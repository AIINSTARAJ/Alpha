from flask import *

import os
import json
import datetime

from agent import *


app = Flask(__name__, template_folder='UI',static_folder='UI')

@app.route('/', methods = ['GET', 'POST'])
def index():
    return render_template('index.html')

@app.route('/favicon.ico', methods = ['GET', 'POST'])
def favicon():
    return send_from_directory('Images','Icon.png')

@app.post('/waitlist')
def join():
    response = request.get_json()
    name = response['name']
    mail = response['mail']

    Entry = {
        'name': name,
        'mail': mail,
        'timestamp': datetime.datetime.utcnow().strftime("%y-%m-%d.%H:%M:%S")
    }

    file_path = 'data.json'
    content = ''

    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

    records = json.loads(content) if content.strip() else []
    records.append(Entry)

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=4)

    return jsonify({'message': 'Saved'}), 201


@app.post('/analyze')
def analyze():
    """
    Atomic Reasoning Analysis.
    """
    try:
        data = request.get_json()
        
        query = data['query']
        
        result = reason(query)
        
        return jsonify(result), 200
        
    except Exception as e:

        return jsonify({
            'status': 'Error',
            'message': str(e)
        }), 500
    
    
@app.post('/refine')
def refine():
    data = request.get_json()

    text = data['Text']

    refined = refineText(text)

    return jsonify(
        {
            'Text': refined
        }
    ), 200

while __name__ == '__main__':
    app.run(debug = True, port = 5245, host='0.0.0.0')

