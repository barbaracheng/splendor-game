// Splendor Game Test Suite
// 在 Node.js 环境中运行测试

// 简单的 SplendorGame 类加载（用于测试）
const fs = require('fs');
const path = require('path');

// 读取并执行核心逻辑
const coreCode = fs.readFileSync(path.join(__dirname, 'splendor-core.js'), 'utf-8');
eval(coreCode);

console.log('🧪 Splendor 游戏测试开始...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ ${name}`);
        console.log(`   错误：${e.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || '断言失败');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `期望 ${expected}, 实际 ${actual}`);
    }
}

// ===== 测试用例 =====

// 1. 游戏初始化测试
test('2 人游戏初始化', () => {
    const game = new SplendorGame(2);
    assertEqual(game.playerCount, 2);
    assertEqual(game.gemCount, 4);
    assertEqual(game.cardsPerTier, 4);
    assertEqual(game.nobleCount, 3);
    assertEqual(game.bank.gold, 5);
});

test('3 人游戏初始化', () => {
    const game = new SplendorGame(3);
    assertEqual(game.playerCount, 3);
    assertEqual(game.gemCount, 5);
    assertEqual(game.cardsPerTier, 5);
    assertEqual(game.nobleCount, 4);
});

test('4 人游戏初始化', () => {
    const game = new SplendorGame(4);
    assertEqual(game.playerCount, 4);
    assertEqual(game.gemCount, 5);
    assertEqual(game.cardsPerTier, 6);
    assertEqual(game.nobleCount, 4);
});

// 2. 购买卡牌测试
test('购买卡牌 - 有足够宝石', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 给玩家足够的宝石
    player.gems.white = 4;
    player.gems.blue = 4;
    
    // 找一张成本为 4 白的卡牌
    const card = game.tier1Cards.find(c => c.cost.white === 4 && c.cost.blue === 0);
    if (card) {
        const result = game.buyCard(0, card);
        assertEqual(result.success, true, '应该能购买');
        assertEqual(player.cards.length, 1);
    }
});

test('购买卡牌 - 宝石不足', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 玩家只有 1 个宝石
    player.gems.white = 1;
    
    // 找一张成本为 4 的卡牌
    const card = game.tier1Cards.find(c => c.cost.white === 4);
    if (card) {
        const canAfford = game.canAffordCard(0, card);
        assertEqual(canAfford, false, '应该买不起');
    }
});

test('购买卡牌 - 使用折扣', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 先给玩家一张白色卡牌（提供白色折扣）
    const bonusCard = { tier: 1, cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 }, points: 0, color: 'white' };
    player.cards.push(bonusCard);
    game.updateBonuses(0);
    
    // 玩家有 2 个白色宝石
    player.gems.white = 2;
    
    // 找一张成本为 1 白 1 蓝 1 绿 1 红的卡牌，实际成本应该是 0 白 1 蓝 1 绿 1 红
    const card = game.tier1Cards.find(c => 
        c.cost.white === 1 && 
        c.cost.blue === 1 && 
        c.cost.green === 1 && 
        c.cost.red === 1
    );
    
    if (card) {
        const actualCost = game.calculateActualCost(0, card);
        assertEqual(actualCost.white, 0, '白色成本应该是 0（有折扣）');
        
        // 现在应该能买得起（需要 3 个宝石，玩家有 2 个白 + 其他）
        player.gems.blue = 1;
        player.gems.green = 1;
        player.gems.red = 1;
        
        const canAfford = game.canAffordCard(0, card);
        assert(canAfford, '应该能买得起');
    }
});

test('购买卡牌 - 使用金色代币', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 玩家只有金色代币
    player.gems.gold = 5;
    player.gems.white = 0;
    player.gems.blue = 0;
    
    // 找一张成本为 4 的卡牌
    const card = game.tier1Cards.find(c => c.cost.white === 4);
    if (card) {
        const canAfford = game.canAffordCard(0, card);
        assertEqual(canAfford, true, '应该能用金色购买');
        
        const result = game.buyCard(0, card);
        assertEqual(result.success, true);
        assertEqual(player.gems.gold, 1); // 花了 4 个金色
    }
});

// 3. 拿取宝石测试
test('拿取 3 个不同宝石', () => {
    const game = new SplendorGame(2);
    const result = game.takeGems({ white: 1, blue: 1, green: 1 });
    assertEqual(result.success, true);
    assertEqual(game.players[0].gems.white, 1);
    assertEqual(game.players[0].gems.blue, 1);
    assertEqual(game.players[0].gems.green, 1);
});

test('拿取 2 个相同宝石', () => {
    const game = new SplendorGame(2);
    const result = game.takeGems({ white: 2 });
    assertEqual(result.success, true);
    assertEqual(game.players[0].gems.white, 2);
});

test('拿取 2 个相同宝石 - 宝石不足 4 个', () => {
    const game = new SplendorGame(2);
    // 2 人游戏每色只有 4 个，不能拿 2 个
    game.bank.white = 3; // 模拟只剩 3 个
    const result = game.takeGems({ white: 2 });
    assertEqual(result.success, false);
});

test('拿取宝石 - 不能拿金色', () => {
    const game = new SplendorGame(2);
    const result = game.takeGems({ gold: 3 });
    assertEqual(result.success, false);
});

// 4. 宝石上限测试
test('宝石上限 10 个', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 给玩家 12 个普通宝石
    player.gems.white = 4;
    player.gems.blue = 4;
    player.gems.green = 4;
    
    const result = game.checkGemLimit(player);
    assertEqual(result.returned, 2, '应该归还 2 个');
    const total = player.gems.white + player.gems.blue + player.gems.green;
    assertEqual(total, 10, '应该剩 10 个');
});

test('金色宝石不计入上限', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 10 个普通宝石 + 5 个金色
    player.gems.white = 4;
    player.gems.blue = 3;
    player.gems.green = 3;
    player.gems.gold = 5;
    
    const result = game.checkGemLimit(player);
    assertEqual(result.returned, 0, '不应该归还');
});

// 5. 预留卡牌测试
test('预留卡牌', () => {
    const game = new SplendorGame(2);
    const card = game.tier1Cards[0];
    const result = game.reserveCard(0, card, 'tier1');
    assertEqual(result.success, true);
    assertEqual(game.players[0].reservedCards.length, 1);
});

test('预留卡牌 - 达到上限', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 已经预留 3 张
    player.reservedCards = [{}, {}, {}];
    
    const card = game.tier1Cards[0];
    const result = game.reserveCard(0, card, 'tier1');
    assertEqual(result.success, false);
    assertEqual(result.reason.includes('上限'), true);
});

// 6. 贵族拜访测试
test('贵族拜访 - 基于折扣', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 给玩家 3 张白色卡牌（提供 3 个白色折扣）
    for (let i = 0; i < 3; i++) {
        player.cards.push({ color: 'white', points: 0 });
    }
    game.updateBonuses(0);
    
    // 检查折扣
    assertEqual(player.bonuses.white, 3);
    
    // 找一个需要 3 白的贵族
    const noble = game.nobleDeck.find(n => n.requirements.white === 3);
    if (noble) {
        game.checkNobleVisit(0);
        assertEqual(player.nobles.length, 1, '应该获得贵族');
    }
});

// 7. 游戏结束测试
test('游戏结束 - 达到 15 分', () => {
    const game = new SplendorGame(2);
    const player = game.players[0];
    
    // 给玩家 15 分
    player.points = 15;
    game.checkGameOver(0);
    
    assertEqual(game.gameOver, true);
    assertEqual(game.finalRoundPlayer, 0);
});

// ===== 测试结果 =====

console.log('\n' + '='.repeat(50));
console.log(`测试结果：${passed} 通过，${failed} 失败`);
console.log('='.repeat(50));

if (failed > 0) {
    console.log('\n❌ 有测试失败，请检查代码！');
    process.exit(1);
} else {
    console.log('\n✅ 所有测试通过！');
    process.exit(0);
}
