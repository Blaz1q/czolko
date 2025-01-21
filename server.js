const express = require('express');
const app = express();

const http = require('http');
const port = 3000;
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');
const { json } = require('stream/consumers');

const players = {};
const rooms = [];
const operators = [];
const bannedplayers = [];
const roomsettings = {};
const words = {
    polski: {
        normalne:["zając","prezes","kucharz","autobus","dinozaur","ananas","kotek","góral","komputer",
            "królowa","wędkarz","lekarka","budowlaniec","morderca","wilk","magik","piłkarz",
            "papuga","kaskader","malarz","muzyk","piwo","kawa","gitarzysta","pijak","szef",
            "tata","mama","pożar","psycholog","robot","kurtka","krowa","telefon","samochód",
            "plac zabaw","szkoła","las","jezioro","park","plaża","ogród","miasto","stadion","wieś",
            "Cristiano Ronaldo","Mikołaj","czarodziej","księżniczka","rycerz","pirat","detektyw","doktor","policjant","nauczyciel",
            "pizza","jabłko","banan","chleb","ciasto","lody","czekolada","kanapka","pierogi","sernik","Albert Einstein","Abraham Lincoln",
            "Pablo Picasso","Elon Musk","Michael Jackson"],
        cenzura:["sztuczna cipa","sperma","fiut","duże cyce","małe cyce","cyce miseczka c"]
    }
}
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
function shuffleArray(array) {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function startGame(socket,roomname){
    let shuffleword = words.polski.normalne.slice();
    shuffleArray(shuffleword);
    for(var i=0;i<rooms[roomname].length;i++){
        let player = players[rooms[roomname][i]];
        player.word = shuffleword[i]; 
    }
    for (var i = 0; i < rooms[roomname].length; i++) {
        for (var j = 0; j < rooms[roomname].length; j++) {
            if (i !== j) {
                socket.broadcast.to(rooms[roomname][j]).emit('word', rooms[roomname][i], shuffleword[i]);
                if(j==0) socket.emit('word', rooms[roomname][i], shuffleword[i]); //nie wiem czemu działa, ale działa.
            }
            else{
                if(j==0) socket.emit('word', rooms[roomname][i], "???");
                socket.broadcast.to(rooms[roomname][j]).emit('word', rooms[roomname][i], "???");
            }
        }
    }
}
function endGame(socket,roomname){

}
function setGame(socket,roomname,isStarted){
    roomsettings[roomname].isstarted = isStarted;
}
function addPlayer(socket, clientUuid, name, outfit, room) {
    players[socket.id] = { 
        id: clientUuid,
        socket: socket.id,
        color: colors[Math.floor(Math.random()*colors.length)],
        username: sanitizeString(name), 
        avatar: outfit,
        room: room,
        word: "",
        lang: "polski",
    };
    console.log(players[socket.id]);
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
        if(roomsettings[room].isstarted){
            socket.emit('kickplayer',"game is started");
            delete players[socket.id];
            return;
        }
    }
    if(!rooms[room]){
        rooms[room] = [];
        roomsettings[room] = {
            isstarted: false,
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
        socket.join(room);
        socket.emit('systemmessage', `You joined the room.`);
        socket.to(room).emit('systemmessage', `${players[socket.id].username} joined.`);
        socket.emit('position', rooms[room].indexOf(socket.id));
        for(var i=rooms[room].length-1;i>=0;i--){
            if(socket.id!=rooms[room][i]) {
                let player = players[rooms[room][i]];
                let playerinfo = {
                    socket: rooms[room][i],
                    username: player.username,
                    isOwner: ifOperator(rooms[room][i],room)
                }
                socket.emit('userconnect',playerinfo);
                console.log("sending :"+rooms[room][i]);
                console.log("user_position :"+i);
            }   
        }
        if(players[socket.id]){
            const operator = operators[players[socket.id].room]
        
            if(socket.id==operator){
                socket.emit('systemmessage', `You are the operator.`);
                socket.emit('operator');
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
            setGame(socket,roomname,true);
            socket.emit('startgame');
            socket.to(roomname).emit('startgame');
            startGame(socket,roomname);
        }
    });
    socket.on('endGame',(roomname)=>{
        
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
        if(rooms[player.room].length<2){
            socket.broadcast.to(player.room).emit('endGame');
        }
        updateOperator(socket,player);
        deleteRoom(player.room); //delete room
        socket.broadcast.emit('position', index);
        }
    });
    socket.on('userstream', ({ frame, roomName }) => {
        const userId = socket.id;
        const player = players[userId];
        //console.log(rooms[roomName]);
        socket.to(roomName).emit('userstream', { frame, player});
    });
});
server.listen(port, () => {
    console.log('server running at http://localhost:3000');
});
