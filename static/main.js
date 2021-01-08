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
    navigator.mediaDevices.getDisplayMedia().then(stream => {
        screenTrack = new Twilio.Viddeo.LocalVideoTrack(stream.getTracks()[0]);
        room.localParticipant.publishTrack(screenTrack);
        screenTrack.mediaStreamTrack.onended = () => {displayPresenterScreen() };
    }).catch(() => {
        alert('Could not share the screen.');
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
        }).catch(() => {
            alert('Connection failed.');
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
            // if (data.presenter != '') {
            //     presenterName = data.presenter;
            //     displayPresenterVideo();
            //     displayPresenterScreen();
            // }
            console.log('start connect to twilio', data);
            return Twilio.Video.connect(data.token);
        }).then(_room => {
            room = _room;
            console.log('join room', room, data);
            room.on('participantConnected', participantConnected);
            room.on('partcipantDisconnected', participantDisconnected);
            connected = true;
            updateParticipantCount();
            resolve();
        }).catch(() => {
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
    if (participant.identity == presenterName) {
        displayPresenterVideo();
        displayPresenterScreen();
        alert('Settle down everyone, the presentation is about to start!');
    }
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
