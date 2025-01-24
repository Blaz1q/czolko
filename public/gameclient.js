var fps = 12;
var append = false;
let videoStream = null; // To store the current stream
let videoTrack = null; // To store the video track
let isCameraOn = false; // Camera state
var requestCounter = 0;
const requestLimit = 3;
var canSendMessage=true;
var penaltyCounter=0;
const penaltyDuration=30;
const video = document.querySelector('video');
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
const nocamera = document.getElementById("nocamera");
var gameplay_container = true;
var player_counter=1;
// Capture video
const messages = {
    polski: {
        joined: "dołączył.",
        left: "wyszedł.",
        banned: "został zbanowany.",
        kicked: "został wyrzucony.",
        isOperator: "został operatorem.",
        youAreOperator: "jesteś operatorem.",
        youBecameOperator: "zostałeś teraz operatorem.",
        tooManyPlayers: "za dużo osób.",
        gameStarted: "gra jest rozpoczęta.",
    },
    english: {
        joined: "joined.",
        left: "left.",
        banned: "banned.",
        kicked: "kicked.",
        isOperator: "is operator.",
        youAreOperator: "you are the operator.",
        youBecameOperator: "you are the operator.",
        tooManyPlayers: "too many players",
        gameStarted: "game started",
    }
}
function getMessages(lang){
    switch(lang){
        case "polski":
            return messages.polski;
        case "english":
            return messages.english;
    }
    return messages.english;
}
let gameSettings = {
    gamemode: "default",
    customWordset: "",
    maxPlayers: 8
}
function copylink(){
    navigator.clipboard.writeText(`http://localhost:3000/?room=${roomName}`);
}
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
function kickplayer(id){
    console.log(`kickplayer ${roomName} ${id}`);
    socket.emit('kickplayer',roomName,id);    
}
function banplayer(id){
    console.log(`banplayer ${roomName} ${id}`);
    socket.emit('banplayer',roomName,id);    
}
function startGame(){
    if(player_counter>1) socket.emit('startgame',roomName);
}
socket.on('startgame',()=>{
    console.log("game started :)");
    updateClassStyle("gameplay_buttons", "display", "block");
    //hide menu
    //get gamemode
    //gamemode = normal -> losuje gracza, wymyślasz mu pytanie (shuffle), timer 30 sek na wymyślenie słowa
    //gamemode = losowo -> gra wymyśla każdemu słowo (słowa nie mogą się powtarzać), cooldown timer 10 sek.
    //gamemode = tematyczne -> wybierasz graczowi jedno z 3 słów (żadne ze słów nie może się powtarzać w grze), cooldown timer 10 sek.
});
socket.on('endGame',()=>{
    let users = document.getElementsByClassName("video-container");
    for(var i=0;i<users.length;i++){
        let id = users[i].id;
        document.getElementById(`${id}-word`).remove();
    }
    updateClassStyle("gameplay_buttons", "display", "none");
});
const roomName = getQueryParam('room');

const scaleFactor = 0.4;
const quality = 0.6; 
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
            videoStream = stream;
            videoTrack = stream.getVideoTracks()[0];
            const { width, height } = videoTrack.getSettings();
            video.srcObject = stream;
            
            canvas.width = width * scaleFactor;
            canvas.height = height * scaleFactor;
            isCameraOn = true;
            toggleCameraDisplay();
            setInterval(() => {
                if (isCameraOn && videoTrack.readyState === 'live' && videoTrack.enabled) {
                    context.drawImage(video, 0, 0, width*scaleFactor, height*scaleFactor);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            socket.emit('userstream', { frame: blob, roomName });
                        }
                    }, 'image/jpeg', quality);
                }
            }, 1000 / fps);
        })
        .catch((error) => {
            console.error('Error accessing webcam:', error);
            toggleCameraDisplay();
            socket.emit('userstream', { frame: null, roomName });
        });
}
const gamemode = document.getElementById("gamemode");
const settings = document.getElementById("settings");
function showGameplaycontainer(){
    if(!gameplay_container){
        gamemode.style.display = "block";
        settings.style.display = "none";
        gameplay_container = true;
    }
}
function showSettingscontainer(){
    if(gameplay_container){
        gamemode.style.display = "none";
        settings.style.display = "block";
        gameplay_container = false;
    }
}
function toggleCameraDisplay(){
    if (!isCameraOn) {
        video.style.display="none";
        nocamera.style.display="block";
    } else {
        video.style.display="block";
        nocamera.style.display="none";
    }
}
startCamera();
function stopCamera() {
    if (videoTrack) {
        videoTrack.stop();
        isCameraOn = false;
        toggleCameraDisplay();
        //toggleButton.textContent = 'Turn Camera On';
        socket.emit('userstream', { frame: null, roomName });
    }
}
// Toggle camera on/off
function toggleCamera(){
    toggleCameraDisplay();
    if (isCameraOn) {
        stopCamera();
    } else {
        startCamera();
    }
}
// Handle connection and UUID
const CLIENT_UUID = 'uuid';
const CLIENT_USERNAME = 'gamerusername';
const CLIENT_AVATAR = 'gameravatar';
socket.on("connect", () => {
    let clientUuid = localStorage.getItem(CLIENT_UUID);
    let clientUSERNAME = localStorage.getItem(CLIENT_USERNAME);
    let clientAVATAR = localStorage.getItem(CLIENT_AVATAR);
    if (!clientUuid) {
        clientUuid = "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
        localStorage.setItem(CLIENT_UUID, clientUuid);
    }
    if(!clientUSERNAME){
        clientUSERNAME = "FajnyZiomek"+Math.floor(Math.random() * 100);
        localStorage.setItem(CLIENT_USERNAME, clientUSERNAME);
    }
    if(!clientAVATAR){
        clientAVATAR = Math.floor(Math.random() * 10);
        localStorage.setItem(CLIENT_AVATAR, clientAVATAR);
    }
    socket.emit('connected', clientUuid,clientUSERNAME,clientAVATAR,roomName);
    document.getElementById("client-username").innerText=clientUSERNAME;
    let locals = document.getElementById("localStream");
    locals.id = "user-"+socket.id;
    enableSettings();
});

// Send message to a room
document.getElementById("userMessage").addEventListener("keypress", function(event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
});
function applyPenalty() {
    canSendMessage = false;
    penaltyCounter++;
    const duration = penaltyDuration * penaltyCounter;
    let penalty = 0;

    // Store the interval ID
    const intervalId = setInterval(() => {
        console.log(penalty);
        if (penalty === duration) {
            clearInterval(intervalId);
            canSendMessage = true; 
        } else {
            canSendMessage = false;
            penalty++;
        }
    }, 1000);
}
setInterval(()=>{
    requestCounter=0;
},1000);

function sendMessage() {
    if(canSendMessage){
        let message = sanitizeMessage(document.getElementById("userMessage").value);
        if(message.length>0&&message!=' '){
            socket.emit('roomMessage', { message, roomName });
            requestCounter++;
            if(requestCounter>requestLimit) applyPenalty();
        }
    }
    else{
        systemHiddenMessage(`spam detected. Your penalty is ${penaltyDuration*penaltyCounter} seconds.`);
    }
    document.getElementById("userMessage").value = "";
    
}
function sanitizeString(str) {
    return str.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
}
function sanitizeMessage(str) {
       str = str.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s!?.,]/g, '');
       return str.replace(/\s+/g, ' ').trim();
}
// Create video element for user stream
function createText(text){
    return document.createTextNode(text);
}
function addListener(classname,funct){
    document.addEventListener('click', event => {
        if (event.target.classList.contains(classname)) {
            const buttons = Array.from(document.querySelectorAll(`.${classname}`));
            const index = buttons.indexOf(event.target);
            if (index !== -1) {
                //function here
                console.log(`Button ${index + 1} was clicked`);
                funct(index+1);
            }
        }
    });
}
function createVideoElement(playerinfo) {
    const videoContainer = document.createElement('div');
    videoContainer.id = `user-${playerinfo.socket}`;
    videoContainer.className = 'video-container';
    const username = document.createElement('p');
    const button_tak = document.createElement('button');
    const button_nie = document.createElement('button');
    const button_kick = document.createElement('button');
    const button_ban = document.createElement('button');
    
    username.appendChild(createText(playerinfo.username));
    button_tak.appendChild(createText("tak"));
    button_nie.appendChild(createText("nie"));
    button_kick.appendChild(createText("kick"));
    button_ban.appendChild(createText("ban"));
    
    button_tak.classList.add("gameplay_buttons");
    button_nie.classList.add("gameplay_buttons");
    button_kick.classList.add("operator_commands");
    button_kick.classList.add("operator_kick");
    button_ban.classList.add("operator_commands");
    button_ban.classList.add("operator_ban");
    
    username.classList.add("username");
    const video = document.createElement('img');
    video.id = `video-${playerinfo.socket}`;
    videoContainer.appendChild(username);
    videoContainer.appendChild(video);
    videoContainer.appendChild(button_tak);
    videoContainer.appendChild(button_nie);
    videoContainer.appendChild(button_kick);
    videoContainer.appendChild(button_ban);
    if(append) streamsContainer.appendChild(videoContainer);
    else streamsContainer.prepend(videoContainer);
    return video;
}//userId can be in playerinfo.
addListener("operator_kick",kickplayer);
addListener("operator_ban",banplayer);
socket.on('append',()=>{
    append = true;
});
function addWord(userId,word){
    const videoContainer = document.getElementById(`user-${userId}`);
    const wordcontainer = document.createElement('p');
    wordcontainer.id = `user-${userId}-word`;
    const wordstring = document.createTextNode(word);
    wordcontainer.appendChild(wordstring);
    videoContainer.appendChild(wordcontainer);
}
// Remove a video element when a user disconnects
function removeVideoElement(userId) {
    const videoContainer = document.getElementById(`user-${userId}`);
    if (videoContainer) {
        videoContainer.remove();
        player_counter--;
    }
}
function addUserVideo(playerinfo){
    let video = document.getElementById(`video-${playerinfo.socket}`);
    if (!video) {
        video = createVideoElement(playerinfo);
        player_counter++;
    }
    return video;
}
socket.on('userdisconnect', (userId) => {
    removeVideoElement(userId);
    console.log("removed "+userId);
});
socket.on('userconnect', (playerinfo) => {
    console.log("user connect");
    let vid = addUserVideo(playerinfo);
    console.log("added "+playerinfo.socket);
    vid.src = "./imgs/camera_disabled.png";
});
socket.on('word', (index,word) => {
    addWord(index,word);
    console.log(`${index} ${word}`);
});

socket.on('userstream', ({ frame, player }) => {
    // Ensure frame is wrapped in an array for Blob construction
    const blob = new Blob([frame], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    let vid = addUserVideo(player);
    if (url) {
        vid.src = url;

        // Revoke the Blob URL after the video or image has loaded
        vid.onload = () => URL.revokeObjectURL(url);
        vid.onerror = () => {
            console.error('Failed to load video/image');
            vid.src = "./imgs/camera_disabled.png";
            URL.revokeObjectURL(url);
        };
    } 
    if(!frame){
        vid.src = "./imgs/camera_disabled.png";
    }
});
function formatSystemMessage(message) {
    const chatmessage = document.createElement('p');
    const node = document.createTextNode(message);
    chatmessage.style.color = "red";
    chatmessage.appendChild(node);
    return chatmessage;
}
function formatSystemHiddenMessage(message) {
    const chatmessage = document.createElement('p');
    const node = document.createTextNode(message);
    chatmessage.style.color = "darkred";
    chatmessage.appendChild(node);
    return chatmessage;
}
function formatUserMessage(player,message) {
    const chatmessage = document.createElement('p');
    const node = document.createTextNode(message);
    const username = document.createElement('span');
    const usernamenode = document.createTextNode(player.username+": ");
    username.style.color = player.color;
    username.appendChild(usernamenode);
    chatmessage.style.color = "black";
    chatmessage.appendChild(username);
    chatmessage.appendChild(node);
    return chatmessage;
}
function sendOperatorCommand(){
    socket.emit('operator',(roomName));
}
socket.on('systemmessage', (message) => {
    let chat = document.getElementById("chat");
    let isScrolledToBottom = Math.abs(chat.scrollTop + chat.clientHeight - chat.scrollHeight) < 5;
    chat.append(formatSystemMessage(message));
    shouldScroll(isScrolledToBottom,chat);
});
function systemHiddenMessage(message){
    let chat = document.getElementById("chat");
    let isScrolledToBottom = Math.abs(chat.scrollTop + chat.clientHeight - chat.scrollHeight) < 5;
    chat.append(formatSystemHiddenMessage(message));
    shouldScroll(isScrolledToBottom,chat);
}
socket.on('systemhiddenmessage', (message) => {
    systemHiddenMessage(message);
});
function updateClassStyle(className, property, value) {
    for (let sheet of document.styleSheets) {
        try {
            if (!sheet.cssRules) continue;
            for (let rule of sheet.cssRules) {
                if (rule.selectorText === `.${className}`) {
                    rule.style[property] = value; 
                    return;
                }
            }
            sheet.insertRule(`.${className} { ${property}: ${value}; }`, sheet.cssRules.length);
            return;
        } catch (err) {
            console.warn(`Unable to access stylesheet: ${sheet.href}`, err);
        }
    }
    console.error(`Could not find or modify the class: .${className}`);
}
function enableSettings(){
    let operatorOnly = document.getElementsByClassName("operatorOnly");
    console.log(operatorOnly);
    for(var i=0;i<operatorOnly.length;i++){
        operatorOnly[i].disabled = !isOperator;
    }
    if(isOperator) updateClassStyle("operator_commands", "display", "block");
    else updateClassStyle("operator_commands", "display", "none");
}
function saveSettings(){
    let operatorOnly = document.getElementsByClassName("operatorOnly");
    for(var i=0;i<operatorOnly.length;i++){
        console.log();
        switch(operatorOnly[i].getAttribute('name')){
            case 'gameplay':
                if(operatorOnly[i].checked){
                    gameSettings.gamemode = operatorOnly[i].value;
                }
            break;
            case 'maxplayers':
                if(operatorOnly[i].value){
                    gameSettings.maxPlayers = parseInt(operatorOnly[i].value);
                }
            break;
            case 'customwordset':
                if(sanitizeMessage(operatorOnly[i].value)!=""){
                    var safe_text = sanitizeMessage(operatorOnly[i].value);
                    var arr = safe_text.split(',')
                    .filter(entry => entry.trim() !== '')
                    .join(',');
                    console.log(arr);
                    gameSettings.customWordset=arr.toString();
                }    
            break;
        }
    }
    console.log(gameSettings);
    socket.emit('settings',gameSettings);
}
function changeRoomSettings(){
    //Roomsize
    //CustomWordset
    //time
}
var isOperator = false;
socket.on('operator', ()=>{
    isOperator = true;
    enableSettings();
    //if you change the value, the server will still know who is the operator ;*
});
function shouldScroll(isScrolledToBottom,chat){
        // console.log("scroll top: "+chat.scrollTop);
        // console.log("client height: "+chat.clientHeight);
        // console.log("scroll height: "+chat.scrollHeight);
    requestAnimationFrame(() => {
        if (isScrolledToBottom) {
            chat.scrollTop = chat.scrollHeight;
        }
    });
}
socket.on('banned',(message)=>{
    window.location.href = `/?message=${message}`;
});
socket.on('kickplayer',(message) =>{
    window.location.href = `/?message=${message}`;
});
socket.on('usermessage', (player,message) => {
    let chat = document.getElementById("chat");
    let isScrolledToBottom = Math.abs(chat.scrollTop + chat.clientHeight - chat.scrollHeight) < 5;
    chat.append(formatUserMessage(player,message));
    shouldScroll(isScrolledToBottom,chat);
});