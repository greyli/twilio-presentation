import os

from flask import Flask, request, jsonify, render_template
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/login', methods=['POST'])
def login():
    username = request.args.get('username')
    # get credentials from environment variables
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    api_key = os.getenv('TWILIO_API_KEY')
    api_secret = os.getenv('TWILIO_API_SECRET')

    room = 'My Presentation'
    # create access token with credentials
    token = AccessToken(account_sid, api_key, api_secret, identity=username)
    # create a Video grant and add to token
    video_grant = VideoGrant(room=room)
    token.add_grant(VideoGrant)
    return jsonify(identity=username, token=token.to_jwt().decode(), room=room)
