from flask import Flask, render_template, request, redirect, url_for, session
import os

app = Flask(__name__, template_folder=os.path.dirname(__file__))
app.secret_key = 'dev-secret-key-for-local-testing'

# Simple in-memory user store for demo purposes only
USERS = {}


@app.context_processor
def inject_helpers():
    # Provide a csrf_token placeholder so templates can call {{ csrf_token() }}
    def csrf_token():
        return ''
    return dict(csrf_token=csrf_token)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    error = ''
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        # Always assign 'user' role server-side
        role = 'user'
        if not email or not password:
            error = 'Email and password are required.'
        elif email in USERS:
            error = 'User already exists.'
        else:
            USERS[email] = {'password': password, 'role': role}
            session['user_id'] = email
            return redirect(url_for('dashboard'))
    return render_template('register.html', error=error)


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = ''
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = USERS.get(email)
        if not user or user.get('password') != password:
            error = 'Invalid credentials.'
        else:
            session['user_id'] = email
            return redirect(url_for('dashboard'))
    return render_template('login.html', error=error)


@app.route('/dashboard')
def dashboard():
    if not session.get('user_id'):
        return redirect(url_for('login'))
    return '<h2>Dashboard</h2><p>Welcome, {}</p><p><a href="{}">Logout</a></p>'.format(
        session.get('user_id'), url_for('logout')
    )


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
