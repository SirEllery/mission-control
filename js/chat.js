export function initializeChat() {
    const messagesContainer = document.getElementById('chat-messages');

    const mockMessages = [
        {
            sender: 'Sir Ellery',
            message: 'Mission Control online. All agents reporting.',
            type: 'agent',
            timestamp: '15:40'
        },
        {
            sender: 'Kyle',
            message: 'How\'s the dialectic going?',
            type: 'user',
            timestamp: '15:41'
        },
        {
            sender: 'Sir Ellery',
            message: 'Dreamer ↔ Skeptic in Round 2. Memory system v1 spec. Dreamer expanding, Skeptic stress-testing. Convergence likely by Round 3.',
            type: 'agent',
            timestamp: '15:41'
        },
        {
            sender: 'Kyle',
            message: 'Cost so far?',
            type: 'user',
            timestamp: '15:42'
        },
        {
            sender: 'Sir Ellery',
            message: 'Total: $0.64. Dreamer (MiniMax): $0.04. Skeptic (GPT-5): $0.22. My overhead: $0.38. Well within budget.',
            type: 'agent',
            timestamp: '15:42'
        },
        {
            sender: 'Kyle',
            message: 'What about the Researcher?',
            type: 'user',
            timestamp: '15:43'
        },
        {
            sender: 'Sir Ellery',
            message: 'Standing by. Scaffolded and ready — waiting for Research Agent Phase 1 to deploy. Memory system comes first.',
            type: 'agent',
            timestamp: '15:43'
        }
    ];

    mockMessages.forEach(msg => {
        const messageElement = createMessageElement(msg);
        messagesContainer.appendChild(messageElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Typing indicator after 3s
    setTimeout(() => {
        addTypingIndicator();
    }, 3000);
}

function createMessageElement(messageData) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${messageData.type}`;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender';
    senderDiv.textContent = messageData.sender;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = messageData.message;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'timestamp';
    timeDiv.textContent = messageData.timestamp;

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);

    return messageDiv;
}

function addTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message agent typing';
    typingDiv.innerHTML = `
        <div class="sender">Sir Ellery</div>
        <div class="content">
            <span class="typing-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    setTimeout(() => {
        typingDiv.remove();
        const finalMessage = createMessageElement({
            sender: 'Sir Ellery',
            message: 'Dreamer just submitted Round 2 expansion. Routing to Skeptic now. Lightning active.',
            type: 'agent',
            timestamp: getCurrentTime()
        });
        messagesContainer.appendChild(finalMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 2000);
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
