// Mission Control — Chat Configuration
// Edit these values to match your OpenClaw Gateway setup

export const CHAT_CONFIG = {
    // Gateway endpoint — uses same origin (proxied by server.js)
    apiBase: '',
    
    // Auth token (gateway.auth.token from openclaw.json)
    token: 'REDACTED_TOKEN',
    
    // Model to use for chat completions
    model: 'anthropic/claude-opus-4-6',
    
    // Agent to talk to
    agentId: 'main',
    
    // User identifier (keeps session stable across page reloads)
    user: 'kyle-mission-control',
    
    // Display names
    userName: 'Kyle',
    agentName: 'Sir Ellery',
};
