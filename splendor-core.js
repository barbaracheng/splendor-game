// splendor-core.js - Splendor 游戏核心逻辑（原版规则）

class SplendorGame {
  constructor(playerCount = 2) {
    // 验证玩家人数
    if (playerCount < 2 || playerCount > 4) {
      throw new Error('Splendor 支持 2-4 名玩家');
    }
    
    this.playerCount = playerCount;
    
    // 初始化玩家
    this.players = Array.from({length: playerCount}, (_, i) => ({
      id: i,
      gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
      cards: [],
      nobles: [],
      reservedCards: [],
      points: 0,
      // 计算卡牌提供的折扣
      bonuses: { white: 0, blue: 0, green: 0, red: 0, black: 0 }
    }));
    
    this.currentPlayer = 0;
    this.gameOver = false;
    this.winner = null;
    this.finalRoundPlayer = null; // 触发结束的玩家
    
    // 根据玩家人数设置宝石数量
    this.setupGems();
    
    // 初始化卡牌和贵族
    this.decks = this.initializeDecks();
    this.nobleDeck = this.initializeNobles();
    
    // 桌面上展示的卡牌
    this.tier1Cards = [];
    this.tier2Cards = [];
    this.tier3Cards = [];
    
    this.setupBoard();
  }

  // 根据玩家人数设置宝石数量
  setupGems() {
    const gemConfig = {
      2: { count: 4, cards: 4, nobles: 3 },
      3: { count: 5, cards: 5, nobles: 4 },
      4: { count: 5, cards: 6, nobles: 4 }
    };
    
    const config = gemConfig[this.playerCount] || gemConfig[4];
    
    // 每种普通宝石数量
    this.gemCount = config.count;
    // 每层翻开卡牌数
    this.cardsPerTier = config.cards;
    // 贵族卡数量
    this.nobleCount = config.nobles;
    // 金色代币固定 5 个
    this.goldCount = 5;
    
    // 初始化宝石池
    this.bank = {
      white: this.gemCount,
      blue: this.gemCount,
      green: this.gemCount,
      red: this.gemCount,
      black: this.gemCount,
      gold: this.goldCount
    };
  }

  initializeDecks() {
    // 完整的 Splendor 卡牌组（简化版，每层 10 张示例）
    const cards = [
      // Tier 1 Cards (0-1 分) - 成本较低
      { id: 't1-1', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 3, black: 0 }, points: 0, color: 'red' },
      { id: 't1-2', tier: 1, cost: { white: 0, blue: 0, green: 3, red: 0, black: 0 }, points: 0, color: 'green' },
      { id: 't1-3', tier: 1, cost: { white: 0, blue: 3, green: 0, red: 0, black: 0 }, points: 0, color: 'blue' },
      { id: 't1-4', tier: 1, cost: { white: 3, blue: 0, green: 0, red: 0, black: 0 }, points: 0, color: 'white' },
      { id: 't1-5', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 0, black: 3 }, points: 0, color: 'black' },
      { id: 't1-6', tier: 1, cost: { white: 2, blue: 0, green: 0, red: 0, black: 0 }, points: 0, color: 'white' },
      { id: 't1-7', tier: 1, cost: { white: 0, blue: 2, green: 0, red: 0, black: 0 }, points: 0, color: 'blue' },
      { id: 't1-8', tier: 1, cost: { white: 0, blue: 0, green: 2, red: 0, black: 0 }, points: 0, color: 'green' },
      { id: 't1-9', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 2, black: 0 }, points: 0, color: 'red' },
      { id: 't1-10', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 0, black: 2 }, points: 0, color: 'black' },
      { id: 't1-11', tier: 1, cost: { white: 1, blue: 1, green: 0, red: 0, black: 0 }, points: 0, color: 'white' },
      { id: 't1-12', tier: 1, cost: { white: 0, blue: 1, green: 1, red: 0, black: 0 }, points: 0, color: 'blue' },
      { id: 't1-13', tier: 1, cost: { white: 0, blue: 0, green: 1, red: 1, black: 0 }, points: 0, color: 'green' },
      { id: 't1-14', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 1, black: 1 }, points: 0, color: 'red' },
      { id: 't1-15', tier: 1, cost: { white: 1, blue: 0, green: 0, red: 0, black: 1 }, points: 0, color: 'black' },
      { id: 't1-16', tier: 1, cost: { white: 1, blue: 1, green: 1, red: 0, black: 0 }, points: 0, color: 'white' },
      { id: 't1-17', tier: 1, cost: { white: 0, blue: 1, green: 1, red: 1, black: 0 }, points: 0, color: 'blue' },
      { id: 't1-18', tier: 1, cost: { white: 0, blue: 0, green: 1, red: 1, black: 1 }, points: 0, color: 'green' },
      { id: 't1-19', tier: 1, cost: { white: 1, blue: 0, green: 0, red: 1, black: 1 }, points: 0, color: 'red' },
      { id: 't1-20', tier: 1, cost: { white: 1, blue: 1, green: 0, red: 0, black: 1 }, points: 0, color: 'black' },
      { id: 't1-21', tier: 1, cost: { white: 3, blue: 1, green: 0, red: 0, black: 0 }, points: 1, color: 'white' },
      { id: 't1-22', tier: 1, cost: { white: 0, blue: 3, green: 1, red: 0, black: 0 }, points: 1, color: 'blue' },
      { id: 't1-23', tier: 1, cost: { white: 0, blue: 0, green: 3, red: 1, black: 0 }, points: 1, color: 'green' },
      { id: 't1-24', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 3, black: 1 }, points: 1, color: 'red' },
      { id: 't1-25', tier: 1, cost: { white: 1, blue: 0, green: 0, red: 0, black: 3 }, points: 1, color: 'black' },
      { id: 't1-26', tier: 1, cost: { white: 2, blue: 2, green: 0, red: 0, black: 0 }, points: 1, color: 'white' },
      { id: 't1-27', tier: 1, cost: { white: 0, blue: 2, green: 2, red: 0, black: 0 }, points: 1, color: 'blue' },
      { id: 't1-28', tier: 1, cost: { white: 0, blue: 0, green: 2, red: 2, black: 0 }, points: 1, color: 'green' },
      { id: 't1-29', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 2, black: 2 }, points: 1, color: 'red' },
      { id: 't1-30', tier: 1, cost: { white: 2, blue: 0, green: 0, red: 0, black: 2 }, points: 1, color: 'black' },
      
      // Tier 2 Cards (2-3 分) - 中等成本
      { id: 't2-1', tier: 2, cost: { white: 2, blue: 2, green: 0, red: 0, black: 0 }, points: 2, color: 'white' },
      { id: 't2-2', tier: 2, cost: { white: 0, blue: 2, green: 2, red: 0, black: 0 }, points: 2, color: 'blue' },
      { id: 't2-3', tier: 2, cost: { white: 0, blue: 0, green: 2, red: 2, black: 0 }, points: 2, color: 'green' },
      { id: 't2-4', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 2, black: 2 }, points: 2, color: 'red' },
      { id: 't2-5', tier: 2, cost: { white: 2, blue: 0, green: 0, red: 0, black: 2 }, points: 2, color: 'black' },
      { id: 't2-6', tier: 2, cost: { white: 3, blue: 0, green: 0, red: 0, black: 0 }, points: 2, color: 'white' },
      { id: 't2-7', tier: 2, cost: { white: 0, blue: 3, green: 0, red: 0, black: 0 }, points: 2, color: 'blue' },
      { id: 't2-8', tier: 2, cost: { white: 0, blue: 0, green: 3, red: 0, black: 0 }, points: 2, color: 'green' },
      { id: 't2-9', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 3, black: 0 }, points: 2, color: 'red' },
      { id: 't2-10', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 0, black: 3 }, points: 2, color: 'black' },
      { id: 't2-11', tier: 2, cost: { white: 4, blue: 0, green: 0, red: 0, black: 0 }, points: 3, color: 'white' },
      { id: 't2-12', tier: 2, cost: { white: 0, blue: 4, green: 0, red: 0, black: 0 }, points: 3, color: 'blue' },
      { id: 't2-13', tier: 2, cost: { white: 0, blue: 0, green: 4, red: 0, black: 0 }, points: 3, color: 'green' },
      { id: 't2-14', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 4, black: 0 }, points: 3, color: 'red' },
      { id: 't2-15', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 0, black: 4 }, points: 3, color: 'black' },
      { id: 't2-16', tier: 2, cost: { white: 3, blue: 2, green: 0, red: 0, black: 0 }, points: 3, color: 'white' },
      { id: 't2-17', tier: 2, cost: { white: 0, blue: 3, green: 2, red: 0, black: 0 }, points: 3, color: 'blue' },
      { id: 't2-18', tier: 2, cost: { white: 0, blue: 0, green: 3, red: 2, black: 0 }, points: 3, color: 'green' },
      { id: 't2-19', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 3, black: 2 }, points: 3, color: 'red' },
      { id: 't2-20', tier: 2, cost: { white: 2, blue: 0, green: 0, red: 0, black: 3 }, points: 3, color: 'black' },
      { id: 't2-21', tier: 2, cost: { white: 3, blue: 2, green: 1, red: 0, black: 0 }, points: 3, color: 'white' },
      { id: 't2-22', tier: 2, cost: { white: 0, blue: 3, green: 2, red: 1, black: 0 }, points: 3, color: 'blue' },
      { id: 't2-23', tier: 2, cost: { white: 0, blue: 0, green: 3, red: 2, black: 1 }, points: 3, color: 'green' },
      { id: 't2-24', tier: 2, cost: { white: 1, blue: 0, green: 0, red: 3, black: 2 }, points: 3, color: 'red' },
      { id: 't2-25', tier: 2, cost: { white: 2, blue: 1, green: 0, red: 0, black: 3 }, points: 3, color: 'black' },
      { id: 't2-26', tier: 2, cost: { white: 3, blue: 2, green: 2, red: 0, black: 0 }, points: 3, color: 'white' },
      { id: 't2-27', tier: 2, cost: { white: 0, blue: 3, green: 2, red: 2, black: 0 }, points: 3, color: 'blue' },
      { id: 't2-28', tier: 2, cost: { white: 0, blue: 0, green: 3, red: 2, black: 2 }, points: 3, color: 'green' },
      { id: 't2-29', tier: 2, cost: { white: 2, blue: 0, green: 0, red: 3, black: 2 }, points: 3, color: 'red' },
      { id: 't2-30', tier: 2, cost: { white: 2, blue: 2, green: 0, red: 0, black: 3 }, points: 3, color: 'black' },
      
      // Tier 3 Cards (4-5 分) - 高成本
      { id: 't3-1', tier: 3, cost: { white: 5, blue: 0, green: 0, red: 0, black: 0 }, points: 4, color: 'white' },
      { id: 't3-2', tier: 3, cost: { white: 0, blue: 5, green: 0, red: 0, black: 0 }, points: 4, color: 'blue' },
      { id: 't3-3', tier: 3, cost: { white: 0, blue: 0, green: 5, red: 0, black: 0 }, points: 4, color: 'green' },
      { id: 't3-4', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 5, black: 0 }, points: 4, color: 'red' },
      { id: 't3-5', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 5 }, points: 4, color: 'black' },
      { id: 't3-6', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'white' },
      { id: 't3-7', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'blue' },
      { id: 't3-8', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'green' },
      { id: 't3-9', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'red' },
      { id: 't3-10', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'black' },
      { id: 't3-11', tier: 3, cost: { white: 4, blue: 0, green: 0, red: 0, black: 0 }, points: 4, color: 'white' },
      { id: 't3-12', tier: 3, cost: { white: 0, blue: 4, green: 0, red: 0, black: 0 }, points: 4, color: 'blue' },
      { id: 't3-13', tier: 3, cost: { white: 0, blue: 0, green: 4, red: 0, black: 0 }, points: 4, color: 'green' },
      { id: 't3-14', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 4, black: 0 }, points: 4, color: 'red' },
      { id: 't3-15', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 4 }, points: 4, color: 'black' },
      { id: 't3-16', tier: 3, cost: { white: 3, blue: 2, green: 2, red: 0, black: 0 }, points: 4, color: 'white' },
      { id: 't3-17', tier: 3, cost: { white: 0, blue: 3, green: 2, red: 2, black: 0 }, points: 4, color: 'blue' },
      { id: 't3-18', tier: 3, cost: { white: 0, blue: 0, green: 3, red: 2, black: 2 }, points: 4, color: 'green' },
      { id: 't3-19', tier: 3, cost: { white: 2, blue: 0, green: 0, red: 3, black: 2 }, points: 4, color: 'red' },
      { id: 't3-20', tier: 3, cost: { white: 2, blue: 2, green: 0, red: 0, black: 3 }, points: 4, color: 'black' },
      { id: 't3-21', tier: 3, cost: { white: 5, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'white' },
      { id: 't3-22', tier: 3, cost: { white: 0, blue: 5, green: 0, red: 0, black: 0 }, points: 5, color: 'blue' },
      { id: 't3-23', tier: 3, cost: { white: 0, blue: 0, green: 5, red: 0, black: 0 }, points: 5, color: 'green' },
      { id: 't3-24', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 5, black: 0 }, points: 5, color: 'red' },
      { id: 't3-25', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 5 }, points: 5, color: 'black' },
      { id: 't3-26', tier: 3, cost: { white: 3, blue: 3, green: 0, red: 0, black: 0 }, points: 4, color: 'white' },
      { id: 't3-27', tier: 3, cost: { white: 0, blue: 3, green: 3, red: 0, black: 0 }, points: 4, color: 'blue' },
      { id: 't3-28', tier: 3, cost: { white: 0, blue: 0, green: 3, red: 3, black: 0 }, points: 4, color: 'green' },
      { id: 't3-29', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 3, black: 3 }, points: 4, color: 'red' },
      { id: 't3-30', tier: 3, cost: { white: 3, blue: 0, green: 0, red: 0, black: 3 }, points: 4, color: 'black' },
      { id: 't3-31', tier: 3, cost: { white: 6, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'white' },
      { id: 't3-32', tier: 3, cost: { white: 0, blue: 6, green: 0, red: 0, black: 0 }, points: 5, color: 'blue' },
      { id: 't3-33', tier: 3, cost: { white: 0, blue: 0, green: 6, red: 0, black: 0 }, points: 5, color: 'green' },
      { id: 't3-34', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 6, black: 0 }, points: 5, color: 'red' },
      { id: 't3-35', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 6 }, points: 5, color: 'black' },
      { id: 't3-36', tier: 3, cost: { white: 4, blue: 2, green: 0, red: 0, black: 0 }, points: 4, color: 'white' },
      { id: 't3-37', tier: 3, cost: { white: 0, blue: 4, green: 2, red: 0, black: 0 }, points: 4, color: 'blue' },
      { id: 't3-38', tier: 3, cost: { white: 0, blue: 0, green: 4, red: 2, black: 0 }, points: 4, color: 'green' },
      { id: 't3-39', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 4, black: 2 }, points: 4, color: 'red' },
      { id: 't3-40', tier: 3, cost: { white: 2, blue: 0, green: 0, red: 0, black: 4 }, points: 4, color: 'black' }
    ];

    const tier1 = cards.filter(c => c.tier === 1);
    const tier2 = cards.filter(c => c.tier === 2);
    const tier3 = cards.filter(c => c.tier === 3);

    this.shuffleArray(tier1);
    this.shuffleArray(tier2);
    this.shuffleArray(tier3);

    return { tier1, tier2, tier3 };
  }

  initializeNobles() {
    const nobles = [
      { id: 'n1', requirements: { white: 3, blue: 0, green: 3, red: 0, black: 3 }, points: 3 },
      { id: 'n2', requirements: { white: 0, blue: 3, green: 3, red: 3, black: 0 }, points: 3 },
      { id: 'n3', requirements: { white: 3, blue: 3, green: 0, red: 0, black: 3 }, points: 3 },
      { id: 'n4', requirements: { white: 0, blue: 0, green: 3, red: 3, black: 3 }, points: 3 },
      { id: 'n5', requirements: { white: 3, blue: 3, green: 3, red: 0, black: 0 }, points: 3 },
      { id: 'n6', requirements: { white: 4, blue: 0, green: 0, red: 4, black: 0 }, points: 3 },
      { id: 'n7', requirements: { white: 0, blue: 4, green: 0, red: 0, black: 4 }, points: 3 },
      { id: 'n8', requirements: { white: 0, blue: 0, green: 4, red: 0, black: 4 }, points: 3 },
      { id: 'n9', requirements: { white: 4, blue: 4, green: 0, red: 0, black: 0 }, points: 3 },
      { id: 'n10', requirements: { white: 0, blue: 0, green: 0, red: 4, black: 4 }, points: 3 }
    ];
    
    this.shuffleArray(nobles);
    return nobles.slice(0, this.nobleCount);
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  setupBoard() {
    // 根据玩家人数发放每层卡牌
    for (let i = 0; i < this.cardsPerTier; i++) {
      if (this.decks.tier1.length > 0) this.tier1Cards.push(this.decks.tier1.pop());
      if (this.decks.tier2.length > 0) this.tier2Cards.push(this.decks.tier2.pop());
      if (this.decks.tier3.length > 0) this.tier3Cards.push(this.decks.tier3.pop());
    }
  }

  // 更新玩家卡牌折扣
  updateBonuses(playerIndex) {
    const player = this.players[playerIndex];
    // 重置折扣
    player.bonuses = { white: 0, blue: 0, green: 0, red: 0, black: 0 };
    // 计算已购卡牌提供的折扣
    player.cards.forEach(card => {
      if (card.color) {
        player.bonuses[card.color]++;
      }
    });
    // 更新玩家分数（只算卡牌分数）
    player.points = player.cards.reduce((sum, card) => sum + card.points, 0);
    player.points += player.nobles.reduce((sum, noble) => sum + noble.points, 0);
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayer];
  }

  getOtherPlayers() {
    return this.players.filter((_, index) => index !== this.currentPlayer);
  }

  // 计算实际购买成本（使用折扣后）
  calculateActualCost(playerIndex, card) {
    const player = this.players[playerIndex];
    let actualCost = {...card.cost};
    
    // 使用已购卡牌的折扣
    player.cards.forEach(ownedCard => {
      if (ownedCard.color && actualCost[ownedCard.color] > 0) {
        actualCost[ownedCard.color]--;
      }
    });
    
    // 确保成本不会低于 0
    Object.keys(actualCost).forEach(color => {
      actualCost[color] = Math.max(0, actualCost[color]);
    });

    return actualCost;
  }

  // 检查是否可以购买卡牌
  canAffordCard(playerIndex, card) {
    const player = this.players[playerIndex];
    const actualCost = this.calculateActualCost(playerIndex, card);
    
    // 计算需要支付的宝石总数
    let totalNeeded = 0;
    Object.values(actualCost).forEach(cost => {
      totalNeeded += cost;
    });
    
    if (totalNeeded === 0) return true; // 免费卡牌
    
    // 计算玩家可用的宝石（包括金色）
    let availableNonGold = 0;
    const colors = ['white', 'blue', 'green', 'red', 'black'];
    colors.forEach(color => {
      availableNonGold += player.gems[color];
    });
    
    const availableGold = player.gems.gold;
    const totalAvailable = availableNonGold + availableGold;
    
    // 首先检查总数是否足够
    if (totalAvailable < totalNeeded) {
      return false;
    }
    
    // 检查是否能实际支付（考虑金色只能作为万能）
    // 计算非金色宝石能支付多少
    let nonGoldPayment = 0;
    colors.forEach(color => {
      nonGoldPayment += Math.min(player.gems[color], actualCost[color]);
    });
    
    // 剩余需要用金色支付的部分
    const remainingNeeded = totalNeeded - nonGoldPayment;
    
    // 检查金色是否足够支付剩余部分
    if (remainingNeeded > availableGold) {
      return false;
    }
    
    return true;
  }

  // 购买卡牌
  buyCard(playerIndex, card) {
    const player = this.players[playerIndex];
    
    if (!this.canAffordCard(playerIndex, card)) {
      return { success: false, reason: '宝石不足' };
    }

    const actualCost = this.calculateActualCost(playerIndex, card);
    
    // 支付费用（优先使用非金色宝石）
    const payment = this.calculatePayment(player, actualCost);
    if (!payment.success) {
      return { success: false, reason: '无法支付' };
    }
    
    // 扣除宝石
    Object.keys(payment.gems).forEach(color => {
      player.gems[color] -= payment.gems[color];
      this.bank[color] += payment.gems[color];
    });

    // 添加卡牌到玩家收藏
    player.cards.push(card);
    this.updateBonuses(playerIndex);

    // 从桌面移除卡牌并补充
    const tierNum = card.tier;
    const index = this[`tier${tierNum}Cards`].findIndex(c => c.id === card.id);
    if (index !== -1) {
      this[`tier${tierNum}Cards`].splice(index, 1);
      if (this.decks[`tier${tierNum}`].length > 0) {
        this[`tier${tierNum}Cards`].push(this.decks[`tier${tierNum}`].pop());
      }
    }

    // 检查贵族拜访
    this.checkNobleVisit(playerIndex);

    // 检查游戏是否结束
    this.checkGameOver(playerIndex);

    return { success: true };
  }

  // 计算支付方式（优先使用非金色宝石）
  calculatePayment(player, cost) {
    const payment = { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
    const colors = ['white', 'blue', 'green', 'red', 'black'];
    
    // 先使用普通宝石
    colors.forEach(color => {
      const useAmount = Math.min(player.gems[color], cost[color]);
      payment[color] = useAmount;
    });
    
    // 计算还差多少
    let remaining = 0;
    colors.forEach(color => {
      remaining += cost[color] - payment[color];
    });
    
    // 使用金色宝石
    if (remaining > 0) {
      if (player.gems.gold >= remaining) {
        payment.gold = remaining;
      } else {
        return { success: false };
      }
    }
    
    return { success: true, gems: payment };
  }

  // 预留卡牌
  reserveCard(playerIndex, card, tierName) {
    const player = this.players[playerIndex];
    
    // 检查预留上限
    if (player.reservedCards.length >= 3) {
      return { success: false, reason: '已达到预留上限（3 张）' };
    }
    
    const tierNum = parseInt(tierName.replace('tier', ''));
    const index = this[`tier${tierNum}Cards`].findIndex(c => c.id === card.id);
    
    if (index === -1) {
      return { success: false, reason: '卡牌不存在' };
    }
    
    // 获得金色代币（如果还有）
    if (this.bank.gold > 0) {
      player.gems.gold++;
      this.bank.gold--;
    }
    
    // 添加到预留区
    player.reservedCards.push(card);
    
    // 从桌面移除并补充
    this[`tier${tierNum}Cards`].splice(index, 1);
    if (this.decks[`tier${tierNum}`].length > 0) {
      this[`tier${tierNum}Cards`].push(this.decks[`tier${tierNum}`].pop());
    }
    
    return { success: true };
  }

  // 购买预留卡牌
  buyReservedCard(playerIndex, cardId) {
    const player = this.players[playerIndex];
    const cardIndex = player.reservedCards.findIndex(c => c.id === cardId);
    
    if (cardIndex === -1) {
      return { success: false, reason: '不是你的预留卡牌' };
    }
    
    const card = player.reservedCards[cardIndex];
    const result = this.buyCard(playerIndex, card);
    
    if (result.success) {
      player.reservedCards.splice(cardIndex, 1);
    }
    
    return result;
  }

  // 拿取宝石
  takeGems(gems) {
    const player = this.getCurrentPlayer();
    const colors = Object.keys(gems);
    const totalGems = Object.values(gems).reduce((sum, val) => sum + val, 0);
    
    // 验证：只能拿 3 个不同或 2 个相同
    if (colors.length === 1 && gems[colors[0]] === 2) {
      // 2 个相同颜色 - 该颜色桌上必须至少 4 个
      const color = colors[0];
      if (this.bank[color] < 4) {
        return { success: false, reason: '该颜色宝石不足 4 个，不能拿 2 个' };
      }
    } else if (colors.length === 3 && totalGems === 3) {
      // 3 个不同颜色 - 不能包含金色
      if (colors.includes('gold')) {
        return { success: false, reason: '不能拿取金色代币' };
      }
      // 检查每种颜色是否至少有 1 个
      for (const color of colors) {
        if (this.bank[color] < 1) {
          return { success: false, reason: `${color}宝石不足` };
        }
      }
    } else {
      return { success: false, reason: '无效的拿取方式' };
    }

    // 更新宝石
    for (const [color, count] of Object.entries(gems)) {
      this.bank[color] -= count;
      player.gems[color] += count;
    }

    // 检查手牌上限（10 个宝石，金色除外）
    this.checkGemLimit(player);

    return { success: true };
  }

  // 检查宝石上限（10 个，金色除外）
  checkGemLimit(player) {
    const regularGems = ['white', 'blue', 'green', 'red', 'black']
      .reduce((sum, color) => sum + player.gems[color], 0);
    
    if (regularGems > 10) {
      // 需要归还直到剩 10 个（简化处理：自动归还多余的）
      const excess = regularGems - 10;
      let toReturn = excess;
      
      ['white', 'blue', 'green', 'red', 'black'].forEach(color => {
        if (toReturn > 0 && player.gems[color] > 0) {
          const returnCount = Math.min(player.gems[color], toReturn);
          player.gems[color] -= returnCount;
          this.bank[color] += returnCount;
          toReturn -= returnCount;
        }
      });
      
      return { returned: excess };
    }
    
    return { returned: 0 };
  }

  // 检查贵族拜访（基于已购卡牌的折扣，不是代币）
  checkNobleVisit(playerIndex) {
    const player = this.players[playerIndex];
    
    for (let i = this.nobleDeck.length - 1; i >= 0; i--) {
      const noble = this.nobleDeck[i];
      let canVisit = true;
      
      // 检查玩家的折扣是否满足贵族要求
      Object.entries(noble.requirements).forEach(([color, requiredCount]) => {
        if (requiredCount > 0) {
          const bonusCount = player.bonuses[color] || 0;
          if (bonusCount < requiredCount) {
            canVisit = false;
          }
        }
      });
      
      if (canVisit) {
        player.nobles.push(noble);
        this.updateBonuses(playerIndex);
        this.nobleDeck.splice(i, 1);
        
        // 检查游戏是否结束
        this.checkGameOver(playerIndex);
      }
    }
  }

  // 检查游戏结束
  checkGameOver(playerIndex) {
    const player = this.players[playerIndex];
    
    // 达到 15 分触发结束
    if (player.points >= 15 && !this.gameOver) {
      this.gameOver = true;
      this.finalRoundPlayer = playerIndex;
      // 注意：不立即设置获胜者，要完成当前轮次
    }
  }

  // 下一玩家
  nextPlayer() {
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    
    // 如果游戏已触发结束，检查是否所有玩家都完成了最后一轮
    if (this.gameOver && this.finalRoundPlayer !== null) {
      if (this.currentPlayer === this.finalRoundPlayer) {
        // 所有玩家回合数相同，计算最终结果
        this.determineWinner();
      }
    }
  }

  // 确定获胜者
  determineWinner() {
    // 找出最高分
    const maxPoints = Math.max(...this.players.map(p => p.points));
    const topPlayers = this.players.filter(p => p.points === maxPoints);
    
    if (topPlayers.length === 1) {
      this.winner = topPlayers[0].id;
    } else {
      // 平局：已购卡牌数量少者胜
      const minCards = Math.min(...topPlayers.map(p => p.cards.length));
      const winners = topPlayers.filter(p => p.cards.length === minCards);
      
      if (winners.length === 1) {
        this.winner = winners[0].id;
      } else {
        // 还是平局：共享胜利（返回第一个）
        this.winner = winners[0].id;
      }
    }
    
    this.winnerDetermined = true;
  }

  // 检查获胜者（供 UI 调用）
  checkWinner() {
    if (this.winnerDetermined) {
      return this.winner;
    }
    return null;
  }

  // 获取游戏状态
  get gameBoard() {
    return {
      tier1: this.tier1Cards,
      tier2: this.tier2Cards,
      tier3: this.tier3Cards,
      nobles: this.nobleDeck,
      gems: this.bank,
      cardsPerTier: this.cardsPerTier,
      nobleCount: this.nobleCount,
      gemCount: this.gemCount
    };
  }

  // 获取游戏配置信息
  get gameConfig() {
    return {
      playerCount: this.playerCount,
      gemCount: this.gemCount,
      cardsPerTier: this.cardsPerTier,
      nobleCount: this.nobleCount,
      goldCount: this.goldCount
    };
  }

  // 获取游戏状态（用于多人游戏）
  getGameState() {
    return {
      currentPlayer: this.currentPlayer,
      players: this.players,
      gameBoard: this.gameBoard,
      gameOver: this.gameOver,
      winner: this.winner,
      winnerDetermined: this.winnerDetermined
    };
  }
}
