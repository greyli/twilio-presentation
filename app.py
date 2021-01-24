import os

from flask import Flask, request, render_template, abort
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

app = Flask(__name__)

presenter_data = {
    'username': '',
    'screen': ''
}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/token', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')

    if not username:
        abort(401)

    if not presenter_data['username'] and password == 'test':
        presenter_data['username'] = username
        is_presenter = True
    else:
        is_presenter = False

    # get credentials from environment variables
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    api_key = os.getenv('TWILIO_API_KEY')
    api_secret = os.getenv('TWILIO_API_SECRET')

    # create access token with credentials
    token = AccessToken(account_sid, api_key, api_secret, identity=username)
    # create a Video grant and add to token
    video_grant = VideoGrant(room='My Presentation')
    token.add_grant(video_grant)
    return {'token': token.to_jwt(), 'is_presenter': is_presenter}


@app.route('/presenter')
def get_presenter_info():
    return presenter_data


@app.route('/screen', methods=['POST'])
def set_screen_track_name():
    presenter_data['screen'] = request.json.get('screen')
    return '', 204


@app.route('/end', methods=['POST'])
def end_presentation():
    presenter_data['username'] = ''
    presenter_data['screen'] = ''
    return '', 204
