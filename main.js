// Database mock (in a real app, this would be server-side)
const adminDatabase = [
    { admin_id: 1, username: "admin1", password: "pass123", email: "admin@gmail.com", role: "SuperAdmin", emp_id: 1 },
    { admin_id: 2, username: "admin2", password: "pass456", email: "admin2@gmail.com", role: "HRAdmin", emp_id: 2 },
    { admin_id: 4, username: "admin4", password: "passabc", email: "admin4@gmail.com", role: "FinanceAdmin", emp_id: 4 }
];

const employeeDatabase = [
    { emp_id: 1, name: "Raj Kumar", email: "rajk@gmail.com", password: "emp123", phone_no: "9876543210", department: "Finance", designation: "Manager", joining_date: "15-JAN-2020", status: "Active" },
    { emp_id: 2, name: "Sudhir Kumar", email: "kumarsudhir@gam", password: "emp456", phone_no: "8765432109", department: "HR", designation: "Developer", joining_date: "20-MAR-2021", status: "Active" },
    { emp_id: 5, name: "Anuraj Singh", email: "anuraj@gmail.com", password: "emp789", phone_no: "9835920672", department: "Finance", designation: "Assistant", joining_date: "16-FEB-2020", status: "Inactive" }
];

const attendanceDatabase = [
    { attendance_id: 101, emp_id: 1, attendance_date: "01-JUN-2024", time_in: "09:00 AM", time_out: "05:00 PM", status: "Present", worked_hour: 8.00, location_type: "Surface" },
    { attendance_id: 102, emp_id: 2, attendance_date: "01-JUN-2024", time_in: "09:15 AM", time_out: "05:30 PM", status: "Present", worked_hour: 8.25, location_type: "Surface" },
    { attendance_id: 114, emp_id: 5, attendance_date: "15-JUN-2025", time_in: "08:00 AM", time_out: "01:00 PM", status: "Present", worked_hour: 5.00, location_type: "Underground" },
    { attendance_id: 115, emp_id: 5, attendance_date: "16-JUL-2024", time_in: "09:00 AM", time_out: "03:00 PM", status: "Present", worked_hour: 6.00, location_type: "Underground" }
];

const leaveDatabase = [
    { leave_id: 302, emp_id: 2, leave_type: "Casual Leave", start_date: "25-MAY-2024", end_date: "26-MAY-2024", status: "Pending", reason: "Family function" }
];

const shiftDatabase = [
    { shift_id: 201, emp_id: 1, name: "Raj Kumar", start_time: "09:00 AM", end_time: "05:00 PM", attendance_id: 101, type: "Shift 1" },
    { shift_id: 202, emp_id: 2, name: "Sudhir Kumar", start_time: "10:00 AM", end_time: "10:00 PM", attendance_id: 102, type: "Shift 2" },
    { shift_id: 204, emp_id: 5, name: "Anuraj Singh", start_time: "09:00 AM", end_time: "05:00 PM", attendance_id: 105, type: "Normal" }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on and initialize accordingly
    if (document.querySelector('.landing-container')) {
        initLandingPage();
    } else if (document.querySelector('.role-modal')) {
        initRoleSelection();
    } else if (document.querySelector('#adminLoginForm')) {
        initAdminLogin();
    } else if (document.querySelector('#employeeLoginForm')) {
        initEmployeeLogin();
    } else if (document.querySelector('.admin-dashboard')) {
        initAdminDashboard();
    } else if (document.querySelector('.employee-dashboard')) {
        initEmployeeDashboard();
    }
});

function initLandingPage() {
    const authCard = document.querySelector('.auth-card');
    if (authCard) {
        setTimeout(() => {
            authCard.style.opacity = '1';
        }, 300);
    }

    const signInBtn = document.getElementById('signInButton');
    if (signInBtn) {
        signInBtn.addEventListener('click', function() {
            this.classList.add('clicked');
            setTimeout(() => {
                window.location.href = 'role-selection.html';
            }, 300);
        });
    }
}

function initRoleSelection() {
    const roleModal = document.querySelector('.role-modal');
    if (roleModal) {
        roleModal.style.display = 'flex';
    }

    const adminRole = document.getElementById('adminRole');
    const employeeRole = document.getElementById('employeeRole');
    const backButton = document.getElementById('backButton');

    if (adminRole) {
        adminRole.addEventListener('click', function() {
            navigateToPage('admin-login.html', this);
        });
    }

    if (employeeRole) {
        employeeRole.addEventListener('click', function() {
            navigateToPage('employee-login.html', this);
        });
    }

    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToPage('index.html', this);
        });
    }
}

function initAdminLogin() {
    const loginForm = document.getElementById('adminLoginForm');
    const backButton = document.getElementById('adminBackButton');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('adminUsername').value.trim();
            const password = document.getElementById('adminPassword').value.trim();
            
            const admin = adminDatabase.find(a => 
                a.username === username && 
                a.password === password
            );
            
            if (admin) {
                sessionStorage.setItem('currentAdmin', JSON.stringify(admin));
                window.location.href = 'admin-dashboard.html';
            } else {
                alert('Invalid username or password');
            }
        });
    }

    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = 'role-selection.html';
        });
    }
}

function initEmployeeLogin() {
    const loginForm = document.getElementById('employeeLoginForm');
    const backButton = document.getElementById('employeeBackButton');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('employeeUsername').value.trim();
            const password = document.getElementById('employeePassword').value.trim();
            
            const employee = employeeDatabase.find(e => 
                e.email === email && 
                e.password === password
            );
            
            if (employee) {
                sessionStorage.setItem('currentEmployee', JSON.stringify(employee));
                window.location.href = 'employee-dashboard.html';
            } else {
                alert('Invalid email or password');
            }
        });
    }

    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = 'role-selection.html';
        });
    }
}

function initAdminDashboard() {
    const admin = JSON.parse(sessionStorage.getItem('currentAdmin'));
    if (!admin) {
        window.location.href = 'admin-login.html';
        return;
    }

    document.getElementById('adminName').textContent = admin.username;
    document.getElementById('adminRole').textContent = admin.role;

    const searchBtn = document.getElementById('searchEmployeeBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const empId = parseInt(document.getElementById('empIdSearch').value);
            const employee = employeeDatabase.find(e => e.emp_id === empId);
            
            if (employee) {
                document.getElementById('employeeDetailsSection').style.display = 'block';
                document.getElementById('employeeDetails').innerHTML = `
                    <p><strong>Name:</strong> ${employee.name}</p>
                    <p><strong>Department:</strong> ${employee.department}</p>
                    <p><strong>Designation:</strong> ${employee.designation}</p>
                    <p><strong>Status:</strong> ${employee.status}</p>
                `;
                sessionStorage.setItem('currentViewingEmployee', JSON.stringify(employee));
            } else {
                alert('Employee not found');
            }
        });
    }

    document.getElementById('viewAttendanceBtn').addEventListener('click', function() {
        const employee = JSON.parse(sessionStorage.getItem('currentViewingEmployee'));
        if (employee) {
            const attendance = attendanceDatabase.filter(a => a.emp_id === employee.emp_id);
            displayResults('Attendance Records', attendance);
        }
    });

    document.getElementById('viewLeavesBtn').addEventListener('click', function() {
        const employee = JSON.parse(sessionStorage.getItem('currentViewingEmployee'));
        if (employee) {
            const leaves = leaveDatabase.filter(l => l.emp_id === employee.emp_id);
            displayResults('Leave Requests', leaves);
        }
    });

    document.getElementById('viewShiftsBtn').addEventListener('click', function() {
        const employee = JSON.parse(sessionStorage.getItem('currentViewingEmployee'));
        if (employee) {
            const shifts = shiftDatabase.filter(s => s.emp_id === employee.emp_id);
            displayResults('Shift Records', shifts);
        }
    });

    document.getElementById('generateReportBtn').addEventListener('click', function() {
        const employee = JSON.parse(sessionStorage.getItem('currentViewingEmployee'));
        if (employee) {
            generateEmployeeReport(employee.emp_id);
        }
    });

    document.getElementById('deleteEmployeeBtn').addEventListener('click', function() {
        const employee = JSON.parse(sessionStorage.getItem('currentViewingEmployee'));
        if (employee) {
            showDeleteConfirmation(employee);
        } else {
            alert('No employee selected');
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.removeItem('currentAdmin');
            window.location.href = 'index.html';
        });
    }
}

function initEmployeeDashboard() {
    const employee = JSON.parse(sessionStorage.getItem('currentEmployee'));
    if (!employee) {
        window.location.href = 'employee-login.html';
        return;
    }

    // Set employee information
    document.getElementById('employeeName').textContent = employee.name;
    document.getElementById('employeeDepartment').textContent = employee.department;
    
    document.getElementById('employeePersonalDetails').innerHTML = `
        <p><strong>Email:</strong> ${employee.email}</p>
        <p><strong>Phone:</strong> ${employee.phone_no}</p>
        <p><strong>Designation:</strong> ${employee.designation}</p>
        <p><strong>Joining Date:</strong> ${employee.joining_date}</p>
        <p><strong>Status:</strong> ${employee.status}</p>
    `;
    
    // Calculate attendance stats
    const attendance = attendanceDatabase.filter(a => a.emp_id === employee.emp_id);
    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const totalCount = attendance.length;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    document.getElementById('attendancePercentage').textContent = `${attendancePercentage}%`;
    document.getElementById('pendingLeaves').textContent = leaveDatabase.filter(l => l.emp_id === employee.emp_id && l.status === 'Pending').length;

    // View Attendance Button
    document.getElementById('viewMyAttendanceBtn').addEventListener('click', function() {
        const attendance = attendanceDatabase.filter(a => a.emp_id === employee.emp_id);
        if (attendance.length > 0) {
            displayEmployeeResults('My Attendance Records', attendance);
        } else {
            displayEmployeeResults('My Attendance Records', [], 'No attendance records found');
        }
    });

    // Apply Leave Button
    document.getElementById('applyLeaveBtn').addEventListener('click', function() {
        showLeaveApplicationForm(employee);
    });

    // View Shifts Button
    document.getElementById('viewMyShiftsBtn').addEventListener('click', function() {
        const shifts = shiftDatabase.filter(s => s.emp_id === employee.emp_id);
        if (shifts.length > 0) {
            displayEmployeeResults('My Shift Records', shifts);
        } else {
            displayEmployeeResults('My Shift Records', [], 'No shift records found');
        }
    });

    // Close Results Button
    document.getElementById('closeResultsBtn').addEventListener('click', function() {
        document.getElementById('resultsSection').style.display = 'none';
    });

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.removeItem('currentEmployee');
            window.location.href = 'index.html';
        });
    }
}

function displayEmployeeResults(title, data, emptyMessage = 'No records found') {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const resultsTitle = document.getElementById('resultsTitle');
    
    resultsTitle.textContent = title;
    
    if (data.length === 0) {
        resultsContent.innerHTML = `<p class="no-records">${emptyMessage}</p>`;
    } else {
        let table = `<table class="data-table"><thead><tr>`;
        const headers = Object.keys(data[0]);
        headers.forEach(header => {
            table += `<th>${header.replace('_', ' ').toUpperCase()}</th>`;
        });
        table += `</tr></thead><tbody>`;
        
        data.forEach(item => {
            table += `<tr>`;
            headers.forEach(header => {
                table += `<td>${item[header]}</td>`;
            });
            table += `</tr>`;
        });
        
        table += `</tbody></table>`;
        resultsContent.innerHTML = table;
    }
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function showLeaveApplicationForm(employee) {
    const today = new Date().toISOString().split('T')[0];
    
    const leaveForm = `
        <div class="leave-form">
            <form id="leaveApplicationForm">
                <div class="form-group">
                    <label for="leaveType">Leave Type</label>
                    <select id="leaveType" class="form-control" required>
                        <option value="">Select Leave Type</option>
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Sick Leave">Sick Leave</option>
                        <option value="Earned Leave">Earned Leave</option>
                    </select>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="startDate">Start Date</label>
                        <input type="date" id="startDate" min="${today}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="endDate">End Date</label>
                        <input type="date" id="endDate" min="${today}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="leaveReason">Reason</label>
                    <textarea id="leaveReason" rows="4" placeholder="Enter reason for leave..." required></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="primary-btn">Submit Application</button>
                    <button type="button" id="cancelLeaveBtn" class="secondary-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('resultsTitle').textContent = 'Apply for Leave';
    document.getElementById('resultsContent').innerHTML = leaveForm;
    document.getElementById('resultsSection').style.display = 'block';
    
    // Set end date to be >= start date
    document.getElementById('startDate').addEventListener('change', function() {
        document.getElementById('endDate').min = this.value;
    });
    
    // Form submission
    document.getElementById('leaveApplicationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (new Date(endDate) < new Date(startDate)) {
            alert('End date cannot be before start date');
            return;
        }
        
        const newLeave = {
            leave_id: Math.floor(Math.random() * 1000),
            emp_id: employee.emp_id,
            name: employee.name,
            leave_type: document.getElementById('leaveType').value,
            start_date: formatDateForDisplay(startDate),
            end_date: formatDateForDisplay(endDate),
            status: "Pending",
            reason: document.getElementById('leaveReason').value,
            applied_date: formatDateForDisplay(today)
        };
        
        leaveDatabase.push(newLeave);
        alert('Leave application submitted successfully!');
        document.getElementById('pendingLeaves').textContent = 
            leaveDatabase.filter(l => l.emp_id === employee.emp_id && l.status === 'Pending').length;
        document.getElementById('resultsSection').style.display = 'none';
    });
    
    // Cancel button
    document.getElementById('cancelLeaveBtn').addEventListener('click', function() {
        document.getElementById('resultsSection').style.display = 'none';
    });
}

function formatDateForDisplay(dateString) {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options).toUpperCase();
}

function displayResults(title, data) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    
    if (data.length === 0) {
        resultsContent.innerHTML = `<p>No records found</p>`;
    } else {
        let table = `<table class="data-table"><thead><tr>`;
        const headers = Object.keys(data[0]);
        headers.forEach(header => {
            table += `<th>${header.replace('_', ' ').toUpperCase()}</th>`;
        });
        table += `</tr></thead><tbody>`;
        
        data.forEach(item => {
            table += `<tr>`;
            headers.forEach(header => {
                table += `<td>${item[header]}</td>`;
            });
            table += `</tr>`;
        });
        
        table += `</tbody></table>`;
        resultsContent.innerHTML = table;
    }
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function generateEmployeeReport(empId) {
    const employee = employeeDatabase.find(e => e.emp_id === empId);
    if (!employee) return;

    const attendance = attendanceDatabase.filter(a => a.emp_id === empId);
    const leaves = leaveDatabase.filter(l => l.emp_id === empId);
    const shifts = shiftDatabase.filter(s => s.emp_id === empId);
    
    const nightShifts = shifts.filter(s => {
        const endHour = parseInt(s.end_time.split(':')[0]);
        return endHour >= 20 || endHour <= 6;
    }).length;
    
    const undergroundDays = attendance.filter(a => a.location_type === 'Underground').length;
    
    let reportContent = `EMPLOYEE REPORT\n================\n\n`;
    reportContent += `Employee ID: ${employee.emp_id}\n`;
    reportContent += `Name: ${employee.name}\n`;
    reportContent += `Department: ${employee.department}\n`;
    reportContent += `Designation: ${employee.designation}\n`;
    reportContent += `Status: ${employee.status}\n\n`;
    
    reportContent += `ATTENDANCE SUMMARY\n------------------\n`;
    reportContent += `Total Records: ${attendance.length}\n`;
    reportContent += `Present Days: ${attendance.filter(a => a.status === 'Present').length}\n`;
    reportContent += `Absent Days: ${attendance.filter(a => a.status === 'Absent').length}\n`;
    reportContent += `Underground Days: ${undergroundDays}\n\n`;
    
    reportContent += `SHIFT SUMMARY\n-------------\n`;
    reportContent += `Total Shifts: ${shifts.length}\n`;
    reportContent += `Night Shifts: ${nightShifts}\n\n`;
    
    reportContent += `LEAVE SUMMARY\n-------------\n`;
    reportContent += `Total Leave Requests: ${leaves.length}\n`;
    reportContent += `Approved Leaves: ${leaves.filter(l => l.status === 'Approved').length}\n`;
    reportContent += `Pending Leaves: ${leaves.filter(l => l.status === 'Pending').length}\n`;
    
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(`<pre>${reportContent}</pre>`);
    reportWindow.document.close();
}

function showDeleteConfirmation(employee) {
    const confirmation = `
        <div class="confirmation-modal">
            <div class="confirmation-content">
                <h3>Confirm Deletion</h3>
                <p>You are about to delete all data for:</p>
                <p><strong>${employee.name} (ID: ${employee.emp_id})</strong></p>
                <div class="summary">
                    <p>This will permanently delete:</p>
                    <ul>
                        <li>Employee record</li>
                        <li>${attendanceDatabase.filter(a => a.emp_id === employee.emp_id).length} attendance records</li>
                        <li>${leaveDatabase.filter(l => l.emp_id === employee.emp_id).length} leave requests</li>
                        <li>${shiftDatabase.filter(s => s.emp_id === employee.emp_id).length} shift records</li>
                    </ul>
                </div>
                <p class="warning"><i class="fas fa-exclamation-triangle"></i> This action cannot be undone!</p>
                <div class="confirmation-buttons">
                    <button id="confirmDeleteBtn" class="danger-btn">Confirm Delete</button>
                    <button id="cancelDeleteBtn" class="secondary-btn">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmation);
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        deleteEmployeeData(employee.emp_id);
        document.querySelector('.confirmation-modal').remove();
    });
    
    document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
        document.querySelector('.confirmation-modal').remove();
    });
}

function deleteEmployeeData(empId) {
    // Delete from employee database
    const employeeIndex = employeeDatabase.findIndex(e => e.emp_id === empId);
    if (employeeIndex !== -1) employeeDatabase.splice(employeeIndex, 1);
    
    // Delete related records
    [attendanceDatabase, leaveDatabase, shiftDatabase].forEach(db => {
        for (let i = db.length - 1; i >= 0; i--) {
            if (db[i].emp_id === empId) db.splice(i, 1);
        }
    });
    
    // If admin is deleting their own employee record
    const currentAdmin = JSON.parse(sessionStorage.getItem('currentAdmin'));
    if (currentAdmin && currentAdmin.emp_id === empId) {
        const adminIndex = adminDatabase.findIndex(a => a.emp_id === empId);
        if (adminIndex !== -1) adminDatabase.splice(adminIndex, 1);
    }
    
    alert(`All data for employee ID ${empId} has been deleted.`);
    document.getElementById('employeeDetailsSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('empIdSearch').value = '';
}

function navigateToPage(page, element) {
    if (element) element.classList.add('clicked');
    setTimeout(() => {
        window.location.href = page;
    }, 300);
}

document.addEventListener('animationend', function(e) {
    if (e.target.classList.contains('clicked')) {
        e.target.classList.remove('clicked');
    }
});