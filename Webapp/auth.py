from flask import Blueprint, render_template, request, flash, redirect, url_for, Response, session
from flask import jsonify
from flask import current_app
import cv2
import qrcode
from pyzbar.pyzbar import decode
import tkinter as tk
from tkinter import Label
from PIL import Image, ImageTk
import mysql.connector
from io import BytesIO
import time
import base64
import requests
import threading


table_prefixes = {
    'shelf1': {'prefix': 'A-', 'counter': 'shelf1_counter'},
    'shelf2': {'prefix': 'B-', 'counter': 'shelf2_counter'},
    'shelf3': {'prefix': 'C-', 'counter': 'shelf3_counter'},
    'shelf4': {'prefix': 'D-', 'counter': 'shelf4_counter'},
    # Add more shelves and prefixes as needed
}

auth = Blueprint('auth', __name__, static_folder='static', static_url_path='/auth/static')


@auth.route('/clear-cache')
def clear_cache():
    cache = current_app.config['CACHE']
    cache.clear()
    return 'Cache cleared'


@auth.route('/main')
def home():
    return render_template("ov.html", boolean=True)

@auth.route('/inventory')
def inventory():
    try:
        db = current_app.get_db()
        print("Database:", db)
        shelf = request.args.get('shelf_id')
        print("Selected shelf:", shelf)
        category = request.args.get('catalog')
        print("Category:", category)
        search_query = request.args.get('search_query')
        print("Search:", search_query)
        
            
        if shelf is None:
            return render_template('inventory.html')

        cursor = db.cursor()

        qr_code_data_list = get_qr_data(cursor)
        
        if category == 'all':
            # Fetch all rows from the selected shelf
            query = f"SELECT id, category, isbn, title, publisher, year_published FROM {shelf}"
            print("Query:", query)
            cursor.execute(query)
        else:
            # Fetch rows from the selected shelf with the specified category
            query = f"SELECT id, category, isbn, title, publisher, year_published FROM {shelf} WHERE category = %s"
            print("Query:", query)
            cursor.execute(query, (category,))
        
        data = cursor.fetchall()

        qr_code_data_list = []
        for row in data:
            print("Row data:", row)
            qr_data = f"ID: {row[0]}, Title: {row[2]}, Category: {row[1]}"  # Adjust this according to your data
            print("QR DATA:", qr_data)
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")

            # Convert the image to base64
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            qr_image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

            qr_code_data = {
                'qrcode': row[0],
                'category': row[1],
                'title': row[2],
                'publisher': row[3],
                'year': row[4] 
            }
            qr_code_data_list.append(qr_code_data)
            print(qr_code_data)
            
            if search_query:
                search_query = f"%{search_query}%"  # Add wildcard characters for a partial search
                filtered_data = [item for item in qr_code_data_list if
                                search_query in item['title'].lower() or search_query in item['publisher'].lower()]
        else:
            filtered_data = qr_code_data_list

        return jsonify(filtered_data)
    except Exception as e:
        print("Exception:", e)
        return jsonify({'error': 'An error occurred during data retrieval'})
       
def get_qr_data(cursor):
    try:
        cursor.execute("SELECT * FROM shelf1")
        result = cursor.fetchall()
        qr_values = [row[1] for row in result]  # assuming the QR data is in the second column
        return qr_values  # You can return the list directly unless you specifically need JSON format here
    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
        return []  # Return an empty list in case of an error


@auth.route('/qr_codes/<image_id>')
def serve_qr_code(image_id):
    try:
        image_path = f"Webapp/static/qr_codes/{image_id}.png"  # Replace with your actual image path
        with open(image_path, "rb") as image_file:
            response = Response(image_file.read(), content_type="image/png")
            return response
    except FileNotFoundError:
        return "Image not found", 404



# Flag to control the video streaming thread
 # Move camera instantiation outside to prevent concurrent access
streaming = False
camera = cv2.VideoCapture(0)  # Initialize the camera when the server starts.

@auth.route('/camera')
def camera_view():
    return render_template('camera.html')

def retrieve_data():
    try:
        response = requests.get("/inventory")
        if response.status_code == 200:
            qr_values = response.json()
            return set(qr_values)
        else:
            print("Error fetching data from API:", response.text)
            return set()
    except Exception as e:
        print("Error fetching data from API:", str(e))  
        return set()

def generate_frames():
    global streaming, camera

    if not camera.isOpened():
        print("Error: Camera could not be opened.")
        yield "Error: Camera could not be opened."  # This won't show an image, but it will give a message.
        return

    while streaming:
        ret, frame = camera.read()
        if not ret:
            print("Error: Frame could not be read.")
            break
        
        qr_values_from_api = retrieve_data()

        decoded_objects = decode(frame)
        for obj in decoded_objects:
            x, y, w, h = obj.rect
            qr_data = obj.data.decode('utf-8')

            if qr_data in qr_values_from_api:
                color = (0, 255, 0)  # Green for QR codes that are in inventory
            else:
                color = (0, 0, 255)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, qr_data, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_pil = Image.fromarray(frame)
        frame_io = BytesIO()
        frame_pil.save(frame_io, format='JPEG')

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_io.getvalue() + b'\r\n')

@auth.route('/start_stream')
def start_stream():
    global streaming
    streaming = True
    return "Streaming started"

@auth.route('/stop_stream')
def stop_stream():
    global streaming
    streaming = False

    time.sleep(0.1)

    if camera.isOpened():
        camera.release()
    
    return "Streaming stopped"

@auth.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@auth.route('/insert', methods=['GET','POST'])
def insert():
    db = current_app.get_db()
    cursor  = db.cursor()
    cursor.execute('SELECT * FROM categories')
    category_name = cursor.fetchall()
    print(category_name)
    cursor.execute('SELECT * FROM shelves')
    shelf = cursor.fetchall()


    if request.method == "POST":
        db = current_app.get_db()
        print(db)
        cursor = db.cursor()
        table = request.form.get('b_shelves')
        print(table)
        cate = request.form.get('b_cate')
        print(cate)
        isbn = request.form.get('b_isbn')
        title = request.form.get('b_title')
        publisher = request.form.get('b_publisher')
        year = int(request.form.get('b_year'))

        try:
            
            query = f"INSERT INTO {table} (category, isbn, title, publisher, year_published) VALUES (%s, %s, %s, %s, %s)"

            cursor.execute(query, (cate, isbn, title, publisher, year))
            db.commit()

            id = cursor.lastrowid

            qr_data = f"ID: {id}, Title: {title}"
            qr_data_encoded = qr_data.encode('utf-8')
            qr_image_base64, image_path = current_app.generate_qr_code(qr_data_encoded, str(id))

            flash('Data successfully inserted!', 'success')

            return jsonify({'success': True, 'qr_image_base64': qr_image_base64, 'image_path': image_path, 'qrCodeID': id})

        except Exception as e:
            db.rollback()
            print("Exception:", e)

            flash('Error inserting data into the database', 'error')
            return jsonify({'success': False, 'error': str(e)})

        finally:
            cursor.close()
            db.close()

    return render_template("insert.html", qr_image_base64=None, category_name=category_name, shelf=shelf)
