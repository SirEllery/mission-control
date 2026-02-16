// Mission Control — Unified server
// Serves static dashboard + proxies /v1/* to OpenClaw gateway
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3456;
const GATEWAY = 'http://127.0.0.1:18789';

const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
    // CORS for all
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

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

            // Stream the response back
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
});
