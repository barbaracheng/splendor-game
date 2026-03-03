class GameRoom {
    constructor() {
        this.roomId = null;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.timerSeconds = 90;
        this.timerInterval = null;
        this.isHistoryExpanded = false;
        
        this.initUI();
        this.startTimer();
    }
    
    initUI() {
        this.initHistoryPanel();
        this.initEmojiPanel();
        this.initChat();
        this.initExitButton();
        this.initActionPanel();
    }
    
    initHistoryPanel() {
        const historyToggle = document.getElementById('history-toggle');
        const historyContent = document.getElementById('history-content');
        const toggleBtn = historyToggle?.querySelector('.btn-toggle-history');
        
        historyToggle?.addEventListener('click', () => {
            this.isHistoryExpanded = !this.isHistoryExpanded;
            historyContent.classList.toggle('expanded', this.isHistoryExpanded);
            toggleBtn.textContent = this.isHistoryExpanded ? '▲ 收起' : '▼ 展开';
        });
    }
    
    initEmojiPanel() {
        const emojiBtn = document.getElementById('emoji-btn');
        const emojiPanel = document.getElementById('emoji-panel');
        
        emojiBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPanel.classList.toggle('hidden');
        });
        
        document.addEventListener('click', (e) => {
            if (!emojiPanel?.contains(e.target) && e.target !== emojiBtn) {
                emojiPanel?.classList.add('hidden');
            }
        });
        
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.dataset.emoji;
                this.sendChatMessage(emoji);
            });
        });
        
        document.querySelectorAll('.quick-msg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const msg = btn.dataset.msg;
                this.sendChatMessage(msg);
            });
        });
    }
    
    initChat() {
        const sendBtn = document.getElementById('send-chat-btn');
        const chatInput = document.getElementById('chat-input');
        
        sendBtn?.addEventListener('click', () => {
            this.sendChatFromInput();
        });
        
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatFromInput();
            }
        });
    }
    
    sendChatFromInput() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        if (message) {
            this.sendChatMessage(message);
            chatInput.value = '';
        }
    }
    
    sendChatMessage(message) {
        this.addChatMessage('你', message, Date.now());
        
        if (window.multiplayer && window.multiplayer.ws) {
            window.multiplayer.send({ type: 'chat_message', message });
        }
    }
    
    addChatMessage(sender, text, timestamp) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const time = new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const isSystem = sender === '系统';
        
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${isSystem ? 'system' : ''}`;
        messageEl.innerHTML = `
            <span class="sender">${sender} <span class="time">${time}</span></span>
            <span class="text">${text}</span>
        `;
        
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }
    
    initExitButton() {
        const exitBtn = document.getElementById('exit-room-btn');
        exitBtn?.addEventListener('click', () => {
            if (confirm('确定要退出房间吗？')) {
                if (window.multiplayer) {
                    window.multiplayer.leaveRoom();
                }
                window.location.href = 'index.html';
            }
        });
    }
    
    initActionPanel() {
        const toggleBtn = document.getElementById('toggle-action-panel');
        const actionPanel = document.querySelector('.action-panel');
        
        toggleBtn?.addEventListener('click', () => {
            actionPanel.classList.toggle('collapsed');
            toggleBtn.textContent = actionPanel.classList.contains('collapsed') ? '▼ 展开' : '▲ 收起';
        });
    }
    
    startTimer() {
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            this.updateTimerDisplay();
            
            if (this.timerSeconds <= 0) {
                this.timerExpired();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timer-display');
        if (!timerDisplay) return;
        
        const minutes = Math.floor(this.timerSeconds / 60);
        const seconds = this.timerSeconds % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.timerSeconds <= 30) {
            timerDisplay.classList.add('warning');
        } else {
            timerDisplay.classList.remove('warning');
        }
    }
    
    timerExpired() {
        clearInterval(this.timerInterval);
        this.addChatMessage('系统', '时间到！跳过当前玩家回合', Date.now());
        this.nextTurn();
    }
    
    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.timerSeconds = 90;
        this.updateCurrentPlayer();
        this.startTimer();
    }
    
    updateCurrentPlayer() {
        const playerCards = document.querySelectorAll('.player-card');
        playerCards.forEach((card, index) => {
            card.classList.toggle('active', index === this.currentPlayerIndex);
        });
        
        const timerPlayer = document.getElementById('timer-player');
        if (timerPlayer) {
            timerPlayer.textContent = `玩家 ${this.currentPlayerIndex + 1} 的回合`;
        }
    }
    
    resetTimer() {
        this.timerSeconds = 90;
        this.updateTimerDisplay();
    }
    
    updatePlayerList(players) {
        this.players = players;
        const container = document.getElementById('players-list');
        if (!container) return;
        
        container.innerHTML = players.map((player, index) => `
            <div class="player-card ${index === this.currentPlayerIndex ? 'active' : ''}" data-player="${index}">
                <div class="player-header">
                    <div class="player-avatar">${index + 1}</div>
                    <div class="player-info">
                        <div class="player-name">${player.name} ${player.isYou ? '<span class="you-badge">你</span>' : ''}</div>
                        <div class="player-status ${player.online ? 'online' : 'offline'}">
                            ${player.online ? '🟢 在线' : '🔴 离线'}
                        </div>
                    </div>
                    <div class="player-ready ${player.ready ? 'ready' : 'not-ready'}">
                        ${player.ready ? '✓ 准备' : '等待中'}
                    </div>
                </div>
                <div class="player-game-info">
                    <div class="player-score">
                        <span class="score-label">⭐ 分数</span>
                        <span class="score-value">${player.score || 0}</span>
                    </div>
                    <div class="player-cards-count">
                        <span class="cards-label">🎴 卡牌</span>
                        <span class="cards-value">${player.cardsCount || 0}</span>
                    </div>
                </div>
                <div class="player-gems-mini">
                    <span class="gem-mini gem-white" title="白色">${player.gems?.white || 0}</span>
                    <span class="gem-mini gem-blue" title="蓝色">${player.gems?.blue || 0}</span>
                    <span class="gem-mini gem-green" title="绿色">${player.gems?.green || 0}</span>
                    <span class="gem-mini gem-red" title="红色">${player.gems?.red || 0}</span>
                    <span class="gem-mini gem-black" title="黑色">${player.gems?.black || 0}</span>
                    <span class="gem-mini gem-gold" title="金色">${player.gems?.gold || 0}</span>
                </div>
            </div>
        `).join('');
        
        document.getElementById('players-count').textContent = players.length;
    }
    
    addHistoryItem(playerName, action) {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        itemEl.innerHTML = `
            <span class="history-time">${time}</span>
            <span class="history-player">${playerName}</span>
            <span class="history-action">${action}</span>
        `;
        
        historyList.insertBefore(itemEl, historyList.firstChild);
        
        const items = historyList.querySelectorAll('.history-item');
        if (items.length > 20) {
            items[items.length - 1].remove();
        }
    }
    
    setRoomInfo(roomId, roomName) {
        this.roomId = roomId;
        const titleEl = document.getElementById('room-title');
        if (titleEl) {
            titleEl.textContent = `💎 ${roomName || '房间 ' + roomId}`;
        }
    }
}

const gameRoom = new GameRoom();

document.addEventListener('DOMContentLoaded', () => {
    const demoPlayers = [
        { name: '玩家 1', isYou: true, online: true, ready: true, score: 0, cardsCount: 0, gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 } },
        { name: '玩家 2', isYou: false, online: true, ready: true, score: 0, cardsCount: 0, gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 } }
    ];
    gameRoom.updatePlayerList(demoPlayers);
    gameRoom.setRoomInfo('ABCD1234', '多人对战房间');
});

window.gameRoom = gameRoom;
