// Splendor 多人游戏服务器
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;

// 游戏房间存储
const rooms = new Map();
// 玩家连接存储
const players = new Map();

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Splendor Server Running');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    players.set(playerId, { ws, roomId: null, name: null });
    
    console.log(`玩家连接：${playerId}`);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, playerId, data);
        } catch (e) {
            console.error('消息解析错误:', e);
        }
    });
    
    ws.on('close', () => {
        const player = players.get(playerId);
        if (player && player.roomId) {
            handlePlayerLeave(playerId, player.roomId);
        }
        players.delete(playerId);
        console.log(`玩家断开：${playerId}`);
    });
});

function handleMessage(ws, playerId, data) {
    const player = players.get(playerId);
    
    switch (data.type) {
        case 'set_name':
            player.name = data.name;
            ws.send(JSON.stringify({ type: 'name_set', playerId }));
            break;
            
        case 'create_room':
            createRoom(playerId, data);
            break;
            
        case 'join_room':
            joinRoom(playerId, data.roomId);
            break;
            
        case 'leave_room':
            if (player.roomId) {
                handlePlayerLeave(playerId, player.roomId);
            }
            break;
            
        case 'game_action':
            broadcastToRoom(player.roomId, {
                type: 'game_action',
                playerId,
                action: data.action
            });
            break;
            
        case 'chat_message':
            broadcastToRoom(player.roomId, {
                type: 'chat_message',
                playerId,
                name: player.name,
                message: data.message,
                timestamp: Date.now()
            });
            break;
            
        case 'start_game':
            if (player.roomId) {
                const room = rooms.get(player.roomId);
                if (room && room.players.includes(playerId)) {
                    broadcastToRoom(player.roomId, {
                        type: 'game_started',
                        roomState: room
                    });
                }
            }
            break;
    }
}

function createRoom(playerId, data) {
    const roomId = uuidv4().slice(0, 8);
    const room = {
        roomId,
        name: data.roomName || `房间${roomId}`,
        players: [playerId],
        maxPlayers: data.maxPlayers || 4,
        gameState: null,
        createdAt: Date.now()
    };
    
    rooms.set(roomId, room);
    players.get(playerId).roomId = roomId;
    
    const ws = players.get(playerId).ws;
    ws.send(JSON.stringify({
        type: 'room_created',
        roomId,
        room
    }));
    
    console.log(`创建房间：${roomId}`);
}

function joinRoom(playerId, roomId) {
    const room = rooms.get(roomId);
    if (!room) {
        players.get(playerId).ws.send(JSON.stringify({
            type: 'error',
            message: '房间不存在'
        }));
        return;
    }
    
    if (room.players.length >= room.maxPlayers) {
        players.get(playerId).ws.send(JSON.stringify({
            type: 'error',
            message: '房间已满'
        }));
        return;
    }
    
    room.players.push(playerId);
    players.get(playerId).roomId = roomId;
    
    broadcastToRoom(roomId, {
        type: 'player_joined',
        roomId,
        playerId,
        playerName: players.get(playerId).name,
        players: room.players.map(id => ({
            id,
            name: players.get(id)?.name || '未知'
        }))
    });
    
    console.log(`玩家 ${playerId} 加入房间 ${roomId}`);
}

function handlePlayerLeave(playerId, roomId) {
    const room = rooms.get(roomId);
    if (room) {
        room.players = room.players.filter(id => id !== playerId);
        
        broadcastToRoom(roomId, {
            type: 'player_left',
            playerId,
            players: room.players.map(id => ({
                id,
                name: players.get(id)?.name || '未知'
            }))
        });
        
        if (room.players.length === 0) {
            rooms.delete(roomId);
            console.log(`房间 ${roomId} 已删除`);
        }
    }
}

function broadcastToRoom(roomId, message) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.players.forEach(playerId => {
        const player = players.get(playerId);
        if (player && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    });
}

server.listen(PORT, () => {
    console.log(`Splendor 服务器运行在端口 ${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
});
