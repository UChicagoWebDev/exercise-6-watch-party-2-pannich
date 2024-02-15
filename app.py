import string
import random
from datetime import datetime
from flask import *
from functools import wraps
import sqlite3


app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/watchparty.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one:
            return rows[0]
        return rows
    return None

def new_user():
    # This generate random user name, password, api_key
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' +
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

def get_user_from_api_key(request):
    """Parse Request Header for api_key

    Args:
        request (_type_): post request
    Returns:
        user object: a sqlite row object of that user
    """
    api_key = request.headers.get('X-API-Key')
    if api_key:
        return query_db('select * from users where api_key = ?', [api_key], one=True)
    return None

def get_user_from_id(user_id):
    """return user object
    """
    return query_db('select * from users where id = ?', [user_id], one=True)

# TODO: If your app sends users to any other routes, include them here.
#       (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/room')
@app.route('/room/<chat_id>')
def index(chat_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404



# -------------------------------- API ROUTES ----------------------------------

# Authenticate USER API
def require_api_key(f):
    """a decorator function to check user api key
    Check if the requested API header 'X-API-Key' matches with current user html cookie.
    """
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        user = get_user_from_api_key(request)
        if api_key and user: # There's X-API-KEY in header and user matches this key exists
            print("API check: " + api_key, user, user['api_key'])
            return f(*args, **kwargs)
        else:
            return jsonify({"error": "Invalid or missing API key."}), 400
    decorated_function.__name__ = f.__name__
    return decorated_function

# TODO: Create the API

#-------------------------------------------------
#----------------sign-up login -------------------

# api for signing up -> return API-KEY
@app.route('/api/signup', methods=['POST']) #TODO create GET for when existing user /signup
def signup():
    """User coming in without API-KEY. Sign up initialize random username, password, API-KEY

    Returns:
        _type_: _description_
    """
    print("signup")
    user = get_user_from_api_key(request)

    if request.method == 'POST':
        user = new_user() #generate random name, pw, api_key
        print("user")
        print(user)
        for key in user.keys():
            print(f'{key}: {user[key]}')

        return jsonify({
        'username': user['name'],
        'password': user['password'],
        'api_key': user['api_key']
    }), 200


@app.route('/api/login', methods=['POST'])
def login():
    """Browswer coming in without API-KEY. Log in finds API-KEY that matches input username, password
"""
    print("login")

    data = request.json
    user_name = data.get('user_name')
    password = data.get('password')

    user = query_db('select * from users where name = ? and password = ?', [user_name, password], one=True)
    if user: # found user
        return jsonify({
            'username': user['name'],
            'password': user['password'],
            'api_key': user['api_key']}), 200
    else:
        return jsonify({"message": "Invalid Username or Password"}), 401

#-------------------------------------------------
## all other /api requires @require_api_key


@app.route('/api/user/credential', methods=['GET'])
def get_credential():
    user = get_user_from_api_key(request)
    return jsonify(dict(user))

# POST to change the user's name
@app.route('/api/user/name', methods=['POST'])
@require_api_key
def update_username():
    user = get_user_from_api_key(request)

    if not user: return jsonify({'error': 'User not found'}), 403

    # get new name
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            new_user_name = data.get('user_name')
        try:
            new_user = query_db('''
        UPDATE users
        SET name = ?
        WHERE id = ? RETURNING *
        ''', (new_user_name, user['id']), one=True)
            return jsonify({'message': f"Username: {new_user['name']} updated successfully"}), 200
        except Exception as e:
            return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

# POST to change the user's password
@app.route('/api/user/password', methods=['POST'])
@require_api_key
def update_password():
    user = get_user_from_api_key(request)
    if not user: return jsonify({'error': 'User not found'}), 403

    # get new password
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            new_password = data.get('password')
        try:
            new_user = query_db('''
        UPDATE users
        SET password = ?
        WHERE id = ? RETURNING *
        ''', (new_password, user['id']), one=True)
            return jsonify({'message': f"Password: {new_user['password']} updated successfully"}), 200
        except Exception as e:
            return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

# GET all rooms
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    try:
        rooms = query_db('select * from rooms', one=False)
        if not rooms:
            return jsonify({'message': 'no room found'}), 200
        ls_rooms = []
        for room in rooms:
            ls_rooms.append({'id': room['id'], 'name': room['name']})
        return jsonify(ls_rooms), 200
    except Exception as e:
        return jsonify({'error': f'An error occurred while fetching messages: {e}'}), 500

# POST create new room
@app.route('/api/rooms/new', methods=['POST'])
@require_api_key
def create_room():
    print("create room") # For debugging
    user = get_user_from_api_key(request)
    if user is None: return {}, 403

    if (request.method == 'POST'):
        name = "Unnamed Room " + ''.join(random.choices(string.digits, k=6))
        room = query_db('''
    INSERT INTO rooms (name)
    VALUES (?) RETURNING *
    ''', (name,), one=True)
        return jsonify({
            'id': room['id'],
            'name': room['name'],
            }), 200
    else:
        return app.send_static_file('create_room.html')

@app.route('/api/room/<int:room_id>', methods=['GET'])
@require_api_key
def get_room(room_id):

    room = query_db('SELECT * FROM rooms WHERE id = ?', [room_id], one=True)
    if room:
        return jsonify(dict(room)), 200
    else:
        return jsonify({'message': 'Room not found'}), 404

# POST to change the name of a room
@app.route('/api/rooms/changename', methods=['POST'])
@require_api_key
def change_room_name():
    """
    json POST:
    - room_id
    - new_room_name

    Returns:
        json: _description_
    """
    if request.is_json:
        data = request.get_json()
        room_id = data.get('room_id')
        new_room_name = data.get('new_room_name')
    # Add your database logic here to update the room name
    try:
        room = query_db('''
        UPDATE rooms
        SET name = ?
        WHERE id = ? RETURNING *
        ''', (new_room_name, room_id), one=True)
        return jsonify({'message': f"Room Name: {room['name']} updated successfully"}), 200
    except Exception as e:
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

# GET to get all the messages in a room
@app.route('/api/messages', methods=['GET'])
@require_api_key
def get_messages():
    room_id = request.args.get('room_id')  # Assuming you pass room_id as a query parameter
    if not room_id:
        return jsonify({'error': 'Room ID is required'}), 400

    try:
        messages = query_db('select * from messages where room_id = ?', [room_id], one=False)
        # print(room_id, messages)
        if not messages:
            return jsonify({'message': 'no message found'}), 200
        ls_messages = []
        for message in messages:
            user = get_user_from_id(message['user_id'])
            if not user:
                print("user id not found")
                continue
            ls_messages.append({'id': message['id'], 'user_name': user['name'], 'body': message['body']})
        # print(ls_messages)
        return jsonify(ls_messages), 200
    except Exception as e:
        return jsonify({'error': f'An error occurred while fetching messages: {e}'}), 500

# POST to post a new message to a room
@app.route('/api/messages/post', methods=['POST'])
@require_api_key
def post_message():
    """
    json POST:
    header: 'X-API-Key'
    body:
    - room_id

    Return:
        json: {'user_name': user['name'], 'body': message['body']}
    """
    print("post message")
    user = get_user_from_api_key(request)
    user_id = user['id']
    if request.is_json:
        data = request.get_json()
        body = data.get('body')
        room_id = data.get('room_id')
    if not room_id:
        return jsonify({'error': 'Room ID is required'}), 400

    message = query_db('''
    INSERT INTO messages (user_id, room_id, body)
    VALUES (?, ?, ?) RETURNING user_id, room_id, body
    ''', (user_id, room_id, body), one=True)

    try:
        return jsonify({'user_name': user['name'], 'body': message['body']}), 200
    except Exception as e:
        # Log the exception e
        return jsonify({'error': 'An error occurred while fetching messages'}), 500
