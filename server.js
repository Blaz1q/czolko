const express = require('express');
const app = express();

const http = require('http');
const port = 3000;
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');

const players = {};
const rooms = [];
const operators = [];
const bannedplayers = [];
const roomsettings = {};
const colors = ["#1401C5","#0DAE0D","#F44E06","#9900AD","#FFC300"];
app.use(express.static(path.join(__dirname, 'public')));
// app.get('imgs/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', '/imgs/'));
// });
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });
app.get('/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
});
app.get('/start', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
});
function sanitizeString(str) {
    return str.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
}
function sanitizeMessage(str) {
    str = str.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s!?.,]/g, '');
    return str.replace(/\s+/g, ' ').trim();
}
function checkBannedPlayers(roomname,uuid){
    var isbanned = false;
    for(var i=0;i<bannedplayers[roomname].length;i++){
        if(bannedplayers[roomname][i]==uuid) return true;
    }
    return false;
}
function setGame(roomname,isStarted){
    let room = rooms[roomname];
    for(var i=0;i<room.length;i++){
        players[room[i]].ingame = isStarted;
    }
}
function addPlayer(socket, clientUuid, name, outfit, room) {
    players[socket.id] = { 
        id: clientUuid,
        ingame: false,
        color: colors[Math.floor(Math.random()*colors.length)],
        username: sanitizeString(name), 
        avatar: outfit,
        room: room
    };
    if(bannedplayers[room]){
        if(checkBannedPlayers(room,players[socket.id].id)){
            socket.emit('banned');
            delete players[socket.id];
            return;
        }
    }
    if(roomsettings[room]&&rooms[room]){
        if(rooms[room].length>=roomsettings[room].maxPlayers){
            socket.emit('kickplayer',"too many players");
            delete players[socket.id];
            return;
        } 
    }
    if(!rooms[room]){
        rooms[room] = [];
        roomsettings[room] = {
            maxPlayers: 10,
            gamemode: "normal",
            time: 30,
            customWordSet: false
        }
    }
    rooms[room].push(socket.id);
    if(!operators[room]){
        operators[room] = socket.id;
    } 
    if(!bannedplayers[room]){
        bannedplayers[room] = [];
    } 
    updateOperator(socket,players[socket.id]);
}
function kickplayer(socket,id,message){
    socket.emit('systemmessage',`${players[id].username} was kicked.`);
    socket.broadcast.emit('systemmessage',`${players[id].username} was kicked.`);
    socket.to(id).emit('kickplayer',message);
}
function banplayer(socket,roomname,id,message){
    bannedplayers[roomname].push(players[id].id);
    socket.emit('systemmessage',`${players[id].username} was banned.`);
    socket.broadcast.emit('systemmessage',`${players[id].username} was banned.`);
    socket.to(id).emit('banned',message);
}
function updateOperator(socket,player){
    if(!players[operators[player.room]]&&rooms[player.room].length>0){
        delete operators[player.room];
        operators[player.room] = getFirstPLayerInRoom(player.room);
        socket.broadcast.emit('systemmessage', `${players[operators[player.room]].username} is now the operator.`);
        socket.to(operators[player.room]).emit('operator');
        socket.to(operators[player.room]).emit('systemhiddenmessage', `You are now the operator.`);
    }
}
function deleteRoom(room){
if(rooms[room].length==0) delete rooms[room];
}
function getFirstPLayerInRoom(room){
    if(rooms[room]){
        return rooms[room][0];
    }
    return -1;
}
function ifOperator(ID,room){
    return ID==operators[room];
}
io.on('connection', (socket) => {
    socket.on('connected', (clientUuid,name,outfit,room) => {
        addPlayer(socket, clientUuid, name, outfit,room);
        if (!players[socket.id]) return;
        socket.broadcast.emit('systemmessage', `${players[socket.id].username} joined.`);
        socket.emit('position', rooms[room].indexOf(socket.id));
        for(var i=rooms[room].length-1;i>=0;i--){
            if(socket.id!=rooms[room][i]) {
                let player = players[rooms[room][i]];
                let playerinfo = {
                    username: player.username,
                    isOwner: ifOperator(rooms[room][i],room)
                }
                socket.emit('userconnect', rooms[room][i],playerinfo);
                console.log("sending :"+rooms[room][i]);
                console.log("user_position :"+i);
            }   
        }
        //socket.emit('systemmessage', `your socket: (${socket.id})`);
        socket.emit('append');
    });
    socket.on('kickplayer', (roomname,index)=>{
        if(operators[roomname]==socket.id&&operators[roomname]!=rooms[roomname][index]) kickplayer(socket,rooms[roomname][index],"you have been kicked");
    });
    socket.on('banplayer', (roomname,index)=>{
        if(operators[roomname]==socket.id&&operators[roomname]!=rooms[roomname][index]) banplayer(socket,roomname,rooms[roomname][index],"you have been kicked");
    });
    socket.on('startgame', (roomname)=>{
        if(operators[roomname]==socket.id) {
            socket.emit('startgame');
            socket.to(roomname).emit('startgame');
            setGame(roomname,true);
        }
    });
    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
        socket.emit('systemmessage', `You joined the room.`);
        if(players[socket.id]){
            const operator = operators[players[socket.id].room]
        
            if(socket.id==operator){
                socket.emit('systemmessage', `You are the operator.`);
                socket.emit('operator');
            } 
        }
    });

    socket.on('leaveRoom', (roomName) => {
        socket.leave(roomName);
    });

    socket.on('roomMessage', ({ roomName, message }) => {
        if(players[socket.id]){
            const player = {
                username: players[socket.id].username,
                color: players[socket.id].color
            }
            socket.to(roomName).emit('usermessage', player,`${sanitizeMessage(message)}`);
            let operator = "";
            //if(ifOperator(roomName,socket.id)) operator = "(/\\/\\)";

            socket.emit('usermessage', player,`${sanitizeMessage(message)}`);
        }
    });
    socket.on('disconnect', () => {
        if(players[socket.id]){
        const player = players[socket.id];
        //console.log(`${player.id} left.`);
        if(!checkBannedPlayers(player.room,player.id)){
            socket.broadcast.emit('systemmessage', `${player.username} left.`);
        }
        socket.broadcast.emit('userdisconnect', socket.id);
        socket.emit('userdisconnect', socket.id);
        delete players[socket.id];
        const index = rooms[player.room].indexOf(socket.id);
        rooms[player.room].splice(index,1); //delete player from room
        updateOperator(socket,player);
        deleteRoom(player.room); //delete room
        socket.broadcast.emit('position', index);
        }
    });
    socket.on('userstream', ({ frame, roomName }) => {
        const userId = socket.id;
        const player = players[userId];
        //console.log(player);
        socket.to(roomName).emit('userstream', { frame, userId,player});
    });
});
server.listen(port, () => {
    console.log('server running at http://localhost:3000');
});
