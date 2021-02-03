import os
import uuid

from flask import Flask, request, render_template, abort
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/present')
def present():
    return render_template('presenter.html')


@app.route('/token', methods=['POST'])
def login():
    if request.args.get('present'):
        username = 'presenter'
    else:
        username = uuid.uuid4().hex

    # get credentials from environment variables
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    api_key = os.getenv('TWILIO_API_KEY')
    api_secret = os.getenv('TWILIO_API_SECRET')

    # create access token with credentials
    token = AccessToken(account_sid, api_key, api_secret, identity=username)

    # create a Video grant and add to token
    video_grant = VideoGrant(room='My Presentation')
    token.add_grant(video_grant)
    return {'token': token.to_jwt()}
