import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, make_response
import psycopg2
from psycopg2 import extras
from psycopg2.pool import ThreadedConnectionPool, PoolError
import hashlib
from datetime import date, datetime
from dotenv import load_dotenv

import platform
import pdfkit
import uuid
from werkzeug.utils import secure_filename

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "default-secret-key")

# Low Bandwidth Optimization: Enable Gzip/Brotli payload compression
try:
    from flask_compress import Compress
    Compress(app)
    print("Flask-Compress enabled for payload compression.")
except Exception as compress_err:
    print("Flask-Compress initialization notice:", compress_err)

# Real-Time Push Engine: Initialize SocketIO
socketio = None
try:
    from flask_socketio import SocketIO, emit, join_room
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    print("Flask-SocketIO enabled for real-time WebSocket push updates.")
except Exception as socket_err:
    print("Flask-SocketIO initialization notice:", socket_err)

DB_CONFIG = {
    'dbname': os.environ.get('DB_NAME'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'host': os.environ.get('DB_HOST'),
    'port': os.environ.get('DB_PORT')
}
PATH_NAME = os.environ.get('PATH_NAME', 'public')

def sync_admin_records(conn):
    try:
        with conn.cursor() as cur:
            # 1. Find or create Admin user
            cur.execute("SELECT user_id, email FROM Users WHERE user_type = 'Admin' ORDER BY user_id LIMIT 1;")
            admin_user = cur.fetchone()
            if not admin_user:
                admin_hash = 'eeac43ccab0d7a588d758fb72fd2811e7c29f03f1d4c834e2e5b67058506bdd4'
                cur.execute("""
                    INSERT INTO Users (password_hash, email, user_type, status, created_at)
                    VALUES (%s, 'admin@gmail.com', 'Admin', 'Active', NOW())
                    RETURNING user_id, email;
                """, (admin_hash,))
                admin_user = cur.fetchone()
            
            admin_id = admin_user[0]
            admin_email = admin_user[1]

            # Get default panchayat_id
            cur.execute("SELECT panchayat_id FROM Panchayats ORDER BY panchayat_id LIMIT 1;")
            p_res = cur.fetchone()
            panchayat_id = p_res[0] if p_res else 1

            # 2. Find or create Admin citizen record
            cur.execute("SELECT citizen_id FROM Citizens WHERE user_id = %s;", (admin_id,))
            cit_res = cur.fetchone()
            if not cit_res:
                cur.execute("""
                    INSERT INTO Citizens (user_id, panchayat_id, first_name, last_name, gender, dob, educational_qualification, occupation, annual_income, tax_due_amount, marital_status, phone_number, email)
                    VALUES (%s, %s, 'Panchayat', 'Admin', 'Other', '1990-01-01', 'Graduate', 'Employed', 0, 0, 'Un_married', '0000000000', %s)
                    RETURNING citizen_id;
                """, (admin_id, panchayat_id, admin_email))
                admin_citizen_id = cur.fetchone()[0]
            else:
                admin_citizen_id = cit_res[0]

            # 3. Ensure Admin employee records exist for all departments
            departments = ['Certificate', 'Patwari', 'Budget', 'Service', 'Tax']
            for dept in departments:
                cur.execute("SELECT employee_id FROM Employees WHERE user_id = %s AND LOWER(department) = %s;", (admin_id, dept.lower()))
                emp_res = cur.fetchone()
                if not emp_res:
                    cur.execute("""
                        INSERT INTO Employees (user_id, panchayat_id, citizen_id, designation, join_date, end_date, department, employment_type, salary)
                        VALUES (%s, %s, %s, 'Panchayat Admin', '2020-01-01', '2099-12-31', %s, 'Permanent', 0);
                    """, (admin_id, panchayat_id, admin_citizen_id, dept))
            print("Admin profile records synchronized in Citizens and Employees tables.")
    except Exception as e:
        print("Admin schema synchronization notice:", e)

# Automated Database Schema & Index Initialization
def init_db_schema():
    print("Checking database schema initialization...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(f"CREATE SCHEMA IF NOT EXISTS {PATH_NAME};")
            cur.execute(f"SET search_path TO {PATH_NAME};")
            
            # Check if Users table exists in current schema
            cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %s AND LOWER(table_name) = 'users');", (PATH_NAME,))
            users_exist = cur.fetchone()[0]
            
            if not users_exist:
                print("Database tables not found. Creating schema and inserting seed data...")
                base_dir = os.path.dirname(os.path.abspath(__file__))
                
                # 1. Create tables
                createtable_path = os.path.join(base_dir, "createtable.sql")
                if os.path.exists(createtable_path):
                    with open(createtable_path, "r", encoding="utf-8") as f:
                        cur.execute(f.read())
                    print("Tables created successfully.")
                
                # 2. Insert seed data
                insertdata_path = os.path.join(base_dir, "insertData.sql")
                if os.path.exists(insertdata_path):
                    with open(insertdata_path, "r", encoding="utf-8") as f:
                        cur.execute(f.read())
                    print("Initial seed data inserted successfully.")
                
                # 3. Create performance indexes
                indexes_path = os.path.join(base_dir, "create_indexes.sql")
                if os.path.exists(indexes_path):
                    with open(indexes_path, "r", encoding="utf-8") as f:
                        cur.execute(f.read())
                    print("Database indexes created successfully.")
            else:
                print("Database schema already exists.")

            # Ensure Admin citizen & employee records exist in database tables
            sync_admin_records(conn)

        conn.close()
    except Exception as e:
        print("Database schema auto-initialization notice:", e)

# Threaded Database Connection Pool Initialization
db_pool = None

def init_db_pool():
    global db_pool
    if db_pool is None:
        try:
            min_conn = int(os.environ.get('DB_MIN_CONN', 2))
            max_conn = int(os.environ.get('DB_MAX_CONN', 20))
            db_pool = ThreadedConnectionPool(min_conn, max_conn, **DB_CONFIG)
            print("PostgreSQL connection pool initialized.")
        except Exception as e:
            print("Failed to initialize database pool:", e)
            db_pool = None

# Middleware: Add browser cache headers for static assets
@app.after_request
def add_static_cache_headers(response):
    if request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response

class PooledConnectionWrapper:
    def __init__(self, conn, pool):
        self._conn = conn
        self._pool = pool

    def close(self):
        if self._pool and self._conn:
            try:
                self._pool.putconn(self._conn)
            except Exception:
                try:
                    self._conn.close()
                except Exception:
                    pass
        elif self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
        self._conn = None

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

# Utility: Acquire connection from PostgreSQL Connection Pool
def get_db_connection():
    global db_pool
    if db_pool is None:
        init_db_pool()

    if db_pool is not None:
        try:
            conn = db_pool.getconn()
            if conn:
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute(f"SET search_path TO {PATH_NAME};")
                return PooledConnectionWrapper(conn, db_pool)
        except PoolError as pe:
            print("Database pool exhausted, falling back to direct connect:", pe)
        except Exception as e:
            print("Database pool error:", e)

    # Direct connection fallback if pool is unavailable or exhausted
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(f"SET search_path TO {PATH_NAME};")
        return conn
    except Exception as e:
        print("Database connection error:", e)
        return None

# Real-Time WebSocket Handlers
if socketio:
    @socketio.on('connect')
    def handle_ws_connect():
        print("Real-time WebSocket client connected.")

    @socketio.on('subscribe_panchayat')
    def handle_subscribe_panchayat(data):
        panchayat_id = data.get('panchayat_id') if isinstance(data, dict) else data
        if panchayat_id:
            room = f"panchayat_{panchayat_id}"
            join_room(room)
            print(f"Client subscribed to real-time room: {room}")

def emit_realtime_event(event_name, data, panchayat_id=None):
    if socketio:
        try:
            if panchayat_id:
                socketio.emit(event_name, data, room=f"panchayat_{panchayat_id}")
            socketio.emit(event_name, data)
        except Exception as socket_err:
            print(f"Realtime socket emit warning ({event_name}): {socket_err}")

# Utility: Hash password for comparison (SHA-256 for better security)
def hash_password(password):
    if not password:
        return None
    secret = app.secret_key or "default-secret-key-for-hashing"
    combined = password + secret
    return hashlib.sha256(combined.encode()).hexdigest()

def save_uploaded_document(file):
    if not file or not getattr(file, 'filename', None) or file.filename == '':
        return None
    allowed = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed:
        return None
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex[:8]}_{filename}"
    upload_dir = os.path.join(app.static_folder, 'uploads', 'documents')
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)
    file.save(file_path)
    return f"/static/uploads/documents/{unique_filename}"



############################################## BASIC ROUTES #########################################################

# Route: Login Page
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        login_type = request.form.get('login_type')
        password = request.form.get('password')
        hashed_password = hash_password(password)

        conn = get_db_connection()
        if not conn:
            flash('Database connection error.', 'danger')
            return redirect(url_for('login'))

        try:
            with conn.cursor() as cur:
                if login_type == 'email':
                    email = request.form.get('email')
                    cur.execute("""
                        SELECT * FROM users 
                        WHERE email = %s AND password_hash = %s;
                    """, (email, hashed_password))
                else:
                    user_id = request.form.get('user_id')
                    cur.execute("""
                        SELECT * FROM users 
                        WHERE user_id = %s AND password_hash = %s;
                    """, (user_id, hashed_password))

                user = cur.fetchone()
                if user:
                    print("User logged in:", user)
                    user_id = user[0]
                    user_type = user[3]

                    print("User type:", user_type)
                    print("User ID:", user_id)
                    
                    # Get citizen_id if applicable
                    citizen_id = None
                    department = None
                    
                    if user_type in ['Citizen', 'Employee']:
                        # For citizens, get their citizen_id
                        if user_type == 'Citizen':
                            cur.execute("""
                                SELECT citizen_id FROM Citizens 
                                WHERE user_id = %s;
                            """, (user_id,))
                            
                            result = cur.fetchone()
                            if result:
                                citizen_id = result[0]
                        
                        # For employees, get their citizen_id and department
                        elif user_type == 'Employee':
                            cur.execute("""
                                SELECT employee_id, department FROM Employees 
                                WHERE user_id = %s;
                            """, (user_id,))
                            
                            result = cur.fetchone()
                            if result:
                                citizen_id = result[0]  # This is actually employee_id
                                department = result[1].lower() if result[1] else None
                                print("Employee department:", department)
                                print("Employee ID:", citizen_id)
                    
                    # Redirect based on user type and department
                    if user_type == 'Admin':
                        return redirect(url_for('admin_dashboard', admin_id=user_id))
                    elif user_type == 'Citizen' and citizen_id:
                        return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
                    elif user_type == 'Employee' and citizen_id:
                        # Route to specific department page based on department
                        if department == 'certificate' or department == 'Certificate':
                            return redirect(url_for('certificate', user_id=user_id, employee_id=citizen_id))
                        elif department == 'budget' or department == 'Budget':
                            return redirect(url_for('budget', user_id=user_id, employee_id=citizen_id))
                        elif department == 'tax' or department == 'Tax':
                            return redirect(url_for('tax', user_id=user_id, employee_id=citizen_id))
                        elif department == 'service' or department == 'Service':
                            return redirect(url_for('service', user_id=user_id, employee_id=citizen_id))
                        elif department == 'patwari' or department == 'Patwari':
                            return redirect(url_for('patwari', user_id=user_id, employee_id=citizen_id))
                        else:
                            print("Employee department not recognized:", department)
                            return render_template('login.html', show_error_prompt=True)
                    elif user_type == 'Monitor':
                        return redirect(url_for('monitor_dashboard', user_id=user_id))
                    else:
                        flash('User type not recognized or missing details.', 'danger')
                        print("User type not recognized:", user_type)
                        return render_template('login.html', show_error_prompt=True)
                else:
                    print("Invalid credentials")
                    flash('Invalid credentials. Please try again.', 'danger')
                    return render_template('login.html', show_error_prompt=True)

        except Exception as e:
            print("Query error:", e)
            flash('An error occurred while processing your request.', 'danger')
            return render_template('login.html', show_error_prompt=True)

        finally:
            conn.close()

    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user_id = request.form.get('user_id')  # Get the citizen ID from form
        
        hashed_password = hash_password(password)

        conn = get_db_connection()
        if not conn:
            flash('Database connection error.', 'danger')
            return render_template('signup.html', show_error_prompt=True)

        try:
            with conn.cursor() as cur:
                # Check if the citizen ID exists
                cur.execute("SELECT * FROM Citizens WHERE citizen_id = %s", (user_id,))
                citizen = cur.fetchone()
                if not citizen:
                    flash('Citizen ID not found. Please enter a valid ID.', 'danger')
                    return render_template('signup.html', show_error_prompt=True)
                    
                # Check if user is already registered
                if citizen[1] is not None:  # citizen[1] should be the user_id column
                    flash('This citizen ID is already linked to an account.', 'danger')
                    return render_template('signup.html', show_error_prompt=True)
                    
                # Check if email already exists
                cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                if cur.fetchone():
                    flash('Email already registered. Please use a different email.', 'danger')
                    return render_template('signup.html', show_error_prompt=True)
                
                # Create new user
                cur.execute("""
                    INSERT INTO Users (email, password_hash, user_type, status)
                    VALUES (%s, %s, 'Citizen', 'Active')
                    RETURNING user_id;
                """, (email, hashed_password))
                
                new_user_id = cur.fetchone()[0]
                
                # Link citizen to the new user
                cur.execute("""
                    UPDATE Citizens 
                    SET user_id = %s 
                    WHERE citizen_id = %s;
                """, (new_user_id, user_id))
                
            conn.commit()
            flash('Account created successfully. Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            print("Signup error:", e)
            flash('An error occurred while signing up. Please try again.', 'danger')
            return render_template('signup.html', show_error_prompt=True)
        finally:
            conn.close()

    return render_template('signup.html')

@app.route('/')
def home():
    return redirect(url_for('landing'))

@app.route('/landing')
def landing():
    return render_template('landing.html')

@app.route('/error')
def error_page():
    return render_template('error.html')

@app.route('/change_password/<int:user_id>', methods=['POST'])
def change_password(user_id):
    current_password = request.form.get('current-password')
    new_password = request.form.get('new-password')
    confirm_password = request.form.get('confirm-password')
    print(current_password, new_password, confirm_password)
    
    # Validate inputs are not None
    if not current_password or not new_password or not confirm_password:
        return jsonify({"success": False, "message": "All password fields are required"})
    
    # Validate that passwords match
    if new_password != confirm_password:
        flash('New passwords do not match.', 'danger')
        return jsonify({"success": False, "message": "New passwords do not match."})
    
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return jsonify({"success": False, "message": "Database connection error."})
    
    try:
        with conn.cursor() as cur:
            # Verify current password
            hashed_current_password = hash_password(current_password)
            cur.execute("""
                SELECT password_hash FROM Users WHERE user_id = %s;
            """, (user_id,))
            user = cur.fetchone()
            
            if not user:
                flash('User not found.', 'danger')
                return jsonify({"success": False, "message": "User not found."})
                
            if user[0] != hashed_current_password:
                flash('Current password is incorrect.', 'danger')
                return jsonify({"success": False, "message": "Current password is incorrect."})
            
            # Update to new password
            hashed_new_password = hash_password(new_password)
            cur.execute("""
                UPDATE Users SET password_hash = %s WHERE user_id = %s;
            """, (hashed_new_password, user_id))
            conn.commit()
            
            flash('Password changed successfully.', 'success')
            return jsonify({"success": True, "message": "Password changed successfully."})
    
    except Exception as e:
        print("Password change error:", e)
        flash('An error occurred while changing your password.', 'danger')
        return jsonify({"success": False, "message": "An error occurred while changing your password."})
    
    finally:
        conn.close()

@app.route('/change_password', methods=['POST'])
def change_password_form():
    """Alternative change_password endpoint that accepts user_id in form data."""
    user_id = request.form.get('user_id')
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    
    # Validate inputs are not None
    if not user_id or not current_password or not new_password:
        return jsonify({"success": False, "message": "Missing required parameters"})
    
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid user_id format"})
        
    # Validate that passwords match
    if not current_password or not new_password:
        return jsonify({"success": False, "message": "Missing password parameters"})
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error."})
    
    try:
        with conn.cursor() as cur:
            # Verify current password
            hashed_current_password = hash_password(current_password)
            cur.execute("""
                SELECT password_hash FROM Users WHERE user_id = %s;
            """, (user_id,))
            user = cur.fetchone()
            
            if not user:
                return jsonify({"success": False, "message": "User not found."})
                
            if user[0] != hashed_current_password:
                return jsonify({"success": False, "message": "Current password is incorrect."})
            
            # Update to new password
            hashed_new_password = hash_password(new_password)
            cur.execute("""
                UPDATE Users SET password_hash = %s WHERE user_id = %s;
            """, (hashed_new_password, user_id))
            conn.commit()
            
            return jsonify({"success": True, "message": "Password changed successfully."})
    
    except Exception as e:
        print("Password change error:", e)
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"})
    
    finally:
        conn.close()

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

############################################## TAX ROUTES #########################################################


@app.route('/tax/<int:user_id>/<int:employee_id>')
def tax(user_id, employee_id):
    conn = get_db_connection()
    if not conn:
        flash("Database connection error.", "danger")
        return redirect(url_for('error_page'))
    
    try:
        with conn.cursor() as cur:
            # First get employee details to find their panchayat
            cur.execute("""
                SELECT c.first_name || ' ' || c.last_name as name, e.panchayat_id, e.citizen_id
                FROM employees e
                JOIN citizens c ON e.citizen_id = c.citizen_id
                WHERE e.employee_id = %s;
            """, (employee_id,))
            employee_data = cur.fetchone()
            
            if not employee_data:
                flash("Employee not found", "danger")
                return redirect(url_for('error_page'))
                
            cur.execute("SELECT user_type FROM Users WHERE user_id = %s;", (user_id,))
            u_type = cur.fetchone()
            if u_type and u_type[0] == 'Admin':
                employee_name = "Panchayat Admin"
            else:
                employee_name = employee_data[0]
            panchayat_id = employee_data[1]
            citizen_id = employee_data[2]
            
            # Get panchayat details
            cur.execute("""
                SELECT panchayat_id, panchayat_name, establishment_date, area_sq_km, contact_email, contact_phone
                FROM Panchayats
                WHERE panchayat_id = %s;
            """, (panchayat_id,))
            panchayat_data = cur.fetchone()
            
            if not panchayat_data:
                flash("Panchayat not found", "danger")
                return redirect(url_for('error_page'))
                
            panchayat = {
                "panchayat_id": panchayat_data[0],
                "panchayat_name": panchayat_data[1],
                "establishment_date": panchayat_data[2].strftime("%d-%m-%Y"),
                "area_sq_km": panchayat_data[3],
                "contact_email": panchayat_data[4],
                "contact_phone": panchayat_data[5]
            }
            
            # Get all citizens in this panchayat
            cur.execute("""
                SELECT citizen_id, first_name, last_name, gender, dob, 
                       educational_qualification, occupation, annual_income, 
                       tax_due_amount, marital_status, phone_number, email
                FROM citizens
                WHERE panchayat_id = %s
                ORDER BY citizen_id;
            """, (panchayat_id,))
            citizens_data = cur.fetchall()
            
            citizens = []
            total_income = 0
            total_tax = 0
            
            for row in citizens_data:
                citizen = {
                    "citizen_id": row[0],
                    "first_name": row[1],
                    "last_name": row[2],
                    "gender": row[3],
                    "dob": row[4].strftime("%d-%m-%Y") if row[4] else "",
                    "educational_qualification": row[5],
                    "occupation": row[6],
                    "annual_income": row[7],
                    "tax_due_amount": row[8],
                    "marital_status": row[9],
                    "phone_number": row[10],
                    "email": row[11]
                }
                citizens.append(citizen)
                total_income += row[7] or 0
                total_tax += row[8] or 0
            
            return render_template(
                'tax.html',
                user_id=user_id,
                employee_id=employee_id,
                employee_name=employee_name,
                employee={"citizen_id": citizen_id},  # Pass the employee object with citizen_id
                panchayat=panchayat,
                citizens=citizens,
                total_income=total_income,
                total_tax=total_tax
            )
            
        flash("An error occurred while fetching tax information.", "danger")
        return redirect(url_for('error_page'))
    finally:
        conn.close()

@app.route('/update_tax', methods=['POST'])
def update_tax():
    citizen_id = request.form.get('citizen_id')
    tax_due_amount = request.form.get('tax_due_amount')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    if not all([citizen_id, tax_due_amount, user_id, employee_id]):
        return jsonify({"success": False, "message": "Missing required parameters"})
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"})

    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE citizens
                SET tax_due_amount = %s
                WHERE citizen_id = %s;
            """, (tax_due_amount, citizen_id))
            conn.commit()
        
        return jsonify({"success": True, "message": "Tax updated successfully"})
    
    except Exception as e:
        print("Error updating tax data:", e)
        return jsonify({"success": False, "message": "An error occurred while updating tax"})
    
    finally:
        conn.close()

############################################ BUDGET ROUTES #########################################################

@app.route('/budget/<int:user_id>/<int:employee_id>')
def budget(user_id, employee_id):
    conn = get_db_connection()
    if not conn:
        flash("Database connection error.", "danger")
        return redirect(url_for('error_page'))
    
    try:
        with conn.cursor() as cur:
            # First get employee details to find their panchayat and citizen_id
            cur.execute("""
                SELECT c.first_name, e.panchayat_id, e.citizen_id 
                FROM employees e
                JOIN Citizens c ON e.citizen_id = c.citizen_id
                WHERE e.employee_id = %s;
            """, (employee_id,))
            employee_data = cur.fetchone()
            
            if not employee_data:
                flash("Employee not found", "danger")
                return redirect(url_for('error_page'))
                
            cur.execute("SELECT user_type FROM Users WHERE user_id = %s;", (user_id,))
            u_type = cur.fetchone()
            if u_type and u_type[0] == 'Admin':
                employee_name = "Panchayat Admin"
            else:
                employee_name = employee_data[0]
            panchayat_id = employee_data[1]
            citizen_id = employee_data[2]  # Get the citizen_id associated with this employee
            
            # Get panchayat details
            cur.execute("""
                SELECT panchayat_id, panchayat_name, establishment_date, area_sq_km, contact_email, contact_phone
                FROM Panchayats
                WHERE panchayat_id = %s;
            """, (panchayat_id,))
            panchayat_data = cur.fetchone()
            
            if not panchayat_data:
                flash("Panchayat not found", "danger")
                return redirect(url_for('error_page'))
                
            panchayat = {
                "panchayat_id": panchayat_data[0],
                "panchayat_name": panchayat_data[1],
                "establishment_date": panchayat_data[2].strftime("%d-%m-%Y"),
                "area_sq_km": panchayat_data[3],
                "contact_email": panchayat_data[4],
                "contact_phone": panchayat_data[5]
            }
            
            # Get revenue entries for this panchayat
            cur.execute("""
                SELECT revenue_id, amount, revenue_date, description
                FROM Budget_Revenue
                WHERE panchayat_id = %s
                ORDER BY revenue_date DESC;
            """, (panchayat_id,))
            revenues_data = cur.fetchall()
            
            revenues = []
            total_income = 0
            
            for row in revenues_data:
                revenue = {
                    "revenue_id": row[0],
                    "amount": row[1],
                    "revenue_date": row[2],
                    "description": row[3]
                }
                revenues.append(revenue)
                total_income += row[1]
            
            # Get expense entries for this panchayat
            cur.execute("""
                SELECT expense_id, amount, expense_date, description
                FROM Budget_Expense
                WHERE panchayat_id = %s
                ORDER BY expense_date DESC;
            """, (panchayat_id,))
            expenses_data = cur.fetchall()
            
            expenses = []
            total_expense = 0
            
            for row in expenses_data:
                expense = {
                    "expense_id": row[0],
                    "amount": row[1],
                    "expense_date": row[2],
                    "description": row[3]
                }
                expenses.append(expense)
                total_expense += row[1]
            
            # Get announcements
            cur.execute("""
                SELECT announcement_id, heading, detail, date
                FROM Announcements
                ORDER BY date DESC
                LIMIT 10;
            """)
            announcements = cur.fetchall()
            
            return render_template(
                'budget.html',
                user_id=user_id,
                employee_id=employee_id,
                citizen_id=citizen_id,  # Pass the citizen_id to the template
                employee_name=employee_name,
                panchayat=panchayat,
                revenues=revenues,
                expenses=expenses,
                total_income=total_income,
                total_expense=total_expense,
                announcements=announcements  # Pass announcements to the template
            )
            
    except Exception as e:
        print("Error fetching budget data:", e)
        flash("An error occurred while fetching data.", "danger")
        return redirect(url_for('error_page'))
    finally:
        conn.close()
        
@app.route('/add_revenue', methods=['POST'])
def add_revenue():
    if request.method == 'POST':
        panchayat_id = request.form.get('panchayat_id')
        amount = float(request.form.get('amount'))
        revenue_date = request.form.get('revenue_date')
        description = request.form.get('description')
        
        conn = get_db_connection()
        if not conn:
            flash("Database connection error.", "danger")
            return redirect(url_for('error_page'))
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO Budget_Revenue (panchayat_id, amount, revenue_date, description)
                    VALUES (%s, %s, %s, %s);
                """, (panchayat_id, amount, revenue_date, description))
                conn.commit()  # Added explicit commit
                
            flash("Income added successfully.", "success")
            
            # Get user_id and employee_id from hidden redirect query params
            user_id = request.form.get('user_id')
            employee_id = request.form.get('employee_id')
            
            return redirect(url_for('budget', user_id=user_id, employee_id=employee_id))
            
        except Exception as e:
            print("Error adding revenue:", e)
            flash("An error occurred while adding income.", "danger")
            return redirect(url_for('error_page'))
        finally:
            conn.close()

@app.route('/add_expense', methods=['POST'])
def add_expense():
    if request.method == 'POST':
        panchayat_id = request.form.get('panchayat_id')
        amount = float(request.form.get('amount'))
        expense_date = request.form.get('expense_date')
        description = request.form.get('description')
        
        conn = get_db_connection()
        if not conn:
            flash("Database connection error.", "danger")
            return redirect(url_for('error_page'))
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO Budget_Expense (panchayat_id, amount, expense_date, description)
                    VALUES (%s, %s, %s, %s);
                """, (panchayat_id, amount, expense_date, description))
                conn.commit()  # Added explicit commit
                
            flash("Expense added successfully.", "success")
            
            # Get user_id and employee_id from hidden redirect query params
            user_id = request.form.get('user_id')
            employee_id = request.form.get('employee_id')
            
            return redirect(url_for('budget', user_id=user_id, employee_id=employee_id))
            
        except Exception as e:
            print("Error adding expense:", e)
            flash("An error occurred while adding expense.", "danger")
            return redirect(url_for('error_page'))
        finally:
            conn.close()
            
@app.route('/delete_revenue', methods=['POST'])
def delete_revenue():
    if request.method == 'POST':
        revenue_id = request.form.get('revenue_id')
        user_id = request.form.get('user_id')
        employee_id = request.form.get('employee_id')
        
        conn = get_db_connection()
        if not conn:
            flash("Database connection error.", "danger")
            return redirect(url_for('error_page'))
        
        try:
            with conn.cursor() as cur:
                # First, let's verify the revenue exists and belongs to this panchayat
                # This ensures we're not deleting data from another panchayat
                cur.execute("""
                    SELECT r.panchayat_id 
                    FROM Budget_Revenue r
                    JOIN employees e ON r.panchayat_id = e.panchayat_id
                    WHERE r.revenue_id = %s AND e.employee_id = %s
                """, (revenue_id, employee_id))
                
                verify_result = cur.fetchone()
                
                if not verify_result:
                    flash("You don't have permission to delete this entry.", "danger")
                    return redirect(url_for('budget', user_id=user_id, employee_id=employee_id))
                
                # Proceed with deletion
                cur.execute("""
                    DELETE FROM Budget_Revenue
                    WHERE revenue_id = %s
                """, (revenue_id,))
                
                conn.commit()
            
            return redirect(url_for('budget', user_id=user_id, employee_id=employee_id))
            
        except Exception as e:
            print("Error deleting revenue:", e)
            flash("An error occurred while deleting the income entry.", "danger")
            return redirect(url_for('error_page'))
        finally:
            conn.close()

@app.route('/delete_expense', methods=['POST'])
def delete_expense():
    if request.method == 'POST':
        expense_id = request.form.get('expense_id')
        user_id = request.form.get('user_id')
        employee_id = request.form.get('employee_id')
        
        conn = get_db_connection()
        if not conn:
            flash("Database connection error.", "danger")
            return redirect(url_for('error_page'))
        
        try:
            with conn.cursor() as cur:
                # First, let's verify the expense exists and belongs to this panchayat
                # This ensures we're not deleting data from another panchayat
                cur.execute("""
                    SELECT e.panchayat_id 
                    FROM Budget_Expense e
                    JOIN employees emp ON e.panchayat_id = emp.panchayat_id
                    WHERE e.expense_id = %s AND emp.employee_id = %s
                """, (expense_id, employee_id))
                
                verify_result = cur.fetchone()
                
                if not verify_result:
                    flash("You don't have permission to delete this entry.", "danger")
                    return redirect(url_for('budget', user_id=user_id, employee_id=employee_id))
                
                # Proceed with deletion
                cur.execute("""
                    DELETE FROM Budget_Expense
                    WHERE expense_id = %s
                """, (expense_id,))
                
                conn.commit()
            
            return redirect(url_for('budget', user_id=user_id, employee_id=employee_id))
            
        except Exception as e:
            print("Error deleting expense:", e)
            flash("An error occurred while deleting the expense entry.", "danger")
            return redirect(url_for('error_page'))
        finally:
            conn.close()

#################################################### SERVICE and Welfare ROUTES #########################################################
@app.route('/service/<int:user_id>/<int:employee_id>')
def service(user_id, employee_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # First get employee details to access citizen_id
    cur.execute('''
        SELECT e.employee_id, e.citizen_id, e.panchayat_id, c.first_name || ' ' || c.last_name as employee_name 
        FROM Employees e
        JOIN Citizens c ON e.citizen_id = c.citizen_id
        WHERE e.employee_id = %s
    ''', (employee_id,))
    
    employee = cur.fetchone()
    if not employee:
        flash('Employee not found.', 'danger')
        return redirect(url_for('error_page'))
    
    cur.execute("SELECT user_type FROM Users WHERE user_id = %s;", (user_id,))
    u_type = cur.fetchone()
    is_admin_user = (u_type and u_type['user_type'] == 'Admin')
    employee_name = "Panchayat Admin" if is_admin_user else employee['employee_name']
    
    cur.execute('''
        SELECT service_id, type, description
        FROM Service
        ORDER BY type
    ''')
    services = cur.fetchall()
    
    for s in services:
        print(f"Service: {s['service_id']} - {s['type']}")
    
    if is_admin_user:
        cur.execute('''
            SELECT sr.request_id, sr.citizen_id, ct.first_name || ' ' || ct.last_name as citizen_name,
                    sr.service_id, s.type as service_type, sr.request_date,
                    sr.description, sr.status, sr.document_path
            FROM Service_Request sr
            JOIN Citizens ct ON sr.citizen_id = ct.citizen_id
            JOIN Service s ON sr.service_id = s.service_id
            WHERE sr.status = 'Pending'
        ''')
    else:
        cur.execute('''
            SELECT sr.request_id, sr.citizen_id, ct.first_name || ' ' || ct.last_name as citizen_name,
                    sr.service_id, s.type as service_type, sr.request_date,
                    sr.description, sr.status, sr.document_path
            FROM Service_Request sr
            JOIN Citizens ct ON sr.citizen_id = ct.citizen_id
            JOIN Service s ON sr.service_id = s.service_id
            WHERE sr.status = 'Pending' AND ct.panchayat_id = %s
        ''', (employee['panchayat_id'],))
    
    service_requests = cur.fetchall()
    
    # Get welfare schemas (projects)
    cur.execute('''
        SELECT schema_id, type, description
        FROM schema_type
        ORDER BY type
    ''')
    welfare_projects = cur.fetchall()
    
    # Get welfare enrollments filtered by panchayat
    if is_admin_user:
        cur.execute('''
            SELECT cws.enrollment_id, cws.citizen_id, 
                   c.first_name || ' ' || c.last_name as citizen_name,
                   st.type as schema_type, cws.joining_date, cws.request_date,
                   cws.status, cws.description, cws.document_path
            FROM Citizen_welfare_Schema cws
            JOIN Citizens c ON cws.citizen_id = c.citizen_id
            JOIN schema_type st ON cws.schema_id = st.schema_id
            ORDER BY cws.request_date DESC
        ''')
    else:
        cur.execute('''
            SELECT cws.enrollment_id, cws.citizen_id, 
                   c.first_name || ' ' || c.last_name as citizen_name,
                   st.type as schema_type, cws.joining_date, cws.request_date,
                   cws.status, cws.description, cws.document_path
            FROM Citizen_welfare_Schema cws
            JOIN Citizens c ON cws.citizen_id = c.citizen_id
            JOIN schema_type st ON cws.schema_id = st.schema_id
            WHERE c.panchayat_id = %s
            ORDER BY cws.request_date DESC
        ''', (employee['panchayat_id'],))
    
    welfare_requests = cur.fetchall()
    
    # Get announcements
    cur.execute("""
        SELECT announcement_id, heading, detail, date
        FROM Announcements
        ORDER BY date DESC
        LIMIT 10;
    """)
    announcements = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return render_template('service.html',
                           services=services,
                           service_requests=service_requests,
                           welfare_projects=welfare_projects,
                           welfare_requests=welfare_requests,
                           user_id=user_id,
                           employee_id=employee_id,
                           employee=employee,
                           employee_name=employee['employee_name'],
                           announcements=announcements)

@app.route('/update_service_request_status', methods=['POST'])
def update_service_request_status():
    request_id = request.form.get('request_id')
    status = request.form.get('status')
    description = request.form.get('description')
    employee_id = request.form.get('employee_id')
    user_id = request.form.get('user_id')
    
    # Update the database
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Update the service request status
        cur.execute('''
            UPDATE Service_Request 
            SET status = %s, description = CONCAT(description, E'\n\nEmployee remarks: ', %s)
            WHERE request_id = %s
        ''', (status, description, request_id))
        
        conn.commit()
        try:
            cur.execute("SELECT citizen_id FROM Service_Request WHERE request_id = %s;", (request_id,))
            sr_r = cur.fetchone()
            if sr_r:
                cit_id = sr_r[0]
                cur.execute("SELECT panchayat_id FROM Citizens WHERE citizen_id = %s;", (cit_id,))
                cit_r = cur.fetchone()
                p_id = cit_r[0] if cit_r else None
                emit_realtime_event('status_updated', {
                    'type': 'Service Request',
                    'id': request_id,
                    'citizen_id': cit_id,
                    'panchayat_id': p_id,
                    'status': status
                }, p_id)
        except Exception as emit_err:
            print("Error emitting service status update:", emit_err)

        flash(f'Service request marked as {status} successfully!', 'success')
    except Exception as e:
        conn.rollback()
        flash(f'Error updating service request: {str(e)}', 'danger')
    
    cur.close()
    conn.close()
    
    # Redirect back to the service page
    return redirect(url_for('service', user_id=user_id, employee_id=employee_id))

@app.route('/add_service', methods=['POST'])
def add_service():
    service_type = request.form.get('service_type')
    service_description = request.form.get('service_description')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    print(f"Adding service: {service_type}, {service_description}")
    
    conn = get_db_connection()
    
    print(f"Database connection status: {'closed' if conn.closed else 'open'}")
    
    cur = conn.cursor()
    
    try:
        # Let Postgres handle the SERIAL auto-increment by not specifying service_id
        cur.execute('''
            INSERT INTO Service (type, description)
            VALUES (%s, %s)
            RETURNING service_id
        ''', (service_type, service_description))
        
        new_service_id = cur.fetchone()[0]
        conn.commit()
        
        print(f"Added service with ID: {new_service_id}")
        flash(f'Service "{service_type}" added successfully!', 'success')
        
    except Exception as e:
        conn.rollback()
        print(f"Database error: {str(e)}")
        flash(f'Error adding service: {str(e)}', 'danger')
    finally:
        cur.close()
        conn.close()
        print(f"Database connection closed")
    
    return redirect(url_for('service', user_id=user_id, employee_id=employee_id))

@app.route('/update_service', methods=['POST'])
def update_service():
    import datetime
    import traceback
    
    # Get form data
    service_id = request.form.get('service_id')
    service_type = request.form.get('service_type')
    service_description = request.form.get('service_description')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    # Enhanced debugging
    print(f"Updating service ID {service_id}: {service_type}, {service_description}")
    
    # Update in database
    conn = get_db_connection()
    
    # Verify connection is open
    print(f"Database connection status: {'closed' if conn.closed else 'open'}")
    
    cur = conn.cursor()
    
    try:
        # Update service
        cur.execute('''
            UPDATE Service
            SET type = %s, description = %s
            WHERE service_id = %s
        ''', (service_type, service_description, service_id))
        
        # Check if any rows were affected
        rows_affected = cur.rowcount
        print(f"Rows affected: {rows_affected}")
        
        # Verify update worked
        cur.execute('SELECT * FROM Service WHERE service_id = %s', (service_id,))
        result = cur.fetchone()
        print(f"Verification query result: {result}")
        
        # Explicit commit - ensure this happens
        conn.commit()
        print(f"Transaction committed successfully")
        
        if rows_affected > 0:
            flash(f'Service "{service_type}" updated successfully!', 'success')
        else:
            flash(f'No service found with ID {service_id}!', 'warning')
    except Exception as e:
        conn.rollback()
        # Enhanced error logging
        print(f"Database error: {str(e)}")
        print(traceback.format_exc())
        flash(f'Error updating service: {str(e)}', 'danger')
    finally:
        cur.close()
        conn.close()
        print(f"Database connection closed")
    
    # Redirect back to the service page
    return redirect(url_for('service', user_id=user_id, employee_id=employee_id))

@app.route('/delete_service', methods=['POST'])
def delete_service():
    service_id = request.form.get('service_id')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    if not all([service_id, user_id, employee_id]):
        flash('Missing required parameters', 'danger')
        return redirect(url_for('service', user_id=user_id, employee_id=employee_id))
    
    conn = get_db_connection()
    if not conn:
        flash('Database connection error', 'danger')
        return redirect(url_for('service', user_id=user_id, employee_id=employee_id))
    
    try:
        with conn.cursor() as cur:
            # Check if service exists
            cur.execute("SELECT service_id FROM Service WHERE service_id = %s", (service_id,))
            if not cur.fetchone():
                flash('Service not found', 'warning')
                return redirect(url_for('service', user_id=user_id, employee_id=employee_id))
            
            # Delete the service (assuming cascading delete is set up)
            cur.execute("DELETE FROM Service WHERE service_id = %s", (service_id,))
            conn.commit()
            
            flash('Service deleted successfully', 'success')
            
    except Exception as e:
        conn.rollback()
        print(f"Error deleting service: {e}")
        flash(f'Error deleting service: {str(e)}', 'danger')
        
    finally:
        conn.close()
    
    return redirect(url_for('service', user_id=user_id, employee_id=employee_id))

@app.route('/welfare/<int:user_id>/<int:employee_id>')
def welfare(user_id, employee_id):
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('login'))
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute('''
            SELECT e.employee_id, e.citizen_id, c.first_name || ' ' || c.last_name as employee_name 
            FROM Employees e
            JOIN Citizens c ON e.citizen_id = c.citizen_id
            WHERE e.employee_id = %s
        ''', (employee_id,))
        employee = cur.fetchone()
        
        cur.execute("SELECT user_type FROM Users WHERE user_id = %s;", (user_id,))
        u_type = cur.fetchone()
        employee_name = "Panchayat Admin" if (u_type and u_type['user_type'] == 'Admin') else (employee['employee_name'] if employee else "Employee")
        
        cur.execute('''
            SELECT schema_id as project_id, type, description
            FROM schema_type
            ORDER BY type
        ''')
        welfare_projects = cur.fetchall()
        
        cur.execute('''
            SELECT cws.enrollment_id as request_id, cws.citizen_id, 
                   ct.first_name || ' ' || ct.last_name as citizen_name,
                   cws.schema_id as project_id, st.type as project_type, 
                   cws.request_date, cws.description, cws.status
            FROM Citizen_welfare_Schema cws
            JOIN Citizens ct ON cws.citizen_id = ct.citizen_id
            JOIN schema_type st ON cws.schema_id = st.schema_id
            WHERE cws.status = 'Pending'
        ''')
        welfare_requests = cur.fetchall()
        
        cur.execute("""
            SELECT announcement_id, heading, detail, date
            FROM Announcements
            ORDER BY date DESC
        """)
        announcements = cur.fetchall()
        
        return render_template('welfare.html',
                               user_id=user_id,
                               employee_id=employee_id,
                               employee_name=employee_name,
                               welfare_projects=welfare_projects,
                               welfare_requests=welfare_requests,
                               announcements=announcements)
    except Exception as e:
        print("Error loading welfare route:", e)
        flash('Error loading welfare page.', 'danger')
        return redirect(url_for('admin_dashboard', admin_id=user_id))
    finally:
        conn.close()

@app.route('/update_welfare_request_status', methods=['POST'])
def update_welfare_request_status():
    request_id = request.form.get('request_id')
    status = request.form.get('status')
    description = request.form.get('description')
    employee_id = request.form.get('employee_id')
    user_id = request.form.get('user_id')
    
    # Update the database
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Update the welfare request status
        cur.execute('''
            UPDATE Welfare_Request 
            SET status = %s, description = CONCAT(description, E'\n\nEmployee remarks: ', %s)
            WHERE request_id = %s
        ''', (status, description, request_id))
        
        conn.commit()
        flash(f'Welfare request marked as {status} successfully!', 'success')
    except Exception as e:
        conn.rollback()
        flash(f'Error updating welfare request: {str(e)}', 'danger')
    
    cur.close()
    conn.close()
    
    # Redirect back to the welfare page
    return redirect(url_for('welfare', user_id=user_id, employee_id=employee_id))

@app.route('/add_welfare_project', methods=['POST'])
def add_welfare_project():
    project_type = request.form.get('project_type')
    project_description = request.form.get('project_description')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    print(f"Adding welfare project: {project_type}, {project_description}")
    
    conn = get_db_connection()
    
    print(f"Database connection status: {'closed' if conn.closed else 'open'}")
    
    cur = conn.cursor()
    
    try:
        # Let Postgres handle the SERIAL auto-increment by not specifying project_id
        cur.execute('''
            INSERT INTO Welfare_Project (type, description)
            VALUES (%s, %s)
            RETURNING project_id
        ''', (project_type, project_description))
        
        new_project_id = cur.fetchone()[0]
        conn.commit()
        
        print(f"Added welfare project with ID: {new_project_id}")
        flash(f'Welfare Project "{project_type}" added successfully!', 'success')
        
    except Exception as e:
        conn.rollback()
        print(f"Database error: {str(e)}")
        flash(f'Error adding welfare project: {str(e)}', 'danger')
    finally:
        cur.close()
        conn.close()
        print(f"Database connection closed")
    
    return redirect(url_for('welfare', user_id=user_id, employee_id=employee_id))

@app.route('/update_welfare_project', methods=['POST'])
def update_welfare_project():
    import datetime
    import traceback
    
    # Get form data
    project_id = request.form.get('project_id')
    project_type = request.form.get('project_type')
    project_description = request.form.get('project_description')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    # Enhanced debugging
    print(f"Updating welfare project ID {project_id}: {project_type}, {project_description}")
    
    # Update in database
    conn = get_db_connection()
    
    # Verify connection is open
    print(f"Database connection status: {'closed' if conn.closed else 'open'}")
    
    cur = conn.cursor()
    
    try:
        # Update welfare project
        cur.execute('''
            UPDATE Welfare_Project
            SET type = %s, description = %s
            WHERE project_id = %s
        ''', (project_type, project_description, project_id))
        
        # Check if any rows were affected
        rows_affected = cur.rowcount
        print(f"Rows affected: {rows_affected}")
        
        # Verify update worked
        cur.execute('SELECT * FROM Welfare_Project WHERE project_id = %s', (project_id,))
        result = cur.fetchone()
        print(f"Verification query result: {result}")
        
        # Explicit commit - ensure this happens
        conn.commit()
        print(f"Transaction committed successfully")
        
        if rows_affected > 0:
            flash(f'Welfare Project "{project_type}" updated successfully!', 'success')
        else:
            flash(f'No welfare project found with ID {project_id}!', 'warning')
    except Exception as e:
        conn.rollback()
        # Enhanced error logging
        print(f"Database error: {str(e)}")
        print(traceback.format_exc())
        flash(f'Error updating welfare project: {str(e)}', 'danger')
    finally:
        cur.close()
        conn.close()
        print(f"Database connection closed")
    
    # Redirect back to the welfare page
    return redirect(url_for('welfare', user_id=user_id, employee_id=employee_id))

@app.route('/delete_welfare_project', methods=['POST'])
def delete_welfare_project():
    project_id = request.form.get('project_id')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    if not all([project_id, user_id, employee_id]):
        flash('Missing required parameters', 'danger')
        return redirect(url_for('welfare', user_id=user_id, employee_id=employee_id))
    
    conn = get_db_connection()
    if not conn:
        flash('Database connection error', 'danger')
        return redirect(url_for('welfare', user_id=user_id, employee_id=employee_id))
    
    try:
        with conn.cursor() as cur:
            # Check if welfare project exists
            cur.execute("SELECT project_id FROM Welfare_Project WHERE project_id = %s", (project_id,))
            if not cur.fetchone():
                flash('Welfare project not found', 'warning')
                return redirect(url_for('welfare', user_id=user_id, employee_id=employee_id))
            
            # Delete the welfare project (assuming cascading delete is set up)
            cur.execute("DELETE FROM Welfare_Project WHERE project_id = %s", (project_id,))
            conn.commit()
            
            flash('Welfare project deleted successfully', 'success')
            
    except Exception as e:
        conn.rollback()
        print(f"Error deleting welfare project: {e}")
        flash(f'Error deleting welfare project: {str(e)}', 'danger')
        
    finally:
        conn.close()
    
    return redirect(url_for('welfare', user_id=user_id, employee_id=employee_id))

@app.route('/welfare_projects/<int:user_id>/<int:employee_id>')
def welfare_projects(user_id, employee_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # First get employee details to access citizen_id
    cur.execute('''
        SELECT e.employee_id, e.citizen_id, e.panchayat_id, c.first_name || ' ' || c.last_name as employee_name 
        FROM Employees e
        JOIN Citizens c ON e.citizen_id = c.citizen_id
        WHERE e.employee_id = %s
    ''', (employee_id,))
    
    employee = cur.fetchone()
    if not employee:
        flash('Employee not found.', 'danger')
        return redirect(url_for('error_page'))

    cur.execute("SELECT user_type FROM Users WHERE user_id = %s;", (user_id,))
    u_type = cur.fetchone()
    is_admin_user = (u_type and u_type['user_type'] == 'Admin')
    
    # Get all welfare schemas (projects)
    cur.execute('''
        SELECT schema_id, type, description
        FROM schema_type
        ORDER BY type
    ''')
    welfare_projects = cur.fetchall()
    
    # Get pending welfare requests
    if is_admin_user:
        cur.execute('''
            SELECT cws.citizen_id, cws.schema_id, 
                   c.first_name || ' ' || c.last_name as citizen_name,
                   st.type as schema_type, cws.joining_date,
                   st.description, cws.document_path
            FROM Citizen_welfare_Schema cws
            JOIN Citizens c ON cws.citizen_id = c.citizen_id
            JOIN schema_type st ON cws.schema_id = st.schema_id
            ORDER BY cws.joining_date DESC
        ''')
    else:
        cur.execute('''
            SELECT cws.citizen_id, cws.schema_id, 
                   c.first_name || ' ' || c.last_name as citizen_name,
                   st.type as schema_type, cws.joining_date,
                   st.description, cws.document_path
            FROM Citizen_welfare_Schema cws
            JOIN Citizens c ON cws.citizen_id = c.citizen_id
            JOIN schema_type st ON cws.schema_id = st.schema_id
            WHERE c.panchayat_id = %s
            ORDER BY cws.joining_date DESC
        ''', (employee['panchayat_id'],))
    
    welfare_requests = cur.fetchall()
    
    # Get announcements
    cur.execute("""
        SELECT announcement_id, heading, detail, date
        FROM Announcements
        ORDER BY date DESC
        LIMIT 10;
    """)
    announcements = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return render_template('welfare_projects.html',
                           welfare_projects=welfare_projects,
                           welfare_requests=welfare_requests,
                           user_id=user_id,
                           employee_id=employee_id,
                           employee=employee,
                           employee_name=employee['employee_name'],
                           announcements=announcements)

@app.route('/add_welfare_schema', methods=['POST'])
def add_welfare_schema():
    schema_type = request.form.get('schema_type')
    schema_description = request.form.get('schema_description')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    print(f"Adding welfare schema: {schema_type}, {schema_description}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Insert new welfare schema
        cur.execute('''
            INSERT INTO schema_type (type, description)
            VALUES (%s, %s)
            RETURNING schema_id
        ''', (schema_type, schema_description))
        
        new_schema_id = cur.fetchone()[0]
        conn.commit()
        
        print(f"Added welfare schema with ID: {new_schema_id}")
        flash(f'Welfare Schema "{schema_type}" added successfully!', 'success')
        
    except Exception as e:
        conn.rollback()
        print(f"Database error: {str(e)}")
        flash(f'Error adding welfare schema: {str(e)}', 'danger')
    finally:
        cur.close()
        conn.close()
    
    return redirect(url_for('service', user_id=user_id, employee_id=employee_id))

@app.route('/update_welfare_schema', methods=['POST'])
def update_welfare_schema():
    schema_id = request.form.get('schema_id')
    schema_type = request.form.get('schema_type')
    schema_description = request.form.get('schema_description')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    print(f"Updating welfare schema ID {schema_id}: {schema_type}, {schema_description}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Update welfare schema
        cur.execute('''
            UPDATE schema_type
            SET type = %s, description = %s
            WHERE schema_id = %s
        ''', (schema_type, schema_description, schema_id))
        
        rows_affected = cur.rowcount
        conn.commit()
        
        if rows_affected > 0:
            flash(f'Welfare Schema "{schema_type}" updated successfully!', 'success')
        else:
            flash(f'No welfare schema found with ID {schema_id}!', 'warning')
    except Exception as e:
        conn.rollback()
        print(f"Database error: {str(e)}")
        flash(f'Error updating welfare schema: {str(e)}', 'danger')
    finally:
        cur.close()
        conn.close()
    
    return redirect(url_for('service', user_id=user_id, employee_id=employee_id))

@app.route('/delete_welfare_schema', methods=['POST'])
def delete_welfare_schema():
    schema_id = request.form.get('schema_id')
    user_id = request.form.get('user_id')
    employee_id = request.form.get('employee_id')
    
    if not all([schema_id, user_id, employee_id]):
        flash('Missing required parameters', 'danger')
        return redirect(url_for('service', user_id=user_id, employee_id=employee_id))
    
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Check if welfare schema exists
            cur.execute("SELECT schema_id FROM schema_type WHERE schema_id = %s", (schema_id,))
            if not cur.fetchone():
                flash('Welfare schema not found', 'warning')
                return redirect(url_for('service', user_id=user_id, employee_id=employee_id))
            
            # Delete the welfare schema
            cur.execute("DELETE FROM schema_type WHERE schema_id = %s", (schema_id,))
            conn.commit()
            
            flash('Welfare schema deleted successfully', 'success')
            
    except Exception as e:
        conn.rollback()
        print(f"Error deleting welfare schema: {e}")
        flash(f'Error deleting welfare schema: {str(e)}', 'danger')
        
    finally:
        conn.close()
    
    return redirect(url_for('service', user_id=user_id, employee_id=employee_id))

@app.route('/update_welfare_enrollment_status', methods=['POST'])
def update_welfare_enrollment_status():
    enrollment_id = request.form.get('enrollment_id')
    status = request.form.get('status')
    description = request.form.get('description')
    employee_id = request.form.get('employee_id')
    user_id = request.form.get('user_id')
    
    # Update the database
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Update the welfare enrollment status
        cur.execute('''
            UPDATE Citizen_welfare_Schema 
            SET status = %s, description = CONCAT(COALESCE(description, ''), E'\n\nEmployee remarks: ', %s)
            WHERE enrollment_id = %s
        ''', (status, description, enrollment_id))
        
        # If status is Enrolled, set the joining_date to current date
        if status == 'Enrolled':
            cur.execute('''
                UPDATE Citizen_welfare_Schema 
                SET joining_date = CURRENT_DATE
                WHERE enrollment_id = %s
            ''', (enrollment_id,))
        
        conn.commit()
        try:
            cur.execute("SELECT citizen_id FROM Citizen_welfare_Schema WHERE enrollment_id = %s;", (enrollment_id,))
            cws_r = cur.fetchone()
            if cws_r:
                cit_id = cws_r[0]
                cur.execute("SELECT panchayat_id FROM Citizens WHERE citizen_id = %s;", (cit_id,))
                cit_r = cur.fetchone()
                p_id = cit_r[0] if cit_r else None
                emit_realtime_event('status_updated', {
                    'type': 'Welfare Scheme',
                    'id': enrollment_id,
                    'citizen_id': cit_id,
                    'panchayat_id': p_id,
                    'status': status
                }, p_id)
        except Exception as emit_err:
            print("Error emitting welfare status update:", emit_err)

        flash(f'Welfare enrollment request marked as {status} successfully!', 'success')
    except Exception as e:
        conn.rollback()
        flash(f'Error updating welfare enrollment: {str(e)}', 'danger')
    
    cur.close()
    conn.close()
    
    # Redirect back to the service page
    return redirect(url_for('service', user_id=user_id, employee_id=employee_id))

############################################## Certificate ROUTES #########################################################

@app.route('/certificate/<int:user_id>/<int:employee_id>')
def certificate(user_id, employee_id):
    conn = get_db_connection()
    if not conn:
        flash("Database connection failed", "danger")
        return redirect(url_for('error'))
    
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Get employee details
        cur.execute('''
            SELECT e.*, c.first_name || ' ' || c.last_name as employee_name 
            FROM Employees e
            JOIN Citizens c ON e.citizen_id = c.citizen_id
            WHERE e.employee_id = %s
        ''', (employee_id,))
        employee = cur.fetchone()
        
        cur.execute("SELECT user_type FROM Users WHERE user_id = %s;", (user_id,))
        u_type = cur.fetchone()
        employee_name = "Panchayat Admin" if (u_type and u_type['user_type'] == 'Admin') else employee['employee_name']
        
        # Get panchayat details
        cur.execute('''
            SELECT * FROM Panchayats WHERE panchayat_id = %s
        ''', (employee['panchayat_id'],))
        panchayat = cur.fetchone()
        
        # Get pending certificate applications
        is_admin_user = (u_type and u_type['user_type'] == 'Admin')
        if is_admin_user:
            cur.execute('''
                SELECT c.certificate_id, c.citizen_id, cit.first_name, ct.type, 
                       c.application_date, c.description, c.status, c.document_path
                FROM certificate c
                JOIN Citizens cit ON c.citizen_id = cit.citizen_id
                JOIN Certificate_Type ct ON c.type_id = ct.type_id
                WHERE c.status = 'Pending'
            ''')
        else:
            cur.execute('''
                SELECT c.certificate_id, c.citizen_id, cit.first_name, ct.type, 
                       c.application_date, c.description, c.status, c.document_path
                FROM certificate c
                JOIN Citizens cit ON c.citizen_id = cit.citizen_id
                JOIN Certificate_Type ct ON c.type_id = ct.type_id
                WHERE c.status = 'Pending' AND cit.panchayat_id = %s
            ''', (employee['panchayat_id'],))
        certificates = cur.fetchall()
        
        # Get certificate types
        cur.execute('SELECT * FROM Certificate_Type')
        certificate_types = cur.fetchall()
        
        return render_template('certificate.html',
                              certificates=certificates,
                              certificate_types=certificate_types,
                              user_id=user_id,
                              employee_id=employee_id,
                              employee=employee,
                              panchayat=panchayat,
                              employee_name=employee['employee_name'])
                              
    except Exception as e:
        flash(f"An error occurred: {str(e)}", "danger")
        return redirect(url_for('error'))
    finally:
        conn.close()

# Add missing routes for certificate type management
@app.route('/add_certificate_type', methods=['POST'])
def add_certificate_type():
    if request.method == 'POST':
        # Get form data
        certificate_type = request.form.get('certificate_type')
        description = request.form.get('certificate_description')
        user_id = request.form.get('user_id')
        employee_id = request.form.get('employee_id')
        
        conn = get_db_connection()
        if not conn:
            flash('Database connection error.', 'danger')
            return redirect(url_for('error_page'))

        try:
            with conn.cursor() as cur:
                # Insert new certificate type
                cur.execute("""
                    INSERT INTO Certificate_Type (type, description)
                    VALUES (%s, %s)
                """, (certificate_type, description))
                
                conn.commit()
                flash('Certificate type added successfully.', 'success')
                
        except Exception as e:
            conn.rollback()
            print(f"Error adding certificate type: {e}")
            flash(f"Error: {str(e)}", 'danger')
            
        finally:
            conn.close()
            
        return redirect(url_for('certificate', user_id=user_id, employee_id=employee_id))

@app.route('/update_certificate_type', methods=['POST'])
def update_certificate_type():
    if request.method == 'POST':
        # Get form data
        type_id = request.form.get('type_id')
        certificate_type = request.form.get('certificate_type')
        description = request.form.get('certificate_description')
        user_id = request.form.get('user_id')
        employee_id = request.form.get('employee_id')
        
        conn = get_db_connection()
        if not conn:
            flash('Database connection error.', 'danger')
            return redirect(url_for('error_page'))

        try:
            with conn.cursor() as cur:
                # Update certificate type
                cur.execute("""
                    UPDATE Certificate_Type 
                    SET type = %s, description = %s
                    WHERE type_id = %s
                """, (certificate_type, description, type_id))
                
                conn.commit()
                flash('Certificate type updated successfully.', 'success')
                
        except Exception as e:
            conn.rollback()
            print(f"Error updating certificate type: {e}")
            flash(f"Error: {str(e)}", 'danger')
            
        finally:
            conn.close()
            
        return redirect(url_for('certificate', user_id=user_id, employee_id=employee_id))

@app.route('/delete_certificate_type', methods=['POST'])
def delete_certificate_type():
    if request.method == 'POST':
        # Get form data
        type_id = request.form.get('type_id')
        user_id = request.form.get('user_id')
        employee_id = request.form.get('employee_id')
        
        conn = get_db_connection()
        if not conn:
            flash('Database connection error.', 'danger')
            return redirect(url_for('error_page'))

        try:
            with conn.cursor() as cur:
                # Check if any certificates are using this type
                cur.execute("""
                    SELECT COUNT(*) FROM certificate 
                    WHERE type_id = %s
                """, (type_id,))
                
                count = cur.fetchone()[0]
                
                if count > 0:
                    flash('Cannot delete certificate type because it is in use.', 'danger')
                else:
                    # Delete certificate type
                    cur.execute("""
                        DELETE FROM Certificate_Type 
                        WHERE type_id = %s
                    """, (type_id,))
                    
                    conn.commit()
                    flash('Certificate type deleted successfully.', 'success')
                
        except Exception as e:
            conn.rollback()
            print(f"Error deleting certificate type: {e}")
            flash(f"Error: {str(e)}", 'danger')
            
        finally:
            conn.close()
            
        return redirect(url_for('certificate', user_id=user_id, employee_id=employee_id))

@app.route('/update_certificate_status', methods=['POST'])
def update_certificate_status():
    if request.method == 'POST':
        # Get form data
        certificate_id = request.form.get('certificate_id')
        status = request.form.get('status')
        description = request.form.get('description', '')
        user_id = request.form.get('user_id')
        employee_id = request.form.get('employee_id')

        conn = get_db_connection()
        if not conn:
            flash('Database connection error.', 'danger')
            return redirect(url_for('error_page'))

        try:
            with conn.cursor() as cur:
                # Update certificate status and description
                cur.execute("""
                    UPDATE certificate 
                    SET status = %s, description = %s
                    WHERE certificate_id = %s
                """, (status, description, certificate_id))
                
                conn.commit()
                
                try:
                    cur.execute("SELECT citizen_id, type FROM certificate WHERE certificate_id = %s;", (certificate_id,))
                    cert_r = cur.fetchone()
                    if cert_r:
                        cur.execute("SELECT panchayat_id FROM Citizens WHERE citizen_id = %s;", (cert_r[0],))
                        cit_r = cur.fetchone()
                        p_id = cit_r[0] if cit_r else None
                        emit_realtime_event('status_updated', {
                            'type': 'Certificate',
                            'id': certificate_id,
                            'title': cert_r[1],
                            'citizen_id': cert_r[0],
                            'panchayat_id': p_id,
                            'status': status
                        }, p_id)
                except Exception as emit_err:
                    print("Error emitting status update:", emit_err)

                return redirect(url_for('certificate', 
                                      user_id=user_id, 
                                      employee_id=employee_id))

        except Exception as e:
            print("Error updating certificate:", e)
            return redirect(url_for('error_page'))

        finally:
            conn.close()

    return redirect(url_for('error_page'))


############################################## Patwari ROUTES #########################################################

@app.route('/patwari/<int:user_id>/<int:employee_id>')
def patwari(user_id, employee_id):

    census_data = {
        'total_citizens': 0,  # Default values if data isn't available yet
        'male_citizens': 0,
        'female_citizens': 0,
        'households': 0
    }

    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('error_page'))
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_type FROM Users WHERE user_id = %s", (user_id,))
            u_type = cur.fetchone()
            is_admin = (u_type and u_type[0] == 'Admin')

            if is_admin:
                cur.execute("""
                    SELECT e.employee_id, c.first_name, c.last_name, e.designation, e.department, e.panchayat_id, e.citizen_id
                    FROM Employees e
                    JOIN Citizens c ON e.citizen_id = c.citizen_id
                    WHERE e.employee_id = %s
                """, (employee_id,))
            else:
                cur.execute("""
                    SELECT e.employee_id, c.first_name, c.last_name, e.designation, e.department, e.panchayat_id, e.citizen_id
                    FROM Employees e
                    JOIN Citizens c ON e.citizen_id = c.citizen_id
                    WHERE e.employee_id = %s AND e.user_id = %s
                """, (employee_id, user_id))
            
            employee_data = cur.fetchone()
            
            if not employee_data:
                flash('Employee not found or unauthorized access.', 'danger')
                return redirect(url_for('error_page'))
            
            panchayat_id = employee_data[5]
            citizen_id = employee_data[6]
            
            employee_info = {
                'id': employee_data[0],
                'name': "Panchayat Admin" if is_admin else f"{employee_data[1]} {employee_data[2]}",
                'designation': employee_data[3] or 'Patwari Officer',
                'department': employee_data[4] or 'Patwari',
                'panchayat_id': panchayat_id,
                'citizen_id': citizen_id 
            }

            cur.execute("""
                SELECT p.panchayat_id 
                FROM Employees e
                JOIN Panchayats p ON e.panchayat_id = p.panchayat_id 
                WHERE e.employee_id = %s
            """, (employee_id,))
            panchayat_result = cur.fetchone()

            if panchayat_result:
                panchayat_id = panchayat_result[0]
                
                # Get census data for this panchayat
                # Fix the query in the patwari() function (around line 373)
            # Fix the query in the patwari() function
            cur.execute("""
                SELECT 
                    COUNT(*) as total_citizens,
                    COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_citizens,
                    COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_citizens,
                    0 as households
                FROM Citizens 
                WHERE panchayat_id = %s
            """, (panchayat_id,))
                
            census_result = cur.fetchone()
            if census_result:
                census_data = {
                    'total_citizens': census_result[0],
                    'male_citizens': census_result[1],
                    'female_citizens': census_result[2],
                    'households': census_result[3]
                }


            
            # Fetch ALL land records regardless of panchayat (for complete data)
            cur.execute("""
                SELECT cl.land_id, cl.citizen_id, c.first_name || ' ' || c.last_name as owner_name, 
                       cl.area, cl.type, cl.crop_type, c.panchayat_id
                FROM Citizen_Lands cl
                JOIN Citizens c ON cl.citizen_id = c.citizen_id
            """)
            
            citizen_lands = []
            for row in cur.fetchall():
                citizen_lands.append({
                    'id': row[0],
                    'citizenId': row[1],
                    'ownerName': row[2],
                    'area': float(row[3]),
                    'type': row[4],
                    'cropType': row[5],
                    'panchayatId': row[6]
                })
            
            # Fetch environmental initiatives (keep focused on the current panchayat)
            cur.execute("""
                SELECT initiative_id, name, start_date, area_covered, type, status, description
                FROM Environmental_Initiatives
                WHERE panchayat_id = %s
            """, (panchayat_id,))
            
            env_initiatives = []
            for row in cur.fetchall():
                env_initiatives.append({
                    'id': row[0],
                    'name': row[1],
                    'startDate': row[2].strftime('%Y-%m-%d') if row[2] else '',
                    'areaCovered': float(row[3]),
                    'type': row[4],
                    'status': row[5],
                    'description': row[6]
                })

            # Fetch irrigation systems (keep focused on the current panchayat)
            cur.execute("""
                SELECT system_id, name, location, coverage, water_source, status, description, added_date
                FROM Irrigation_Systems
                WHERE panchayat_id = %s
            """, (panchayat_id,))
            
            irrigation_systems = []
            for row in cur.fetchall():
                irrigation_systems.append({
                    'id': row[0],
                    'name': row[1],
                    'location': row[2],
                    'coverage': float(row[3]),
                    'source': row[4],
                    'status': row[5],
                    'description': row[6],
                    'date': row[7].strftime('%Y-%m-%d') if row[7] else ''
                })

            # Fetch announcements
            cur.execute("""
                SELECT announcement_id, heading, detail, date
                FROM Announcements
                ORDER BY date DESC
            """)
            
            announcements = []
            for row in cur.fetchall():
                announcements.append({
                    'id': row[0],
                    'heading': row[1],
                    'detail': row[2],
                    'date': row[3].strftime('%Y-%m-%d') if row[3] else ''
                })

            # Calculate global statistics for all lands
            total_stats = {
                'agricultural_area': 0,
                'residential_area': 0,
                'commercial_area': 0,
                'total_area': 0,
                'unique_citizens': len(set(land['citizenId'] for land in citizen_lands)),
                'environmental_projects': len(env_initiatives),
                'irrigation_coverage': sum(system['coverage'] for system in irrigation_systems)
            }
            
            # Also calculate statistics for the current panchayat only
            panchayat_stats = {
                'agricultural_area': 0,
                'residential_area': 0,
                'commercial_area': 0,
                'total_area': 0,
                'unique_citizens': len(set(land['citizenId'] for land in citizen_lands if land['panchayatId'] == panchayat_id)),
                'environmental_projects': len(env_initiatives),
                'irrigation_coverage': sum(system['coverage'] for system in irrigation_systems)
            }
            
            for land in citizen_lands:
                # Add to global statistics
                total_stats['total_area'] += land['area']
                if land['type'] == 'Agricultural':
                    total_stats['agricultural_area'] += land['area']
                elif land['type'] == 'Residential':
                    total_stats['residential_area'] += land['area']
                elif land['type'] == 'Commercial':
                    total_stats['commercial_area'] += land['area']
                
                # If land belongs to current panchayat, add to panchayat statistics
                if land['panchayatId'] == panchayat_id:
                    panchayat_stats['total_area'] += land['area']
                    if land['type'] == 'Agricultural':
                        panchayat_stats['agricultural_area'] += land['area']
                    elif land['type'] == 'Residential':
                        panchayat_stats['residential_area'] += land['area']
                    elif land['type'] == 'Commercial':
                        panchayat_stats['commercial_area'] += land['area']
            
            # Calculate cultivation percentage
            if total_stats['total_area'] > 0:
                total_stats['cultivation_percent'] = (total_stats['agricultural_area'] / total_stats['total_area']) * 100
            else:
                total_stats['cultivation_percent'] = 0
                
            if panchayat_stats['total_area'] > 0:
                panchayat_stats['cultivation_percent'] = (panchayat_stats['agricultural_area'] / panchayat_stats['total_area']) * 100
            else:
                panchayat_stats['cultivation_percent'] = 0

        return render_template('Patwari.html', 
                             employee_data=employee_info,
                             citizen_lands=citizen_lands,
                             env_initiatives=env_initiatives,
                             irrigation_systems=irrigation_systems,
                             announcements=announcements,
                             stats=total_stats,
                             panchayat_stats=panchayat_stats,
                             user_id=user_id,
                             employee_id=employee_id,
                             panchayat_id=panchayat_id,
                             census=census_data)
    
    except Exception as e:
        print(f"Error fetching patwari data: {e}")
        flash('An error occurred while loading the dashboard.', 'danger')
        return redirect(url_for('error_page'))
    
    finally:
        conn.close()

@app.route('/api/land/<int:land_id>', methods=['GET'])
def get_land(land_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT cl.land_id, cl.citizen_id, c.first_name || ' ' || c.last_name as owner_name, 
                       cl.area, cl.type, cl.crop_type, c.panchayat_id
                FROM Citizen_Lands cl
                JOIN Citizens c ON cl.citizen_id = c.citizen_id
                WHERE cl.land_id = %s
            """, (land_id,))
            
            row = cur.fetchone()
            if not row:
                return jsonify({'success': False, 'message': 'Land record not found'})
                
            land = {
                'id': row[0],
                'citizenId': row[1],
                'ownerName': row[2],
                'area': float(row[3]),
                'type': row[4],
                'cropType': row[5],
                'panchayatId': row[6]
            }
            
        return jsonify({'success': True, 'land': land})
    
    except Exception as e:
        print(f"Error fetching land record: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/initiative/<int:initiative_id>', methods=['GET'])
def get_initiative(initiative_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT initiative_id, panchayat_id, name, start_date, area_covered, 
                       type, status, description
                FROM Environmental_Initiatives
                WHERE initiative_id = %s
            """, (initiative_id,))
            
            row = cur.fetchone()
            if not row:
                return jsonify({'success': False, 'message': 'Initiative not found'})
                
            initiative = {
                'id': row[0],
                'panchayatId': row[1],
                'name': row[2],
                'startDate': row[3].strftime('%Y-%m-%d') if row[3] else '',
                'areaCovered': float(row[4]),
                'type': row[5],
                'status': row[6],
                'description': row[7]
            }
            
        return jsonify({'success': True, 'initiative': initiative})
    
    except Exception as e:
        print(f"Error fetching initiative: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/irrigation/<int:system_id>', methods=['GET'])
def get_irrigation(system_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT system_id, panchayat_id, name, location, coverage, 
                       water_source, status, description
                FROM Irrigation_Systems
                WHERE system_id = %s
            """, (system_id,))
            
            row = cur.fetchone()
            if not row:
                return jsonify({'success': False, 'message': 'Irrigation system not found'})
                
            system = {
                'id': row[0],
                'panchayatId': row[1],
                'name': row[2],
                'location': row[3],
                'coverage': float(row[4]),
                'source': row[5],
                'status': row[6],
                'description': row[7]
            }
            
        return jsonify({'success': True, 'system': system})
    
    except Exception as e:
        print(f"Error fetching irrigation system: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/irrigation/update/<int:system_id>', methods=['PUT'])
def update_irrigation(system_id):
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE Irrigation_Systems 
                SET name = %s, location = %s, coverage = %s, 
                    water_source = %s, status = %s, description = %s
                WHERE system_id = %s
            """, (
                data['name'], 
                data['location'], 
                data['coverage'], 
                data['waterSource'], 
                data['status'],
                data['description'],
                system_id
            ))
            
        return jsonify({'success': True, 'message': 'Irrigation system updated successfully'})
    
    except Exception as e:
        print(f"Error updating irrigation system: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/land/create', methods=['POST'])
def create_land():
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            # Get next land_id
            cur.execute("SELECT MAX(land_id) FROM Citizen_Lands")
            max_id = cur.fetchone()[0] or 0
            new_id = max_id + 1
            
            cur.execute("""
                INSERT INTO Citizen_Lands (land_id, citizen_id, area, type, crop_type)
                VALUES (%s, %s, %s, %s, %s)
            """, (new_id, data['citizenId'], data['area'], data['type'], data['cropType']))
            
        return jsonify({'success': True, 'message': 'Land record created successfully'})
    
    except Exception as e:
        print(f"Error creating land record: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/land/update/<int:land_id>', methods=['PUT'])
def update_land(land_id):
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE Citizen_Lands 
                SET citizen_id = %s, area = %s, type = %s, crop_type = %s
                WHERE land_id = %s
            """, (data['citizenId'], data['area'], data['type'], data['cropType'], land_id))
            
        return jsonify({'success': True, 'message': 'Land record updated successfully'})
    
    except Exception as e:
        print(f"Error updating land record: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/land/delete/<int:land_id>', methods=['POST'])
def delete_land(land_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Citizen_Lands WHERE land_id = %s", (land_id,))
            
        return jsonify({'success': True, 'message': 'Land record deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting land record: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/initiative/create', methods=['POST'])
def create_initiative():
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO Environmental_Initiatives 
                (panchayat_id, name, start_date, area_covered, type, status, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                data['panchayatId'], 
                data['name'], 
                data['startDate'], 
                data['areaCovered'], 
                data['type'], 
                data['status'],
                data['description']
            ))
            
        return jsonify({'success': True, 'message': 'Initiative created successfully'})
    
    except Exception as e:
        print(f"Error creating initiative: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/initiative/update/<int:initiative_id>', methods=['PUT'])
def update_initiative(initiative_id):
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE Environmental_Initiatives 
                SET name = %s, start_date = %s, area_covered = %s, 
                    type = %s, status = %s, description = %s
                WHERE initiative_id = %s
            """, (
                data['name'], 
                data['startDate'], 
                data['areaCovered'], 
                data['type'], 
                data['status'],
                data['description'],
                initiative_id
            ))
            
        return jsonify({'success': True, 'message': 'Initiative updated successfully'})
    
    except Exception as e:
        print(f"Error updating initiative: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/initiative/delete/<int:initiative_id>', methods=['POST'])
def delete_initiative(initiative_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Environmental_Initiatives WHERE initiative_id = %s", (initiative_id,))
            
        return jsonify({'success': True, 'message': 'Initiative deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting initiative: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/irrigation/create', methods=['POST'])
def create_irrigation():
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO Irrigation_Systems 
                (panchayat_id, name, location, coverage, water_source, status, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                data['panchayatId'], 
                data['name'], 
                data['location'], 
                data['coverage'], 
                data['waterSource'], 
                data['status'],
                data['description']
            ))
            
        return jsonify({'success': True, 'message': 'Irrigation system created successfully'})
    
    except Exception as e:
        print(f"Error creating irrigation system: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/irrigation/delete/<int:system_id>', methods=['POST'])
def delete_irrigation(system_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Irrigation_Systems WHERE system_id = %s", (system_id,))
            
        return jsonify({'success': True, 'message': 'Irrigation system deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting irrigation system: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/logout_ptw', methods=['GET', 'POST'])
def logout_ptw():
    # Clear any session data
    session.clear()
    # Always redirect to login page
    return redirect(url_for('landing'))

@app.route('/change_password_ptw/<int:user_id>', methods=['POST'])
def change_password_ptw(user_id):
    current_password = request.form.get('current-password')
    new_password = request.form.get('new-password')
    
    if not current_password or not new_password:
        flash('Missing password information.', 'danger')
        return redirect(request.referrer)
    
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(request.referrer)
    
    try:
        with conn.cursor() as cur:
            # Verify current password
            cur.execute("""
                SELECT password_hash FROM Users WHERE user_id = %s;
            """, (user_id,))
            user = cur.fetchone()
            
            if not user or user[0] != hash_password(current_password):
                flash('Current password is incorrect.', 'danger')
                print("Current password is incorrect.")
                return redirect(request.referrer)
            
            # Update to new password
            cur.execute("""
                UPDATE Users SET password_hash = %s WHERE user_id = %s;
            """, (hash_password(new_password), user_id))
            
            conn.commit()
            print("Password changed successfully.")
            flash('Password changed successfully.', 'success')
            
            return redirect(request.referrer)
    
    except Exception as e:
        print("Password change error:", e)
        flash('An error occurred while changing your password.', 'danger')
        return redirect(request.referrer)
    
    finally:
        conn.close()

@app.route('/api/census/refresh/<int:employee_id>', methods=['GET'])
def refresh_census(employee_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            # Get the panchayat_id associated with this employee
            cur.execute("""
                SELECT p.panchayat_id 
                FROM Employees e
                JOIN Panchayats p ON e.panchayat_id = p.panchayat_id 
                WHERE e.employee_id = %s
            """, (employee_id,))
            panchayat_result = cur.fetchone()
            
            if not panchayat_result:
                return jsonify({'success': False, 'message': 'Employee not associated with any panchayat'})
            
            panchayat_id = panchayat_result[0]
            
            # Get census data for this panchayat
            cur.execute("""
                SELECT 
                    COUNT(*) as total_citizens,
                    COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_citizens,
                    COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_citizens
                FROM Citizens 
                WHERE panchayat_id = %s
            """, (panchayat_id,))
            
            census_result = cur.fetchone()
            
            # Get household count
            try:
                cur.execute("""
                    SELECT COUNT(DISTINCT household_id) 
                    FROM Households
                    WHERE household_id IN (
                        SELECT household_id FROM Citizens WHERE panchayat_id = %s
                    )
                """, (panchayat_id,))
                household_count = cur.fetchone()[0] or 0
            except Exception:
                household_count = 0
            
            # Get education level distribution for the chart
            cur.execute("""
                SELECT educational_qualification, COUNT(*) 
                FROM Citizens 
                WHERE panchayat_id = %s 
                GROUP BY educational_qualification
                ORDER BY COUNT(*) DESC
            """, (panchayat_id,))
            
            edu_results = cur.fetchall()
            education_data = []
            
            if edu_results:
                for edu in edu_results:
                    education_data.append({
                        'level': edu[0] or 'Not Specified',
                        'count': edu[1]
                    })
            
            census_data = {
                'total_citizens': census_result[0] if census_result else 0,
                'male_citizens': census_result[1] if census_result else 0,
                'female_citizens': census_result[2] if census_result else 0,
                'households': household_count,
                'education_data': education_data
            }
            
            return jsonify({'success': True, 'census': census_data})
    
    except Exception as e:
        print(f"Error refreshing census data: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()


################################### Citizens Routes ###############################################################

@app.context_processor
def utility_processor():
    def now():
        return datetime.now()
    return dict(now=now)

@app.route('/citizen/<int:user_id>/<int:citizen_id>')
def citizen_dashboard(user_id, citizen_id):
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('error_page'))
        
    try:
        citizen_data = {}
        recent_activities = []
        
        with conn.cursor() as cur:
            # Check if user_id belongs to Admin
            cur.execute("SELECT user_type FROM Users WHERE user_id = %s;", (user_id,))
            u_type_res = cur.fetchone()
            if u_type_res and u_type_res[0] == 'Admin':
                # Verify if this citizen_id is Admin's own citizen record
                cur.execute("SELECT citizen_id FROM Citizens WHERE user_id = %s;", (user_id,))
                adm_cit_res = cur.fetchone()
                if not adm_cit_res or adm_cit_res[0] != citizen_id:
                    flash('Admin cannot access individual citizen portals directly to protect citizen privacy. Use Reset Password to log in as citizen, or use Citizen Portal Preview.', 'warning')
                    return redirect(url_for('admin_dashboard', admin_id=user_id))

            # Get citizen basic info including panchayat_id
            cur.execute("""
                SELECT first_name, last_name, panchayat_id
                FROM Citizens 
                WHERE citizen_id = %s
            """, (citizen_id,))
            citizen_info = cur.fetchone()
            
            if citizen_info:
                citizen_data['name'] = f"{citizen_info[0]} {citizen_info[1]}"
                panchayat_id = citizen_info[2]
                
                # Get panchayat (village) information
                cur.execute("""
                    SELECT p.panchayat_name, p.establishment_date, p.area_sq_km, 
                           p.contact_email, p.contact_phone, a.block_name, a.district_name, 
                           a.state_name, a.pin_code, a.country
                    FROM Panchayats p
                    JOIN Address a ON p.address_id = a.address_id
                    WHERE p.panchayat_id = %s
                """, (panchayat_id,))
                panchayat_info = cur.fetchone()
                
                if panchayat_info:
                    village_info = {
                        'panchayat_name': panchayat_info[0],
                        'establishment_date': panchayat_info[1],
                        'area_sq_km': panchayat_info[2],
                        'contact_email': panchayat_info[3],
                        'contact_phone': panchayat_info[4],
                        'address': f"{panchayat_info[5]}, {panchayat_info[6]}, {panchayat_info[7]} - {panchayat_info[8]}, {panchayat_info[9]}"
                    }
                    citizen_data['village_info'] = village_info
                    
                    # Get panchayat members/officials
                    cur.execute("""
                        SELECT c.first_name, c.last_name, e.designation, e.department, c.email
                        FROM Employees e
                        JOIN Citizens c ON e.citizen_id = c.citizen_id
                        WHERE e.panchayat_id = %s
                        ORDER BY e.designation
                    """, (panchayat_id,))
                    panchayat_members = cur.fetchall()
                    citizen_data['panchayat_members'] = panchayat_members
            else:
                citizen_data['name'] = "Citizen"
            
            
            # Get tax information
            cur.execute("""
                SELECT tax_due_amount 
                FROM Citizens 
                WHERE citizen_id = %s
            """, (citizen_id,))
            tax_result = cur.fetchone()
            if tax_result:
                citizen_data['total_tax_due'] = tax_result[0]
            else:
                citizen_data['total_tax_due'] = 0

            cur.execute("""
                SELECT type_id, type, description 
                FROM Certificate_Type
                ORDER BY type
            """)
            certificate_types = cur.fetchall()
            citizen_data['certificate_types'] = certificate_types
            

            cur.execute("""
                SELECT schema_id, type, description
                FROM schema_type
                ORDER BY type
            """)
            citizen_data['available_welfare_schemes'] = cur.fetchall()
            # Get certificate applications
            cur.execute("""
                SELECT type_id, type, description
                FROM Certificate_Type
                ORDER BY type
            """)
            certificate_types = cur.fetchall()
            citizen_data['certificate_types'] = certificate_types

            # Get certificate applications
            cur.execute("""
                SELECT certificate_id, type, application_date, status
                FROM certificate
                WHERE citizen_id = %s
                ORDER BY application_date DESC
            """, (citizen_id,))
            certificates = cur.fetchall()
            citizen_data['certificates'] = certificates
            citizen_data['pending_certificates'] = sum(1 for cert in certificates if cert[3] == 'Pending')
            citizen_data['approved_certificates'] = sum(1 for cert in certificates if cert[3] == 'Approved')
            
            for cert in certificates:
                recent_activities.append({
                    'date': cert[2],  # application_date
                    'activity': f"Applied for {cert[1]} Certificate",  # type
                    'status': cert[3],  # status
                    'action_type': 'certificate',
                    'id': cert[0]  # certificate_id
                })

            # Get service requests
            cur.execute("""
                SELECT sr.request_id, s.type, sr.request_date, sr.status
                FROM Service_Request sr
                JOIN Service s ON sr.service_id = s.service_id
                WHERE sr.citizen_id = %s
                ORDER BY sr.request_date DESC
            """, (citizen_id,))
            service_requests = cur.fetchall()
            citizen_data['service_requests'] = service_requests


            for service in service_requests:
                recent_activities.append({
                    'date': service[2],  # request_date
                    'activity': f"Service Request: {service[1]}",  # service type
                    'status': service[3],  # status
                    'action_type': 'service',
                    'id': service[0]  # request_id
                })
            
            # Get announcements
            cur.execute("""
                SELECT heading, detail, date
                FROM Announcements
                ORDER BY date DESC
                LIMIT 5
            """)
            announcements = cur.fetchall()
            citizen_data['announcements'] = announcements

            # Get welfare scheme applications
            cur.execute("""
                SELECT cws.enrollment_id, st.type, cws.joining_date, cws.status
                FROM Citizen_welfare_Schema cws
                JOIN schema_type st ON cws.schema_id = st.schema_id
                WHERE cws.citizen_id = %s
                ORDER BY cws.joining_date DESC
            """, (citizen_id,))
            welfare_schemes = cur.fetchall()
            citizen_data['welfare_schemes'] = welfare_schemes

            # Add to recent activities - KEEP ONLY ONE COPY of this code in your function
            for scheme in welfare_schemes:
                recent_activities.append({
                    'date': scheme[2],
                    'activity': f"Applied for {scheme[1]} Scheme",
                    'status': scheme[3],
                    'action_type': 'welfare',
                    'id': scheme[0]
                })

            # Get tax payment history
            cur.execute("""
                SELECT tax_payment_id, amount, date_of_payment, mode_of_payment 
                FROM Tax_Payments 
                WHERE citizen_id = %s 
                ORDER BY date_of_payment DESC
            """, (citizen_id,))
            
            tax_payments = cur.fetchall()
            
            # Add tax payments to recent activities
            for payment in tax_payments:
                recent_activities.append({
                    'date': payment[2],  # date_of_payment
                    'activity': f"Tax Payment of ₹{payment[1]}",
                    'status': 'Completed',
                    'action_type': 'tax',
                    'id': payment[0],  # tax_payment_id
                    'amount': float(payment[1]),  # Convert to float to ensure it's a number
                    'payment_mode': payment[3] if payment[3] else 'Online'  # mode_of_payment with fallback
                })
            recent_activities.sort(key=lambda x: x['date'], reverse=True)
            
            # Take only the 5 most recent activities
            recent_activities = recent_activities[:15]
            citizen_data['recent_activities'] = recent_activities
            
            # Add this query to fetch all available services from database
            cur.execute("""
                SELECT service_id, type, description
                FROM Service
                ORDER BY type
            """)
            services = cur.fetchall()
            citizen_data['services'] = services
            
        return render_template('citizens.html',
                               user_id=user_id,
                               citizen_id=citizen_id,
                               data=citizen_data)
    
    except Exception as e:
        print("Error fetching citizen data:", e)
        flash('An error occurred while loading your dashboard.', 'danger')
        return redirect(url_for('error_page'))
    
    finally:
        conn.close()


@app.route('/apply_certificate/<int:citizen_id>', methods=['POST'])
@app.route('/view_certificate/<int:certificate_id>')
def view_certificate(certificate_id):
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('error_page'))
    
    try:
        with conn.cursor() as cur:
            # First get the citizen_id and associated user_id for potential redirect
            cur.execute("""
                SELECT cert.citizen_id, c.user_id
                FROM certificate cert
                JOIN Citizens c ON cert.citizen_id = c.citizen_id
                WHERE cert.certificate_id = %s
            """, (certificate_id,))
            redirect_info = cur.fetchone()
            
            if not redirect_info:
                flash('Certificate not found.', 'danger')
                return redirect(url_for('error_page'))
            
            citizen_id, user_id = redirect_info
            
            # Now get the certificate details
            cur.execute("""
                SELECT c.first_name, c.last_name, c.dob, c.gender, 
                       COALESCE(a.block_name || ', ' || a.district_name || ', ' || a.state_name, 'Address not available') as address,
                       cert.type, cert.application_date, cert.status, cert.description
                FROM certificate cert
                JOIN Citizens c ON cert.citizen_id = c.citizen_id
                LEFT JOIN Panchayats p ON c.panchayat_id = p.panchayat_id
                LEFT JOIN Address a ON p.address_id = a.address_id
                WHERE cert.certificate_id = %s
            """, (certificate_id,))
            certificate_info = cur.fetchone()
            
            if not certificate_info or certificate_info[7] != 'Approved':
                flash('Certificate not found or not yet approved.', 'danger')
                return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
            
            # Disk Cache Check for Pre-generated PDF
            cert_dir = os.path.join(app.static_folder, 'generated_certificates')
            os.makedirs(cert_dir, exist_ok=True)
            cached_pdf_path = os.path.join(cert_dir, f'Certificate_{certificate_id}.pdf')

            if os.path.exists(cached_pdf_path):
                print(f"Serving cached PDF for Certificate #{certificate_id}")
                with open(cached_pdf_path, 'rb') as f:
                    pdf_data = f.read()
                response = make_response(pdf_data)
                response.headers['Content-Type'] = 'application/pdf'
                response.headers['Content-Disposition'] = f'attachment; filename=Certificate_{certificate_id}.pdf'
                return response

            from datetime import datetime
            
            # Setup wkhtmltopdf path based on operating system
            if platform.system() == 'Windows':
                # Try multiple common installation paths
                possible_paths = [
                    r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe',
                    r'C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe',
                    r'wkhtmltopdf'  # If it's in PATH
                ]
                
                wkhtmltopdf_path = None
                for path in possible_paths:
                    if os.path.exists(path):
                        wkhtmltopdf_path = path
                        break
                    elif path == 'wkhtmltopdf':
                        # Try using just the command name if it's in PATH
                        wkhtmltopdf_path = path
                        break
            else:
                # Linux path (assumes it's installed via apt)
                wkhtmltopdf_path = '/usr/bin/wkhtmltopdf'
                if not os.path.exists(wkhtmltopdf_path):
                    wkhtmltopdf_path = 'wkhtmltopdf'  # Try using just the command name if it's in PATH
            
            # Print debugging information
            print(f"Using wkhtmltopdf path: {wkhtmltopdf_path}")
            
            # Configure pdfkit with the path
            try:
                config = pdfkit.configuration(wkhtmltopdf=wkhtmltopdf_path)
                
                # Create HTML content for the certificate
                html_content = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>{certificate_info[5]} Certificate</title>
                    <style>
                        body {{
                            font-family: 'Times New Roman', Times, serif;
                            margin: 40px;
                            position: relative;
                        }}
                        .certificate {{
                            border: 15px solid #073763;
                            padding: 40px;
                            position: relative;
                        }}
                        .header {{
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #073763;
                            padding-bottom: 15px;
                        }}
                        .title {{
                            font-size: 28px;
                            color: #073763;
                            text-transform: uppercase;
                            margin-bottom: 5px;
                        }}
                        .subtitle {{
                            font-size: 18px;
                            color: #333;
                        }}
                        .content {{
                            margin: 30px 0;
                            font-size: 16px;
                            line-height: 1.6;
                        }}
                        .detail {{
                            margin: 10px 0;
                            text-align: left;
                        }}
                        .label {{
                            font-weight: bold;
                            display: inline-block;
                            width: 150px;
                        }}
                        .footer {{
                            margin-top: 60px;
                            display: flex;
                            justify-content: space-between;
                        }}
                        .signature {{
                            text-align: center;
                            width: 200px;
                        }}
                        .signature-line {{
                            width: 100%;
                            border-top: 1px solid #000;
                            margin-bottom: 5px;
                        }}
                        .signature-title {{
                            font-weight: bold;
                        }}
                        .watermark {{
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(-45deg);
                            font-size: 100px;
                            color: rgba(7, 55, 99, 0.05);
                        }}
                        .seal {{
                            position: absolute;
                            bottom: 100px;
                            right: 100px;
                            width: 150px;
                            height: 150px;
                            border: 2px solid #073763;
                            border-radius: 50%;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            transform: rotate(-15deg);
                            opacity: 0.2;
                        }}
                        .seal-text {{
                            font-size: 18px;
                            color: #073763;
                            text-align: center;
                            font-weight: bold;
                        }}
                        .certificate-id {{
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            font-size: 14px;
                            color: #073763;
                        }}
                    </style>
                </head>
                <body>
                    <div class="certificate">
                        <div class="certificate-id">Certificate ID: CERT-{certificate_id}</div>
                        <div class="watermark">OFFICIAL</div>
                        
                        <div class="header">
                            <h1 class="title">{certificate_info[5]} Certificate</h1>
                            <p class="subtitle">Gram Panchayat Management System</p>
                        </div>
                        
                        <div class="content">
                            <p>This is to certify that the following information is true and correct according to our records:</p>
                            
                            <div class="detail">
                                <span class="label">Name:</span> {certificate_info[0]} {certificate_info[1]}
                            </div>
                            
                            <div class="detail">
                                <span class="label">Date of Birth:</span> {certificate_info[2].strftime('%d %B %Y')}
                            </div>
                            
                            <div class="detail">
                                <span class="label">Gender:</span> {certificate_info[3]}
                            </div>
                            
                            <div class="detail">
                                <span class="label">Address:</span> {certificate_info[4]}
                            </div>
                            
                            <div class="detail">
                                <span class="label">Certificate Type:</span> {certificate_info[5]}
                            </div>
                            
                            <div class="detail">
                                <span class="label">Issue Date:</span> {datetime.now().strftime('%d %B %Y')}
                            </div>
                        </div>
                        
                        <div class="footer">
                            <div class="signature">
                                <div class="signature-line"></div>
                                <div class="signature-title">Certifying Officer</div>
                                <div>Gram Panchayat</div>
                            </div>
                            
                            <div class="signature">
                                <div class="signature-line"></div>
                                <div class="signature-title">Village Head</div>
                                <div>Gram Panchayat</div>
                            </div>
                        </div>
                        
                        <div class="seal">
                            <div class="seal-text">OFFICIAL SEAL<br>GRAM PANCHAYAT</div>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                # Generate PDF from HTML content using the configuration
                options = {
                    'page-size': 'A4',
                    'margin-top': '0.75in',
                    'margin-right': '0.75in',
                    'margin-bottom': '0.75in',
                    'margin-left': '0.75in',
                    'encoding': "UTF-8"
                }
                
                # Add debug information
                print("Attempting to generate PDF...")
                pdf = pdfkit.from_string(html_content, False, options=options, configuration=config)
                print("PDF generated successfully")

                # Cache generated PDF to disk
                try:
                    with open(cached_pdf_path, 'wb') as f:
                        f.write(pdf)
                    print(f"Saved generated PDF to disk cache: {cached_pdf_path}")
                except Exception as cache_err:
                    print(f"Warning: Failed to save PDF to cache: {cache_err}")
                
                # Create response with PDF content
                response = make_response(pdf)
                response.headers['Content-Type'] = 'application/pdf'
                response.headers['Content-Disposition'] = f'attachment; filename=Certificate_{certificate_id}.pdf'
                
                return response
                
            except Exception as e:
                print(f"PDF generation error: {e}")
                
                # Provide more detailed error message
                if "wkhtmltopdf" in str(e) and "not found" in str(e):
                    flash('PDF generation tool (wkhtmltopdf) not found. Please contact administrator.', 'danger')
                else:
                    flash(f'Error generating PDF certificate: {str(e)}. Please try again later.', 'danger')
                
                return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
    
    except Exception as e:
        print(f"Database error: {e}")
        flash('An error occurred while retrieving the certificate.', 'danger')
        return redirect(url_for('error_page'))
    
    finally:
        conn.close() 


@app.route('/apply_certificate/<int:user_id>/<int:citizen_id>', methods=['POST'])
def apply_certificate(user_id, citizen_id):
    if request.method == 'POST':
        certificate_type = request.form.get('certificate-type')
        description = request.form.get('description')
        doc_file = request.files.get('document')
        doc_path = save_uploaded_document(doc_file)
        
        conn = get_db_connection()
        if not conn:
            flash("Database connection error.", "danger")
            return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
        
        try:
            with conn.cursor() as cur:
                # First get the type_id for the certificate type
                cur.execute("""
                    SELECT type_id FROM Certificate_Type WHERE type = %s
                """, (certificate_type,))
                
                result = cur.fetchone()
                if not result:
                    flash(f"Invalid certificate type: {certificate_type}", "danger")
                    return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
                
                type_id = result[0]
                
                # Insert the certificate application - include both type, type_id, and document_path
                cur.execute("""
                    INSERT INTO certificate 
                    (citizen_id, application_date, status, type, type_id, description, document_path)
                    VALUES (%s, CURRENT_DATE, 'Pending', %s, %s, %s, %s)
                """, (citizen_id, certificate_type, type_id, description, doc_path))
                
                cur.execute("SELECT panchayat_id FROM Citizens WHERE citizen_id = %s;", (citizen_id,))
                cit_res = cur.fetchone()
                p_id = cit_res[0] if cit_res else None

                emit_realtime_event('new_application', {
                    'type': 'Certificate',
                    'title': certificate_type,
                    'citizen_id': citizen_id,
                    'panchayat_id': p_id,
                    'status': 'Pending'
                }, p_id)

                flash(f"Your application for {certificate_type} Certificate has been submitted successfully.", "success")
        
        except Exception as e:
            conn.rollback()
            print(f"Error applying for certificate: {e}")
            flash(f"An error occurred: {str(e)}", "danger")
        
        finally:
            conn.close()
    
    return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))



@app.route('/apply_welfare/<int:user_id>/<int:citizen_id>', methods=['POST'])
def apply_welfare(user_id, citizen_id):
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('error_page'))
        
    try:
        # Get form data
        scheme_type = request.form.get('welfare-scheme')
        reason = request.form.get('welfare-reason', '')
        family_income = request.form.get('family-income', 0)
        doc_file = request.files.get('document')
        doc_path = save_uploaded_document(doc_file)
        
        with conn.cursor() as cur:
            # Get the schema_id from the scheme type
            cur.execute("""
                SELECT schema_id FROM schema_type WHERE type = %s
            """, (scheme_type,))
            
            schema_result = cur.fetchone()
            if not schema_result:
                flash(f'Welfare scheme "{scheme_type}" not found.', 'danger')
                return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
            
            schema_id = schema_result[0]
            
            # Create the welfare application
            cur.execute("""
                INSERT INTO Citizen_welfare_Schema 
                (citizen_id, schema_id, joining_date, request_date, description, status, document_path)
                VALUES (%s, %s, NOW(), NOW(), %s, 'Pending', %s)
            """, (citizen_id, schema_id, reason, doc_path))
            
            conn.commit()
            
            cur.execute("SELECT panchayat_id FROM Citizens WHERE citizen_id = %s;", (citizen_id,))
            cit_res = cur.fetchone()
            p_id = cit_res[0] if cit_res else None

            emit_realtime_event('new_application', {
                'type': 'Welfare Scheme',
                'title': scheme_type,
                'citizen_id': citizen_id,
                'panchayat_id': p_id,
                'status': 'Pending'
            }, p_id)

            flash(f'Successfully applied for {scheme_type} welfare scheme!', 'success')
            
        return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
        
    except Exception as e:
        conn.rollback()
        print("Error in welfare application:", e)
        flash('An error occurred while applying for the welfare scheme.', 'danger')
        return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
        
    finally:
        conn.close()

# Add this route after the get_certificate_details route

@app.route('/get_welfare_details/<int:enrollment_id>')
def get_welfare_details(enrollment_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor(cursor_factory=extras.DictCursor) as cur:
            cur.execute("""
                SELECT cws.enrollment_id, cws.citizen_id, cws.schema_id, 
                       cws.joining_date, cws.request_date, cws.description, cws.status,
                       st.type, st.description as scheme_description,
                       c.first_name || ' ' || c.last_name as citizen_name
                FROM Citizen_welfare_Schema cws
                JOIN schema_type st ON cws.schema_id = st.schema_id
                JOIN Citizens c ON cws.citizen_id = c.citizen_id
                WHERE cws.enrollment_id = %s
            """, (enrollment_id,))
            welfare = cur.fetchone()
            
            if welfare:
                return jsonify({
                    'success': True,
                    'welfare': dict(welfare)
                })
            else:
                return jsonify({'success': False, 'message': 'Welfare enrollment not found'})
    
    except Exception as e:
        print("Error retrieving welfare details:", e)
        return jsonify({'success': False, 'message': 'An error occurred while fetching welfare details'})
    
    finally:
        conn.close()


@app.route('/pay_tax/<int:user_id>/<int:citizen_id>', methods=['POST'])
def pay_tax(user_id, citizen_id):
    if request.method == 'POST':
        # Get form data
        payment_mode = request.form.get('payment_mode')
        amount = request.form.get('amount')
        
        # Validate amount - make sure it's not None or empty
        if not amount:
            flash('Payment amount is required', 'danger')
            return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
        
        # Convert to float for database
        try:
            amount_float = float(amount)
        except ValueError:
            flash('Invalid payment amount', 'danger')
            return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
        
        conn = get_db_connection()
        if not conn:
            flash('Database connection error.', 'danger')
            return redirect(url_for('error_page'))
        
        try:
            with conn.cursor() as cur:
                # First check if the sequence exists
                cur.execute("""
                    SELECT EXISTS(
                        SELECT FROM pg_sequences
                        WHERE schemaname = 'highfive' AND sequencename = 'tax_payments_tax_payment_id_seq'
                    );
                """)
                sequence_exists = cur.fetchone()[0]
                
                # Record the tax payment in the database - use SERIAL auto-increment
                if sequence_exists:
                    # If sequence exists, use it
                    cur.execute("""
                        INSERT INTO tax_payments (citizen_id, amount, date_of_payment, mode_of_payment)
                        VALUES (%s, %s, CURRENT_DATE, %s)
                        RETURNING tax_payment_id;
                    """, (citizen_id, amount_float, payment_mode))
                else:
                    # If sequence doesn't exist, let's just generate a simple unique ID
                    cur.execute("""
                        SELECT COALESCE(MAX(tax_payment_id), 0) + 1 FROM tax_payments;
                    """)
                    next_payment_id = cur.fetchone()[0]
                    
                    cur.execute("""
                        INSERT INTO tax_payments (tax_payment_id, citizen_id, amount, date_of_payment, mode_of_payment)
                        VALUES (%s, %s, %s, CURRENT_DATE, %s)
                        RETURNING tax_payment_id;
                    """, (next_payment_id, citizen_id, amount_float, payment_mode))
                
                payment_id = cur.fetchone()[0]
                
                # Update the citizen's tax due amount
                cur.execute("""
                    UPDATE citizens
                    SET tax_due_amount = GREATEST(0, tax_due_amount - %s)
                    WHERE citizen_id = %s
                """, (amount_float, citizen_id))
                
                conn.commit()
                flash('Tax payment successful!', 'success')
                
                return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
                
        except Exception as e:
            conn.rollback()
            print("Tax payment error:", e)
            flash('An error occurred while processing your payment.', 'danger')
            return redirect(url_for('error_page'))
        finally:
            conn.close()
    return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))

@app.route('/government_dashboard/<int:user_id>')
def monitor_dashboard(user_id): 
    conn = get_db_connection()
    if not conn:
        flash("Database connection error.", "danger")
        return redirect(url_for('error_page'))
    
    try:
        with conn.cursor() as cur:
            # Single aggregated query joining Panchayats and Citizens to eliminate N+1 queries
            cur.execute("""
                SELECT p.panchayat_id, p.panchayat_name, p.establishment_date, 
                       p.area_sq_km, p.contact_email, p.contact_phone, 
                       COUNT(c.citizen_id) AS population
                FROM Panchayats p
                LEFT JOIN Citizens c ON p.panchayat_id = c.panchayat_id
                GROUP BY p.panchayat_id, p.panchayat_name, p.establishment_date, 
                         p.area_sq_km, p.contact_email, p.contact_phone
                ORDER BY p.panchayat_name;
            """)
            panchayats_data = cur.fetchall()
            
            total_panchayats = len(panchayats_data)
            total_population = sum(row[6] for row in panchayats_data)
            
            panchayat_data = [
                {
                    "panchayat_id": row[0],
                    "panchayat_name": row[1],
                    "establishment_date": row[2].strftime("%Y-%m-%d") if row[2] else "",
                    "area_sq_km": row[3],
                    "contact_email": row[4],
                    "contact_phone": row[5],
                    "population": row[6]
                }
                for row in panchayats_data
            ]
            
        return render_template('government_dashboard.html', 
                              user_id=user_id, 
                              panchayats=panchayat_data,
                              total_panchayats=total_panchayats,
                              total_population=total_population)
    except Exception as e:
        print("Error fetching Panchayat data:", e)
        flash("An error occurred while fetching data.", "danger")
        return redirect(url_for('error_page'))
    finally:
        conn.close()

@app.route('/government_dashboard/village_details.html')
def village_details(): 
    # Get panchayat_id from request arguments instead of URL path
    panchayat_id = request.args.get('panchayat_id', type=int)
    
    if not panchayat_id:
        flash("Panchayat ID is required.", "danger")
        return redirect(url_for('monitor_dashboard', user_id=session.get('user_id', 0)))
    
    conn = get_db_connection()
    if not conn:
        flash("Database connection error.", "danger")
        return redirect(url_for('error_page'))
    
    try:
        with conn.cursor() as cur:
            # Get panchayat details
            cur.execute("""
                SELECT panchayat_id, panchayat_name, establishment_date, area_sq_km, contact_email, contact_phone
                FROM Panchayats
                WHERE panchayat_id = %s;
            """, (panchayat_id,))
            panchayat = cur.fetchone()
            
            if not panchayat:
                flash("Panchayat not found.", "danger")
                return redirect(url_for('monitor_dashboard', user_id=session.get('user_id', 0)))
            
            # Format panchayat data
            panchayat_data = {
                "panchayat_id": panchayat[0],
                "panchayat_name": panchayat[1],
                "establishment_date": panchayat[2].strftime("%Y-%m-%d") if panchayat[2] else "",
                "area_sq_km": panchayat[3],
                "contact_email": panchayat[4],
                "contact_phone": panchayat[5]
            }
            
            # Get employees for this panchayat with single JOIN to eliminate loop queries
            cur.execute("""
                SELECT e.employee_id, e.user_id, e.citizen_id, e.designation, e.join_date, e.end_date, 
                       e.department, e.employment_type, e.salary,
                       COALESCE(c.first_name || ' ' || c.last_name, 'N/A') AS name
                FROM Employees e
                LEFT JOIN Citizens c ON e.citizen_id = c.citizen_id
                WHERE e.panchayat_id = %s;
            """, (panchayat_id,))
            employees = cur.fetchall()
            
            employee_data = [
                {
                    "employee_id": row[0],
                    "user_id": row[1],
                    "citizen_id": row[2],
                    "name": row[9],
                    "designation": row[3],
                    "join_date": row[4].strftime("%Y-%m-%d") if row[4] else "N/A",
                    "end_date": row[5].strftime("%Y-%m-%d") if row[5] else "N/A",
                    "department": row[6],
                    "employment_type": row[7],
                    "salary": row[8]
                }
                for row in employees
            ]
            
            # Get citizens for this panchayat - Updated to match the new table structure
            cur.execute("""
                SELECT citizen_id, user_id, first_name, last_name, gender, dob, educational_qualification, 
                       occupation, annual_income, tax_due_amount, marital_status, phone_number, email
                FROM Citizens
                WHERE panchayat_id = %s;
            """, (panchayat_id,))
            citizens = cur.fetchall()
            
            # Format citizens data - Updated to match the new table structure
            citizen_data = [
                {
                    "citizen_id": row[0],
                    "user_id": row[1],
                    "name": f"{row[2]} {row[3]}",
                    "gender": row[4],
                    "dob": row[5].strftime("%Y-%m-%d") if row[5] else "N/A",
                    "education": row[6],
                    "occupation": row[7],
                    "annual_income": row[8],
                    "tax_due": row[9],
                    "marital_status": row[10],
                    "phone": row[11],
                    "email": row[12]
                }
                for row in citizens
            ]
            
            # Count total citizens
            citizen_count = len(citizen_data)
            
        return render_template('village_details.html', 
                              panchayat=panchayat_data,
                              employees=employee_data,
                              citizens=citizen_data,
                              citizen_count=citizen_count)
    
    except Exception as e:
        print("Error fetching village details:", e)
        flash("An error occurred while fetching data.", "danger")
        return redirect(url_for('error_page'))
    finally:
        conn.close()

@app.route('/get_service_request/<int:request_id>')
def get_service_request(request_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"})
    
    try:
        with conn.cursor() as cur:
            # Get service request details including the description
            cur.execute("""
                SELECT sr.request_id, s.type, sr.request_date, sr.status, sr.description
                FROM Service_Request sr
                JOIN Service s ON sr.service_id = s.service_id
                WHERE sr.request_id = %s
            """, (request_id,))
            request_data = cur.fetchone()
            
            if not request_data:
                return jsonify({"success": False, "message": "Service request not found"})
                
            # Format the response
            request = {
                "id": request_data[0],
                "type": request_data[1],
                "date": request_data[2].strftime('%d %b %Y') if request_data[2] else '',
                "status": request_data[3],
                "description": request_data[4] if request_data[4] else 'No description provided'
            }
            
            return jsonify({"success": True, "request": request})
            
    except Exception as e:
        print(f"Error fetching service request: {e}")
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"})
    
    finally:
        conn.close()

####################################### Announcements Routes ############################################################
@app.route('/add_announcement', methods=['POST'])
def add_announcement():
    data = request.get_json()
    heading = data.get('heading')
    detail = data.get('detail')
    announcement_date = date.today()
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO Announcements (heading, detail, date)
                VALUES (%s, %s, %s);
            """, (heading, detail, announcement_date))
        return jsonify({'success': True})
    except Exception as e:
        print("Insert error (Announcements):", e)
        return jsonify({'success': False, 'message': 'Failed to add announcement'})
    finally:
        conn.close()

@app.route('/get_announcement/<int:announcement_id>', methods=['GET'])
def get_announcement(announcement_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT heading, detail FROM Announcements WHERE announcement_id = %s;", (announcement_id,))
            announcement = cur.fetchone()
            if announcement:
                return jsonify({'success': True, 'announcement': {'heading': announcement[0], 'detail': announcement[1]}})
            else:
                return jsonify({'success': False, 'message': 'Announcement not found'})
    except Exception as e:
        print("Query error (Get Announcement):", e)
        return jsonify({'success': False, 'message': 'Failed to fetch announcement details'})
    finally:
        conn.close()

@app.route('/update_announcement/<int:announcement_id>', methods=['POST'])
def update_announcement(announcement_id):
    data = request.get_json()
    heading = data.get('heading')
    detail = data.get('detail')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE Announcements SET heading = %s, detail = %s WHERE announcement_id = %s;
            """, (heading, detail, announcement_id))
        return jsonify({'success': True})
    except Exception as e:
        print("Update error (Announcements):", e)
        return jsonify({'success': False, 'message': 'Failed to update announcement'})
    finally:
        conn.close()

@app.route('/delete_announcement/<int:announcement_id>', methods=['POST'])
def delete_announcement(announcement_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Announcements WHERE announcement_id = %s;", (announcement_id,))
        return jsonify({'success': True})
    except Exception as e:
        print("Delete error (Announcements):", e)
        return jsonify({'success': False, 'message': 'Failed to delete announcement'})
    finally:
        conn.close()

@app.route('/get_announcements', methods=['GET'])
def get_announcements():
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT announcement_id, heading, detail, date
                FROM Announcements
                ORDER BY date DESC;
            """)
            announcements = cur.fetchall()
            announcements_list = [
                {'id': row[0], 'heading': row[1], 'detail': row[2], 'date': row[3].strftime('%Y-%m-%d')}
                for row in announcements
            ]
        return jsonify({'success': True, 'announcements': announcements_list})
    except Exception as e:
        print("Error fetching announcements:", e)
        return jsonify({'success': False, 'message': 'Failed to fetch announcements'})
    finally:
        conn.close()

@app.route('/api/announcement/<int:announcement_id>', methods=['GET'])
def get_api_announcement(announcement_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT announcement_id, heading, detail, date
                FROM Announcements
                WHERE announcement_id = %s
            """, (announcement_id,))
            
            row = cur.fetchone()
            if not row:
                return jsonify({'success': False, 'message': 'Announcement not found'})
            
            announcement = {
                'id': row[0],
                'heading': row[1],
                'detail': row[2],
                'date': row[3].strftime('%Y-%m-%d') if row[3] else ''
            }
            
        return jsonify({'success': True, 'announcement': announcement})
    
    except Exception as e:
        print(f"Error fetching announcement: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/announcement/update/<int:announcement_id>', methods=['PUT'])
def update_api_announcement(announcement_id):
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE Announcements 
                SET heading = %s, detail = %s
                WHERE announcement_id = %s
            """, (data['heading'], data['detail'], announcement_id))
            
        return jsonify({'success': True, 'message': 'Announcement updated successfully'})
    
    except Exception as e:
        print(f"Error updating announcement: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/announcement/create', methods=['POST'])
def create_api_announcement():
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO Announcements (heading, detail, date)
                VALUES (%s, %s, CURRENT_DATE)
            """, (data['heading'], data['detail']))
            
        return jsonify({'success': True, 'message': 'Announcement created successfully'})
    
    except Exception as e:
        print(f"Error creating announcement: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/api/announcement/delete/<int:announcement_id>', methods=['POST'])
def delete_api_announcement(announcement_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Announcements WHERE announcement_id = %s", (announcement_id,))
            
        return jsonify({'success': True, 'message': 'Announcement deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting announcement: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

############################################## ADMIN ROUTES #########################################################
@app.route('/admin/<int:admin_id>')
def admin_dashboard(admin_id):
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('error_page'))

    employees = []
    citizens = []
    panchayats = []
    total_employees = 0
    total_citizens = 0
    total_panchayats = 0
    announcements = []

    try:
        with conn.cursor() as cur:
            try:
                cur.execute("""
                    SELECT e.employee_id, c.first_name, c.last_name, e.designation, e.department, p.panchayat_name,
                    CASE
                        WHEN e.end_date >= CURRENT_DATE THEN 'Active'
                        ELSE 'Inactive'
                    END AS status, e.salary, e.employment_type
                    FROM Employees e
                    JOIN Citizens c ON e.citizen_id = c.citizen_id
                    JOIN Panchayats p ON e.panchayat_id = p.panchayat_id
                    ORDER BY status DESC, c.first_name, c.last_name;
                """)
                employees = cur.fetchall()
            except Exception as e:
                print("Query error (Employees):", e)
                employees = []

            try:
                cur.execute("""
                    SELECT c.citizen_id, c.first_name, c.last_name, 
                    DATE_PART('year', AGE(c.dob)) AS age, c.email,
                    CASE 
                        WHEN c.user_id IS NOT NULL THEN 'Registered'
                        ELSE 'Not Registered'
                    END AS status
                    FROM Citizens c
                    JOIN Panchayats p ON c.panchayat_id = p.panchayat_id
                    ORDER BY status DESC, c.first_name, c.last_name;
                """)
                citizens = cur.fetchall()
            except Exception as e:
                print("Query error (Citizens):", e)
                citizens = []

            try:
                cur.execute("""
                    SELECT panchayat_id, panchayat_name, contact_email, contact_phone, area_sq_km, establishment_date
                    FROM Panchayats
                    ORDER BY panchayat_name;
                """)
                panchayats = cur.fetchall()
            except Exception as e:
                print("Query error (Panchayats):", e)
                panchayats = []

            try:
                cur.execute("""
                    SELECT COUNT(*) FROM Employees;
                """)
                total_employees = cur.fetchone()[0]
            except Exception as e:
                print("Query error (Total Employees):", e)
                total_employees = 0

            try:
                cur.execute("""
                    SELECT COUNT(*) FROM Citizens;
                """)
                total_citizens = cur.fetchone()[0]
            except Exception as e:
                print("Query error (Total Citizens):", e)
                total_citizens = 0

            try:
                cur.execute("""
                    SELECT COUNT(*) FROM Panchayats;
                """)
                total_panchayats = cur.fetchone()[0]
            except Exception as e:
                print("Query error (Total Panchayats):", e)
                total_panchayats = 0

            try:
                cur.execute("""
                    SELECT announcement_id, heading, detail, date
                    FROM Announcements
                    ORDER BY date DESC
                    ;
                """)
                announcements = cur.fetchall()
            except Exception as e:
                print("Query error (Announcements):", e)
                announcements = []
    except Exception as e:
        print("Database connection error:", e)
        flash('An error occurred while fetching data.', 'danger')
        employees = []
        citizens = []
        panchayats = []
        total_employees = 0
        total_citizens = 0
        total_panchayats = 0
        announcements = []
    finally:
        conn.close()

    return render_template('admin.html', admin_id=admin_id, employees=employees, citizens=citizens, panchayats=panchayats, total_employees=total_employees, total_citizens=total_citizens, total_panchayats=total_panchayats, announcements=announcements)

@app.route('/admin/access_employee_portal/<int:admin_id>/<int:employee_id>')
def access_employee_portal(admin_id, employee_id):
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('error_page'))
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT department FROM Employees WHERE employee_id = %s;", (employee_id,))
            res = cur.fetchone()
            if not res:
                flash('Employee not found.', 'danger')
                return redirect(url_for('admin_dashboard', admin_id=admin_id))
            
            dept = (res[0] or 'Certificate').strip()
            dept_lower = dept.lower()
            
            if 'tax' in dept_lower:
                return redirect(url_for('tax', user_id=admin_id, employee_id=employee_id))
            elif 'budget' in dept_lower:
                return redirect(url_for('budget', user_id=admin_id, employee_id=employee_id))
            elif 'service' in dept_lower:
                return redirect(url_for('service', user_id=admin_id, employee_id=employee_id))
            elif 'welfare' in dept_lower:
                return redirect(url_for('welfare', user_id=admin_id, employee_id=employee_id))
            elif 'patwari' in dept_lower:
                return redirect(url_for('patwari', user_id=admin_id, employee_id=employee_id))
            else:
                return redirect(url_for('certificate', user_id=admin_id, employee_id=employee_id))
    except Exception as e:
        print("Error accessing employee portal:", e)
        flash('Error redirecting to employee portal.', 'danger')
        return redirect(url_for('admin_dashboard', admin_id=admin_id))
    finally:
        conn.close()

@app.route('/admin/preview_module/<int:admin_id>/<string:module_name>')
def admin_preview_module(admin_id, module_name):
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('admin_dashboard', admin_id=admin_id))
    try:
        with conn.cursor() as cur:
            # Query employee record created specifically for Admin under this department
            cur.execute("""
                SELECT employee_id FROM Employees 
                WHERE user_id = %s AND LOWER(department) LIKE %s 
                ORDER BY employee_id LIMIT 1;
            """, (admin_id, f'%{module_name.lower()}%'))
            emp_res = cur.fetchone()
            
            if not emp_res:
                # Fallback to any employee record for Admin
                cur.execute("SELECT employee_id FROM Employees WHERE user_id = %s ORDER BY employee_id LIMIT 1;", (admin_id,))
                emp_res = cur.fetchone()

            if not emp_res:
                # General fallback to system employees
                cur.execute("SELECT employee_id FROM Employees WHERE LOWER(department) LIKE %s ORDER BY employee_id LIMIT 1;", (f'%{module_name.lower()}%',))
                emp_res = cur.fetchone()
            
            if not emp_res:
                flash(f'No employee profile registered for {module_name} module.', 'warning')
                return redirect(url_for('admin_dashboard', admin_id=admin_id))
            
            employee_id = emp_res[0]
            
            dept_route_map = {
                'certificate': 'certificate',
                'patwari': 'patwari',
                'budget': 'budget',
                'service': 'service',
                'tax': 'tax',
                'welfare': 'welfare'
            }
            target_route = dept_route_map.get(module_name.lower(), 'certificate')
            return redirect(url_for(target_route, user_id=admin_id, employee_id=employee_id))
    except Exception as e:
        print("Error previewing module:", e)
        flash('Error previewing module.', 'danger')
        return redirect(url_for('admin_dashboard', admin_id=admin_id))
    finally:
        conn.close()

@app.route('/admin/preview_citizen_portal/<int:admin_id>')
def admin_preview_citizen_portal(admin_id):
    conn = get_db_connection()
    if not conn:
        flash('Database connection error.', 'danger')
        return redirect(url_for('admin_dashboard', admin_id=admin_id))
    try:
        with conn.cursor() as cur:
            # Query citizen record created specifically for Admin
            cur.execute("SELECT citizen_id FROM Citizens WHERE user_id = %s LIMIT 1;", (admin_id,))
            c_res = cur.fetchone()
            if not c_res:
                cur.execute("SELECT citizen_id FROM Citizens ORDER BY citizen_id LIMIT 1;")
                c_res = cur.fetchone()
                
            if not c_res:
                flash('No citizen account found for Admin preview.', 'warning')
                return redirect(url_for('admin_dashboard', admin_id=admin_id))
            
            sample_citizen_id = c_res[0]
            
            cur.execute("""
                SELECT first_name, last_name, panchayat_id
                FROM Citizens 
                WHERE citizen_id = %s
            """, (sample_citizen_id,))
            c_info = cur.fetchone()
            
            village_info = {}
            if c_info:
                panchayat_id = c_info[2]
                cur.execute("""
                    SELECT p.panchayat_name, p.establishment_date, p.area_sq_km, 
                           p.contact_email, p.contact_phone, a.block_name, a.district_name, 
                           a.state_name, a.pin_code, a.country
                    FROM Panchayats p
                    JOIN Address a ON p.address_id = a.address_id
                    WHERE p.panchayat_id = %s
                """, (panchayat_id,))
                p_info = cur.fetchone()
                if p_info:
                    village_info = {
                        'panchayat_name': p_info[0],
                        'establishment_date': p_info[1],
                        'area_sq_km': p_info[2],
                        'contact_email': p_info[3],
                        'contact_phone': p_info[4],
                        'block_name': p_info[5],
                        'district_name': p_info[6],
                        'state_name': p_info[7],
                        'pin_code': p_info[8],
                        'country': p_info[9],
                        'address': f"{p_info[5]}, {p_info[6]}, {p_info[7]} - {p_info[8]}, {p_info[9]}"
                    }

            citizen_data = {
                'name': 'Panchayat Admin (Citizen Portal Preview)',
                'total_tax_due': 0,
                'certificates': [],
                'pending_certificates': 0,
                'approved_certificates': 0,
                'service_requests': [],
                'welfare_schemes': [],
                'announcements': [],
                'recent_activities': [],
                'certificate_types': [],
                'tax_payments': [],
                'available_welfare_schemes': [],
                'panchayat_members': [],
                'village_info': village_info
            }
            if c_info:
                panchayat_id = c_info[2]
                cur.execute("""
                    SELECT p.panchayat_name, p.establishment_date, p.area_sq_km, 
                           p.contact_email, p.contact_phone, a.block_name, a.district_name, 
                           a.state_name, a.pin_code, a.country
                    FROM Panchayats p
                    JOIN Address a ON p.address_id = a.address_id
                    WHERE p.panchayat_id = %s
                """, (panchayat_id,))
                p_info = cur.fetchone()
                if p_info:
                    village_info = {
                        'panchayat_name': p_info[0],
                        'establishment_date': p_info[1],
                        'area_sq_km': p_info[2],
                        'contact_email': p_info[3],
                        'contact_phone': p_info[4],
                        'block_name': p_info[5],
                        'district_name': p_info[6],
                        'state_name': p_info[7],
                        'pin_code': p_info[8],
                        'country': p_info[9],
                        'address': f"{p_info[5]}, {p_info[6]}, {p_info[7]} - {p_info[8]}, {p_info[9]}"
                    }
                    citizen_data['village_info'] = village_info
                    
            cur.execute("SELECT announcement_id, heading, detail, date FROM Announcements ORDER BY date DESC LIMIT 5;")
            announcements = cur.fetchall()

            cur.execute("""
                SELECT type_id, type, description 
                FROM Certificate_Type
                ORDER BY type
            """)
            certificate_types = cur.fetchall()
            citizen_data['certificate_types'] = certificate_types
            
            return render_template('citizens.html', 
                                   user_id=admin_id, 
                                   citizen_id=sample_citizen_id, 
                                   data=citizen_data, 
                                   village_info=village_info,
                                   announcements=announcements,
                                   recent_activities=[],
                                   is_admin_preview=True)
    except Exception as e:
        print("Error previewing citizen portal:", e)
        flash('Error opening citizen portal preview.', 'danger')
        return redirect(url_for('admin_dashboard', admin_id=admin_id))
    finally:
        conn.close()

@app.route('/admin/reset_password', methods=['POST'])
def admin_reset_password():
    data = request.get_json() or request.form
    target_type = data.get('type')
    target_id = data.get('id')
    new_password = data.get('new_password')

    if not target_id or not new_password or not str(new_password).strip():
        return jsonify({'success': False, 'message': 'Password cannot be empty.'})

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error.'})

    try:
        with conn.cursor() as cur:
            user_id = None
            if target_type == 'employee':
                cur.execute("SELECT user_id FROM Employees WHERE employee_id = %s;", (target_id,))
                res = cur.fetchone()
                if res: user_id = res[0]
            elif target_type == 'citizen':
                cur.execute("SELECT user_id FROM Citizens WHERE citizen_id = %s;", (target_id,))
                res = cur.fetchone()
                if res: user_id = res[0]
            else:
                user_id = target_id

            if not user_id:
                return jsonify({'success': False, 'message': 'Associated user account not found.'})

            pwd_hash = hash_password(str(new_password).strip())
            cur.execute("UPDATE Users SET password_hash = %s WHERE user_id = %s;", (pwd_hash, user_id))
            conn.commit()
            return jsonify({'success': True, 'message': 'Password updated successfully!'})
    except Exception as e:
        print("Reset password error:", e)
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/get_employee/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            # Get complete employee details including citizen information
            cur.execute("""
                SELECT e.employee_id, e.citizen_id, c.first_name, c.last_name, e.designation, 
                       e.department, e.join_date, e.end_date, e.salary, e.employment_type, 
                       e.user_id, p.panchayat_name, c.email
                FROM Employees e
                JOIN Citizens c ON e.citizen_id = c.citizen_id
                JOIN Panchayats p ON e.panchayat_id = p.panchayat_id
                WHERE e.employee_id = %s;
            """, (employee_id,))
            
            employee_data = cur.fetchone()
            
            if employee_data:
                return jsonify({'success': True, 'employee': {
                    'id': employee_data[0],
                    'citizen_id': employee_data[1],
                    'first_name': employee_data[2],
                    'last_name': employee_data[3],
                    'designation': employee_data[4],
                    'department': employee_data[5],
                    'join_date': employee_data[6],
                    'end_date': employee_data[7],
                    'salary': employee_data[8],
                    'employment_type': employee_data[9],
                    'user_id': employee_data[10],
                    'panchayat': employee_data[11],
                    'email': employee_data[12]
                }})
            else:
                return jsonify({'success': False, 'message': 'Employee not found'})
    except Exception as e:
        print("Query error (Get Employee):", e)
        return jsonify({'success': False, 'message': f'Failed to fetch employee details: {str(e)}'})
    finally:
        conn.close()

@app.route('/update_employee/<int:employee_id>', methods=['POST'])
def update_employee(employee_id):
    data = request.get_json()
    updates = []
    params = []

    if 'panchayat' in data:
        updates.append("panchayat_id = (SELECT panchayat_id FROM Panchayats WHERE panchayat_name = %s)")
        params.append(data['panchayat'])
    if 'position' in data:
        updates.append("designation = %s")
        params.append(data['position'])
    if 'end_date' in data:
        updates.append("end_date = %s")
        params.append(data['end_date'])
    if 'salary' in data:
        updates.append("salary = %s")
        params.append(data['salary'])
    if 'type' in data:
        updates.append("employment_type = %s")
        params.append(data['type'])

    if not updates:
        return jsonify({'success': False, 'message': 'No fields to update'})

    params.append(employee_id)
    query = f"UPDATE Employees SET {', '.join(updates)} WHERE employee_id = %s"

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            if updates:
                cur.execute(query, tuple(params))
            if 'password' in data and data['password'] and data['password'].strip():
                new_pwd = data['password'].strip()
                new_pwd_hash = hash_password(new_pwd)
                cur.execute("""
                    SELECT e.user_id, c.email, e.designation 
                    FROM Employees e 
                    LEFT JOIN Citizens c ON e.citizen_id = c.citizen_id 
                    WHERE e.employee_id = %s;
                """, (employee_id,))
                e_res = cur.fetchone()
                if e_res:
                    u_id, e_email, designation = e_res[0], e_res[1], e_res[2]
                    if u_id:
                        cur.execute("UPDATE Users SET password_hash = %s WHERE user_id = %s;", (new_pwd_hash, u_id))
                    elif e_email:
                        cur.execute("SELECT user_id FROM Users WHERE LOWER(email) = LOWER(%s);", (e_email,))
                        u_match = cur.fetchone()
                        if u_match:
                            u_id = u_match[0]
                            cur.execute("UPDATE Users SET password_hash = %s WHERE user_id = %s;", (new_pwd_hash, u_id))
                            cur.execute("UPDATE Employees SET user_id = %s WHERE employee_id = %s;", (u_id, employee_id))
                        else:
                            cur.execute("""
                                INSERT INTO Users (email, password_hash, user_type, status)
                                VALUES (%s, %s, %s, 'Active')
                                RETURNING user_id;
                            """, (e_email, new_pwd_hash, designation or 'Employee'))
                            new_u_id = cur.fetchone()[0]
                            cur.execute("UPDATE Employees SET user_id = %s WHERE employee_id = %s;", (new_u_id, employee_id))
        return jsonify({'success': True})
    except Exception as e:
        print("Update error (Employees):", e)
        return jsonify({'success': False, 'message': 'Failed to update employee'})
    finally:
        conn.close()

@app.route('/delete_employee/<int:employee_id>', methods=['POST'])
def delete_employee(employee_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE Users
                SET user_type = 'Citizen'
                WHERE user_id = (SELECT user_id FROM Employees WHERE employee_id = %s);
            """, (employee_id,))
            cur.execute("""
                DELETE FROM Employees WHERE employee_id = %s;
            """, (employee_id,))
        return jsonify({'success': True})
    except Exception as e:
        print("Delete error (Employees):", e)
        return jsonify({'success': False, 'message': 'Failed to delete employee'})
    finally:
        conn.close()

@app.route('/add_employee', methods=['POST'])
def add_employee():
    data = request.get_json()
    citizen_id = data.get('citizen_id')
    email = data.get('email')
    designation = data.get('designation')
    join_date = data.get('join_date')
    end_date = data.get('end_date')
    department = data.get('department')
    employment_type = data.get('type')
    salary = data.get('salary')
    # Removed panchayat parameter from request

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            # Check if the citizen exists and get their email and panchayat_id
            cur.execute("SELECT email, panchayat_id FROM Citizens WHERE citizen_id = %s", (citizen_id,))
            citizen = cur.fetchone()
            if not citizen:
                return jsonify({'success': False, 'message': 'Citizen does not exist'})
            
            # Use the email from the form if provided, otherwise use the citizen's email
            email_to_use = email if email else citizen[0]
            # Get panchayat_id directly from the citizen's record
            panchayat_id = citizen[1]
            
            # Check if a user already exists with this email
            cur.execute("SELECT user_id, user_type FROM Users WHERE email = %s", (email_to_use,))
            existing_user = cur.fetchone()
            
            if existing_user:
                user_id = existing_user[0]
                # Update existing user to Employee type if they're not already
                if existing_user[1] != 'Employee':
                    cur.execute("""
                        UPDATE Users 
                        SET user_type = 'Employee', status = 'Active'
                        WHERE user_id = %s
                    """, (user_id,))
            else:
                # Create a new user with default password hash for 'GramPanchayat'
                cur.execute("""
                    INSERT INTO Users (email, password_hash, user_type, status)
                    VALUES (%s, '1b0ce6ad7d50c0352b9e0e825567faca9208ec3e00298eae502532c1cfeb6b74', 'Employee', 'Active')
                    RETURNING user_id;
                """, (email_to_use,))
                user_id = cur.fetchone()[0]
                
            # Update the citizen's user_id reference
            cur.execute("""
                UPDATE Citizens 
                SET user_id = %s 
                WHERE citizen_id = %s;
            """, (user_id, citizen_id))
                
            # Check if employee already exists
            cur.execute("""
                SELECT employee_id FROM Employees WHERE citizen_id = %s
            """, (citizen_id,))
            existing_employee = cur.fetchone()
            
            if existing_employee:
                return jsonify({'success': False, 'message': 'This citizen is already an employee'})
                
            # Add the employee entry using the panchayat_id from the citizen's record
            cur.execute("""
                INSERT INTO Employees (user_id, panchayat_id, citizen_id, designation, join_date, end_date, department, employment_type, salary)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_id, panchayat_id, citizen_id, designation, join_date, end_date, department, employment_type, salary))

            conn.commit()
            return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        print("Insert error (Employees):", e)
        return jsonify({'success': False, 'message': f'Failed to add employee: {str(e)}'})
    finally:
        conn.close()

@app.route('/get_citizen/<int:citizen_id>', methods=['GET'])
def get_citizen(citizen_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.first_name, c.last_name, c.panchayat_id, c.gender, c.dob, c.educational_qualification, 
                       c.occupation, c.annual_income, c.tax_due_amount, c.marital_status, c.phone_number, 
                       c.email, cl.area, cl.type, cl.crop_type, h.household_id, c.user_id
                FROM Citizens c
                LEFT JOIN Citizen_Lands cl ON c.citizen_id = cl.citizen_id
                LEFT JOIN Households h ON c.citizen_id = h.citizen_id
                WHERE c.citizen_id = %s;
            """, (citizen_id,))
            citizen = cur.fetchone()
            if citizen:
                return jsonify({'success': True, 'citizen': {
                    'first_name': citizen[0],
                    'last_name': citizen[1],
                    'panchayat_id': citizen[2],
                    'gender': citizen[3],
                    'dob': citizen[4],
                    'educational_qualification': citizen[5],
                    'occupation': citizen[6],
                    'annual_income': citizen[7],
                    'tax_due_amount': citizen[8],
                    'marital_status': citizen[9],
                    'phone_number': citizen[10],
                    'email': citizen[11],
                    'land_area': citizen[12],
                    'land_type': citizen[13],
                    'crop_type': citizen[14],
                    'household_id': citizen[15],
                    'user_id': citizen[16]  # Added user_id to the response
                }})
            else:
                return jsonify({'success': False, 'message': 'Citizen not found'})
    except Exception as e:
        print("Query error (Get Citizen):", e)
        return jsonify({'success': False, 'message': 'Failed to fetch citizen details'})
    finally:
        conn.close()

@app.route('/update_citizen/<int:citizen_id>', methods=['POST'])
def update_citizen(citizen_id):
    data = request.get_json()
    updates = []
    params = []

    if 'first_name' in data and data['first_name']:
        updates.append("first_name = %s")
        params.append(data['first_name'])
    if 'last_name' in data and data['last_name']:
        updates.append("last_name = %s")
        params.append(data['last_name'])
    if 'panchayat_id' in data and data['panchayat_id']:
        updates.append("panchayat_id = %s")
        params.append(data['panchayat_id'])
    if 'gender' in data and data['gender']:
        updates.append("gender = %s")
        params.append(data['gender'])
    if 'dob' in data and data['dob']:
        updates.append("dob = %s")
        params.append(data['dob'])
    if 'educational_qualification' in data and data['educational_qualification']:
        updates.append("educational_qualification = %s")
        params.append(data['educational_qualification'])
    if 'occupation' in data and data['occupation']:
        updates.append("occupation = %s")
        params.append(data['occupation'])
    if 'annual_income' in data and data['annual_income']:
        updates.append("annual_income = %s")
        params.append(data['annual_income'])
    if 'tax_due_amount' in data and data['tax_due_amount']:
        updates.append("tax_due_amount = %s")
        params.append(data['tax_due_amount'])
    if 'marital_status' in data and data['marital_status']:
        updates.append("marital_status = %s")
        params.append(data['marital_status'])
    if 'phone_number' in data and data['phone_number']:
        updates.append("phone_number = %s")
        params.append(data['phone_number'])
    if 'email' in data and data['email']:
        updates.append("email = %s")
        params.append(data['email'])

    if not updates:
        return jsonify({'success': False, 'message': 'No fields to update'})

    params.append(citizen_id)
    query = f"UPDATE Citizens SET {', '.join(updates)} WHERE citizen_id = %s"

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            if updates:
                cur.execute(query, tuple(params))
            
            if 'password' in data and data['password'] and data['password'].strip():
                new_pwd = data['password'].strip()
                new_pwd_hash = hash_password(new_pwd)
                cur.execute("SELECT user_id, email FROM Citizens WHERE citizen_id = %s;", (citizen_id,))
                c_res = cur.fetchone()
                if c_res:
                    u_id, c_email = c_res[0], c_res[1]
                    if u_id:
                        cur.execute("UPDATE Users SET password_hash = %s WHERE user_id = %s;", (new_pwd_hash, u_id))
                    elif c_email:
                        cur.execute("SELECT user_id FROM Users WHERE LOWER(email) = LOWER(%s);", (c_email,))
                        u_match = cur.fetchone()
                        if u_match:
                            u_id = u_match[0]
                            cur.execute("UPDATE Users SET password_hash = %s WHERE user_id = %s;", (new_pwd_hash, u_id))
                            cur.execute("UPDATE Citizens SET user_id = %s WHERE citizen_id = %s;", (u_id, citizen_id))
                        else:
                            cur.execute("""
                                INSERT INTO Users (email, password_hash, user_type, status)
                                VALUES (%s, %s, 'Citizen', 'Active')
                                RETURNING user_id;
                            """, (c_email, new_pwd_hash))
                            new_u_id = cur.fetchone()[0]
                            cur.execute("UPDATE Citizens SET user_id = %s WHERE citizen_id = %s;", (new_u_id, citizen_id))
            
            # Handle household_id separately
            if 'household_id' in data:
                household_id = data['household_id']
                if household_id:
                    cur.execute("""
                        SELECT household_id FROM Households WHERE citizen_id = %s;
                    """, (citizen_id,))
                    existing_household = cur.fetchone()
                    if existing_household:
                        cur.execute("""
                            UPDATE Households SET household_id = %s WHERE citizen_id = %s;
                        """, (household_id, citizen_id))
                    else:
                        cur.execute("""
                            INSERT INTO Households (household_id, citizen_id)
                            VALUES (%s, %s);
                        """, (household_id, citizen_id))
                else:
                    cur.execute("""
                        DELETE FROM Households WHERE citizen_id = %s;
                    """, (citizen_id,))
        
        return jsonify({'success': True})
    except Exception as e:
        print("Update error (Citizens):", e)
        return jsonify({'success': False, 'message': f'Failed to update citizen: {str(e)}'})
    finally:
        conn.close()

@app.route('/add_citizen', methods=['POST'])
def add_citizen():
    data = request.get_json()
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    panchayat_id = data.get('panchayat_id')
    gender = data.get('gender')
    dob = data.get('dob')
    educational_qualification = data.get('educational_qualification')
    occupation = data.get('occupation')
    annual_income = data.get('annual_income')
    tax_due_amount = data.get('tax_due_amount')
    marital_status = data.get('marital_status')
    phone_number = data.get('phone_number')
    email = data.get('email')
    household_id = data.get('household_id')

    if not all([first_name, last_name, panchayat_id, gender, dob, educational_qualification, occupation, annual_income, tax_due_amount, marital_status, phone_number, email]):
        return jsonify({'success': False, 'message': 'All fields are required'})

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO Citizens (first_name, last_name, panchayat_id, gender, dob, educational_qualification, occupation, annual_income, tax_due_amount, marital_status, phone_number, email)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING citizen_id;
            """, (first_name, last_name, panchayat_id, gender, dob, educational_qualification, occupation, annual_income, tax_due_amount, marital_status, phone_number, email))
            citizen_id = cur.fetchone()[0]

            if household_id:
                cur.execute("""
                    INSERT INTO Households (household_id, citizen_id)
                    VALUES (%s, %s)
                    ON CONFLICT (household_id, citizen_id) DO NOTHING;
                """, (household_id, citizen_id))

        return jsonify({'success': True})
    except Exception as e:
        print("Insert error (Citizens/Households):", e)
        return jsonify({'success': False, 'message': 'Failed to add citizen'})
    finally:
        conn.close()

@app.route('/get_panchayat/<int:panchayat_id>', methods=['GET'])
def get_panchayat(panchayat_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT panchayat_name, establishment_date, area_sq_km, contact_email, contact_phone, 
                       block_name, district_name, state_name, pin_code, country
                FROM Panchayats p
                JOIN Address a ON p.address_id = a.address_id
                WHERE p.panchayat_id = %s;
            """, (panchayat_id,))
            panchayat = cur.fetchone()
            if panchayat:
                return jsonify({'success': True, 'panchayat': {
                    'panchayat_name': panchayat[0],
                    'establishment_date': panchayat[1],
                    'area_sq_km': panchayat[2],
                    'contact_email': panchayat[3],
                    'contact_phone': panchayat[4],
                    'block_name': panchayat[5],
                    'district_name': panchayat[6],
                    'state_name': panchayat[7],
                    'pin_code': panchayat[8],
                    'country': panchayat[9]
                }})
            else:
                return jsonify({'success': False, 'message': 'Panchayat not found'})
    except Exception as e:
        print("Query error (Get Panchayat):", e)
        return jsonify({'success': False, 'message': 'Failed to fetch panchayat details'})
    finally:
        conn.close()

@app.route('/update_panchayat/<int:panchayat_id>', methods=['POST'])
def update_panchayat(panchayat_id):
    data = request.get_json()
    updates = []
    params = []

    if 'panchayat_name' in data and data['panchayat_name']:
        updates.append("panchayat_name = %s")
        params.append(data['panchayat_name'])
    if 'establishment_date' in data and data['establishment_date']:
        updates.append("establishment_date = %s")
        params.append(data['establishment_date'])
    if 'area_sq_km' in data and data['area_sq_km']:
        updates.append("area_sq_km = %s")
        params.append(data['area_sq_km'])
    if 'contact_email' in data and data['contact_email']:
        updates.append("contact_email = %s")
        params.append(data['contact_email'])
    if 'contact_phone' in data and data['contact_phone']:
        updates.append("contact_phone = %s")
        params.append(data['contact_phone'])

    address_updates = []
    address_params = []
    if 'block_name' in data and data['block_name']:
        address_updates.append("block_name = %s")
        address_params.append(data['block_name'])
    if 'district_name' in data and data['district_name']:
        address_updates.append("district_name = %s")
        address_params.append(data['district_name'])
    if 'state_name' in data and data['state_name']:
        address_updates.append("state_name = %s")
        address_params.append(data['state_name'])
    if 'pin_code' in data and data['pin_code']:
        address_updates.append("pin_code = %s")
        address_params.append(data['pin_code'])
    if 'country' in data and data['country']:
        address_updates.append("country = %s")
        address_params.append(data['country'])

    if not updates and not address_updates:
        return jsonify({'success': False, 'message': 'No fields to update'})

    params.append(panchayat_id)
    query = f"UPDATE Panchayats SET {', '.join(updates)} WHERE panchayat_id = %s"

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            if updates:
                cur.execute(query, tuple(params))
            if address_updates:
                address_query = f"UPDATE Address SET {', '.join(address_updates)} WHERE address_id = (SELECT address_id FROM Panchayats WHERE panchayat_id = %s)"
                address_params.append(panchayat_id)
                cur.execute(address_query, tuple(address_params))
        return jsonify({'success': True})
    except Exception as e:
        print("Update error (Panchayats):", e)
        return jsonify({'success': False, 'message': 'Failed to update panchayat'})
    finally:
        conn.close()

@app.route('/delete_panchayat/<int:panchayat_id>', methods=['POST'])
def delete_panchayat(panchayat_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})

    try:
        with conn.cursor() as cur:
            # Get the address_id associated with the panchayat
            cur.execute("SELECT address_id FROM Panchayats WHERE panchayat_id = %s;", (panchayat_id,))
            address_id = cur.fetchone()
            if not address_id:
                return jsonify({'success': False, 'message': 'Panchayat not found'})

            # Delete the panchayat
            cur.execute("DELETE FROM Panchayats WHERE panchayat_id = %s;", (panchayat_id,))

            # Delete the address
            cur.execute("DELETE FROM Address WHERE address_id = %s;", (address_id,))
        
        return jsonify({'success': True})
    except Exception as e:
        print("Delete error (Panchayats):", e)
        return jsonify({'success': False, 'message': 'Failed to delete panchayat'})
    finally:
        conn.close()

@app.route('/check_citizen_employee/<int:citizen_id>', methods=['GET'])
def check_citizen_employee(citizen_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection error'})
            
        # Check if the citizen exists
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM Citizens WHERE citizen_id = %s", (citizen_id,))
            citizen = cur.fetchone()
            
            if not citizen:
                return jsonify({'success': False, 'message': 'Citizen not found'})
            
            # Check if the citizen is an employee
            cur.execute("SELECT employee_id FROM Employees WHERE citizen_id = %s", (citizen_id,))
            employee = cur.fetchone()
            
            if employee:
                return jsonify({'success': True, 'isEmployee': True, 'employeeId': employee[0]})
            else:
                return jsonify({'success': True, 'isEmployee': False})
                
    except Exception as e:
        print(f"Error checking citizen employee status: {e}")
        return jsonify({'success': False, 'message': str(e)})
    finally:
        if conn:
            conn.close()

@app.route('/get_services', methods=['GET'])
def get_services():
    """Get all available services from the Service table"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT service_id, type, description 
                FROM Service
                ORDER BY type
            """)
            services = []
            for row in cur.fetchall():
                services.append({
                    'id': row[0],
                    'type': row[1],
                    'description': row[2] or ''
                })
            
            return jsonify({'success': True, 'services': services})
    
    except Exception as e:
        print(f"Error fetching services: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/request_service/<int:user_id>/<int:citizen_id>', methods=['POST'])
def request_service(user_id, citizen_id):
    """Handle service request submission"""
    if request.method == 'POST':
        # Get form data - important: match exact parameter names from the form
        service_id = request.form.get('service-id')
        description = request.form.get('description', '')
        doc_file = request.files.get('document')
        doc_path = save_uploaded_document(doc_file)
        
        # Debug output to help diagnose form submission issues
        print(f"Request form data: {request.form}")
        print(f"Service ID: {service_id}, Description: {description}")
        
        # Validate input data
        if not service_id:
            flash('Service ID is required', 'danger')
            return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
            
        if not description.strip():
            flash('Description is required', 'danger')
            return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
        
        conn = get_db_connection()
        if not conn:
            flash('Database connection error.', 'danger')
            return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
            
        try:
            with conn.cursor() as cur:
                # Check if the service exists
                cur.execute("SELECT type FROM Service WHERE service_id = %s", (service_id,))
                service = cur.fetchone()
                if not service:
                    flash('Selected service does not exist', 'danger')
                    return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))
                
                cur.execute("""
                    INSERT INTO Service_Request
                    (citizen_id, service_id, request_date, description, status, document_path)
                    VALUES (%s, %s, CURRENT_DATE, %s, %s, %s)
                """, (citizen_id, service_id, description, 'Pending', doc_path))
                
                conn.commit()
                cur.execute("SELECT panchayat_id FROM Citizens WHERE citizen_id = %s;", (citizen_id,))
                cit_res = cur.fetchone()
                p_id = cit_res[0] if cit_res else None

                emit_realtime_event('new_application', {
                    'type': 'Service Request',
                    'title': service[0],
                    'citizen_id': citizen_id,
                    'panchayat_id': p_id,
                    'status': 'Pending'
                }, p_id)

                flash(f'Your request for {service[0]} service has been submitted successfully.', 'success')
                
        except Exception as e:
            conn.rollback()
            print(f"Error processing service request: {e}")
            flash(f'An error occurred while processing your request: {str(e)}', 'danger')
        
        finally:
            conn.close()
    
    # Redirect back to the citizen dashboard
    return redirect(url_for('citizen_dashboard', user_id=user_id, citizen_id=citizen_id))

# route to check and seed services if needed
@app.route('/check_services', methods=['GET'])
def check_services():
    """Check and optionally seed services"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection error'})
    
    try:
        with conn.cursor() as cur:
            # Check if services table is empty
            cur.execute("SELECT COUNT(*) FROM Service")
            count = cur.fetchone()[0]
            
            # If no services exist, add some defaults
            if (count == 0):
                default_services = [
                    ("Water Supply", "Request for water supply maintenance or new connection"),
                    ("Road Maintenance", "Report road issues or request repairs"),
                    ("Waste Management", "Request for waste collection or report waste issues"),
                    ("Electricity", "Report electricity issues or request new connection"),
                    ("Sanitation", "Request sanitation services or report sanitation issues"),
                    ("Health Services", "Request healthcare services or health camps"),
                    ("Education", "Request education-related services or report issues"),
                    ("Agriculture Support", "Request for agricultural assistance or subsidies")
                ]
                
                for service_type, description in default_services:
                    cur.execute("""
                        INSERT INTO Service (type, description)
                        VALUES (%s, %s)
                    """, (service_type, description))
                
                conn.commit()
                return jsonify({
                    'success': True, 
                    'message': f'Added {len(default_services)} default services',
                    'added_count': len(default_services)
                })
            
            return jsonify({
                'success': True, 
                'message': f'Found {count} existing services',
                'count': count
            })
    
    except Exception as e:
        print(f"Error checking/seeding services: {e}")
        return jsonify({'success': False, 'message': str(e)})
    
    finally:
        conn.close()

@app.route('/get_certificate_details/<int:certificate_id>')
def get_certificate_details(certificate_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"})
    
    try:
        with conn.cursor() as cur:
            # Get certificate details
            cur.execute("""
                SELECT certificate_id, type, application_date, status, description
                FROM certificate
                WHERE certificate_id = %s
            """, (certificate_id,))
            cert_data = cur.fetchone()
            
            if not cert_data:
                return jsonify({"success": False, "message": "Certificate not found"})
                
            # Format the response
            certificate = {
                "id": cert_data[0],
                "type": cert_data[1],
                "date": cert_data[2].strftime('%d %b %Y') if cert_data[2] else '',
                "status": cert_data[3],
                "description": cert_data[4] if cert_data[4] else 'No description provided'
            }
            
            return jsonify({"success": True, "certificate": certificate})
            
    except Exception as e:
        print(f"Error fetching certificate details: {e}")
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"})
    
    finally:
        conn.close()

from datetime import timedelta

def cleanup_old_documents(months=6):
    """
    Deletes physical files and sets document_path to NULL for applications
    older than the specified number of months (default: 6 months).
    """
    conn = get_db_connection()
    if not conn:
        return 0

    deleted_count = 0
    cutoff_date = datetime.now() - timedelta(days=months * 30)

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        tables = [
            ('certificate', 'application_date'),
            ('Service_Request', 'request_date'),
            ('Citizen_welfare_Schema', 'request_date')
        ]

        for table, date_col in tables:
            cur.execute(f"SELECT document_path FROM {table} WHERE {date_col} < %s AND document_path IS NOT NULL;", (cutoff_date,))
            rows = cur.fetchall()
            for row in rows:
                doc_path = row['document_path'] if row else None
                if doc_path:
                    clean_rel_path = doc_path.lstrip('/')
                    full_path = os.path.join(app.root_path, clean_rel_path)
                    if os.path.exists(full_path):
                        try:
                            os.remove(full_path)
                            deleted_count += 1
                        except Exception as file_err:
                            print(f"Cleanup error removing {full_path}: {file_err}")
            
            cur.execute(f"UPDATE {table} SET document_path = NULL WHERE {date_col} < %s AND document_path IS NOT NULL;", (cutoff_date,))

        conn.commit()
        print(f"Document cleanup completed. Removed {deleted_count} files older than {months} months.")
    except Exception as e:
        print(f"Error during document cleanup: {e}")
    finally:
        conn.close()
    return deleted_count

@app.route('/admin/cleanup_documents', methods=['POST'])
def admin_cleanup_documents():
    count = cleanup_old_documents(months=6)
    return jsonify({
        "success": True,
        "message": f"Successfully cleaned up documents older than 6 months. Removed {count} document file(s)."
    })

if __name__ == "__main__":
    init_db_schema()
    init_db_pool()
    try:
        cleanup_old_documents(months=6)
    except Exception as e:
        print(f"Startup cleanup notice: {e}")
    port = int(os.environ.get("PORT", 5000))
    if socketio:
        socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
    else:
        app.run(host="0.0.0.0", port=port)