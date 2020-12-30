const video = document.getElementById('presenter');
const screen = document.getElementById('screen');
let room = 'My Presentation';


function displayPresenterVideo() {
    Twilio.Video.createLocalVideoTrack().then(track => {
        video.appendChild(track.attach());
    });
};


function displayPresenterScreen() {
    navigator.mediaDevices.getDisplayMedia().then(stream => {
        screenTrack = new Twilio.Viddeo.LocalVideoTrack(stream.getTracks()[0]);
        room.localParticipant.publishTrack(screenTrack);
        screen.appendChild(screenTrack.attach())
        // shareScreen.innerHTML = 'Stop sharing';
        screenTrack.mediaStreamTrack.onended = () => {displayPresenterScreen() };
    }).catch(() => {
        alert('Could not share the screen.');
    });
};


displayPresenterVideo();
displayPresenterScreen();
