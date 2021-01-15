const videoContainer = document.getElementById('presenter')
const screenContainer = document.getElementById('screen')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')
const passwordLabel = document.querySelector('label[for="password"]')
const connectButton = document.getElementById('connect')
const status = document.getElementById('status')
let connected = false
let screenTrack
let presenterName
let isPresenter
let room
let screenTrackName

function getPresenterInfo() {
    fetch('/presenter', {
        method: 'GET'
    }).then(res => res.json()).then(data => {
        if (data.username) {
            presenterName = data.username
            screenTrackName = data.screen
            passwordInput.remove()
            passwordLabel.remove()
        }
    }).catch(error => {
        console.log(error.message)
    })
}

function setScreenTrackName(screenName) {
    screenTrackName = screenName
    fetch('/screen', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({'screen': screenName}) 
    }).catch(error => {
        console.log(error.message)
    })
}

function displayPresenterVideo() {
    Twilio.Video.createLocalVideoTrack().then(track => {
        videoContainer.appendChild(track.attach())
    })
}

function displayPresenterScreen() {
    navigator.mediaDevices.getDisplayMedia({
        video: {
            width: 1280,
            height: 720
        }
    }).then(stream => {
        screenTrack = new Twilio.Video.LocalVideoTrack(stream.getTracks()[0])
        room.localParticipant.publishTrack(screenTrack)
        screenContainer.appendChild(screenTrack.attach())
        setScreenTrackName(screenTrack.name)
        screenTrack.mediaStreamTrack.onended = () => { displayPresenterScreen() }
    }).catch((error) => {
        alert('Could not share the screen.')
        console.error(`Unable to share screen: ${error.message}`)
    })
}

function connectButtonHandler(event) {
    event.preventDefault()
    if (!connected) {
        let username = usernameInput.value
        let password = passwordInput.value
        if (!username) {
            alert('Enter your name before connecting.')
            return
        }
        connectButton.disabled = true
        connectButton.innerHTML = 'Connecting...'
        connect(username, password).then(() => {
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

function connect(username, password) {
    let promise = new Promise((resolve, reject) => {
        fetch('/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({'username': username, 'password': password})
        }).then(res => res.json()).then(data => {
            if (data.is_presenter) {
                isPresenter = true
            }
            return Twilio.Video.connect(data.token)
        }).then(_room => {
            room = _room
            if (isPresenter) {
                displayPresenterVideo()
                displayPresenterScreen()
            } else {
                room.localParticipant.audioTracks.forEach(publication => {
                    publication.track.disable()
                })
                room.localParticipant.videoTracks.forEach(publication => {
                    publication.track.stop()
                    publication.unpublish()
                })
                room.participants.forEach(participant => {
                    // display presenter's tracks for new participant
                    if (participant.identity == presenterName) {
                        participant.on('trackSubscribed', track => trackSubscribed(track))
                        participant.on('trackUnsubscribed', trackUnsubscribed)
                    }
                })
            }
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
    updateParticipantCount()
}

function participantDisconnected(participant) {
    console.log(`${participant.identity} left the room.`)
    if (participant.identity == presenterName) {
        console.log('The presentation is over.')
        fetch('/end', {
            method: 'POST',
        }).catch(error => {
            console.log(error.message)
        })
    }
    updateParticipantCount()
}

function trackSubscribed(track) {
    if (track.name == screenTrackName) {
        screenContainer.appendChild(track.attach())
    } else {
        videoContainer.appendChild(track.attach())
    }
}

function trackUnsubscribed(track) {
    track.detach().forEach(element => element.remove())
}

connectButton.addEventListener('click', connectButtonHandler)
getPresenterInfo()
