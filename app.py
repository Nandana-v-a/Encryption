# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os, base64

from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

app = Flask(__name__, static_folder='static', static_url_path='/')
CORS(app)  # allow frontend fetches while developing

def derive_key(password: str, salt: bytes, iterations: int = 200_000) -> bytes:
    """Derive a 32-byte key from password and salt using PBKDF2-HMAC-SHA256."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
    )
    return kdf.derive(password.encode('utf-8'))

@app.route('/encrypt', methods=['POST'])
def encrypt():
    data = request.get_json(force=True)
    plaintext = data.get('plaintext', '')
    password = data.get('password', '')
    if not plaintext or not password:
        return jsonify({'error': 'plaintext and password are required'}), 400

    salt = os.urandom(16)          # 16 bytes salt
    key = derive_key(password, salt)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)         # 12 bytes nonce for AES-GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)

    # bundle salt + nonce + ciphertext and base64 encode for transport/storage
    token = base64.b64encode(salt + nonce + ciphertext).decode('utf-8')
    return jsonify({'ciphertext': token})

@app.route('/decrypt', methods=['POST'])
def decrypt():
    try:
        data = request.get_json(force=True)
        token = data.get('ciphertext', '')
        password = data.get('password', '')
        if not token or not password:
            return jsonify({'error': 'ciphertext and password are required'}), 400

        raw = base64.b64decode(token)
        salt = raw[:16]
        nonce = raw[16:28]
        ct = raw[28:]

        key = derive_key(password, salt)
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ct, None)
        return jsonify({'plaintext': plaintext.decode('utf-8')})
    except Exception as e:
        # in production don't leak raw errors — return a friendly message
        return jsonify({'error': 'decryption failed: ' + str(e)}), 400

# serve the static index.html
@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
