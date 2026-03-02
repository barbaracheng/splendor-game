// splendor-core.js
// Splendor 游戏核心逻辑

class SplendorGame {
  constructor(players = 2) {
    this.players = Array.from({length: players}, (_, i) => ({
      id: i,
      gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
      cards: [],
      nobles: [],
      points: 0,
      reservedCards: []
    }));
    
    this.currentPlayer = 0;
    this.gameOver = false;
    this.winner = null;
    
    // 宝石池
    this.bank = { white: 7, blue: 7, green: 7, red: 7, black: 7, gold: 5 };
    
    // 初始化卡牌和贵族
    this.decks = this.initializeDecks();
    this.nobleDeck = this.initializeNobles();
    
    // 桌面上展示的卡牌
    this.tier1Cards = [];
    this.tier2Cards = [];
    this.tier3Cards = [];
    
    this.setupBoard();
  }

  initializeDecks() {
    const cards = [
      // Tier 1 Cards (0 分)
      { id: 't1-1', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 0, black: 4 }, points: 0, color: 'black' },
      { id: 't1-2', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 4, black: 0 }, points: 0, color: 'red' },
      { id: 't1-3', tier: 1, cost: { white: 0, blue: 0, green: 4, red: 0, black: 0 }, points: 0, color: 'green' },
      { id: 't1-4', tier: 1, cost: { white: 0, blue: 4, green: 0, red: 0, black: 0 }, points: 0, color: 'blue' },
      { id: 't1-5', tier: 1, cost: { white: 4, blue: 0, green: 0, red: 0, black: 0 }, points: 0, color: 'white' },
      { id: 't1-6', tier: 1, cost: { white: 1, blue: 1, green: 1, red: 1, black: 0 }, points: 0, color: 'white' },
      { id: 't1-7', tier: 1, cost: { white: 1, blue: 1, green: 1, red: 0, black: 1 }, points: 0, color: 'blue' },
      { id: 't1-8', tier: 1, cost: { white: 1, blue: 1, green: 0, red: 1, black: 1 }, points: 0, color: 'green' },
      { id: 't1-9', tier: 1, cost: { white: 1, blue: 0, green: 1, red: 1, black: 1 }, points: 0, color: 'red' },
      { id: 't1-10', tier: 1, cost: { white: 0, blue: 1, green: 1, red: 1, black: 1 }, points: 0, color: 'black' },
      { id: 't1-11', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 3, black: 0 }, points: 0, color: 'red' },
      { id: 't1-12', tier: 1, cost: { white: 0, blue: 0, green: 3, red: 0, black: 0 }, points: 0, color: 'green' },
      { id: 't1-13', tier: 1, cost: { white: 0, blue: 3, green: 0, red: 0, black: 0 }, points: 0, color: 'blue' },
      { id: 't1-14', tier: 1, cost: { white: 3, blue: 0, green: 0, red: 0, black: 0 }, points: 0, color: 'white' },
      { id: 't1-15', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 0, black: 3 }, points: 0, color: 'black' },
      { id: 't1-16', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 2, black: 0 }, points: 0, color: 'red' },
      { id: 't1-17', tier: 1, cost: { white: 0, blue: 0, green: 2, red: 0, black: 0 }, points: 0, color: 'green' },
      { id: 't1-18', tier: 1, cost: { white: 0, blue: 2, green: 0, red: 0, black: 0 }, points: 0, color: 'blue' },
      { id: 't1-19', tier: 1, cost: { white: 2, blue: 0, green: 0, red: 0, black: 0 }, points: 0, color: 'white' },
      { id: 't1-20', tier: 1, cost: { white: 0, blue: 0, green: 0, red: 0, black: 2 }, points: 0, color: 'black' },
      
      // Tier 2 Cards (1-3 分)
      { id: 't2-1', tier: 2, cost: { white: 2, blue: 2, green: 0, red: 0, black: 0 }, points: 1, color: 'white' },
      { id: 't2-2', tier: 2, cost: { white: 0, blue: 2, green: 2, red: 0, black: 0 }, points: 1, color: 'blue' },
      { id: 't2-3', tier: 2, cost: { white: 0, blue: 0, green: 2, red: 2, black: 0 }, points: 1, color: 'green' },
      { id: 't2-4', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 2, black: 2 }, points: 1, color: 'red' },
      { id: 't2-5', tier: 2, cost: { white: 2, blue: 0, green: 0, red: 0, black: 2 }, points: 1, color: 'black' },
      { id: 't2-6', tier: 2, cost: { white: 3, blue: 0, green: 0, red: 0, black: 0 }, points: 1, color: 'white' },
      { id: 't2-7', tier: 2, cost: { white: 0, blue: 3, green: 0, red: 0, black: 0 }, points: 1, color: 'blue' },
      { id: 't2-8', tier: 2, cost: { white: 0, blue: 0, green: 3, red: 0, black: 0 }, points: 1, color: 'green' },
      { id: 't2-9', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 3, black: 0 }, points: 1, color: 'red' },
      { id: 't2-10', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 0, black: 3 }, points: 1, color: 'black' },
      { id: 't2-11', tier: 2, cost: { white: 2, blue: 0, green: 0, red: 0, black: 2 }, points: 2, color: 'white' },
      { id: 't2-12', tier: 2, cost: { white: 0, blue: 2, green: 0, red: 0, black: 2 }, points: 2, color: 'blue' },
      { id: 't2-13', tier: 2, cost: { white: 0, blue: 0, green: 2, red: 0, black: 2 }, points: 2, color: 'green' },
      { id: 't2-14', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 2, black: 2 }, points: 2, color: 'red' },
      { id: 't2-15', tier: 2, cost: { white: 2, blue: 2, green: 0, red: 0, black: 0 }, points: 2, color: 'black' },
      { id: 't2-16', tier: 2, cost: { white: 3, blue: 0, green: 0, red: 0, black: 0 }, points: 2, color: 'white' },
      { id: 't2-17', tier: 2, cost: { white: 0, blue: 3, green: 0, red: 0, black: 0 }, points: 2, color: 'blue' },
      { id: 't2-18', tier: 2, cost: { white: 0, blue: 0, green: 3, red: 0, black: 0 }, points: 2, color: 'green' },
      { id: 't2-19', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 3, black: 0 }, points: 2, color: 'red' },
      { id: 't2-20', tier: 2, cost: { white: 0, blue: 0, green: 0, red: 0, black: 3 }, points: 2, color: 'black' },
      
      // Tier 3 Cards (4-5 分)
      { id: 't3-1', tier: 3, cost: { white: 3, blue: 0, green: 0, red: 0, black: 0 }, points: 4, color: 'white' },
      { id: 't3-2', tier: 3, cost: { white: 0, blue: 3, green: 0, red: 0, black: 0 }, points: 4, color: 'blue' },
      { id: 't3-3', tier: 3, cost: { white: 0, blue: 0, green: 3, red: 0, black: 0 }, points: 4, color: 'green' },
      { id: 't3-4', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 3, black: 0 }, points: 4, color: 'red' },
      { id: 't3-5', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 3 }, points: 4, color: 'black' },
      { id: 't3-6', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'white' },
      { id: 't3-7', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'blue' },
      { id: 't3-8', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'green' },
      { id: 't3-9', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'red' },
      { id: 't3-10', tier: 3, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 5, color: 'black' },
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
      { id: 'n5', requirements: { white: 3, blue: 3, green: 3, red: 0, black: 0 }, points: 3 }
    ];
    
    this.shuffleArray(nobles);
    return nobles.slice(0, Math.max(3, this.players.length + 1));
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  setupBoard() {
    for (let i = 0; i < 4; i++) {
      if (this.decks.tier1.length > 0) this.tier1Cards.push(this.decks.tier1.pop());
      if (this.decks.tier2.length > 0) this.tier2Cards.push(this.decks.tier2.pop());
      if (this.decks.tier3.length > 0) this.tier3Cards.push(this.decks.tier3.pop());
    }
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayer];
  }

  getOtherPlayers() {
    return this.players.filter((_, index) => index !== this.currentPlayer);
  }

  canAffordCard(player, card) {
    let totalCost = {...card.cost};
    
    player.cards.forEach(card => {
      if (totalCost[card.color] > 0) {
        totalCost[card.color]--;
      }
    });
    
    Object.keys(totalCost).forEach(color => {
      totalCost[color] = Math.max(0, totalCost[color]);
    });

    let hasGems = true;
    Object.keys(totalCost).forEach(color => {
      if (player.gems[color] < totalCost[color]) {
        hasGems = false;
      }
    });
    
    return hasGems;
  }

  calculateActualCost(player, card) {
    let actualCost = {...card.cost};
    
    player.cards.forEach(card => {
      if (actualCost[card.color] > 0) {
        actualCost[card.color]--;
      }
    });
    
    Object.keys(actualCost).forEach(color => {
      actualCost[color] = Math.max(0, actualCost[color]);
    });

    return actualCost;
  }

  buyCard(playerIndex, card) {
    const player = this.players[playerIndex];
    
    if (!this.canAffordCard(player, card)) {
      return false;
    }

    const actualCost = this.calculateActualCost(player, card);
    
    for (const [color, cost] of Object.entries(actualCost)) {
      player.gems[color] -= cost;
      this.bank[color] += cost;
    }

    player.cards.push(card);
    player.points += card.points;

    const tierNum = card.tier;
    const index = this[`tier${tierNum}Cards`].findIndex(c => c.id === card.id);
    if (index !== -1) {
      this[`tier${tierNum}Cards`].splice(index, 1);
      if (this.decks[`tier${tierNum}`].length > 0) {
        this[`tier${tierNum}Cards`].push(this.decks[`tier${tierNum}`].pop());
      }
    }

    this.checkNobleVisit(player);

    if (player.points >= 15) {
      this.gameOver = true;
      this.winner = playerIndex;
    }

    return true;
  }

  reserveCard(playerIndex, card, tierName) {
    const player = this.players[playerIndex];
    const tierNum = parseInt(tierName.replace('tier', ''));
    const index = this[`tier${tierNum}Cards`].findIndex(c => c.id === card.id);
    
    if (index === -1) return false;
    
    if (this.bank.gold > 0) {
      player.gems.gold++;
      this.bank.gold--;
    }
    
    player.reservedCards.push(card);
    this[`tier${tierNum}Cards`].splice(index, 1);
    
    if (this.decks[`tier${tierNum}`].length > 0) {
      this[`tier${tierNum}Cards`].push(this.decks[`tier${tierNum}`].pop());
    }
    
    return true;
  }

  takeGems(gems) {
    const player = this.getCurrentPlayer();
    const colors = Object.keys(gems);
    const totalGems = Object.values(gems).reduce((sum, val) => sum + val, 0);
    
    if (colors.length === 1 && gems[colors[0]] === 2) {
      const color = colors[0];
      if (this.bank[color] < 4) return false;
    } else if (colors.length === 3 && totalGems === 3) {
      for (const color of colors) {
        if (this.bank[color] < 1) return false;
      }
    } else {
      return false;
    }

    for (const [color, count] of Object.entries(gems)) {
      this.bank[color] -= count;
      player.gems[color] += count;
    }

    return true;
  }

  checkNobleVisit(player) {
    for (let i = this.nobleDeck.length - 1; i >= 0; i--) {
      const noble = this.nobleDeck[i];
      let canVisit = true;
      
      Object.entries(noble.requirements).forEach(([color, requiredCount]) => {
        if (requiredCount > 0) {
          const ownedCount = player.cards.filter(card => card.color === color).length;
          if (ownedCount < requiredCount) {
            canVisit = false;
          }
        }
      });
      
      if (canVisit) {
        player.nobles.push(noble);
        player.points += noble.points;
        this.nobleDeck.splice(i, 1);
        
        if (player.points >= 15) {
          this.gameOver = true;
          this.winner = this.currentPlayer;
        }
      }
    }
  }

  nextPlayer() {
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
  }

  nextTurn() {
    this.nextPlayer();
  }

  checkWinner() {
    if (this.gameOver && this.winner !== null) {
      return this.winner;
    }
    
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].points >= 15) {
        this.gameOver = true;
        this.winner = i;
        return i;
      }
    }
    
    return null;
  }

  get gameBoard() {
    return {
      tier1: this.tier1Cards,
      tier2: this.tier2Cards,
      tier3: this.tier3Cards,
      nobles: this.nobleDeck,
      gems: this.bank
    };
  }

  initializeGame() {
    // 已在构造函数中完成初始化
  }
}
