// Splendor 多人游戏服务器
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;

const TURN_TIME_LIMIT = 90;
const TIMER_WARNING_THRESHOLD = 30;
const TIMER_SYNC_INTERVAL = 1000;

const rooms = new Map();
const players = new Map();
const roomTimers = new Map();

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Splendor Server Running');
});

function addHistoryRecord(roomId, record) {
    const room = rooms.get(roomId);
    if (!room) return;

    if (!room.history) {
        room.history = [];
    }

    room.history.push({
        timestamp: Date.now(),
        playerId: record.playerId || null,
        playerName: record.playerName || '系统',
        actionType: record.actionType,
        actionDetail: record.actionDetail || {}
    });
}

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    players.set(playerId, {
        ws,
        roomId: null,
        name: null,
        isReady: false,
        isOnline: true,
        lastActivity: Date.now()
    });

    console.log(`玩家连接：${playerId}`);

    ws.send(JSON.stringify({
        type: 'connected',
        playerId
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const player = players.get(playerId);
            if (player) {
                player.lastActivity = Date.now();
            }
            handleMessage(ws, playerId, data);
        } catch (e) {
            console.error('消息解析错误:', e);
        }
    });

    ws.on('close', () => {
        handlePlayerDisconnect(playerId);
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
                    room.gameStarted = true;

                    addHistoryRecord(player.roomId, {
                        actionType: 'game_start',
                        actionDetail: { 
                            message: '游戏开始',
                            players: room.players.map(id => {
                                const p = players.get(id);
                                return p?.name || '未知';
                            })
                        }
                    });

                    broadcastToRoom(player.roomId, {
                        type: 'game_started',
                        roomState: room
                    });
                }
            }
            break;

        case 'game_state_sync':
            handleGameStateSync(playerId, data);
            break;

        case 'player_action':
            handlePlayerAction(playerId, data);
            break;

        case 'emoji':
            handleEmoji(playerId, data);
            break;

        case 'quick_message':
            handleQuickMessage(playerId, data);
            break;

        case 'player_ready':
            handlePlayerReady(playerId, data);
            break;

        case 'player_online':
            handlePlayerOnline(playerId, data);
            break;

        case 'turn_start':
            handleTurnStart(playerId, data);
            break;

        case 'turn_end':
            handleTurnEnd(playerId, data);
            break;

        case 'get_history':
            handleGetHistory(playerId, data);
            break;

        case 'game_end':
            handleGameEnd(playerId, data);
            break;
    }
}

function createRoom(playerId, data) {
    const roomId = uuidv4().slice(0, 8);
    const player = players.get(playerId);
    const room = {
        roomId,
        name: data.roomName || `房间${roomId}`,
        players: [playerId],
        maxPlayers: data.maxPlayers || 4,
        gameState: null,
        gameStarted: false,
        createdAt: Date.now(),
        history: []
    };

    rooms.set(roomId, room);
    player.roomId = roomId;

    player.ws.send(JSON.stringify({
        type: 'room_created',
        roomId,
        room,
        players: [{
            id: playerId,
            name: player.name,
            isReady: player.isReady,
            isOnline: player.isOnline
        }]
    }));

    console.log(`创建房间：${roomId}`);
}

function joinRoom(playerId, roomId) {
    const room = rooms.get(roomId);
    const player = players.get(playerId);

    if (!room) {
        player.ws.send(JSON.stringify({
            type: 'error',
            message: '房间不存在'
        }));
        return;
    }

    if (room.players.length >= room.maxPlayers) {
        player.ws.send(JSON.stringify({
            type: 'error',
            message: '房间已满'
        }));
        return;
    }

    room.players.push(playerId);
    player.roomId = roomId;

    addHistoryRecord(roomId, {
        playerId,
        playerName: player.name,
        actionType: 'player_join',
        actionDetail: { message: `${player.name} 加入房间` }
    });

    const playersList = room.players.map(id => {
        const p = players.get(id);
        return {
            id,
            name: p?.name || '未知',
            isReady: p?.isReady || false,
            isOnline: p?.isOnline || false
        };
    });

    broadcastToRoom(roomId, {
        type: 'player_joined',
        roomId,
        playerId,
        playerName: player.name,
        players: playersList
    });

    console.log(`玩家 ${playerId} 加入房间 ${roomId}`);
}

function handlePlayerLeave(playerId, roomId) {
    const room = rooms.get(roomId);
    const player = players.get(playerId);

    if (room) {
        addHistoryRecord(roomId, {
            playerId,
            playerName: player?.name || '未知',
            actionType: 'player_leave',
            actionDetail: { message: `${player?.name || '未知'} 离开房间` }
        });

        room.players = room.players.filter(id => id !== playerId);

        const playersList = room.players.map(id => {
            const p = players.get(id);
            return {
                id,
                name: p?.name || '未知',
                isReady: p?.isReady || false,
                isOnline: p?.isOnline || false
            };
        });

        broadcastToRoom(roomId, {
            type: 'player_left',
            playerId,
            playerName: player?.name || '未知',
            players: playersList
        });

        if (room.players.length === 0) {
            stopTurnTimer(roomId);
            rooms.delete(roomId);
            console.log(`房间 ${roomId} 已删除`);
        }
    }

    if (player) {
        player.roomId = null;
        player.isReady = false;
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

function broadcastToRoomExcept(roomId, exceptPlayerId, message) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach(playerId => {
        if (playerId === exceptPlayerId) return;
        const player = players.get(playerId);
        if (player && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    });
}

function handlePlayerDisconnect(playerId) {
    const player = players.get(playerId);
    if (!player) return;

    player.isOnline = false;

    if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) {
            const playersList = room.players.map(id => {
                const p = players.get(id);
                return {
                    id,
                    name: p?.name || '未知',
                    isReady: p?.isReady || false,
                    isOnline: id === playerId ? false : (p?.isOnline || false)
                };
            });

            broadcastToRoom(player.roomId, {
                type: 'player_offline',
                playerId,
                playerName: player.name || '未知',
                players: playersList,
                timestamp: Date.now()
            });

            if (!room.gameStarted) {
                handlePlayerLeave(playerId, player.roomId);
            }
        }
    }

    players.delete(playerId);
    console.log(`玩家断开：${playerId}`);
}

function handleGameStateSync(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room) return;

    if (data.gameState) {
        room.gameState = data.gameState;
    }

    broadcastToRoom(player.roomId, {
        type: 'game_state_sync',
        playerId,
        gameState: room.gameState,
        timestamp: Date.now()
    });
}

function handlePlayerAction(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || !room.gameStarted) return;

    const actionType = data.actionType;
    const validActionTypes = ['take_gems', 'buy_card', 'reserve_card', 'turn_skip'];

    if (!validActionTypes.includes(actionType)) {
        player.ws.send(JSON.stringify({
            type: 'error',
            message: '无效的操作类型'
        }));
        return;
    }

    addHistoryRecord(player.roomId, {
        playerId,
        playerName: player.name,
        actionType,
        actionDetail: data.actionData || {}
    });

    broadcastToRoomExcept(player.roomId, playerId, {
        type: 'player_action',
        playerId,
        playerName: player.name,
        actionType,
        actionData: data.actionData,
        timestamp: Date.now()
    });

    stopTurnTimer(player.roomId);

    console.log(`玩家 ${player.name}(${playerId}) 执行操作: ${actionType}`);
}

function handleEmoji(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const emoji = data.emoji;
    if (!emoji) {
        player.ws.send(JSON.stringify({
            type: 'error',
            message: '表情内容不能为空'
        }));
        return;
    }

    broadcastToRoom(player.roomId, {
        type: 'emoji',
        playerId,
        playerName: player.name,
        emoji,
        timestamp: Date.now()
    });
}

function handleQuickMessage(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const messageId = data.messageId;
    const validMessages = [
        'hello', 'good_game', 'thinking', 'well_played',
        'good_luck', 'wait', 'thanks', 'oops'
    ];

    if (!messageId || !validMessages.includes(messageId)) {
        player.ws.send(JSON.stringify({
            type: 'error',
            message: '无效的快捷消息'
        }));
        return;
    }

    broadcastToRoom(player.roomId, {
        type: 'quick_message',
        playerId,
        playerName: player.name,
        messageId,
        timestamp: Date.now()
    });
}

function handlePlayerReady(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || room.gameStarted) return;

    player.isReady = data.isReady !== undefined ? data.isReady : !player.isReady;

    const playersList = room.players.map(id => {
        const p = players.get(id);
        return {
            id,
            name: p?.name || '未知',
            isReady: p?.isReady || false,
            isOnline: p?.isOnline || false
        };
    });

    broadcastToRoom(player.roomId, {
        type: 'player_ready',
        playerId,
        playerName: player.name,
        isReady: player.isReady,
        players: playersList,
        timestamp: Date.now()
    });

    console.log(`玩家 ${player.name}(${playerId}) 准备状态: ${player.isReady}`);
}

function handlePlayerOnline(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    player.isOnline = data.isOnline !== undefined ? data.isOnline : true;
    player.lastActivity = Date.now();

    const room = rooms.get(player.roomId);
    if (!room) return;

    const playersList = room.players.map(id => {
        const p = players.get(id);
        return {
            id,
            name: p?.name || '未知',
            isReady: p?.isReady || false,
            isOnline: p?.isOnline || false
        };
    });

    broadcastToRoom(player.roomId, {
        type: 'player_online',
        playerId,
        playerName: player.name,
        isOnline: player.isOnline,
        players: playersList,
        timestamp: Date.now()
    });
}

function handleTurnStart(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || !room.gameStarted) return;

    const currentPlayerId = data.currentPlayerId || playerId;
    startTurnTimer(player.roomId, currentPlayerId);

    console.log(`房间 ${player.roomId} 回合开始，玩家: ${currentPlayerId}`);
}

function handleTurnEnd(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    stopTurnTimer(player.roomId);

    console.log(`房间 ${player.roomId} 回合结束`);
}

function startTurnTimer(roomId, playerId) {
    const room = rooms.get(roomId);
    if (!room || !room.gameStarted) return;

    stopTurnTimer(roomId);

    const timerState = {
        currentPlayerId: playerId,
        startTime: Date.now(),
        timeLimit: TURN_TIME_LIMIT,
        remainingTime: TURN_TIME_LIMIT,
        warningSent: false,
        intervalId: null
    };

    timerState.intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
        timerState.remainingTime = Math.max(0, TURN_TIME_LIMIT - elapsed);

        broadcastToRoom(roomId, {
            type: 'timer_sync',
            playerId: timerState.currentPlayerId,
            remainingTime: timerState.remainingTime,
            timeLimit: TURN_TIME_LIMIT,
            timestamp: Date.now()
        });

        if (timerState.remainingTime <= TIMER_WARNING_THRESHOLD && !timerState.warningSent) {
            timerState.warningSent = true;
            broadcastToRoom(roomId, {
                type: 'timer_warning',
                playerId: timerState.currentPlayerId,
                remainingTime: timerState.remainingTime,
                timestamp: Date.now()
            });
        }

        if (timerState.remainingTime <= 0) {
            handleTurnTimeout(roomId, timerState.currentPlayerId);
        }
    }, TIMER_SYNC_INTERVAL);

    roomTimers.set(roomId, timerState);

    broadcastToRoom(roomId, {
        type: 'timer_sync',
        playerId: playerId,
        remainingTime: TURN_TIME_LIMIT,
        timeLimit: TURN_TIME_LIMIT,
        timestamp: Date.now()
    });

    console.log(`房间 ${roomId} 启动计时器，玩家: ${playerId}, 时间限制: ${TURN_TIME_LIMIT}秒`);
}

function stopTurnTimer(roomId) {
    const timerState = roomTimers.get(roomId);
    if (timerState && timerState.intervalId) {
        clearInterval(timerState.intervalId);
        roomTimers.delete(roomId);
        console.log(`房间 ${roomId} 停止计时器`);
    }
}

function handleTurnTimeout(roomId, playerId) {
    const room = rooms.get(roomId);
    const player = players.get(playerId);
    
    if (!room || !player) return;

    stopTurnTimer(roomId);

    broadcastToRoom(roomId, {
        type: 'turn_timeout',
        playerId: playerId,
        playerName: player.name,
        timestamp: Date.now()
    });

    console.log(`玩家 ${player.name}(${playerId}) 在房间 ${roomId} 超时`);

    broadcastToRoom(roomId, {
        type: 'turn_skip',
        playerId: playerId,
        playerName: player.name,
        timestamp: Date.now()
    });
}

function getTimerState(roomId) {
    return roomTimers.get(roomId);
}

function handleGetHistory(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) {
        player?.ws?.send(JSON.stringify({
            type: 'error',
            message: '未加入房间'
        }));
        return;
    }

    const room = rooms.get(player.roomId);
    if (!room) {
        player.ws.send(JSON.stringify({
            type: 'error',
            message: '房间不存在'
        }));
        return;
    }

    let history = room.history || [];

    if (data.actionType) {
        const actionTypes = Array.isArray(data.actionType) ? data.actionType : [data.actionType];
        history = history.filter(record => actionTypes.includes(record.actionType));
    }

    if (data.startTime) {
        history = history.filter(record => record.timestamp >= data.startTime);
    }

    if (data.endTime) {
        history = history.filter(record => record.timestamp <= data.endTime);
    }

    const limit = data.limit || 100;
    if (history.length > limit) {
        history = history.slice(-limit);
    }

    player.ws.send(JSON.stringify({
        type: 'history_data',
        roomId: player.roomId,
        history: history,
        total: room.history?.length || 0,
        timestamp: Date.now()
    }));
}

function handleGameEnd(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || !room.gameStarted) return;

    addHistoryRecord(player.roomId, {
        actionType: 'game_end',
        actionDetail: {
            message: '游戏结束',
            winner: data.winner || null,
            scores: data.scores || {}
        }
    });

    room.gameStarted = false;

    broadcastToRoom(player.roomId, {
        type: 'game_ended',
        winner: data.winner,
        scores: data.scores,
        timestamp: Date.now()
    });

    console.log(`房间 ${player.roomId} 游戏结束`);
}

server.listen(PORT, () => {
    console.log(`Splendor 服务器运行在端口 ${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
});
