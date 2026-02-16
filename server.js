// Mission Control — Unified server
// Serves static dashboard + proxies /v1/* to OpenClaw gateway + /api/agents for live data
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3456;
const GATEWAY = 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = 'REDACTED_TOKEN';

const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

// Agent color/position/height config (visual properties not in session data)
const AGENT_VISUALS = {
    'main': {
        name: 'Sir Ellery', role: 'Coordinator', color: '#00ff88',
        height: 6, floatHeight: 3.0, position: [0, 0, 0]
    },
    'dreamer': {
        name: 'The Dreamer', role: 'Expansionist', color: '#ffaa00',
        height: 4, floatHeight: 2.5, position: [-16, 0, -7]
    },
    'skeptic': {
        name: 'The Skeptic', role: 'Adversarial Reviewer', color: '#ff44ff',
        height: 4, floatHeight: 2.5, position: [16, 0, -7]
    },
    'researcher': {
        name: 'The Researcher', role: 'Intelligence', color: '#00ddff',
        height: 3, floatHeight: 2.0, position: [-16, 0, 14]
    }
};

// Cache to avoid hammering gateway
let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5s

async function fetchLiveAgentData() {
    const now = Date.now();
    if (cachedData && (now - cacheTime) < CACHE_TTL) return cachedData;

    try {
        const res = await fetch(`${GATEWAY}/tools/invoke`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GATEWAY_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tool: 'sessions_list',
                args: { messageLimit: 1 }
            })
        });

        if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
        const data = await res.json();
        
        // tools/invoke wraps in result.details or result.content
        const sessions = data?.result?.details?.sessions || data?.result?.sessions || [];
        const agents = [];
        const agentSessions = {};

        // Group sessions by agent id
        for (const s of sessions) {
            const match = s.key?.match(/^agent:([^:]+):/);
            if (!match) continue;
            const agentId = match[1];
            if (!agentSessions[agentId]) agentSessions[agentId] = [];
            agentSessions[agentId].push(s);
        }

        // Build agent objects
        for (const [agentId, vis] of Object.entries(AGENT_VISUALS)) {
            const sess = agentSessions[agentId] || [];
            const mainSession = sess.find(s => s.key === `agent:${agentId}:main`) || sess[0];
            
            // Aggregate across all sessions for this agent
            let totalTokens = 0;
            let totalCost = 0;
            let totalMessages = 0;
            let channels = new Set();
            let lastUpdated = 0;

            for (const s of sess) {
                totalTokens += s.totalTokens || 0;
                if (s.channel && s.channel !== 'unknown') channels.add(s.channel);
                if (s.updatedAt > lastUpdated) lastUpdated = s.updatedAt;
                
                // Extract cost from last message's usage data
                if (s.messages && s.messages.length > 0) {
                    for (const msg of s.messages) {
                        totalMessages++;
                        if (msg.usage && msg.usage.cost && msg.usage.cost.total) {
                            totalCost += msg.usage.cost.total;
                        }
                    }
                }
            }

            // Note: totalCost from last message only approximates cumulative cost
            // The real cumulative cost would need full transcript parsing
            // But this gives us the per-session latest cost as a baseline

            // Determine status
            const fiveMinAgo = now - 5 * 60 * 1000;
            const thirtyMinAgo = now - 30 * 60 * 1000;
            let status = 'offline';
            if (lastUpdated > fiveMinAgo) status = 'active';
            else if (lastUpdated > thirtyMinAgo) status = 'idle';
            else if (sess.length > 0) status = 'idle';

            // Last seen
            let lastSeen = '—';
            if (lastUpdated > 0) {
                const diff = now - lastUpdated;
                if (diff < 60000) lastSeen = 'just now';
                else if (diff < 3600000) lastSeen = `${Math.floor(diff / 60000)}m ago`;
                else if (diff < 86400000) lastSeen = `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ago`;
                else lastSeen = `${Math.floor(diff / 86400000)}d ago`;
            }

            // Format cost
            const costStr = totalCost > 0 ? `$${totalCost.toFixed(4)}` : '$0.00';

            // Get last message content as current task
            let currentTask = '—';
            if (mainSession?.messages?.[0]) {
                const lastMsg = mainSession.messages[0];
                const content = lastMsg.content;
                if (Array.isArray(content)) {
                    const textBlock = content.find(c => c.type === 'text');
                    if (textBlock?.text) {
                        const txt = textBlock.text.replace(/\n/g, ' ').trim();
                        currentTask = txt.length > 50 ? txt.substring(0, 50) + '…' : txt;
                    }
                } else if (typeof content === 'string') {
                    currentTask = content.length > 50 ? content.substring(0, 50) + '…' : content;
                }
            }
            if (currentTask === '—' || currentTask === 'NO_REPLY') {
                currentTask = status === 'active' ? 'Active' : status === 'idle' ? 'Standing by' : 'Offline';
            }

            const model = mainSession?.model || vis.role;

            agents.push({
                id: agentId,
                name: vis.name,
                role: vis.role,
                model: model,
                status: status,
                currentTask: currentTask,
                sessions: sess.length,
                channels: [...channels],
                cronJobs: 0,
                heartbeat: agentId === 'main',
                lastActive: lastSeen,
                tokensToday: totalTokens,
                messagesCount: totalMessages,
                errorCount: 0,
                uptime: status === 'active' ? 'LIVE' : lastSeen,
                cost: costStr,
                color: vis.color,
                height: vis.height,
                floatHeight: vis.floatHeight,
                position: vis.position
            });
        }

        // Build connections
        const connections = [
            { from: 'dreamer', to: 'skeptic', active: false },
            { from: 'main', to: 'dreamer', active: false },
            { from: 'main', to: 'skeptic', active: false },
            { from: 'main', to: 'researcher', active: false }
        ];

        // Mark connections active if both agents are active
        const activeIds = new Set(agents.filter(a => a.status === 'active').map(a => a.id));
        for (const c of connections) {
            // Use 'sir-ellery' mapping for display but 'main' for logic
            const fromActive = activeIds.has(c.from);
            const toActive = activeIds.has(c.to);
            c.active = fromActive && toActive;
        }

        // Remap 'main' to 'sir-ellery' for dashboard compatibility
        for (const a of agents) {
            if (a.id === 'main') a.id = 'sir-ellery';
        }
        for (const c of connections) {
            if (c.from === 'main') c.from = 'sir-ellery';
            if (c.to === 'main') c.to = 'sir-ellery';
        }

        cachedData = { agents, connections, activeConversations: [], _live: true, _timestamp: now };
        cacheTime = now;
        return cachedData;
    } catch (err) {
        console.error('Failed to fetch live data:', err.message);
        // Return cached data if available, or fall back to empty
        if (cachedData) return cachedData;
        return { agents: [], connections: [], activeConversations: [], _live: false, _error: err.message };
    }
}

const server = createServer(async (req, res) => {
    // CORS for all
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Live agent data API
    if (req.url === '/api/agents') {
        try {
            const data = await fetchLiveAgentData();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
            res.end(JSON.stringify(data));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Proxy /v1/* to gateway
    if (req.url.startsWith('/v1/')) {
        try {
            const targetUrl = GATEWAY + req.url;
            const headers = { ...req.headers, host: '127.0.0.1:18789' };
            delete headers['origin'];
            delete headers['referer'];

            const proxyReq = await fetch(targetUrl, {
                method: req.method,
                headers,
                body: req.method !== 'GET' && req.method !== 'HEAD'
                    ? await collectBody(req)
                    : undefined,
            });

            res.writeHead(proxyReq.status, {
                'Content-Type': proxyReq.headers.get('content-type') || 'application/json',
                'Cache-Control': 'no-cache',
            });

            if (proxyReq.body) {
                const reader = proxyReq.body.getReader();
                const pump = async () => {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) { res.end(); return; }
                        res.write(value);
                    }
                };
                pump().catch(() => res.end());
            } else {
                res.end(await proxyReq.text());
            }
        } catch (err) {
            res.writeHead(502);
            res.end(JSON.stringify({ error: { message: 'Gateway unreachable: ' + err.message } }));
        }
        return;
    }

    // Static file serving
    let filePath = join(__dirname, req.url.split('?')[0]);
    try {
        const s = await stat(filePath);
        if (s.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {}

    try {
        const data = await readFile(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

function collectBody(req) {
    return new Promise((resolve) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Mission Control listening on http://0.0.0.0:${PORT}`);
    console.log(`Proxying /v1/* → ${GATEWAY}`);
    console.log(`Live agent data → /api/agents`);
});
