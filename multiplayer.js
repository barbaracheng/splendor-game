// Splendor 多人游戏客户端

class SplendorMultiplayer {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.roomId = null;
        this.players = [];
        this.serverUrl = 'ws://localhost:3000';
        
        this.initUI();
    }
    
    initUI() {
        // 多人游戏按钮
        document.getElementById('multiplayer-btn')?.addEventListener('click', () => {
            document.getElementById('multiplayer-modal').classList.remove('hidden');
        });
        
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tab = btn.dataset.tab;
                document.getElementById('create-room-panel').classList.toggle('hidden', tab !== 'create');
                document.getElementById('join-room-panel').classList.toggle('hidden', tab !== 'join');
            });
        });
        
        // 创建房间
        document.getElementById('create-room-btn')?.addEventListener('click', () => {
            const roomName = document.getElementById('room-name-input').value;
            const maxPlayers = parseInt(document.getElementById('room-players-select').value);
            this.createRoom(roomName, maxPlayers);
        });
        
        // 加入房间
        document.getElementById('join-room-btn')?.addEventListener('click', () => {
            const roomId = document.getElementById('room-id-input').value.trim();
            if (roomId) {
                this.joinRoom(roomId);
            }
        });
        
        // 开始游戏
        document.getElementById('start-game-btn')?.addEventListener('click', () => {
            this.send({ type: 'start_game' });
        });
        
        // 复制房间 ID
        document.getElementById('copy-room-id-btn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(this.roomId);
            alert('房间 ID 已复制到剪贴板！');
        });
        
        // 邀请好友
        document.getElementById('invite-btn')?.addEventListener('click', () => {
            const shareText = `快来和我一起玩 Splendor！房间 ID: ${this.roomId}`;
            if (navigator.share) {
                navigator.share({
                    title: 'Splendor 邀请',
                    text: shareText
                });
            } else {
                navigator.clipboard.writeText(shareText);
                alert('邀请信息已复制！');
            }
        });
        
        // 聊天
        document.getElementById('send-chat-btn')?.addEventListener('click', () => {
            this.sendChat();
        });
        
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChat();
            }
        });
    }
    
    connect() {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
            console.log('已连接到服务器');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('连接已关闭');
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket 错误:', error);
        };
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'name_set':
                this.playerId = data.playerId;
                break;
                
            case 'room_created':
                this.roomId = data.roomId;
                this.showRoom(data.room);
                break;
                
            case 'player_joined':
                this.players = data.players;
                this.updatePlayerList();
                this.addChatMessage('系统', `${data.playerName} 加入了房间`, Date.now());
                break;
                
            case 'player_left':
                this.players = data.players;
                this.updatePlayerList();
                this.addChatMessage('系统', '有玩家离开了房间', Date.now());
                break;
                
            case 'chat_message':
                this.addChatMessage(data.name, data.message, data.timestamp);
                break;
                
            case 'game_started':
                this.startGame(data.roomState);
                break;
                
            case 'error':
                alert(data.message);
                break;
        }
    }
    
    createRoom(roomName, maxPlayers) {
        const playerName = prompt('请输入你的昵称：') || '玩家' + Math.floor(Math.random() * 1000);
        this.send({ type: 'set_name', name: playerName });
        
        setTimeout(() => {
            this.send({
                type: 'create_room',
                roomName,
                maxPlayers
            });
        }, 100);
    }
    
    joinRoom(roomId) {
        const playerName = prompt('请输入你的昵称：') || '玩家' + Math.floor(Math.random() * 1000);
        this.send({ type: 'set_name', name: playerName });
        
        setTimeout(() => {
            this.send({ type: 'join_room', roomId });
        }, 100);
    }
    
    showRoom(room) {
        this.roomId = room.roomId;
        this.players = room.players.map(id => ({ id, name: '未知' }));
        
        document.getElementById('multiplayer-modal').classList.add('hidden');
        document.getElementById('room-modal').classList.remove('hidden');
        document.getElementById('room-title').textContent = `房间 ${room.roomId}`;
        
        this.updatePlayerList();
    }
    
    updatePlayerList() {
        const list = document.getElementById('room-players-list');
        if (!list) return;
        
        list.innerHTML = this.players.map((player, index) => `
            <div class="player-item">
                <div class="player-avatar">${index + 1}</div>
                <div class="player-name">${player.name || '未知'}</div>
                ${player.id === this.playerId ? '<span class="player-status">👤 你</span>' : ''}
            </div>
        `).join('');
        
        // 至少 2 人才能开始
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.disabled = this.players.length < 2;
        }
    }
    
    sendChat() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (message) {
            this.send({ type: 'chat_message', message });
            input.value = '';
        }
    }
    
    addChatMessage(sender, text, timestamp) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const time = new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        container.innerHTML += `
            <div class="chat-message">
                <div class="sender">${sender} <span class="time">${time}</span></div>
                <div class="text">${text}</div>
            </div>
        `;
        
        container.scrollTop = container.scrollHeight;
    }
    
    startGame(roomState) {
        document.getElementById('room-modal').classList.add('hidden');
        // 初始化游戏逻辑
        alert(`游戏即将开始！\n房间：${this.roomId}\n玩家：${this.players.length}人`);
        // TODO: 初始化实际游戏
    }
    
    leaveRoom() {
        this.send({ type: 'leave_room' });
        this.roomId = null;
        this.players = [];
        document.getElementById('room-modal').classList.add('hidden');
        document.getElementById('multiplayer-modal').classList.remove('hidden');
    }
}

// 初始化
const multiplayer = new SplendorMultiplayer();
// 自动连接（如果服务器可用）
try {
    multiplayer.connect();
} catch (e) {
    console.log('多人服务器未启动，单机模式可用');
}
