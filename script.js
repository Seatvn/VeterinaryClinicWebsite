// Константы
const API_BASE = '/api';
let currentData = {};
let currentEditingId = null;
let currentEditingTable = null;

// === ЗАЩИТА ОТ XSS (Новая функция) ===
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initializeMenuButtons();
    initializeQuickActions();
    loadAllData();
    setupFilters();
});

// ===== НАВИГАЦИЯ =====
function initializeMenuButtons() {
    const menuBtns = document.querySelectorAll('.menu-btn');
    menuBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            switchSection(section);
            
            menuBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.classList.remove('active'));
    
    const section = document.getElementById(sectionName);
    if (section) {
        section.classList.add('active');
        document.getElementById('pageTitle').textContent = getPageTitle(sectionName);
    }
}

function getPageTitle(sectionName) {
    const titles = {
        'dashboard': 'Главная',
        'patients': 'Пациенты',
        'doctors': 'Врачи',
        'services': 'Услуги',
        'appointments': 'Приёмы'
    };
    return titles[sectionName] || 'Главная';
}

// ===== БЫСТРЫЕ ДЕЙСТВИЯ =====
function initializeQuickActions() {
    const aptBtn = document.getElementById('appointmentBtn');
    if(aptBtn) aptBtn.addEventListener('click', () => showForm('visits'));
    
    const searchPBtn = document.getElementById('searchPatientBtn');
    if(searchPBtn) searchPBtn.addEventListener('click', () => showSearchPatient());
    
    const searchSBtn = document.getElementById('searchServiceBtn');
    if(searchSBtn) searchSBtn.addEventListener('click', () => showSearchService());
}

// ===== ЗАГРУЗКА ДАННЫХ =====
async function loadAllData() {
    try {
        // Загружаем основные таблицы
        await Promise.all([
            loadData('doctors'),
            loadData('owners'),
            loadData('pets'),
            loadData('services'),
            loadData('visits')
        ]);
        
        updateStats();
        displayPatients();
        displayDoctors();
        displayServices();
        displayAppointments(); // Обновление приёмов
        
    } catch (error) {
        showAlert('Ошибка при загрузке данных', 'error');
        console.error(error);
    }
}

async function loadData(table) {
    try {
        const response = await fetch(`${API_BASE}/${table}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        currentData[table] = result.data || [];
    } catch (error) {
        console.error(`Ошибка загрузки ${table}:`, error);
        currentData[table] = [];
    }
}

// ===== ОТОБРАЖЕНИЕ ДАННЫХ (с защитой escapeHtml) =====
function displayPatients() {
    const pets = currentData.pets || [];
    const owners = currentData.owners || [];
    const container = document.getElementById('patientsList');
    
    if (pets.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">🐾</div><p>Нет питомцев</p></div>';
        return;
    }
    
    container.innerHTML = pets.map(pet => {
        const owner = owners.find(o => o.OwnerID === pet.OwnerID);
        return `
            <div class="item-card" onclick="showPatientDetails(${pet.PetID})">
                <div class="item-card-title">🐾 ${escapeHtml(pet.Name)}</div>
                <div class="item-card-info">
                    <div class="info-row">
                        <span class="info-label">Вид:</span>
                        <span class="info-value">${escapeHtml(pet.Species)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Порода:</span>
                        <span class="info-value">${escapeHtml(pet.Breed)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Владелец:</span>
                        <span class="info-value">${escapeHtml(owner ? owner.FullName : 'N/A')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Пол:</span>
                        <span class="info-value">${escapeHtml(pet.Gender)}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); showForm('pets', ${pet.PetID})">Редактировать</button>
                    <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteItem('pets', ${pet.PetID})">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
}

function displayDoctors() {
    const doctors = currentData.doctors || [];
    const container = document.getElementById('doctorsList');
    
    if (doctors.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">👨‍⚕️</div><p>Нет врачей</p></div>';
        return;
    }
    
    container.innerHTML = doctors.map(doctor => `
        <div class="item-card" onclick="showDoctorDetails(${doctor.DoctorID})">
            <div class="item-card-title">👨‍⚕️ ${escapeHtml(doctor.FullName)}</div>
            <div class="item-card-info">
                <div class="info-row">
                    <span class="info-label">Специализация:</span>
                    <span class="info-value">${escapeHtml(doctor.Specialization)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Опыт (лет):</span>
                    <span class="info-value">${escapeHtml(doctor.Experience)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Телефон:</span>
                    <span class="info-value">${escapeHtml(doctor.Phone)}</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); showForm('doctors', ${doctor.DoctorID})">Редактировать</button>
                <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteItem('doctors', ${doctor.DoctorID})">Удалить</button>
            </div>
        </div>
    `).join('');
}

function displayServices() {
    const services = currentData.services || [];
    const container = document.getElementById('servicesList');
    
    if (services.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">💊</div><p>Нет услуг</p></div>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="item-card">
            <div class="item-card-title">💊 ${escapeHtml(service.ServiceName)}</div>
            <div class="item-card-info">
                <div class="info-row">
                    <span class="info-label">Стоимость:</span>
                    <span class="info-value">${escapeHtml(service.Cost)} ₸</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-small" onclick="showForm('services', ${service.ServiceID})">Редактировать</button>
                <button class="btn btn-danger btn-small" onclick="deleteItem('services', ${service.ServiceID})">Удалить</button>
            </div>
        </div>
    `).join('');
}

function displayAppointments() {
    const visits = currentData.visits || [];
    const pets = currentData.pets || [];
    const doctors = currentData.doctors || [];
    const container = document.getElementById('appointmentsList');
    
    if (visits.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">📅</div><p>Нет приёмов</p></div>';
        return;
    }
    
    container.innerHTML = visits.map(visit => {
        const pet = pets.find(p => p.PetID === visit.PetID);
        const doctor = doctors.find(d => d.DoctorID === visit.DoctorID);
        return `
            <div class="item-card">
                <div class="item-card-title">📅 Приём</div>
                <div class="item-card-info">
                    <div class="info-row">
                        <span class="info-label">Питомец:</span>
                        <span class="info-value">${escapeHtml(pet ? pet.Name : 'N/A')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Врач:</span>
                        <span class="info-value">${escapeHtml(doctor ? doctor.FullName : 'N/A')} (${escapeHtml(doctor ? doctor.Specialization : 'N/A')})</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Диагноз:</span>
                        <span class="info-value">${escapeHtml(visit.Diagnosis)}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary btn-small" onclick="showForm('visits', ${visit.VisitID})">Редактировать</button>
                    <button class="btn btn-danger btn-small" onclick="deleteItem('visits', ${visit.VisitID})">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== СТАТИСТИКА =====
function updateStats() {
    document.getElementById('patientsCount').textContent = (currentData.pets || []).length;
    document.getElementById('doctorsCount').textContent = (currentData.doctors || []).length;
    document.getElementById('appointmentsCount').textContent = (currentData.visits || []).length;
}

// ===== ФОРМЫ =====
function showForm(table, id = null) {
    currentEditingTable = table;
    currentEditingId = id;
    
    const modal = document.getElementById('modal');
    const formTitle = document.getElementById('formTitle');
    const formFields = document.getElementById('formFields');
    
    formTitle.textContent = id ? `Редактировать ${table}` : `Добавить ${table}`;
    
    const fields = getFormFields(table, id);
    formFields.innerHTML = fields;
    
    modal.classList.add('active');
}

function getFormFields(table, id) {
    let fields = '';
    
    if (table === 'doctors') {
        const doctor = id ? (currentData.doctors || []).find(d => d.DoctorID === id) : {};
        fields = `
            <div class="form-group">
                <label>ФИО</label>
                <input type="text" name="FullName" value="${escapeHtml(doctor.FullName)}" required>
            </div>
            <div class="form-group">
                <label>Специализация</label>
                <input type="text" name="Specialization" value="${escapeHtml(doctor.Specialization)}" required>
            </div>
            <div class="form-group">
                <label>Опыт (лет)</label>
                <input type="number" name="Experience" value="${escapeHtml(doctor.Experience)}" required min="0">
            </div>
            <div class="form-group">
                <label>Телефон</label>
                <input type="tel" name="Phone" value="${escapeHtml(doctor.Phone)}" required>
            </div>
        `;
    } else if (table === 'pets') {
        const pet = id ? (currentData.pets || []).find(p => p.PetID === id) : {};
        const owners = currentData.owners || [];
        fields = `
            <div class="form-group">
                <label>Имя</label>
                <input type="text" name="Name" value="${escapeHtml(pet.Name)}" required>
            </div>
            <div class="form-group">
                <label>Вид</label>
                <input type="text" name="Species" value="${escapeHtml(pet.Species)}" required>
            </div>
            <div class="form-group">
                <label>Порода</label>
                <input type="text" name="Breed" value="${escapeHtml(pet.Breed)}" required>
            </div>
            <div class="form-group">
                <label>Пол</label>
                <select name="Gender" required>
                    <option value="">Выберите пол</option>
                    <option value="M" ${pet.Gender === 'M' ? 'selected' : ''}>Самец</option>
                    <option value="F" ${pet.Gender === 'F' ? 'selected' : ''}>Самка</option>
                </select>
            </div>
            <div class="form-group">
                <label>Дата рождения</label>
                <input type="date" name="BirthDate" value="${escapeHtml(pet.BirthDate)}">
            </div>
            <div class="form-group">
                <label>Цвет</label>
                <input type="text" name="Color" value="${escapeHtml(pet.Color)}">
            </div>
            <div class="form-group">
                <label>Владелец</label>
                <select name="OwnerID" required>
                    <option value="">Выберите владельца</option>
                    ${owners.map(o => `<option value="${o.OwnerID}" ${pet.OwnerID === o.OwnerID ? 'selected' : ''}>${escapeHtml(o.FullName)}</option>`).join('')}
                </select>
            </div>
        `;
    } else if (table === 'services') {
        const service = id ? (currentData.services || []).find(s => s.ServiceID === id) : {};
        fields = `
            <div class="form-group">
                <label>Название услуги</label>
                <input type="text" name="ServiceName" value="${escapeHtml(service.ServiceName)}" required>
            </div>
            <div class="form-group">
                <label>Стоимость</label>
                <input type="number" name="Cost" value="${escapeHtml(service.Cost)}" required min="0" step="0.01">
            </div>
        `;
    } else if (table === 'visits') {
        const visit = id ? (currentData.visits || []).find(v => v.VisitID === id) : {};
        const pets = currentData.pets || [];
        const doctors = currentData.doctors || [];
        fields = `
            <div class="form-group">
                <label>Питомец</label>
                <select name="PetID" required>
                    <option value="">Выберите питомца</option>
                    ${pets.map(p => `<option value="${p.PetID}" ${visit.PetID === p.PetID ? 'selected' : ''}>${escapeHtml(p.Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Врач</label>
                <select name="DoctorID" required>
                    <option value="">Выберите врача</option>
                    ${doctors.map(d => `
                        <option value="${d.DoctorID}" ${visit.DoctorID === d.DoctorID ? 'selected' : ''}>
                            ${escapeHtml(d.FullName)} (${escapeHtml(d.Specialization)})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Диагноз</label>
                <textarea name="Diagnosis">${escapeHtml(visit.Diagnosis)}</textarea>
            </div>
            <div class="form-group">
                <label>Рекомендации</label>
                <textarea name="Recommendations">${escapeHtml(visit.Recommendations)}</textarea>
            </div>
        `;
    }
    
    return fields;
}

function closeForm() {
    document.getElementById('modal').classList.remove('active');
    currentEditingId = null;
    currentEditingTable = null;
}

async function submitForm(event) {
    event.preventDefault();
    
    const form = document.getElementById('dataForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        let response;
        if (currentEditingId) {
            response = await fetch(`${API_BASE}/${currentEditingTable}/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_BASE}/${currentEditingTable}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        const resData = await response.json();
        
        if (!response.ok || !resData.success) {
            throw new Error(resData.error || 'Ошибка сервера');
        }
        
        showAlert('Данные сохранены успешно', 'success');
        closeForm();
        await loadAllData();
        
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ===== УДАЛЕНИЕ =====
async function deleteItem(table, id) {
    if (!confirm('Вы уверены?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/${table}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        showAlert('Запись удалена', 'success');
        await loadAllData();
        
    } catch (error) {
        showAlert('Ошибка при удалении', 'error');
        console.error(error);
    }
}

// ===== ПОИСК =====
function showSearchPatient() {
    const modal = document.getElementById('searchModal');
    const searchContent = document.getElementById('searchContent');
    
    searchContent.innerHTML = `
        <input type="text" id="searchPatientInput" class="filter-input" placeholder="Введите имя питомца..." style="width: 100%; margin-bottom: 15px;">
        <div id="searchResults" style="max-height: 400px; overflow-y: auto;"></div>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('searchPatientInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const pets = currentData.pets || [];
        const results = pets.filter(p => p.Name.toLowerCase().includes(query));
        
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = results.map(pet => `
            <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; cursor: pointer;" onclick="showPatientDetails(${pet.PetID})">
                <strong>${escapeHtml(pet.Name)}</strong> - ${escapeHtml(pet.Species)} (${escapeHtml(pet.Breed)})
            </div>
        `).join('');
    });
}

function showSearchService() {
    const modal = document.getElementById('searchModal');
    const searchContent = document.getElementById('searchContent');
    
    searchContent.innerHTML = `
        <input type="text" id="searchServiceInput" class="filter-input" placeholder="Введите название услуги..." style="width: 100%; margin-bottom: 15px;">
        <div id="searchResults" style="max-height: 400px; overflow-y: auto;"></div>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('searchServiceInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const services = currentData.services || [];
        const results = services.filter(s => s.ServiceName.toLowerCase().includes(query));
        
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = results.map(service => `
            <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px;">
                <strong>${escapeHtml(service.ServiceName)}</strong><br>
                <span style="color: #666;">Стоимость: ${escapeHtml(service.Cost)} ₸</span>
            </div>
        `).join('');
    });
}

function closeSearchModal() {
    document.getElementById('searchModal').classList.remove('active');
}

// ===== ДЕТАЛИ =====
function showPatientDetails(petId) {
    const pet = (currentData.pets || []).find(p => p.PetID === petId);
    const owner = (currentData.owners || []).find(o => o.OwnerID === pet.OwnerID);
    const visits = (currentData.visits || []).filter(v => v.PetID === petId);
    
    const modal = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('detailsContent');
    
    detailsContent.innerHTML = `
        <h3>${escapeHtml(pet.Name)}</h3>
        <div style="margin-bottom: 20px;">
            <p><strong>Вид:</strong> ${escapeHtml(pet.Species)}</p>
            <p><strong>Порода:</strong> ${escapeHtml(pet.Breed)}</p>
            <p><strong>Пол:</strong> ${escapeHtml(pet.Gender)}</p>
            <p><strong>Цвет:</strong> ${escapeHtml(pet.Color)}</p>
            <p><strong>Дата рождения:</strong> ${escapeHtml(pet.BirthDate)}</p>
        </div>
        
        <h4>Владелец</h4>
        <div style="margin-bottom: 20px;">
            <p><strong>ФИО:</strong> ${escapeHtml(owner.FullName)}</p>
            <p><strong>Телефон:</strong> ${escapeHtml(owner.Phone)}</p>
            <p><strong>Email:</strong> ${escapeHtml(owner.Email)}</p>
            <p><strong>Адрес:</strong> ${escapeHtml(owner.Address)}</p>
        </div>
        
        <h4>История визитов (${visits.length})</h4>
        <div>
            ${visits.map(v => {
                const doctor = (currentData.doctors || []).find(d => d.DoctorID === v.DoctorID);
                return `
                    <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px;">
                        <p><strong>Врач:</strong> ${escapeHtml(doctor ? doctor.FullName : 'N/A')}</p>
                        <p><strong>Диагноз:</strong> ${escapeHtml(v.Diagnosis)}</p>
                        <p><strong>Рекомендации:</strong> ${escapeHtml(v.Recommendations)}</p>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('deleteBtn').onclick = () => deleteItem('pets', petId);
    modal.classList.add('active');
}

function showDoctorDetails(doctorId) {
    const doctor = (currentData.doctors || []).find(d => d.DoctorID === doctorId);
    const visits = (currentData.visits || []).filter(v => v.DoctorID === doctorId);
    
    const modal = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('detailsContent');
    
    detailsContent.innerHTML = `
        <h3>${escapeHtml(doctor.FullName)}</h3>
        <div style="margin-bottom: 20px;">
            <p><strong>Специализация:</strong> ${escapeHtml(doctor.Specialization)}</p>
            <p><strong>Опыт:</strong> ${escapeHtml(doctor.Experience)} лет</p>
            <p><strong>Телефон:</strong> ${escapeHtml(doctor.Phone)}</p>
        </div>
        
        <h4>Приёмы (${visits.length})</h4>
        <div>
            ${visits.map(v => {
                const pet = (currentData.pets || []).find(p => p.PetID === v.PetID);
                return `
                    <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px;">
                        <p><strong>Пациент:</strong> ${escapeHtml(pet ? pet.Name : 'N/A')}</p>
                        <p><strong>Диагноз:</strong> ${escapeHtml(v.Diagnosis)}</p>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('deleteBtn').onclick = () => deleteItem('doctors', doctorId);
    modal.classList.add('active');
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.remove('active');
}

// ===== ФИЛЬТРЫ =====
function setupFilters() {
    const doctorSearch = document.getElementById('doctorsSearch');
    if (doctorSearch) {
        doctorSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const doctors = currentData.doctors || [];
            const filtered = doctors.filter(d => 
                (d.FullName || '').toLowerCase().includes(query) ||
                (d.Specialization || '').toLowerCase().includes(query)
            );
            displayFilteredDoctors(filtered);
        });
    }
    
    const serviceSearch = document.getElementById('servicesSearch');
    if (serviceSearch) {
        serviceSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const services = currentData.services || [];
            const filtered = services.filter(s => 
                (s.ServiceName || '').toLowerCase().includes(query)
            );
            displayFilteredServices(filtered);
        });
    }
    
    const patientSearch = document.getElementById('patientsSearch');
    if (patientSearch) {
        patientSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const pets = currentData.pets || [];
            const filtered = pets.filter(p => 
                (p.Name || '').toLowerCase().includes(query) ||
                (p.Species || '').toLowerCase().includes(query)
            );
            displayFilteredPatients(filtered);
        });
    }
}

function displayFilteredDoctors(doctors) {
    const container = document.getElementById('doctorsList');
    
    if (doctors.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">👨‍⚕️</div><p>Врачи не найдены</p></div>';
        return;
    }
    
    container.innerHTML = doctors.map(doctor => `
        <div class="item-card" onclick="showDoctorDetails(${doctor.DoctorID})">
            <div class="item-card-title">👨‍⚕️ ${escapeHtml(doctor.FullName)}</div>
            <div class="item-card-info">
                <div class="info-row">
                    <span class="info-label">Специализация:</span>
                    <span class="info-value">${escapeHtml(doctor.Specialization)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Опыт (лет):</span>
                    <span class="info-value">${escapeHtml(doctor.Experience)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Телефон:</span>
                    <span class="info-value">${escapeHtml(doctor.Phone)}</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); showForm('doctors', ${doctor.DoctorID})">Редактировать</button>
                <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteItem('doctors', ${doctor.DoctorID})">Удалить</button>
            </div>
        </div>
    `).join('');
}

function displayFilteredServices(services) {
    const container = document.getElementById('servicesList');
    if (services.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">💊</div><p>Услуги не найдены</p></div>';
        return;
    }
    container.innerHTML = services.map(service => `
        <div class="item-card">
            <div class="item-card-title">💊 ${escapeHtml(service.ServiceName)}</div>
            <div class="item-card-info">
                <div class="info-row">
                    <span class="info-label">Стоимость:</span>
                    <span class="info-value">${escapeHtml(service.Cost)} ₸</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-small" onclick="showForm('services', ${service.ServiceID})">Редактировать</button>
                <button class="btn btn-danger btn-small" onclick="deleteItem('services', ${service.ServiceID})">Удалить</button>
            </div>
        </div>
    `).join('');
}

function displayFilteredPatients(pets) {
    const owners = currentData.owners || [];
    const container = document.getElementById('patientsList');
    if (pets.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">🐾</div><p>Питомцы не найдены</p></div>';
        return;
    }
    container.innerHTML = pets.map(pet => {
        const owner = owners.find(o => o.OwnerID === pet.OwnerID);
        return `
            <div class="item-card" onclick="showPatientDetails(${pet.PetID})">
                <div class="item-card-title">🐾 ${escapeHtml(pet.Name)}</div>
                <div class="item-card-info">
                    <div class="info-row">
                        <span class="info-label">Вид:</span>
                        <span class="info-value">${escapeHtml(pet.Species)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Порода:</span>
                        <span class="info-value">${escapeHtml(pet.Breed)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Владелец:</span>
                        <span class="info-value">${escapeHtml(owner ? owner.FullName : 'N/A')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Пол:</span>
                        <span class="info-value">${escapeHtml(pet.Gender)}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); showForm('pets', ${pet.PetID})">Редактировать</button>
                    <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteItem('pets', ${pet.PetID})">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== УВЕДОМЛЕНИЯ =====
function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);
    setTimeout(() => { alert.remove(); }, 3000);
}