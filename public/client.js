var fps = 30;
let isCameraOn = true;
const nocamera = document.getElementById("nocamera");
const nocamerabutton = document.getElementById("cameraoff");
const video = document.querySelector('video');
const popup = document.getElementById("popup");
const error_message = document.getElementById("error_message");
const popup_image = document.getElementById("popup_image");
// Capture video
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
const message = getQueryParam('message');
const roomName = getQueryParam('room');
const error_image = getQueryParam('image');
console.log(message);
if(roomName){
    document.getElementById("join").innerHTML = "join Room";
}
if(message){
    showPopup();
}
function toggleCamera(){
    if (!isCameraOn) {
        video.style.display="none";
        nocamera.style.display="block";
        nocamerabutton.style.display="block";
    } else {
        video.style.display="block";
        nocamera.style.display="none";
        nocamerabutton.style.display="none";
    }
}
startCamera();
function startCamera(){
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then((stream) => {
        const { width, height } = stream.getVideoTracks()[0].getSettings();
        video.srcObject = stream;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        isCameraOn=true;
        toggleCamera();
        setInterval(() => {
            context.drawImage(video, 0, 0, width, height);
         }, (1000 / fps));
    })
    .catch((error) => {
        console.error('Error accessing webcam:', error); 
        isCameraOn=false;
        toggleCamera();
    });
}
// Handle connection and UUID
const CLIENT_USERNAME = 'gamerusername';
const CLIENT_AVATAR = 'gameravatar';
function sanitizeString(str) {
    return str.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
}
function buttonUsername(){
    let username = document.getElementById("gamerusername").value;
    console.log(username);
    changeUsername(username);
}
function showPopup(){
popup.style.display="flex";
let dir = "./imgs/";
switch(error_image){
    case 'banned':
        popup_image.src = dir+"banned_image.png";
        break;
    case 'error':
        popup_image.src = dir+"error_image.png";
        break;
    case 'kicked':
        popup_image.src = dir+"kicked_image.png";
        break;
    default:
        popup_image.src = dir+"error_image.png";
        break;
}
error_message.innerHTML = message;
}
function closePopup(){
    popup.style.display="none";
}
function changeUsername(username){
    let clientUSERNAME = sanitizeString(username);
    if(clientUSERNAME.length>0) localStorage.setItem(CLIENT_USERNAME, clientUSERNAME);
    console.log(localStorage.getItem(CLIENT_USERNAME));
}
function CreateRoom(){
    if(roomName) window.location.href = `/lobby?room=${roomName}`;
    else{
        window.location.href = `/lobby?room=${"100040008000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        )}`;
    }
}