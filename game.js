// Splendor Game UI Controller

class SplendorUI {
    constructor() {
        this.game = new SplendorGame(2);
        this.selectedGems = [];
        this.selectedCard = null;
        this.init();
    }

    init() {
        this.renderGemPool();
        this.renderNobles();
        this.renderCards();
        this.renderPlayers();
        this.bindEvents();
        this.updateMessage('游戏开始！玩家 1 的回合');
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
        container.innerHTML = '';
        this.game.gameBoard.nobles.forEach(noble => {
            const card = this.createCardElement(noble, 'noble');
            container.appendChild(card);
        });
    }

    // 渲染卡牌
    renderCards() {
        ['tier1', 'tier2', 'tier3'].forEach(tier => {
            const container = document.getElementById(`${tier}-container`);
            container.innerHTML = '';
            this.game.gameBoard[tier].forEach(card => {
                const cardEl = this.createCardElement(card, tier);
                container.appendChild(cardEl);
            });
        });
    }

    // 创建卡牌元素
    createCardElement(card, tier) {
        const el = document.createElement('div');
        el.className = `card ${tier}`;
        el.dataset.cardId = card.id;

        let costHtml = '';
        for (const [color, amount] of Object.entries(card.cost)) {
            if (amount > 0) {
                costHtml += `<span class="cost-gem gem-${color}"></span>`;
            }
        }

        el.innerHTML = `
            <div class="card-cost">${costHtml}</div>
            <div class="card-points">${card.points > 0 ? '⭐' + card.points : ''}</div>
            <div class="card-bonus">
                ${card.color ? `<span class="bonus-gem gem-${card.color}"></span>` : ''}
            </div>
        `;

        if (tier !== 'noble') {
            el.addEventListener('click', () => this.selectCard(card, tier));
        }

        return el;
    }

    // 渲染玩家区域
    renderPlayers() {
        this.game.players.forEach((player, index) => {
            const section = document.getElementById(`player-${index}`);
            if (section) {
                section.classList.toggle('active', index === this.game.currentPlayer);
            }

            // 更新得分
            const pointsEl = document.getElementById(`p${index}-points`);
            if (pointsEl) pointsEl.textContent = player.points;

            // 更新宝石
            const gemsContainer = document.getElementById(`p${index}-gems`);
            if (gemsContainer) {
                gemsContainer.innerHTML = '';
                for (const [color, count] of Object.entries(player.gems)) {
                    if (count > 0) {
                        gemsContainer.innerHTML += `
                            <div class="player-gem">
                                <span class="gem gem-${color}" style="width:25px;height:25px;"></span>
                                <span>${count}</span>
                            </div>
                        `;
                    }
                }
            }

            // 更新卡牌
            const cardsContainer = document.getElementById(`p${index}-cards`);
            if (cardsContainer) {
                cardsContainer.innerHTML = '';
                player.cards.forEach(card => {
                    const cardEl = this.createCardElement(card, 'tier' + (card.id.startsWith('t1') ? '1' : card.id.startsWith('t2') ? '2' : '3'));
                    cardEl.style.width = '80px';
                    cardEl.style.height = '110px';
                    cardsContainer.appendChild(cardEl);
                });
            }
        });

        // 更新当前玩家显示
        const currentPlayerEl = document.getElementById('current-player');
        if (currentPlayerEl) {
            currentPlayerEl.textContent = `当前玩家：玩家 ${this.game.currentPlayer + 1}`;
        }
    }

    // 选择卡牌
    selectCard(card, tier) {
        this.selectedCard = { card, tier };
        this.updateMessage(`选择了 ${tier} 卡牌，可以选择购买`);
        document.getElementById('buy-card').disabled = false;
        document.getElementById('reserve-card').disabled = false;
    }

    // 绑定事件
    bindEvents() {
        // 新游戏
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
            }
        });

        // 购买卡牌
        document.getElementById('buy-card').addEventListener('click', () => {
            if (this.selectedCard) {
                this.buyCard(this.selectedCard.card);
            }
        });

        // 宝石池点击
        document.querySelectorAll('.gem-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const color = slot.dataset.color;
                this.selectGemFromPool(color);
            });
        });
    }

    // 从宝石池选择宝石
    selectGemFromPool(color) {
        const count = this.game.gameBoard.gems[color];
        if (count <= 0) {
            this.updateMessage('该颜色的宝石已用完！');
            return;
        }

        if (this.selectedGems.includes(color) && this.selectedGems.length >= 2) {
            this.updateMessage('最多只能拿取 2 个相同颜色的宝石');
            return;
        }

        this.selectedGems.push(color);
        this.updateMessage(`已选择：${this.selectedGems.join(', ')} - 点击"确认拿取"或继续选择`);

        if (this.selectedGems.length === 3 || 
            (this.selectedGems.length === 2 && this.selectedGems[0] === this.selectedGems[1])) {
            this.confirmTakeGems();
        }
    }

    // 确认拿取宝石
    confirmTakeGems() {
        const gems = {};
        this.selectedGems.forEach(color => {
            gems[color] = (gems[color] || 0) + 1;
        });

        const success = this.game.takeGems(gems);
        if (success) {
            this.updateMessage(`拿取了 ${this.selectedGems.join(', ')} 宝石`);
            this.endTurn();
        } else {
            this.updateMessage('无法拿取这些宝石，请重新选择');
        }

        this.selectedGems = [];
        this.renderGemPool();
        this.renderPlayers();
    }

    // 拿取 3 个不同宝石
    take3DifferentGems() {
        this.updateMessage('请点击选择 3 个不同颜色的宝石');
        this.selectedGems = [];
    }

    // 拿取 2 个相同宝石
    take2SameGems() {
        this.updateMessage('请点击选择 1 种颜色的宝石（拿取 2 个）');
        this.selectedGems = [];
    }

    // 预订卡牌
    reserveCard(card, tier) {
        const success = this.game.reserveCard(this.game.currentPlayer, card, tier);
        if (success) {
            this.updateMessage(`玩家 ${this.game.currentPlayer + 1} 预订了卡牌`);
            this.endTurn();
        } else {
            this.updateMessage('无法预订这张卡牌');
        }
        this.renderCards();
        this.renderPlayers();
    }

    // 购买卡牌
    buyCard(card) {
        const success = this.game.buyCard(this.game.currentPlayer, card);
        if (success) {
            this.updateMessage(`玩家 ${this.game.currentPlayer + 1} 购买了卡牌！获得 ${card.points} 分`);
            this.checkWinner();
            this.endTurn();
        } else {
            this.updateMessage('宝石不足，无法购买这张卡牌');
        }
        this.renderCards();
        this.renderPlayers();
    }

    // 结束回合
    endTurn() {
        this.game.nextTurn();
        this.selectedCard = null;
        document.getElementById('buy-card').disabled = true;
        document.getElementById('reserve-card').disabled = true;
        setTimeout(() => this.renderPlayers(), 500);
    }

    // 检查获胜者
    checkWinner() {
        const winner = this.game.checkWinner();
        if (winner !== null) {
            this.showGameOver(winner);
        }
    }

    // 显示游戏结束
    showGameOver(winnerIndex) {
        const modal = document.getElementById('game-over-modal');
        const text = document.getElementById('winner-text');
        text.textContent = `玩家 ${winnerIndex + 1} 获胜！`;
        modal.classList.remove('hidden');
    }

    // 更新消息
    updateMessage(msg) {
        const area = document.getElementById('message-area');
        area.textContent = msg;
    }
}

// 启动游戏
let gameUI;
document.addEventListener('DOMContentLoaded', () => {
    gameUI = new SplendorUI();
});
