const connectButton = document.getElementById('connect')
const status = document.getElementById('status')
const videoContainer = document.getElementById('video')
let connected = false
let room
let screenTrack

function displayPresenterVideo() {
    Twilio.Video.createLocalVideoTrack().then(track => {
        videoContainer.appendChild(track.attach())
    })
}

function publishPresenterScreen() {
    navigator.mediaDevices.getDisplayMedia({
        video: {
            width: 1280,
            height: 720
        }
    }).then(stream => {
        screenTrack = new Twilio.Video.LocalVideoTrack(stream.getTracks()[0], {name: 'screen'})
        room.localParticipant.publishTrack(screenTrack)
        screenTrack.mediaStreamTrack.onended = connectButtonHandler
    }).catch((error) => {
        alert('Could not share the screen.')
        console.error(`Unable to share screen: ${error.message}`)
    })
}

function connectButtonHandler(event) {
    event.preventDefault()
    if (!connected) {
        connectButton.disabled = true
        connectButton.innerHTML = 'Connecting...'
        connect().then(() => {
            connectButton.innerHTML = 'Stop Presentation'
            connectButton.disabled = false
        }).catch(error => {
            alert('Connection failed.')
            console.error(`Unable to connect: ${error.message}`)
            connectButton.innerHTML = 'Start Presenting!'
            connectButton.disabled = false
        })
    } else {
        disconnect()
        connectButton.innerHTML = 'Start Presenting!'
    }
}

function setSubscribeRule(username) {
    fetch(`/set-rule?username=${username}`, {method: 'POST'}).catch(error => {
        console.error(`Unable to set subscribe rule: ${error.message}`)
    })    
}

function connect() {
    let promise = new Promise((resolve, reject) => {
        fetch('/token?present=true', {method: 'POST'}).then(res => res.json()).then(data => {
            return Twilio.Video.connect(data.token, {
                automaticSubscription: false
            })
        }).then(_room => {
            room = _room
            setSubscribeRule(username='presenter')
            publishPresenterScreen()
            room.on('participantConnected', participantConnected)
            room.on('participantDisconnected', participantDisconnected)
            connected = true
            updateParticipantCount()
            resolve()
        }).catch(error => {
            console.error(`Unable to connect to Room: ${error.message}`)
            reject()
        })
    })
    return promise
}

function disconnect() {
    room.disconnect()
    connected = false
    updateParticipantCount()
    endPresentation()
}

function endPresentation() {
    console.log('The presentation is over.')
    // unpublish screen track
    room.localParticipant.unpublishTrack(screenTrack)
    screenTrack.stop()
    screenTrack = null
}

function updateParticipantCount() {
    if (!connected) {
        status.innerHTML = 'Disconnected'
    } else {
        status.innerHTML = room.participants.size + ' participants are watching.'
    }
}

function participantConnected(participant) {
    console.log(`${participant.identity} just joined the room.`)
    updateParticipantCount()
}

function participantDisconnected(participant) {
    console.log(`${participant.identity} left the room.`)
    updateParticipantCount()
}

window.addEventListener('beforeunload', () => {
    endPresentation()
})

displayPresenterVideo()
connectButton.addEventListener('click', connectButtonHandler)
