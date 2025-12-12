from flask import Flask, render_template, request, jsonify, send_from_directory
import pyodbc
import os

app = Flask(__name__, static_folder='public', static_url_path='')

# Конфигурация подключения (оставили жесткую привязку, как ты просил)
SERVER = 'huawei\\SQLEXPRESS'
DATABASE = 'VeterinaryClinic'
CONNECTION_STRING = f'Driver={{ODBC Driver 17 for SQL Server}};Server={SERVER};Database={DATABASE};Trusted_Connection=yes;'

def get_connection():
    """Получить подключение к БД"""
    try:
        conn = pyodbc.connect(CONNECTION_STRING)
        # Настройка кодировки для кириллицы
        conn.setdecoding(pyodbc.SQL_CHAR, encoding='cp1251')
        conn.setdecoding(pyodbc.SQL_WCHAR, encoding='cp1251')
        return conn
    except Exception as e:
        print(f"✗ Ошибка подключения: {str(e)}")
        return None

# Вспомогательная функция валидации
def validate_data(data, required_fields):
    if not data:
        return "Нет данных"
    missing = [field for field in required_fields if field not in data or str(data[field]).strip() == ""]
    if missing:
        return f"Не заполнены обязательные поля: {', '.join(missing)}"
    return None

# ============ ГЛАВНАЯ СТРАНИЦА ============
@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

# ============ ВРАЧИ ============
@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения к БД'}), 500
        
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM doctors')
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/doctors', methods=['POST'])
def add_doctor():
    try:
        data = request.json
        error = validate_data(data, ['FullName', 'Specialization', 'Experience', 'Phone'])
        if error: return jsonify({'success': False, 'error': error}), 400

        try:
            exp = int(data['Experience'])
            if exp < 0: raise ValueError
        except ValueError:
            return jsonify({'success': False, 'error': 'Опыт должен быть положительным числом'}), 400

        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения к БД'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO doctors (FullName, Specialization, Experience, Phone)
            VALUES (?, ?, ?, ?)
        ''', (data['FullName'], data['Specialization'], exp, data['Phone']))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/doctors/<int:id>', methods=['PUT'])
def update_doctor(id):
    try:
        data = request.json
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Ошибка подключения'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE doctors SET FullName=?, Specialization=?, Experience=?, Phone=?
            WHERE DoctorID=?
        ''', (data['FullName'], data['Specialization'], int(data['Experience']), data['Phone'], id))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/doctors/<int:id>', methods=['DELETE'])
def delete_doctor(id):
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Ошибка подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('DELETE FROM doctors WHERE DoctorID=?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ ПИТОМЦЫ ============
@app.route('/api/pets', methods=['GET'])
def get_pets():
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM pets')
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/pets', methods=['POST'])
def add_pet():
    try:
        data = request.json
        error = validate_data(data, ['OwnerID', 'Name', 'Species', 'Gender'])
        if error: return jsonify({'success': False, 'error': error}), 400

        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO pets (OwnerID, Name, Species, Breed, Gender, BirthDate, Color)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (int(data['OwnerID']), data['Name'], data['Species'], data.get('Breed'), 
              data['Gender'], data.get('BirthDate'), data.get('Color')))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/pets/<int:id>', methods=['DELETE'])
def delete_pet(id):
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('DELETE FROM pets WHERE PetID=?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/pets/<int:id>', methods=['PUT'])
def update_pet(id):
    try:
        data = request.json
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE pets SET OwnerID=?, Name=?, Species=?, Breed=?, Gender=?, BirthDate=?, Color=?
            WHERE PetID=?
        ''', (int(data['OwnerID']), data['Name'], data['Species'], data['Breed'], 
              data['Gender'], data['BirthDate'], data['Color'], id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ ВЛАДЕЛЬЦЫ (для выпадающих списков) ============
@app.route('/api/owners', methods=['GET'])
def get_owners():
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM owners')
        columns = [c[0] for c in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ УСЛУГИ ============
@app.route('/api/services', methods=['GET'])
def get_services():
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM services')
        columns = [c[0] for c in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/services', methods=['POST'])
def add_service():
    try:
        data = request.json
        error = validate_data(data, ['ServiceName', 'Cost'])
        if error: return jsonify({'success': False, 'error': error}), 400

        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        
        cursor = conn.cursor()
        cursor.execute('INSERT INTO services (ServiceName, Cost) VALUES (?, ?)', 
                      (data['ServiceName'], float(data['Cost'])))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/services/<int:id>', methods=['DELETE'])
def delete_service(id):
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('DELETE FROM services WHERE ServiceID=?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/services/<int:id>', methods=['PUT'])
def update_service(id):
    try:
        data = request.json
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('UPDATE services SET ServiceName=?, Cost=? WHERE ServiceID=?', 
                      (data['ServiceName'], float(data['Cost']), id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ ВИЗИТЫ ============
@app.route('/api/visits', methods=['GET'])
def get_visits():
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM visits')
        columns = [c[0] for c in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/visits', methods=['POST'])
def add_visit():
    try:
        data = request.json
        error = validate_data(data, ['PetID', 'DoctorID'])
        if error: return jsonify({'success': False, 'error': error}), 400

        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        
        # Для простоты используем текущую дату, если не передана
        import datetime
        visit_date = data.get('VisitDate', datetime.datetime.now().strftime('%Y-%m-%d'))

        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO visits (PetID, DoctorID, VisitDate, Diagnosis, Recommendations)
            VALUES (?, ?, ?, ?, ?)
        ''', (int(data['PetID']), int(data['DoctorID']), visit_date, 
              data.get('Diagnosis'), data.get('Recommendations')))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/visits/<int:id>', methods=['DELETE'])
def delete_visit(id):
    try:
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('DELETE FROM visits WHERE VisitID=?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/visits/<int:id>', methods=['PUT'])
def update_visit(id):
    try:
        data = request.json
        conn = get_connection()
        if not conn: return jsonify({'success': False, 'error': 'Нет подключения'}), 500
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE visits SET PetID=?, DoctorID=?, Diagnosis=?, Recommendations=?
            WHERE VisitID=?
        ''', (int(data['PetID']), int(data['DoctorID']), data['Diagnosis'], data['Recommendations'], id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print(f"Запуск сервера... Подключение к {SERVER}")
    app.run(debug=True, port=5000, host='localhost')