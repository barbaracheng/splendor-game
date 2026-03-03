// Splendor Game UI Controller - 原版规则

class SplendorUI {
    constructor(playerCount, isMultiplayer = false, playerId = null) {
        this.game = new SplendorGame(playerCount);
        this.selectedGems = [];
        this.selectedCard = null;
        this.isMultiplayer = isMultiplayer;
        this.playerId = playerId;
        this.init();
    }

    init() {
        this.renderGameConfig();
        this.renderGemPool();
        this.renderNobles();
        this.renderCards();
        this.renderPlayers();
        this.bindEvents();
        this.updateMessage('🎮 游戏开始！玩家 1 的回合 - 请选择行动');
        
        // 初始化按钮状态
        document.getElementById('take-3-different').disabled = false;
        document.getElementById('take-2-same').disabled = false;
        document.getElementById('buy-card').disabled = true;
        document.getElementById('reserve-card').disabled = true;
    }

    // 渲染游戏配置
    renderGameConfig() {
        const config = this.game.gameConfig;
        document.getElementById('config-players').textContent = config.playerCount;
        document.getElementById('config-gems').textContent = config.gemCount;
        document.getElementById('config-cards').textContent = config.cardsPerTier;
        document.getElementById('config-nobles').textContent = config.nobleCount;
        
        // 更新规则弹窗中的配置
        document.getElementById('rule-players').textContent = config.playerCount;
        document.getElementById('rule-gems').textContent = config.gemCount;
        document.getElementById('rule-cards').textContent = config.cardsPerTier;
        document.getElementById('rule-nobles').textContent = config.nobleCount;
    }

    // 渲染宝石池
    renderGemPool() {
        const gems = this.game.gameBoard.gems;
        for (const [color, count] of Object.entries(gems)) {
            const el = document.getElementById(`gem-${color}`);
            if (el) el.textContent = count;
        }
    }

    // 渲染贵族卡
    renderNobles() {
        const container = document.getElementById('nobles-container');
        if (!container) return;
        container.innerHTML = '';
        this.game.gameBoard.nobles.forEach(noble => {
            const card = this.createNobleElement(noble);
            container.appendChild(card);
        });
    }

    // 渲染卡牌
    renderCards() {
        ['tier1', 'tier2', 'tier3'].forEach(tier => {
            const container = document.getElementById(`${tier}-container`);
            if (!container) return;
            
            // 使用 DocumentFragment 减少 DOM 操作
            const fragment = document.createDocumentFragment();
            this.game.gameBoard[tier].forEach(card => {
                const cardEl = this.createCardElement(card, tier);
                fragment.appendChild(cardEl);
            });
            
            container.innerHTML = '';
            container.appendChild(fragment);
        });
    }

    // 创建卡牌元素
    createCardElement(card, tier) {
        const el = document.createElement('div');
        el.className = `card ${tier}`;
        el.dataset.cardId = card.id;
        el.title = `点击选择这张卡牌`;

        let costHtml = '';
        const gemNames = { white: '⚪', blue: '🔵', green: '🟢', red: '🔴', black: '⚫' };
        for (const [color, amount] of Object.entries(card.cost)) {
            if (amount > 0) {
                for (let i = 0; i < amount; i++) {
                    costHtml += `<span class="cost-gem gem-${color}" title="${gemNames[color]}"></span>`;
                }
            }
        }

        el.innerHTML = `
            <div class="card-cost">${costHtml}</div>
            <div class="card-points">${card.points > 0 ? `⭐${card.points}` : ''}</div>
            <div class="card-bonus">
                ${card.color ? `<span class="bonus-gem gem-${card.color}" title="${gemNames[card.color]}折扣"></span>` : ''}
            </div>
        `;

        el.addEventListener('click', () => this.selectCard(card, tier));
        return el;
    }

    // 创建贵族卡元素
    createNobleElement(noble) {
        const el = document.createElement('div');
        el.className = 'card noble';
        el.dataset.nobleId = noble.id;

        let reqHtml = '';
        const gemNames = { white: '⚪', blue: '🔵', green: '🟢', red: '🔴', black: '⚫' };
        for (const [color, amount] of Object.entries(noble.requirements)) {
            if (amount > 0) {
                for (let i = 0; i < amount; i++) {
                    reqHtml += `<span class="cost-gem gem-${color}" title="${gemNames[color]}"></span>`;
                }
            }
        }

        el.innerHTML = `
            <div style="text-align:center;font-size:2em;">👑</div>
            <div class="card-cost" style="margin-top:10px;">${reqHtml}</div>
            <div class="card-points">⭐${noble.points}</div>
        `;

        return el;
    }

    // 渲染玩家区域
    renderPlayers() {
        this.game.players.forEach((player, index) => {
            const section = document.getElementById(`player-${index}`);
            if (section) {
                // 只在需要时更新 active 类，避免不必要的 DOM 操作
                const isActive = index === this.game.currentPlayer;
                if (isActive !== section.classList.contains('active')) {
                    section.classList.toggle('active', isActive);
                }
            }

            // 更新得分
            const pointsEl = document.getElementById(`p${index}-points`);
            if (pointsEl && pointsEl.textContent !== player.points.toString()) {
                pointsEl.textContent = player.points;
            }

            // 更新卡牌数量
            const cardsCountEl = document.getElementById(`p${index}-cards-count`);
            if (cardsCountEl && cardsCountEl.textContent !== player.cards.length.toString()) {
                cardsCountEl.textContent = player.cards.length;
            }

            // 更新宝石
            const gemsContainer = document.getElementById(`p${index}-gems`);
            if (gemsContainer) {
                let gemsHtml = '';
                for (const [color, count] of Object.entries(player.gems)) {
                    if (count > 0) {
                        gemsHtml += `
                            <div class="player-gem">
                                <span class="gem gem-${color}" style="width:25px;height:25px;"></span>
                                <span>${count}</span>
                            </div>
                        `;
                    }
                }
                if (gemsContainer.innerHTML !== gemsHtml) {
                    gemsContainer.innerHTML = gemsHtml;
                }
            }

            // 更新折扣
            const bonusesContainer = document.getElementById(`p${index}-bonuses`);
            if (bonusesContainer) {
                let bonusesHtml = '<div class="bonus-label">💎 折扣：</div><div class="player-bonuses-list">';
                let hasBonuses = false;
                for (const [color, count] of Object.entries(player.bonuses)) {
                    if (count > 0) {
                        bonusesHtml += `<span class="bonus-item"><span class="gem gem-${color}" style="width:18px;height:18px;display:inline-block;"></span>×${count}</span>`;
                        hasBonuses = true;
                    }
                }
                if (hasBonuses) {
                    bonusesHtml += '</div>';
                } else {
                    bonusesHtml = '<div class="bonus-label">💎 折扣：无</div>';
                }
                if (bonusesContainer.innerHTML !== bonusesHtml) {
                    bonusesContainer.innerHTML = bonusesHtml;
                }
            }

            // 更新已购卡牌
            const cardsContainer = document.getElementById(`p${index}-cards`);
            if (cardsContainer) {
                let cardsHtml = '';
                if (player.cards.length === 0) {
                    cardsHtml = '<div class="no-cards">暂无卡牌</div>';
                } else {
                    // 使用 DocumentFragment 减少 DOM 操作
                    const fragment = document.createDocumentFragment();
                    player.cards.forEach(card => {
                        const cardEl = this.createCardElement(card, `tier${card.tier}`);
                        cardEl.style.width = '70px';
                        cardEl.style.height = '100px';
                        cardEl.style.padding = '5px';
                        cardEl.style.fontSize = '0.7em';
                        fragment.appendChild(cardEl);
                    });
                    cardsContainer.innerHTML = '';
                    cardsContainer.appendChild(fragment);
                    return; // 提前结束本次循环，跳过下面的 HTML 比较
                }
                if (cardsContainer.innerHTML !== cardsHtml) {
                    cardsContainer.innerHTML = cardsHtml;
                }
            }

            // 更新预留卡牌
            const reservedContainer = document.getElementById(`p${index}-reserved`);
            if (reservedContainer) {
                if (player.reservedCards.length > 0) {
                    // 使用 DocumentFragment 减少 DOM 操作
                    const fragment = document.createDocumentFragment();
                    const reservedLabel = document.createElement('div');
                    reservedLabel.className = 'reserved-label';
                    reservedLabel.textContent = '🃏 预留卡牌：';
                    fragment.appendChild(reservedLabel);
                    
                    const reservedDiv = document.createElement('div');
                    reservedDiv.className = 'player-reserved-list';
                    
                    player.reservedCards.forEach(card => {
                        const cardEl = this.createCardElement(card, `tier${card.tier}`);
                        cardEl.style.width = '70px';
                        cardEl.style.height = '100px';
                        cardEl.style.padding = '5px';
                        cardEl.style.fontSize = '0.7em';
                        cardEl.style.borderColor = '#ffd700';
                        
                        // 添加购买按钮
                        const buyBtn = document.createElement('button');
                        buyBtn.className = 'buy-reserved-btn';
                        buyBtn.textContent = '购买';
                        buyBtn.onclick = (e) => {
                            e.stopPropagation();
                            this.buyReservedCard(card.id);
                        };
                        
                        const cardWrapper = document.createElement('div');
                        cardWrapper.style.display = 'flex';
                        cardWrapper.style.flexDirection = 'column';
                        cardWrapper.style.alignItems = 'center';
                        cardWrapper.appendChild(cardEl);
                        cardWrapper.appendChild(buyBtn);
                        reservedDiv.appendChild(cardWrapper);
                    });
                    
                    fragment.appendChild(reservedDiv);
                    reservedContainer.innerHTML = '';
                    reservedContainer.appendChild(fragment);
                } else if (reservedContainer.innerHTML !== '') {
                    reservedContainer.innerHTML = '';
                }
            }
        });

        // 更新当前玩家显示
        const currentPlayerEl = document.getElementById('current-player');
        if (currentPlayerEl) {
            const newText = `🎯 玩家 ${this.game.currentPlayer + 1} 的回合`;
            if (currentPlayerEl.innerHTML !== newText) {
                currentPlayerEl.innerHTML = newText;
            }
        }
    }

    // 选择卡牌
    selectCard(card, tier) {
        // 清除之前的选择
        document.querySelectorAll('.card').forEach(c => c.style.borderColor = 'rgba(255,255,255,0.2)');
        
        this.selectedCard = { card, tier };
        
        // 高亮选中的卡牌
        const selectedEl = document.querySelector(`[data-card-id="${card.id}"]`);
        if (selectedEl) {
            selectedEl.style.borderColor = '#ffd700';
        }
        
        const canAfford = this.game.canAffordCard(this.game.currentPlayer, card);
        const actualCost = this.game.calculateActualCost(this.game.currentPlayer, card);
        
        // 显示实际成本
        const costText = this.formatCost(actualCost);
        const message = canAfford 
            ? `✨ 已选择 ${tier} 卡牌 - 可以购买！成本：${costText}` 
            : `💰 宝石不足 - 当前无法购买（成本：${costText}）`;
        this.updateMessage(message);
        
        document.getElementById('buy-card').disabled = false;
        document.getElementById('reserve-card').disabled = false;
    }

    // 格式化成本显示
    formatCost(cost) {
        const gemNames = { white: '⚪', blue: '🔵', green: '🟢', red: '🔴', black: '⚫', gold: '🟡' };
        let text = '';
        for (const [color, amount] of Object.entries(cost)) {
            if (amount > 0) {
                text += `${gemNames[color]}${amount} `;
            }
        }
        return text.trim() || '免费';
    }

    // 绑定事件
    bindEvents() {
        // 快速入门按钮
        document.getElementById('quickstart-btn').addEventListener('click', () => {
            document.getElementById('quickstart-modal').classList.remove('hidden');
        });

        // 规则按钮
        document.getElementById('rules-btn').addEventListener('click', () => {
            document.getElementById('rules-modal').classList.remove('hidden');
        });

        // 行动面板折叠
        document.getElementById('toggle-action-panel').addEventListener('click', () => {
            const panel = document.querySelector('.action-panel');
            const btn = document.getElementById('toggle-action-panel');
            panel.classList.toggle('collapsed');
            btn.textContent = panel.classList.contains('collapsed') ? '▼ 展开' : '▲ 收起';
        });

        // 新游戏按钮
        document.getElementById('new-game-btn').addEventListener('click', () => {
            if (confirm('确定要开始新游戏吗？')) {
                location.reload();
            }
        });

        // 拿取 3 个不同宝石
        document.getElementById('take-3-different').addEventListener('click', () => {
            this.take3DifferentGems();
        });

        // 拿取 2 个相同宝石
        document.getElementById('take-2-same').addEventListener('click', () => {
            this.take2SameGems();
        });

        // 预订卡牌
        document.getElementById('reserve-card').addEventListener('click', () => {
            if (this.selectedCard) {
                this.reserveCard(this.selectedCard.card, this.selectedCard.tier);
            } else {
                this.updateMessage('⚠️ 请先选择一张卡牌');
            }
        });

        // 购买卡牌
        document.getElementById('buy-card').addEventListener('click', () => {
            if (this.selectedCard) {
                this.buyCard(this.selectedCard.card);
            } else {
                this.updateMessage('⚠️ 请先选择一张卡牌');
            }
        });

        // 宝石池点击
        document.querySelectorAll('.gem-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const color = slot.dataset.color;
                this.selectGemFromPool(color);
            });
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') document.getElementById('take-3-different').click();
            if (e.key === '2') document.getElementById('take-2-same').click();
            if (e.key === 'b' || e.key === 'B') document.getElementById('buy-card').click();
            if (e.key === 'r' || e.key === 'R') document.getElementById('reserve-card').click();
            if (e.key === '?') document.getElementById('rules-modal').classList.remove('hidden');
        });
    }

    // 从宝石池选择宝石
    selectGemFromPool(color) {
        // 检查是否是金色
        if (color === 'gold') {
            this.updateMessage('❌ 金色代币不能直接拿取，只能通过预订卡牌获得');
            return;
        }

        const count = this.game.gameBoard.gems[color];
        if (count <= 0) {
            this.updateMessage('❌ 该颜色的宝石已用完！');
            return;
        }

        // 检查是否已经有 2 个相同颜色
        const sameColorCount = this.selectedGems.filter(g => g === color).length;
        if (sameColorCount >= 2) {
            this.updateMessage('⚠️ 最多只能拿取 2 个相同颜色的宝石');
            return;
        }

        // 添加宝石拿取动画
        const gemSlot = document.querySelector(`.gem-slot[data-color="${color}"]`);
        if (gemSlot) {
            gemSlot.classList.add('picked');
            setTimeout(() => gemSlot.classList.remove('picked'), 500);
        }

        this.selectedGems.push(color);
        
        // 显示当前选择
        const gemNames = { white: '⚪白', blue: '🔵蓝', green: '🟢绿', red: '🔴红', black: '⚫黑', gold: '🟡金' };
        const selectedText = this.selectedGems.map(g => gemNames[g]).join(' + ');
        
        if (this.selectedGems.length === 3) {
            this.updateMessage(`✅ 已选择：${selectedText} - 自动确认`);
            setTimeout(() => this.confirmTakeGems(), 300);
        } else if (this.selectedGems.length === 2 && this.selectedGems[0] === this.selectedGems[1]) {
            this.updateMessage(`✅ 已选择：${selectedText} - 自动确认`);
            setTimeout(() => this.confirmTakeGems(), 300);
        } else {
            this.updateMessage(`👆 已选择：${selectedText} - 继续选择`);
        }
    }

    // 确认拿取宝石
    confirmTakeGems() {
        const gems = {};
        this.selectedGems.forEach(color => {
            gems[color] = (gems[color] || 0) + 1;
        });

        const result = this.game.takeGems(gems);
        if (result.success) {
            const gemNames = { white: '⚪', blue: '🔵', green: '🟢', red: '🔴', black: '⚫', gold: '🟡' };
            const selectedText = this.selectedGems.map(g => gemNames[g]).join('');
            this.updateMessage(`✨ 成功拿取：${selectedText}`);
            this.endTurn();
        } else {
            this.updateMessage(`❌ ${result.reason}`);
        }

        this.selectedGems = [];
        this.renderGemPool();
        this.renderPlayers();
    }

    // 拿取 3 个不同宝石
    take3DifferentGems() {
        this.updateMessage('👆 请点击选择 3 个不同颜色的宝石（不能选金色）');
        this.selectedGems = [];
    }

    // 拿取 2 个相同宝石
    take2SameGems() {
        this.updateMessage('👆 请点击选择 1 种颜色的宝石（该颜色需≥4 个）');
        this.selectedGems = [];
    }

    // 预订卡牌
    reserveCard(card, tier) {
        const result = this.game.reserveCard(this.game.currentPlayer, card, tier);
        if (result.success) {
            const goldMsg = this.game.bank.gold < 5 ? '(获得 1🟡)' : '(无金色代币了)';
            this.updateMessage(`🃏 玩家 ${this.game.currentPlayer + 1} 预订了卡牌 ${goldMsg}`);
            this.endTurn();
        } else {
            this.updateMessage(`❌ ${result.reason}`);
        }
        this.renderCards();
        this.renderPlayers();
    }

    // 购买卡牌
    buyCard(card) {
        const result = this.game.buyCard(this.game.currentPlayer, card);
        if (result.success) {
            // 添加卡牌购买动画
            const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
            if (cardElement) {
                cardElement.classList.add('purchased');
                setTimeout(() => cardElement.classList.remove('purchased'), 800);
            }
            
            this.updateMessage(`🎉 玩家 ${this.game.currentPlayer + 1} 购买了卡牌！获得 ${card.points}分`);
            this.checkWinner();
            this.endTurn();
        } else {
            this.updateMessage(`❌ ${result.reason}`);
        }
        this.renderCards();
        this.renderPlayers();
    }

    // 购买预留卡牌
    buyReservedCard(cardId) {
        const result = this.game.buyReservedCard(this.game.currentPlayer, cardId);
        if (result.success) {
            // 添加预留卡牌购买动画
            const playerIndex = this.game.currentPlayer;
            const reservedContainer = document.getElementById(`p${playerIndex}-reserved`);
            if (reservedContainer) {
                const cardElements = reservedContainer.querySelectorAll('.card');
                cardElements.forEach(cardEl => {
                    if (cardEl.dataset.cardId === cardId) {
                        cardEl.classList.add('purchased');
                        setTimeout(() => cardEl.classList.remove('purchased'), 800);
                    }
                });
            }
            
            this.updateMessage(`🎉 玩家 ${this.game.currentPlayer + 1} 购买了预留卡牌！`);
            this.checkWinner();
            this.endTurn();
        } else {
            this.updateMessage(`❌ ${result.reason}`);
        }
        this.renderPlayers();
    }

    // 结束回合
    endTurn() {
        // 检查游戏是否已结束
        if (this.game.winnerDetermined) {
            this.showGameOver();
            return;
        }

        this.game.nextPlayer();
        this.selectedCard = null;
        document.getElementById('buy-card').disabled = true;
        document.getElementById('reserve-card').disabled = true;
        
        // 清除卡牌高亮
        document.querySelectorAll('.card').forEach(c => c.style.borderColor = 'rgba(255,255,255,0.2)');
        
        // 在多人游戏模式下发送回合结束消息
        if (this.isMultiplayer && window.multiplayer) {
            window.multiplayer.send({ 
                type: 'game_action', 
                action: 'end_turn',
                gameState: this.game.getGameState()
            });
        }
        
        setTimeout(() => {
            this.renderPlayers();
            this.updateMessage(`🎯 玩家 ${this.game.currentPlayer + 1} 的回合 - 请选择行动`);
        }, 500);
    }

    // 检查获胜者
    checkWinner() {
        const winner = this.game.checkWinner();
        if (winner !== null) {
            setTimeout(() => this.showGameOver(), 1000);
        }
    }

    // 显示游戏结束
    showGameOver() {
        const modal = document.getElementById('game-over-modal');
        const text = document.getElementById('winner-text');
        const scoresDiv = document.getElementById('final-scores');
        
        text.innerHTML = `🏆 玩家 ${this.game.winner + 1} 获胜！`;
        
        // 显示最终分数
        let scoresHtml = '<div class="final-scores">';
        this.game.players.forEach((player, index) => {
            const isWinner = index === this.game.winner;
            scoresHtml += `
                <div class="final-score-item ${isWinner ? 'winner' : ''}">
                    <strong>玩家 ${index + 1}</strong>: 
                    ${player.points}分 
                    (${player.cards.length}张卡牌，${player.nobles.length}个贵族)
                    ${isWinner ? '🏆' : ''}
                </div>
            `;
        });
        scoresHtml += '</div>';
        scoresDiv.innerHTML = scoresHtml;
        
        modal.classList.remove('hidden');
        
        // 庆祝动画
        this.confetti();
    }

    // 游戏结束庆祝动画
    confetti() {
        // 减少动画数量以提高性能
        const colors = ['#ffd700', '#ff6b6b', '#4fc3f7', '#81c784', '#ce93d8'];
        
        // 限制彩带数量，使用 requestAnimationFrame 优化性能
        const confettiCount = 50; // 减少到 50 个
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    const confetti = document.createElement('div');
                    confetti.style.cssText = `
                        position: fixed;
                        width: ${Math.random() * 8 + 4}px;
                        height: ${Math.random() * 8 + 4}px;
                        background: ${colors[Math.floor(Math.random() * colors.length)]};
                        left: ${Math.random() * 100}vw;
                        top: -10px;
                        z-index: 9999;
                        animation: confettiFall ${2 + Math.random() * 2}s linear;
                        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                        pointer-events: none;
                    `;
                    document.body.appendChild(confetti);
                    setTimeout(() => confetti.remove(), 4000);
                });
            }, i * 40); // 增加间隔时间
        }
        
        // 限制烟花数量
        const fireworkCount = 5; // 减少到 5 个
        for (let i = 0; i < fireworkCount; i++) {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    const firework = document.createElement('div');
                    firework.style.cssText = `
                        position: fixed;
                        width: ${Math.random() * 15 + 8}px;
                        height: ${Math.random() * 15 + 8}px;
                        background: ${colors[Math.floor(Math.random() * colors.length)]};
                        left: ${Math.random() * 100}vw;
                        top: ${Math.random() * 50}vh;
                        z-index: 9999;
                        animation: firework 1s ease-out;
                        border-radius: 50%;
                        pointer-events: none;
                    `;
                    document.body.appendChild(firework);
                    setTimeout(() => firework.remove(), 1000);
                });
            }, i * 600); // 增加间隔时间
        }
        
        // 胜利闪烁效果
        const winnerModal = document.getElementById('game-over-modal');
        if (winnerModal) {
            winnerModal.style.animation = 'pulse 1s ease-in-out infinite';
        }
    }

    // 更新消息
    updateMessage(msg) {
        const area = document.getElementById('message-area');
        if (area && area.textContent !== msg) {
            area.classList.add('updating');
            area.textContent = msg;
            // 使用 requestAnimationFrame 优化动画
            requestAnimationFrame(() => {
                setTimeout(() => area.classList.remove('updating'), 300);
            });
        }
    }
    
    // 渲染整个游戏
    renderGame() {
        this.renderGemPool();
        this.renderNobles();
        this.renderCards();
        this.renderPlayers();
    }
}

// 启动游戏
let gameUI;
let selectedPlayers = 2;

document.addEventListener('DOMContentLoaded', () => {
    // 显示设置弹窗
    showSetupModal();
    
    // 添加 CSS 动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.02); }
        }
        .final-scores {
            margin: 20px 0;
            text-align: left;
        }
        .final-score-item {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            background: rgba(255,255,255,0.1);
        }
        .final-score-item.winner {
            background: rgba(255,215,0,0.3);
            border: 2px solid #ffd700;
        }
        .buy-reserved-btn {
            margin-top: 5px;
            padding: 3px 8px;
            font-size: 0.7em;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        .buy-reserved-btn:hover {
            background: #45a049;
        }
        .reserved-label, .bonus-label {
            margin: 10px 0 5px 0;
            font-weight: bold;
            color: #ffd700;
        }
        .player-bonuses-list, .player-reserved-list {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .bonus-item {
            display: flex;
            align-items: center;
            gap: 3px;
            background: rgba(0,0,0,0.3);
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 0.9em;
        }
        .no-cards {
            color: #999;
            font-style: italic;
            padding: 10px;
        }
        .setup-section {
            margin: 30px 0;
            text-align: center;
        }
        .setup-section label {
            display: block;
            font-size: 1.3em;
            margin-bottom: 20px;
            color: #ffd700;
        }
        .player-select {
            display: flex;
            gap: 20px;
            justify-content: center;
        }
        .player-btn {
            padding: 15px 30px;
            font-size: 1.3em;
            background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,215,0,0.3);
            color: #fff;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .player-btn:hover, .player-btn.selected {
            background: rgba(255,215,0,0.2);
            border-color: #ffd700;
            transform: scale(1.05);
        }
        .setup-info {
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
            text-align: left;
        }
        .setup-info ul {
            margin-top: 10px;
            padding-left: 20px;
        }
        .setup-info li {
            margin: 8px 0;
            color: #e0e0e0;
        }
    `;
    document.head.appendChild(style);
});

// 显示设置弹窗
function showSetupModal() {
    const modal = document.getElementById('setup-modal');
    modal.classList.remove('hidden');
    
    // 玩家选择按钮事件
    document.querySelectorAll('.player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedPlayers = parseInt(btn.dataset.players);
            updateSetupInfo();
        });
    });
    
    // 默认选中 2 人
    document.querySelector('[data-players="2"]').classList.add('selected');
    updateSetupInfo();
}

// 更新设置信息
function updateSetupInfo() {
    const info = document.getElementById('setup-info');
    const configs = {
        2: { gems: 4, cards: 4, nobles: 3 },
        3: { gems: 5, cards: 5, nobles: 4 },
        4: { gems: 5, cards: 6, nobles: 4 }
    };
    const config = configs[selectedPlayers];
    info.innerHTML = `
        <p>📊 ${selectedPlayers}人游戏配置：</p>
        <ul>
            <li>每种宝石：${config.gems}个</li>
            <li>每层卡牌：${config.cards}张</li>
            <li>贵族卡：${config.nobles}张</li>
        </ul>
        <button class="btn" onclick="startGame(${selectedPlayers})" style="margin-top:20px;width:100%;">开始游戏</button>
    `;
}

// 开始游戏
function startGame(playerCount, isMultiplayer = false, playerId = null) {
    document.getElementById('setup-modal').classList.add('hidden');
    gameUI = new SplendorUI(playerCount, isMultiplayer, playerId);
}
