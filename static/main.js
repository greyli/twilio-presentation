const connectButton = document.getElementById('connect')
const status = document.getElementById('status')
const screenContainer = document.getElementById('screen')
const videoContainer = document.getElementById('presenter')
let connected = false
let room

function connectButtonHandler(event) {
    event.preventDefault()
    if (!connected) {
        connectButton.disabled = true
        connectButton.innerHTML = 'Connecting...'
        connect().then(() => {
            connectButton.innerHTML = 'Leave'
            connectButton.disabled = false
        }).catch(error => {
            alert('Connection failed.')
            console.error(`Unable to connect: ${error.message}`)
            connectButton.innerHTML = 'Join'
            connectButton.disabled = false
        })
    } else {
        disconnect()
        connectButton.innerHTML = 'Join'
    }
}

function subscribe() {
    fetch('/subscribe', {method: 'POST'}).catch(error => {
        console.error(`Unable to set subscribe rule: ${error.message}`)
    })    
}


function connect() {
    let promise = new Promise((resolve, reject) => {
        fetch('/token', {method: 'POST'}).then(res => res.json()).then(data => {
            return Twilio.Video.connect(data.token, {
                automaticSubscription: false,
                audio: false,
                video: false
            })
        }).then(_room => {
            room = _room
            subscribe()
            room.participants.forEach(participantConnected)
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
    // display presenter's tracks for new participant
    if (participant.identity == 'presenter') {
        participant.on('trackSubscribed', track => trackSubscribed(track))
        participant.on('trackUnsubscribed', trackUnsubscribed)
    }
    updateParticipantCount()
}

function participantDisconnected(participant) {
    console.log(`${participant.identity} left the room.`)
    if (participant.identity == 'presenter') {
        alert('The presentation is over.')
    }
    updateParticipantCount()
}

function trackSubscribed(track) {
    if (track.name == 'screen') {
        screenContainer.appendChild(track.attach())
    } else {
        videoContainer.appendChild(track.attach())
    }
}

function trackUnsubscribed(track) {
    track.detach().forEach(element => element.remove())
}

connectButton.addEventListener('click', connectButtonHandler)
