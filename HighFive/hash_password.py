import hashlib
from flask import Flask

app = Flask(__name__)
app.secret_key = 'rkgal'

password = 'rohit'
combined = password + app.secret_key
hashed_password = hashlib.sha256(combined.encode()).hexdigest()
print(hashed_password)
