import { CHAT_CONFIG } from './chat-config.js';

let conversationHistory = [];
let isStreaming = false;

export function initializeChat() {
    const messagesContainer = document.getElementById('chat-messages');
    const input = document.getElementById('command-input');
    const sendBtn = document.getElementById('send-btn');

    // Welcome message
    addMessage('Sir Ellery', 'Mission Control online. Type a message to chat.', 'agent');

    // Send on button click
    sendBtn.addEventListener('click', () => sendMessage());

    // Send on Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

async function sendMessage() {
    if (isStreaming) return;

    const input = document.getElementById('command-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // Show user message
    addMessage(CHAT_CONFIG.userName, text, 'user');

    // Add to conversation history
    conversationHistory.push({ role: 'user', content: text });

    // Start streaming response
    isStreaming = true;
    const responseEl = addMessage(CHAT_CONFIG.agentName, '', 'agent');
    const contentEl = responseEl.querySelector('.content');

    try {
        const response = await fetch(`${CHAT_CONFIG.apiBase}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CHAT_CONFIG.token}`,
                'Content-Type': 'application/json',
                'x-openclaw-agent-id': CHAT_CONFIG.agentId,
            },
            body: JSON.stringify({
                model: 'openclaw',
                stream: true,
                user: CHAT_CONFIG.user,
                messages: conversationHistory,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            contentEl.textContent = `Error ${response.status}: ${err}`;
            isStreaming = false;
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line in buffer

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                        fullText += delta;
                        contentEl.textContent = fullText;
                        scrollToBottom();
                    }
                } catch (e) {
                    // skip unparseable chunks
                }
            }
        }

        // Save assistant response to history
        if (fullText) {
            conversationHistory.push({ role: 'assistant', content: fullText });
        }

        // Update timestamp
        const timeEl = responseEl.querySelector('.timestamp');
        if (timeEl) timeEl.textContent = getCurrentTime();

    } catch (err) {
        contentEl.textContent = `Connection error: ${err.message}`;
    }

    isStreaming = false;
}

function addMessage(sender, text, type) {
    const messagesContainer = document.getElementById('chat-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender';
    senderDiv.textContent = sender;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = text;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'timestamp';
    timeDiv.textContent = getCurrentTime();

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    return messageDiv;
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Typing animation styles
const style = document.createElement('style');
style.textContent = `
    .typing-dots {
        display: inline-block;
    }
    .typing-dots span {
        opacity: 0.4;
        animation: typing 1.4s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
        0%, 60%, 100% { opacity: 0.4; }
        30% { opacity: 1; }
    }
    .message.typing {
        border-left-color: #00ff88;
        background: rgba(0, 255, 136, 0.05);
    }
`;
document.head.appendChild(style);
