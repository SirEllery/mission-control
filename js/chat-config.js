// Mission Control — Chat Configuration
// Edit these values to match your OpenClaw Gateway setup

export const CHAT_CONFIG = {
    // Gateway endpoint — uses same origin (proxied by server.js)
    apiBase: '',
    
    // Auth token — injected server-side via proxy, not needed here
    token: '',
    
    // Model to use for chat completions
    model: 'anthropic/claude-opus-4-6',
    
    // Agent to talk to
    agentId: 'main',
    
    // Session key — routes to the SAME session as WhatsApp
    // So conversations are shared across all surfaces
    sessionKey: 'agent:main:main',
    
    // User identifier
    user: 'kyle-mission-control',
    
    // Display names
    userName: 'Kyle',
    agentName: 'Sir Ellery',
};
