const video = document.getElementById('presenter');
const screen = document.getElementById('screen');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const connectButton = document.getElementById('connect');
const status = document.getElementById('status');
let connected = false;
let screenTrack;
let presenterName;
let room;

function displayPresenterVideo() {
    Twilio.Video.createLocalVideoTrack().then(track => {
        video.appendChild(track.attach());
    });
};

function displayPresenterScreen() {
    navigator.mediaDevices.getDisplayMedia({
        video: {
            width: 1280,
            height: 720
        }
    }).then(stream => {
        screenTrack = new Twilio.Video.LocalVideoTrack(stream.getTracks()[0]);
        room.localParticipant.publishTrack(screenTrack);
        screen.appendChild(screenTrack.attach());
        screenTrack.mediaStreamTrack.onended = () => { displayPresenterScreen() };
    }).catch((error) => {
        alert('Could not share the screen.');
        console.error(`Unable to share screen: ${error.message}`);
    });
};

function connectButtonHandler(event) {
    event.preventDefault();
    if (!connected) {
        let username = usernameInput.value;
        let password = passwordInput.value;
        if (!username) {
            alert('Enter your name before connecting.');
            return;
        }
        connectButton.disabled = true;
        connectButton.innerHTML = 'Connecting...';
        connect(username, password).then(() => {
            connectButton.innerHTML = 'Leave';
            connectButton.disabled = false;
        }).catch(error => {
            alert('Connection failed.');
            console.error(`Unable to connect: ${error.message}`);
            connectButton.innerHTML = 'Join';
            connectButton.disabled = false;
        });
    } else {
        disconnect();
        connectButton.innerHTML = 'Join';
    }
};

function connect(username, password) {
    let promise = new Promise((resolve, reject) => {
        fetch('/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({'username': username, 'password': password})
        }).then(res => res.json()).then(data => {
            presenterName = data.presenter;
            console.log('start connect to twilio', data);
            return Twilio.Video.connect(data.token);
        }).then(_room => {
            room = _room;
            console.log('join room', room, presenterName);
            if (presenterName != '') {
                displayPresenterVideo();
                displayPresenterScreen();
                // alert('Settle down everyone, the presentation is about to start!');
            }
            room.participants.forEach(participantConnected);
            room.on('participantConnected', participantConnected);
            room.on('partcipantDisconnected', participantDisconnected);
            connected = true;
            updateParticipantCount();
            resolve();
        }).catch(error => {
            console.error(`Unable to connect to Room: ${error.message}`);
            reject();
        });
    });
    return promise;
};

function disconnect () {
    room.disconnect();
    connected = false;
    updateParticipantCount();
};

function updateParticipantCount() {
    if (!connected) {
        status.innerHTML = 'Disconnected';
    } else {
        status.innerHTML = room.participants.size + ' participants are watching.';
    }
};

function participantConnected(participant) {
    console.log('new user', participant.identity);
    updateParticipantCount();
};

function participantDisconnected(participant) {
    if (participant.identity == presenterName) {
        room.localParticipant.unpublishTrack(screenTrack);
        screenTrack.stop();
        screenTrack = null;
        alert('The presentation is over, goodbye!');
    }
    updateParticipantCount();
};

connectButton.addEventListener('click', connectButtonHandler);
