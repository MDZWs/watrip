const ChatModule = {
    isOpen: false,
    messages: [],

    open() {
        this.show();
        const badge = document.getElementById('aiFabBadge');
        if (badge) badge.style.display = 'none';
    },

    show() {
        this.isOpen = true;
        document.getElementById('chatOverlay').classList.add('show');
        this.renderMessages();
        setTimeout(() => {
            document.getElementById('chatInput').focus();
        }, 300);
    },

    close() {
        this.isOpen = false;
        document.getElementById('chatOverlay').classList.remove('show');
    },

    closeOnOverlay(e) {
        if (e.target.id === 'chatOverlay') this.close();
    },

    renderMessages() {
        const container = document.getElementById('chatMessages');
        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="chat-msg ai">
                    <div class="chat-msg-bubble">
                        你好呀！我是哇途AI 🤖 你想怎么调整行程呢？
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = this.messages.map(msg => `
                <div class="chat-msg ${msg.role}">
                    <div class="chat-msg-bubble">${msg.content}</div>
                </div>
            `).join('');
        }
        
        const quickReplies = document.getElementById('chatQuickReplies');
        if (this.messages.length === 0) {
            quickReplies.innerHTML = `
                <button class="chat-quick-btn" onclick="ChatModule.quickSend('第一天行程太满了，帮我减少一个景点')">第一天太满了，减一个景点</button>
                <button class="chat-quick-btn" onclick="ChatModule.quickSend('帮我加一个附近的美食推荐')">加个美食推荐</button>
                <button class="chat-quick-btn" onclick="ChatModule.quickSend('把景点顺序调整一下，不要走回头路')">优化路线顺序</button>
                <button class="chat-quick-btn" onclick="ChatModule.quickSend('帮我推荐一个夜景好看的地方')">加个夜景打卡点</button>
            `;
        } else {
            quickReplies.innerHTML = '';
        }
        
        container.scrollTop = container.scrollHeight;
    },

    quickSend(text) {
        document.getElementById('chatInput').value = text;
        this.send();
    },

    async send() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.messages.push({ role: 'user', content: text });
        this.renderMessages();

        this.messages.push({ role: 'ai', content: '正在思考如何调整...' });
        this.renderMessages();

        try {
            const newTrip = await AIPlanner.chatModify(text, App.tripData);
            if (newTrip) {
                App.tripData = newTrip;
                this.messages[this.messages.length - 1] = { 
                    role: 'ai', 
                    content: '好的！已经帮你调整好行程了，去看看吧 ✨' 
                };
                this.renderMessages();
                
                await App.refreshAfterModification();
                
                setTimeout(() => this.close(), 800);
            } else {
                this.messages[this.messages.length - 1] = { 
                    role: 'ai', 
                    content: '抱歉，这个调整我暂时做不到，可以换个说法试试吗？' 
                };
                this.renderMessages();
            }
        } catch (e) {
            console.error('Chat error', e);
            this.messages[this.messages.length - 1] = { 
                role: 'ai', 
                content: '网络有点问题，稍后再试试吧～' 
            };
            this.renderMessages();
        }
    },

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.send();
        }
    }
};
