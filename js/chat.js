import { CHAT_CONFIG } from './chat-config.js';

const STORAGE_KEY = 'mc-chat-history';
const STORAGE_MSGS_KEY = 'mc-chat-messages';
let conversationHistory = [];
let isStreaming = false;
let attachedFile = null; // { file, url (for image preview) }

function saveChat() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
        // Save rendered messages
        const container = document.getElementById('chat-messages');
        localStorage.setItem(STORAGE_MSGS_KEY, container.innerHTML);
    } catch (e) { /* storage full or unavailable */ }
}

function loadChat() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const savedHtml = localStorage.getItem(STORAGE_MSGS_KEY);
        if (saved && savedHtml) {
            conversationHistory = JSON.parse(saved);
            const container = document.getElementById('chat-messages');
            container.innerHTML = savedHtml;
            scrollToBottom();
            return true;
        }
    } catch (e) { /* corrupted */ }
    return false;
}

export function initializeChat() {
    const input = document.getElementById('command-input');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const attachPreview = document.getElementById('attachment-preview');
    const attachName = document.getElementById('attachment-name');
    const attachRemove = document.getElementById('attachment-remove');

    // Restore previous chat or show welcome
    if (!loadChat()) {
        addMessage('Sir Ellery', 'Mission Control online. Type a message to chat.', 'agent');
    }

    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Attachment handling
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        attachedFile = { file, url: null };

        // Show preview
        attachName.textContent = file.name;
        // Remove old thumbnail if any
        const oldThumb = attachPreview.querySelector('img.thumb');
        if (oldThumb) oldThumb.remove();

        if (file.type.startsWith('image/')) {
            attachedFile.url = URL.createObjectURL(file);
            const img = document.createElement('img');
            img.className = 'thumb';
            img.src = attachedFile.url;
            attachPreview.insertBefore(img, attachName);
        }
        attachPreview.style.display = 'flex';
        fileInput.value = '';
    });

    attachRemove.addEventListener('click', () => {
        clearAttachment();
    });
}

function clearAttachment() {
    if (attachedFile?.url) URL.revokeObjectURL(attachedFile.url);
    attachedFile = null;
    const preview = document.getElementById('attachment-preview');
    preview.style.display = 'none';
    const thumb = preview.querySelector('img.thumb');
    if (thumb) thumb.remove();
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed: ' + res.status);
    return res.json();
}

async function sendMessage() {
    if (isStreaming) return;

    const input = document.getElementById('command-input');
    const text = input.value.trim();
    if (!text && !attachedFile) return;

    input.value = '';
    const currentFile = attachedFile;
    clearAttachment();

    // Build display text
    let displayText = text;
    if (currentFile) {
        displayText = text ? `📎 ${currentFile.file.name}\n${text}` : `📎 ${currentFile.file.name}`;
    }
    addMessage(CHAT_CONFIG.userName, displayText, 'user');

    // Upload file if attached
    let uploadedPath = null;
    if (currentFile) {
        try {
            const result = await uploadFile(currentFile.file);
            uploadedPath = result.filePath;
        } catch (err) {
            addMessage(CHAT_CONFIG.agentName, `Upload error: ${err.message}`, 'agent');
            return;
        }
    }

    // Build message content
    let messageContent;
    if (uploadedPath) {
        const isImage = currentFile.file.type.startsWith('image/');
        if (isImage) {
            const parts = [];
            if (text) parts.push({ type: 'text', text });
            parts.push({ type: 'image_url', image_url: { url: uploadedPath } });
            messageContent = parts;
        } else {
            messageContent = text ? `[Attached file: ${uploadedPath}]\n${text}` : `[Attached file: ${uploadedPath}]`;
        }
    } else {
        messageContent = text;
    }

    conversationHistory.push({ role: 'user', content: messageContent });

    // Show typing indicator
    isStreaming = true;
    const typingEl = showTypingIndicator();

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

        // Remove typing indicator, add real message element
        typingEl.remove();

        if (!response.ok) {
            const err = await response.text();
            addMessage(CHAT_CONFIG.agentName, `Error ${response.status}: ${err}`, 'agent');
            isStreaming = false;
            return;
        }

        const responseEl = addMessage(CHAT_CONFIG.agentName, '', 'agent');
        const contentEl = responseEl.querySelector('.content');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

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
                } catch (e) {}
            }
        }

        if (fullText) {
            conversationHistory.push({ role: 'assistant', content: fullText });
            saveChat();
        }

        const timeEl = responseEl.querySelector('.timestamp');
        if (timeEl) timeEl.textContent = getCurrentTime();

    } catch (err) {
        typingEl.remove();
        addMessage(CHAT_CONFIG.agentName, `Connection error: ${err.message}`, 'agent');
    }

    isStreaming = false;
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message agent typing';
    div.innerHTML = `
        <div class="sender">${CHAT_CONFIG.agentName}</div>
        <div class="content"><span class="typing-dots"><span>●</span><span>●</span><span>●</span></span></div>
    `;
    messagesContainer.appendChild(div);
    scrollToBottom();
    return div;
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
    return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

// Typing animation styles
const style = document.createElement('style');
style.textContent = `
    .typing-dots { display: inline-block; }
    .typing-dots span {
        color: #00ff88;
        opacity: 0.4;
        animation: typing 1.4s infinite;
        font-size: 14px;
        margin: 0 1px;
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
