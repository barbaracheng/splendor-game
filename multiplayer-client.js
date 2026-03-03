class MultiplayerClient {
    constructor(multiplayer) {
        this.multiplayer = multiplayer;
        this.playerId = null;
        this.roomId = null;
        this.players = [];
        this.isMyTurn = false;
        this.currentPlayerIndex = 0;
        this.timerSeconds = 90;
        this.timerInterval = null;
        this.animationQueue = [];
        this.isAnimating = false;
        
        this.gemColors = ['white', 'blue', 'green', 'red', 'black', 'gold'];
        this.gemNames = { white: '⚪白', blue: '🔵蓝', green: '🟢绿', red: '🔴红', black: '⚫黑', gold: '🟡金' };
        this.quickMessages = {
            'hello': '大家好！',
            'good_game': '好游戏！',
            'thinking': '让我想想...',
            'well_played': '玩得好！',
            'good_luck': '祝好运！',
            'wait': '请稍等',
            'thanks': '谢谢！',
            'oops': '哎呀！'
        };
        
        this.init();
    }
    
    init() {
        this.injectAnimationStyles();
    }
    
    setPlayerId(playerId) {
        this.playerId = playerId;
    }
    
    setRoomId(roomId) {
        this.roomId = roomId;
    }
    
    setPlayers(players) {
        this.players = players;
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'game_state_sync':
                this.handleGameStateSync(data);
                break;
                
            case 'player_action':
                this.handlePlayerAction(data);
                break;
                
            case 'emoji':
                this.handleEmoji(data);
                break;
                
            case 'quick_message':
                this.handleQuickMessage(data);
                break;
                
            case 'chat_message':
                this.handleChatMessage(data);
                break;
                
            case 'timer_sync':
                this.handleTimerSync(data);
                break;
                
            case 'timer_warning':
                this.handleTimerWarning(data);
                break;
                
            case 'player_ready':
                this.handlePlayerReady(data);
                break;
                
            case 'player_online':
                this.handlePlayerOnline(data);
                break;
                
            case 'player_offline':
                this.handlePlayerOffline(data);
                break;
        }
    }
    
    handleGameStateSync(data) {
        if (data.gameState && window.gameUI) {
            Object.assign(window.gameUI.game, data.gameState);
            window.gameUI.renderGame();
            
            this.currentPlayerIndex = data.gameState.currentPlayer || 0;
            this.isMyTurn = this.isCurrentPlayer();
            
            this.addHistoryItem('系统', '游戏状态已同步');
        }
    }
    
    handlePlayerAction(data) {
        if (data.playerId === this.playerId) return;
        
        const playerName = data.playerName || '对手';
        const actionType = data.actionType;
        const actionData = data.actionData;
        
        this.queueAnimation(() => {
            switch (actionType) {
                case 'take_gems':
                    this.playOpponentTakeGemsAnimation(playerName, actionData);
                    break;
                case 'buy_card':
                    this.playOpponentBuyCardAnimation(playerName, actionData);
                    break;
                case 'reserve_card':
                    this.playOpponentReserveCardAnimation(playerName, actionData);
                    break;
            }
        });
        
        const actionText = this.getActionDescription(actionType, actionData);
        this.addHistoryItem(playerName, actionText);
    }
    
    handleEmoji(data) {
        if (data.playerId === this.playerId) return;
        
        const playerName = data.playerName || '对手';
        const emoji = data.emoji;
        
        this.playEmojiAnimation(data.playerId, emoji);
        this.showFloatingEmoji(data.playerId, emoji);
        
        if (window.gameRoom) {
            window.gameRoom.addChatMessage(playerName, emoji, data.timestamp || Date.now());
        }
    }
    
    handleQuickMessage(data) {
        if (data.playerId === this.playerId) return;
        
        const playerName = data.playerName || '对手';
        const messageId = data.messageId;
        const message = this.quickMessages[messageId] || messageId;
        
        this.showQuickMessageBubble(data.playerId, message);
        
        if (window.gameRoom) {
            window.gameRoom.addChatMessage(playerName, message, data.timestamp || Date.now());
        }
    }
    
    handleChatMessage(data) {
        if (data.playerId === this.playerId) return;
        
        const playerName = data.name || '对手';
        const message = data.message;
        
        if (window.gameRoom) {
            window.gameRoom.addChatMessage(playerName, message, data.timestamp || Date.now());
        }
    }
    
    handleTimerSync(data) {
        this.timerSeconds = data.seconds || 90;
        this.currentPlayerIndex = data.currentPlayerIndex || 0;
        
        this.updateTimerDisplay();
        
        if (window.gameRoom) {
            const timerPlayer = document.getElementById('timer-player');
            if (timerPlayer) {
                timerPlayer.textContent = `玩家 ${this.currentPlayerIndex + 1} 的回合`;
            }
        }
    }
    
    handleTimerWarning(data) {
        const secondsLeft = data.secondsLeft || 30;
        
        this.showTimerWarning(secondsLeft);
        
        if (window.gameRoom) {
            window.gameRoom.addChatMessage('系统', `⚠️ 剩余 ${secondsLeft} 秒！`, Date.now());
        }
    }
    
    handlePlayerReady(data) {
        const playerName = data.playerName || '玩家';
        const isReady = data.isReady;
        
        this.updatePlayerReadyStatus(data.playerId, isReady);
        
        if (window.gameRoom) {
            const statusText = isReady ? '已准备' : '取消准备';
            window.gameRoom.addChatMessage('系统', `${playerName} ${statusText}`, data.timestamp || Date.now());
            
            if (data.players) {
                window.gameRoom.updatePlayerList(data.players);
            }
        }
    }
    
    handlePlayerOnline(data) {
        const playerName = data.playerName || '玩家';
        const isOnline = data.isOnline;
        
        this.updatePlayerOnlineStatus(data.playerId, isOnline);
        
        if (window.gameRoom && data.players) {
            window.gameRoom.updatePlayerList(data.players);
        }
    }
    
    handlePlayerOffline(data) {
        const playerName = data.playerName || '玩家';
        
        this.updatePlayerOnlineStatus(data.playerId, false);
        
        if (window.gameRoom) {
            window.gameRoom.addChatMessage('系统', `${playerName} 已离线`, data.timestamp || Date.now());
            
            if (data.players) {
                window.gameRoom.updatePlayerList(data.players);
            }
        }
    }
    
    sendPlayerAction(actionType, actionData) {
        if (!this.multiplayer || !this.multiplayer.ws) return;
        
        this.multiplayer.send({
            type: 'player_action',
            actionType,
            actionData
        });
    }
    
    sendGameState(gameState) {
        if (!this.multiplayer || !this.multiplayer.ws) return;
        
        this.multiplayer.send({
            type: 'game_state_sync',
            gameState
        });
    }
    
    sendEmoji(emoji) {
        if (!this.multiplayer || !this.multiplayer.ws) return;
        
        this.multiplayer.send({
            type: 'emoji',
            emoji
        });
    }
    
    sendQuickMessage(messageId) {
        if (!this.multiplayer || !this.multiplayer.ws) return;
        
        this.multiplayer.send({
            type: 'quick_message',
            messageId
        });
    }
    
    sendPlayerReady(isReady) {
        if (!this.multiplayer || !this.multiplayer.ws) return;
        
        this.multiplayer.send({
            type: 'player_ready',
            isReady
        });
    }
    
    isCurrentPlayer() {
        if (!window.gameUI) return false;
        
        const myIndex = this.players.findIndex(p => p.id === this.playerId);
        return myIndex === window.gameUI.game.currentPlayer;
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
    
    showTimerWarning(secondsLeft) {
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.classList.add('critical');
            
            setTimeout(() => {
                timerDisplay.classList.remove('critical');
            }, 3000);
        }
        
        this.showNotification(`⚠️ 时间警告：剩余 ${secondsLeft} 秒！`, 'warning');
    }
    
    updatePlayerReadyStatus(playerId, isReady) {
        const playerCard = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerCard) {
            const readyBadge = playerCard.querySelector('.player-ready');
            if (readyBadge) {
                readyBadge.className = `player-ready ${isReady ? 'ready' : 'not-ready'}`;
                readyBadge.textContent = isReady ? '✓ 准备' : '等待中';
            }
        }
    }
    
    updatePlayerOnlineStatus(playerId, isOnline) {
        const playerCard = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerCard) {
            const statusBadge = playerCard.querySelector('.player-status');
            if (statusBadge) {
                statusBadge.className = `player-status ${isOnline ? 'online' : 'offline'}`;
                statusBadge.textContent = isOnline ? '🟢 在线' : '🔴 离线';
            }
        }
    }
    
    playOpponentTakeGemsAnimation(playerName, actionData) {
        const gems = actionData?.gems || {};
        
        const overlay = document.createElement('div');
        overlay.className = 'opponent-action-overlay';
        overlay.innerHTML = `
            <div class="opponent-action-content">
                <div class="opponent-name">${playerName}</div>
                <div class="opponent-action-text">拿取宝石</div>
                <div class="opponent-gems">
                    ${Object.entries(gems).map(([color, count]) => 
                        `<span class="gem-animation gem-${color}">${this.gemNames[color] || color} ×${count}</span>`
                    ).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 500);
        }, 1500);
        
        this.highlightGemPool(gems);
    }
    
    playOpponentBuyCardAnimation(playerName, actionData) {
        const cardId = actionData?.cardId;
        const cardPoints = actionData?.points || 0;
        
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            cardElement.classList.add('opponent-buying');
            
            const flyCard = cardElement.cloneNode(true);
            flyCard.classList.add('fly-card-animation');
            document.body.appendChild(flyCard);
            
            setTimeout(() => {
                flyCard.remove();
                cardElement.classList.remove('opponent-buying');
            }, 1000);
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'opponent-action-overlay';
        overlay.innerHTML = `
            <div class="opponent-action-content">
                <div class="opponent-name">${playerName}</div>
                <div class="opponent-action-text">购买卡牌</div>
                <div class="opponent-card-points">⭐ +${cardPoints} 分</div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 500);
        }, 1500);
    }
    
    playOpponentReserveCardAnimation(playerName, actionData) {
        const cardId = actionData?.cardId;
        
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            cardElement.classList.add('opponent-reserving');
            
            setTimeout(() => {
                cardElement.classList.remove('opponent-reserving');
            }, 1000);
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'opponent-action-overlay';
        overlay.innerHTML = `
            <div class="opponent-action-content">
                <div class="opponent-name">${playerName}</div>
                <div class="opponent-action-text">预留卡牌</div>
                <div class="opponent-gold-bonus">🟡 +1 金色代币</div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 500);
        }, 1500);
    }
    
    playEmojiAnimation(playerId, emoji) {
        const playerCard = document.querySelector(`[data-player-id="${playerId}"]`);
        if (!playerCard) return;
        
        const emojiEl = document.createElement('div');
        emojiEl.className = 'emoji-animation';
        emojiEl.textContent = emoji;
        playerCard.appendChild(emojiEl);
        
        setTimeout(() => emojiEl.remove(), 2000);
    }
    
    showFloatingEmoji(playerId, emoji) {
        const playerCard = document.querySelector(`[data-player-id="${playerId}"]`);
        if (!playerCard) return;
        
        const rect = playerCard.getBoundingClientRect();
        
        const floatingEmoji = document.createElement('div');
        floatingEmoji.className = 'floating-emoji';
        floatingEmoji.textContent = emoji;
        floatingEmoji.style.left = `${rect.left + rect.width / 2}px`;
        floatingEmoji.style.top = `${rect.top}px`;
        document.body.appendChild(floatingEmoji);
        
        setTimeout(() => floatingEmoji.remove(), 1500);
    }
    
    showQuickMessageBubble(playerId, message) {
        const playerCard = document.querySelector(`[data-player-id="${playerId}"]`);
        if (!playerCard) return;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = message;
        playerCard.appendChild(bubble);
        
        setTimeout(() => {
            bubble.classList.add('fade-out');
            setTimeout(() => bubble.remove(), 300);
        }, 3000);
    }
    
    playTurnChangeAnimation(fromPlayer, toPlayer) {
        const overlay = document.createElement('div');
        overlay.className = 'turn-change-overlay';
        overlay.innerHTML = `
            <div class="turn-change-content">
                <div class="turn-change-text">回合切换</div>
                <div class="turn-change-player">玩家 ${toPlayer + 1} 的回合</div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 500);
        }, 1500);
    }
    
    highlightGemPool(gems) {
        Object.entries(gems).forEach(([color, count]) => {
            const gemSlot = document.querySelector(`.gem-slot[data-color="${color}"]`);
            if (gemSlot) {
                gemSlot.classList.add('highlight-gem');
                setTimeout(() => gemSlot.classList.remove('highlight-gem'), 1000);
            }
        });
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    addHistoryItem(playerName, action) {
        if (window.gameRoom) {
            window.gameRoom.addHistoryItem(playerName, action);
        }
    }
    
    getActionDescription(actionType, actionData) {
        switch (actionType) {
            case 'take_gems':
                const gems = actionData?.gems || {};
                const gemText = Object.entries(gems)
                    .map(([color, count]) => `${this.gemNames[color] || color}×${count}`)
                    .join(' ');
                return `拿取宝石: ${gemText}`;
            case 'buy_card':
                return `购买卡牌 (⭐+${actionData?.points || 0})`;
            case 'reserve_card':
                return '预留卡牌';
            default:
                return actionType;
        }
    }
    
    queueAnimation(animationFn) {
        this.animationQueue.push(animationFn);
        
        if (!this.isAnimating) {
            this.processAnimationQueue();
        }
    }
    
    processAnimationQueue() {
        if (this.animationQueue.length === 0) {
            this.isAnimating = false;
            return;
        }
        
        this.isAnimating = true;
        const animation = this.animationQueue.shift();
        
        animation();
        
        setTimeout(() => this.processAnimationQueue(), 2000);
    }
    
    injectAnimationStyles() {
        if (document.getElementById('multiplayer-client-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'multiplayer-client-styles';
        style.textContent = `
            .opponent-action-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .opponent-action-overlay.fade-out {
                animation: fadeOut 0.5s ease forwards;
            }
            
            .opponent-action-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #ffd700;
                border-radius: 15px;
                padding: 30px 50px;
                text-align: center;
                animation: scaleIn 0.3s ease;
            }
            
            .opponent-name {
                font-size: 1.5em;
                color: #ffd700;
                margin-bottom: 10px;
            }
            
            .opponent-action-text {
                font-size: 1.2em;
                color: #fff;
                margin-bottom: 15px;
            }
            
            .opponent-gems {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .gem-animation {
                font-size: 1.5em;
                padding: 10px 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                animation: bounce 0.5s ease infinite;
            }
            
            .opponent-card-points {
                font-size: 1.3em;
                color: #ffd700;
            }
            
            .opponent-gold-bonus {
                font-size: 1.3em;
                color: #ffd700;
            }
            
            .opponent-buying, .opponent-reserving {
                animation: pulse 0.5s ease infinite;
                border-color: #ff6b6b !important;
            }
            
            .fly-card-animation {
                position: fixed;
                z-index: 10001;
                animation: flyToPlayer 1s ease forwards;
            }
            
            @keyframes flyToPlayer {
                0% {
                    transform: scale(1);
                    opacity: 1;
                }
                100% {
                    transform: scale(0.5) translateY(100vh);
                    opacity: 0;
                }
            }
            
            .emoji-animation {
                position: absolute;
                font-size: 2em;
                animation: emojiPop 2s ease forwards;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            @keyframes emojiPop {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.5);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -100%) scale(1);
                    opacity: 0;
                }
            }
            
            .floating-emoji {
                position: fixed;
                font-size: 3em;
                z-index: 10000;
                animation: floatUp 1.5s ease forwards;
                pointer-events: none;
            }
            
            @keyframes floatUp {
                0% {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100px) scale(0.5);
                    opacity: 0;
                }
            }
            
            .message-bubble {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: #ffd700;
                color: #000;
                padding: 8px 15px;
                border-radius: 15px;
                font-size: 0.9em;
                white-space: nowrap;
                animation: bubbleIn 0.3s ease;
                z-index: 100;
            }
            
            .message-bubble::after {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid #ffd700;
            }
            
            .message-bubble.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }
            
            @keyframes bubbleIn {
                0% {
                    transform: translateX(-50%) scale(0);
                    opacity: 0;
                }
                100% {
                    transform: translateX(-50%) scale(1);
                    opacity: 1;
                }
            }
            
            .turn-change-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .turn-change-overlay.fade-out {
                animation: fadeOut 0.5s ease forwards;
            }
            
            .turn-change-content {
                text-align: center;
            }
            
            .turn-change-text {
                font-size: 1.5em;
                color: #aaa;
                margin-bottom: 10px;
            }
            
            .turn-change-player {
                font-size: 2em;
                color: #ffd700;
                animation: pulse 1s ease infinite;
            }
            
            .highlight-gem {
                animation: highlightPulse 1s ease;
            }
            
            @keyframes highlightPulse {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: none;
                }
                50% {
                    transform: scale(1.2);
                    box-shadow: 0 0 20px #ffd700;
                }
            }
            
            .game-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 1.1em;
                z-index: 10001;
                animation: slideDown 0.3s ease;
            }
            
            .game-notification.info {
                background: #4fc3f7;
                color: #000;
            }
            
            .game-notification.warning {
                background: #ff9800;
                color: #000;
            }
            
            .game-notification.success {
                background: #4caf50;
                color: #fff;
            }
            
            .game-notification.error {
                background: #f44336;
                color: #fff;
            }
            
            .game-notification.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }
            
            @keyframes slideDown {
                0% {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
                100% {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes scaleIn {
                0% {
                    transform: scale(0.8);
                    opacity: 0;
                }
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .timer-display.warning {
                color: #ff9800;
                animation: pulse 1s ease infinite;
            }
            
            .timer-display.critical {
                color: #f44336;
                animation: pulse 0.5s ease infinite;
            }
        `;
        document.head.appendChild(style);
    }
}

window.MultiplayerClient = MultiplayerClient;
