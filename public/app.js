const API_BASE_URL = '/api/students';

// DOM Elements
const studentForm = document.getElementById('student-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const refreshBtn = document.getElementById('refresh-btn');
const studentsTbody = document.getElementById('students-tbody');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

let editingStudentId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    
    studentForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
    refreshBtn.addEventListener('click', loadStudents);
});

// Load all students from backend
async function loadStudents() {
    try {
        loading.style.display = 'block';
        errorMessage.style.display = 'none';
        studentsTbody.innerHTML = '';

        const response = await fetch(API_BASE_URL);
        const result = await response.json();

        if (result.status === 'success') {
            if (result.data && result.data.length > 0) {
                displayStudents(result.data);
            } else {
                displayEmptyState();
            }
        } else {
            showError('Failed to load students: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students. Please check if the server is running.');
    } finally {
        loading.style.display = 'none';
    }
}

// Display students in table
function displayStudents(students) {
    studentsTbody.innerHTML = '';
    
    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(student.studentId)}</strong></td>
            <td>${escapeHtml(student.firstName || '-')}</td>
            <td>${escapeHtml(student.lastName || '-')}</td>
            <td>${student.year || '-'}</td>
            <td>${student.gender ? capitalizeFirst(student.gender) : '-'}</td>
            <td class="balance ${student.balance < 0 ? 'negative' : ''}">
                ${formatCurrency(student.balance || 0)}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick="editStudent('${student.studentId}')">
                        ✏️ Edit
                    </button>
                </div>
            </td>
        `;
        studentsTbody.appendChild(row);
    });
}

// Display empty state
function displayEmptyState() {
    studentsTbody.innerHTML = `
        <tr>
            <td colspan="7">
                <div class="empty-state">
                    <p>📋 No students found</p>
                    <p>Add your first student using the form on the left!</p>
                </div>
            </td>
        </tr>
    `;
}

// Handle form submission (Add or Update)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(studentForm);
    const studentData = {
        studentId: formData.get('studentId'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        year: formData.get('year') ? parseInt(formData.get('year')) : null,
        gender: formData.get('gender') || null
    };

    try {
        let response;
        
        if (editingStudentId) {
            // Update existing student
            const updateData = {
                firstName: studentData.firstName,
                lastName: studentData.lastName,
                year: studentData.year,
                gender: studentData.gender
            };
            
            response = await fetch(`${API_BASE_URL}/${editingStudentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
        } else {
            // Create new student
            response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
        }

        const result = await response.json();

        if (result.status === 'success') {
            showNotification(
                editingStudentId ? 'Student updated successfully!' : 'Student added successfully!',
                'success'
            );
            resetForm();
            loadStudents();
        } else {
            showNotification(
                result.message || 'Failed to save student',
                'error'
            );
        }
    } catch (error) {
        console.error('Error saving student:', error);
        showNotification('Failed to save student. Please try again.', 'error');
    }
}

// Edit student
async function editStudent(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/${studentId}`);
        const result = await response.json();

        if (result.status === 'success') {
            const student = result.data;
            editingStudentId = student.studentId;
            
            // Populate form
            document.getElementById('studentId').value = student.studentId;
            document.getElementById('studentId').disabled = true; // Can't change ID
            document.getElementById('firstName').value = student.firstName || '';
            document.getElementById('lastName').value = student.lastName || '';
            document.getElementById('year').value = student.year || '';
            document.getElementById('gender').value = student.gender || '';
            
            // Update UI
            formTitle.textContent = 'Edit Student';
            submitBtn.textContent = 'Update Student';
            cancelBtn.style.display = 'inline-block';
            
            // Scroll to form
            document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        } else {
            showNotification('Failed to load student data', 'error');
        }
    } catch (error) {
        console.error('Error loading student:', error);
        showNotification('Failed to load student data', 'error');
    }
}

// Reset form to add mode
function resetForm() {
    editingStudentId = null;
    studentForm.reset();
    document.getElementById('studentId').disabled = false;
    formTitle.textContent = 'Add New Student';
    submitBtn.textContent = 'Add Student';
    cancelBtn.style.display = 'none';
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0
    }).format(amount);
}

// Make editStudent available globally for onclick handlers
window.editStudent = editStudent;

