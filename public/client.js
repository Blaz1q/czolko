var fps = 30;

// Capture video
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
const message = getQueryParam('message');
const roomName = getQueryParam('room');
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then((stream) => {
        const video = document.querySelector('video');
        const { width, height } = stream.getVideoTracks()[0].getSettings();
        video.srcObject = stream;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        setInterval(() => {
            context.drawImage(video, 0, 0, width, height);
         }, 1000 / fps);
    })
    .catch((error) => console.error('Error accessing webcam:', error));

// Handle connection and UUID
const CLIENT_USERNAME = 'gamerusername';
const CLIENT_AVATAR = 'gameravatar';
function sanitizeString(str) {
    return str.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
}
function buttonUsername(){
    let username = document.getElementById("gamerusername").value;
    changeUsername(username);
}
function buttonAvatar(){
    let avatar = parseInt(document.getElementById("gameravatar").value);
    changeAvatar(avatar);
}
function changeUsername(username){
    let clientUSERNAME = sanitizeString(username);
    localStorage.setItem(CLIENT_USERNAME, clientUSERNAME);
}
function changeAvatar(avatar){
    let clientAVATAR = Math.floor(Math.random() * 10);
    clientAVATAR = avatar;
    localStorage.setItem(CLIENT_AVATAR, clientAVATAR);
}
function CreateRoom(){
    if(roomName) window.location.href = `/lobby?room=${roomName}`;
    else{
        window.location.href = `/lobby?room=${"100040008000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        )}`;
    }
}