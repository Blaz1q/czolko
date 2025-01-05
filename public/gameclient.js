var fps = 30;
var append = false;
// Capture video
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
const roomName = getQueryParam('room');
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then((stream) => {
        const video = document.querySelector('video');
        const { width, height } = stream.getVideoTracks()[0].getSettings();
        video.srcObject = stream;

        // Send frames to server
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        setInterval(() => {
            context.drawImage(video, 0, 0, width, height);
            const frame = canvas.toDataURL('image/webp');
            socket.emit('userstream', { frame,roomName });
        }, 1000 / fps);
    })
    .catch((error) =>{
        console.error('Error accessing webcam:', error);
        socket.emit('userstream', { undefined,roomName });
    });

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
    joinRoom();
});

// Join a room
function joinRoom() {
    socket.emit('joinRoom', roomName);
    console.log(`Joined room: ${roomName}`);
}

// Leave a room
function leaveRoom() {
    socket.emit('leaveRoom', roomName);
    console.log(`Left room: ${roomName}`);
}

// Send message to a room
document.getElementById("userMessage").addEventListener("keypress", function(event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });
function sendMessage() {
    let message = sanitizeMessage(document.getElementById("userMessage").value);
    if(message.length>0&&message!=' ') socket.emit('roomMessage', { message, roomName });
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
function createVideoElement(userId,playerinfo) {
    const videoContainer = document.createElement('div');
    videoContainer.id = `user-${userId}`;
    videoContainer.className = 'video-container';
    const username = document.createElement('p');
    const node = document.createTextNode(playerinfo.username);
    username.appendChild(node);
    const video = document.createElement('img');
    video.id = `video-${userId}`;
    videoContainer.appendChild(username);
    videoContainer.appendChild(video);
    if(append) streamsContainer.appendChild(videoContainer);
    else streamsContainer.prepend(videoContainer);
    return video;
}
socket.on('append',()=>{
    append = true;
});
// Remove a video element when a user disconnects
function removeVideoElement(userId) {
    const videoContainer = document.getElementById(`user-${userId}`);
    if (videoContainer) {
        videoContainer.remove();
    }
}
function addUserVideo(userId,playerinfo){
    let video = document.getElementById(`video-${userId}`);
    if (!video) {
        video = createVideoElement(userId,playerinfo);
    }
    return video;
}
socket.on('userdisconnect', (userId) => {
    removeVideoElement(userId);
    console.log("removed "+userId);
});
socket.on('userconnect', (userId,playerinfo) => {
    console.log("user connect");
    addUserVideo(userId,playerinfo);
    console.log("added "+userId);
});

socket.on('userstream', ({ frame, userId ,player}) => {
    //console.log("user stream");
    let vid = addUserVideo(userId,player);
    if(frame) vid.src = frame;
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
function formatUserMessage(message) {
    const chatmessage = document.createElement('p');
    const node = document.createTextNode(message);
    chatmessage.style.color = "black";
    chatmessage.appendChild(node);
    return chatmessage;
}
function sendOperatorCommand(){
    socket.emit('operator',(roomName));
}
socket.on('systemmessage', (message) => {
    let chat = document.getElementById("chat");
    chat.append(formatSystemMessage(message));
});
socket.on('systemhiddenmessage', (message) => {
    let chat = document.getElementById("chat");
    chat.append(formatSystemHiddenMessage(message));
});
var isOperator = false;
socket.on('operator', ()=>{
    isOperator = true;
    //if you change the value, the server will still know who is the operator ;*
});
socket.on('usermessage', (message) => {
    let chat = document.getElementById("chat");
    chat.append(formatUserMessage(message));
    chat.scrollTop = chat.scrollHeight;
});