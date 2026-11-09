// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = sessionStorage.getItem('authToken') || '';

// Enhanced API helper with auth and error handling
async function fetchAPI(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (response.status === 401 && !endpoint.startsWith('/auth/')) {
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentAdmin');
      sessionStorage.removeItem('currentEmployee');
      window.location.href = 'index.html';
      return;
    }

    let data = {};
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw { message: text || 'Invalid response from server' };
      }
    }

    if (!response.ok) {
      throw {
        message: data.message || data.error || `Request failed with status ${response.status}`
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw {
      message: error.message || 'Network error occurred. Please try again.'
    };
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  // Normalize current path
  const getCurrentPage = () => {
    let path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace('.html', '');
  };

  const currentPage = getCurrentPage();
  console.debug(`Initializing page: ${currentPage}`);

  // Protected routes
  const protectedRoutes = ['admin-dashboard', 'employee-dashboard'];
  if (protectedRoutes.includes(currentPage)) {
    if (!authToken) {
      window.location.href = 'index.html';
      return;
    }

    // Verify token is still valid
    const userType = currentPage.split('-')[0]; // 'admin' or 'employee'
    const currentUser = sessionStorage.getItem(`current${userType.charAt(0).toUpperCase() + userType.slice(1)}`);
    if (!currentUser) {
      sessionStorage.removeItem('authToken');
      window.location.href = `${userType}-login.html`;
      return;
    }
  }

  // Page initializers
  const pageInitializers = {
    'index': initLandingPage,
    'role-selection': initRoleSelection,
    'admin-login': initAdminLogin,
    'employee-login': initEmployeeLogin,
    'admin-dashboard': initAdminDashboard,
    'employee-dashboard': initEmployeeDashboard
  };

  // Initialize current page
  const initializer = pageInitializers[currentPage];
  if (initializer) {
    try {
      initializer();
    } catch (error) {
      console.error(`Initialization error for ${currentPage}:`, error);
      showError('Page initialization failed');
      if (protectedRoutes.includes(currentPage)) {
        window.location.href = 'index.html';
      }
    }
  } else {
    console.warn(`No initializer found for page: ${currentPage}`);
    if (currentPage !== 'index') {
      window.location.href = 'index.html';
    }
  }
});

/* ==================== */
/* PAGE INITIALIZATIONS */
/* ==================== */

function initLandingPage() {
  // Animate auth card
  const authCard = document.querySelector('.auth-card');
  if (authCard) {
    setTimeout(() => authCard.style.opacity = '1', 300);
  }

  // Sign in button
  document.getElementById('signInButton')?.addEventListener('click', function(e) {
    e.preventDefault();
    navigateToPage('role-selection.html', this);
  });
}

function initRoleSelection() {
  // Show modal
  const roleModal = document.querySelector('.role-modal');
  if (roleModal) roleModal.style.display = 'flex';

  // Role selection
  document.getElementById('adminRole')?.addEventListener('click', function() {
    navigateToPage('admin-login.html', this);
  });

  document.getElementById('employeeRole')?.addEventListener('click', function() {
    navigateToPage('employee-login.html', this);
  });

  // Back button
  document.getElementById('backButton')?.addEventListener('click', function(e) {
    e.preventDefault();
    navigateToPage('index.html', this);
  });
}

function setLoginFeedback(form, state, message) {
  const card = form.closest('.login-card');
  const feedback = form.querySelector('[data-auth-feedback]');
  card.classList.remove('is-submitting', 'is-error', 'is-success', 'is-authenticating');
  if (state) card.classList.add(`is-${state}`);
  feedback.textContent = message;
  feedback.hidden = !message;
}

function setLoginPending(form, submitButton) {
  setLoginFeedback(form, 'submitting', 'Checking your sign-in…');
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="login-spinner" aria-hidden="true"></span> Checking…';
}

function setLoginFailure(form, submitButton, message) {
  setLoginFeedback(form, 'error', message);
  submitButton.disabled = false;
  submitButton.innerHTML = 'Sign in <i class="fas fa-arrow-right"></i>';
}

function setLoginSuccess(form, submitButton, destination) {
  setLoginFeedback(form, 'success', 'Verified. Opening your workspace…');
  form.closest('.login-card').classList.add('is-authenticating');
  submitButton.innerHTML = '<i class="fas fa-check"></i> Verified';
  setTimeout(() => navigateToPage(destination, submitButton), 240);
}

async function initAdminLogin() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    setLoginPending(form, submitBtn);
    let redirecting = false;

    try {
      const formData = {
        username: form.adminUsername.value.trim(),
        password: form.adminPassword.value.trim()
      };

      const response = await fetchAPI('/auth/admin', 'POST', formData);

      if (response.token) {
        authToken = response.token;
        sessionStorage.setItem('authToken', response.token);
        sessionStorage.setItem('currentAdmin', JSON.stringify(response.admin));
        redirecting = true;
        setLoginSuccess(form, submitBtn, 'admin-dashboard.html');
      } else {
        setLoginFailure(form, submitBtn, response.message || 'Authentication failed');
      }
    } catch (error) {
      setLoginFailure(form, submitBtn, getErrorMessage(error));
    } finally {
      if (!redirecting) submitBtn.disabled = false;
    }
  });

  // Back button
  document.getElementById('adminBackButton')?.addEventListener('click', () => {
    window.location.href = 'role-selection.html';
  });
}

async function initEmployeeLogin() {
  const form = document.getElementById('employeeLoginForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    setLoginPending(form, submitBtn);
    let redirecting = false;

    try {
      const formData = {
        emailOrUsername: form.employeeUsername.value.trim(),
        password: form.employeePassword.value.trim()
      };

      const response = await fetchAPI('/auth/employee', 'POST', formData);

      if (response.token) {
        authToken = response.token;
        sessionStorage.setItem('authToken', response.token);
        sessionStorage.setItem('currentEmployee', JSON.stringify(response.employee));
        redirecting = true;
        setLoginSuccess(form, submitBtn, 'employee-dashboard.html');
      } else {
        setLoginFailure(form, submitBtn, response.message || 'Authentication failed');
      }
    } catch (error) {
      setLoginFailure(form, submitBtn, getErrorMessage(error));
    } finally {
      if (!redirecting) submitBtn.disabled = false;
    }
  });

  // Back button
  document.getElementById('employeeBackButton')?.addEventListener('click', () => {
    window.location.href = 'role-selection.html';
  });
}

function initializeDashboardShell(user) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const greetingPeriod = document.getElementById('greetingPeriod');
  const dashboardDate = document.getElementById('dashboardDate');
  const footerYear = document.getElementById('footerYear');
  const displayName = user.name || user.username || 'there';
  const avatarMark = document.getElementById(user.role === 'employee' ? 'employeeAvatarMark' : 'adminAvatarMark');

  if (greetingPeriod) greetingPeriod.textContent = greeting;
  if (dashboardDate) {
    dashboardDate.textContent = new Intl.DateTimeFormat('en', {
      weekday: 'long', month: 'long', day: 'numeric'
    }).format(now);
  }
  if (footerYear) footerYear.textContent = now.getFullYear();
  if (avatarMark) avatarMark.textContent = displayName.trim().charAt(0).toUpperCase();

  const themeToggle = document.getElementById('themeToggle');
  const applyDashboardTheme = theme => {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    if (themeToggle) {
      const nextTheme = isDark ? 'light' : 'dark';
      themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
      themeToggle.setAttribute('title', `Switch to ${nextTheme} mode`);
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
    }
  };
  applyDashboardTheme(localStorage.getItem('attendanceTheme') || 'light');
  themeToggle?.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('attendanceTheme', nextTheme);
    applyDashboardTheme(nextTheme);
  });

  const sidebar = document.getElementById('dashboardSidebar');
  const toggle = document.getElementById('sidebarToggle');
  const closeSidebar = () => {
    sidebar?.classList.remove('active');
    toggle?.setAttribute('aria-expanded', 'false');
  };
  const setActiveItem = item => {
    item.closest('nav')?.querySelectorAll('li').forEach(listItem => listItem.classList.remove('active'));
    item.closest('li')?.classList.add('active');
  };

  toggle?.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('active');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('[data-dashboard-nav]').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      setActiveItem(link);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeSidebar();
    });
  });

  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', async () => {
      setActiveItem(button);
      await viewEmployeeData(button.dataset.view);
      document.getElementById('resultsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeSidebar();
    });
  });

  document.querySelectorAll('[data-employee-action]').forEach(button => {
    button.addEventListener('click', async () => {
      setActiveItem(button);
      if (button.dataset.employeeAction === 'leave') {
        await showLeaveApplicationForm(user);
      } else {
        const action = button.dataset.employeeAction;
        const title = action === 'attendance' ? 'My Attendance Records' : 'My Shift Records';
        await fetchAndDisplay(action, title);
        document.getElementById('resultsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      closeSidebar();
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeSidebar();
  });
}

async function loadAdminDashboardSummary() {
  try {
    const summary = await fetchAPI('/dashboard/summary');
    document.getElementById('totalEmployees').textContent = summary.employees.total ?? 0;
    document.getElementById('activeEmployees').textContent = summary.employees.active ?? 0;
    document.getElementById('presentToday').textContent = summary.attendance.present_today ?? 0;
    document.getElementById('pendingLeaveCount').textContent = summary.leaves.pending ?? 0;
  } catch (error) {
    console.error('Failed to load dashboard summary:', error);
  }
}

async function initAdminDashboard() {
  try {
    const admin = JSON.parse(sessionStorage.getItem('currentAdmin'));
    if (!admin) throw new Error('Session expired');

    // Display admin info
    document.getElementById('adminName').textContent = admin.username;
    document.getElementById('adminRole').textContent = admin.role;
    document.getElementById('adminWelcomeName').textContent = admin.username;
    initializeDashboardShell(admin);
    loadAdminDashboardSummary();

    // Set up event listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('employeeSearchForm')?.addEventListener('submit', event => {
      event.preventDefault();
      searchEmployee();
    });
    document.getElementById('addEmployeeBtn')?.addEventListener('click', showAddEmployeeForm);
    document.getElementById('addEmployeeNavBtn')?.addEventListener('click', showAddEmployeeForm);
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    document.getElementById('deleteEmployeeBtn')?.addEventListener('click', confirmDelete);
    document.getElementById('closeResultsBtn')?.addEventListener('click', () => {
      document.getElementById('resultsSection').style.display = 'none';
    });

    // Data view buttons
    document.getElementById('viewAttendanceBtn')?.addEventListener('click',
      () => viewEmployeeData('attendance'));
    document.getElementById('viewLeavesBtn')?.addEventListener('click',
      () => viewEmployeeData('leaves'));
    document.getElementById('viewShiftsBtn')?.addEventListener('click',
      () => viewEmployeeData('shifts'));

  } catch (error) {
    showError('Session expired. Please login again.');
    window.location.href = 'admin-login.html';
  }
}

async function initEmployeeDashboard() {
  try {
    const employee = JSON.parse(sessionStorage.getItem('currentEmployee'));
    if (!employee) throw new Error('Session expired');

    // Display employee info
    document.getElementById('employeeName').textContent = employee.name;
    document.getElementById('employeeDepartment').textContent = employee.department;
    document.getElementById('employeeWelcomeName').textContent = employee.name.split(' ')[0];
    initializeDashboardShell({ ...employee, role: 'employee' });

    // Personal details
    document.getElementById('employeePersonalDetails').innerHTML = `
      <p><strong>Username:</strong> ${employee.username}</p>
      <p><strong>Email:</strong> ${employee.email}</p>
      <p><strong>Phone:</strong> ${employee.phone_no || 'N/A'}</p>
      <p><strong>Designation:</strong> ${employee.designation}</p>
      <p><strong>Joining Date:</strong> ${formatDate(employee.joining_date)}</p>
      <p><strong>Status:</strong> ${employee.status}</p>
    `;

    // Load stats
    try {
      const stats = await fetchAPI(`/employees/${employee.emp_id}/stats`);
      document.getElementById('attendancePercentage').textContent = `${stats.attendancePercentage}%`;
      document.getElementById('pendingLeaves').textContent = stats.pendingLeaves;
    } catch (error) {
      console.error('Failed to load stats:', error);
    }

    // Set up event listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('applyLeaveBtn')?.addEventListener('click',
      () => showLeaveApplicationForm(employee));
    document.getElementById('closeResultsBtn')?.addEventListener('click',
      () => document.getElementById('resultsSection').style.display = 'none');

    // Data view buttons
    document.getElementById('viewMyAttendanceBtn')?.addEventListener('click',
      () => fetchAndDisplay('attendance', 'My Attendance Records'));
    document.getElementById('viewMyShiftsBtn')?.addEventListener('click',
      () => fetchAndDisplay('shifts', 'My Shift Records'));

  } catch (error) {
    showError('Session expired. Please login again.');
    window.location.href = 'employee-login.html';
  }
}

/* ================== */
/* UTILITY FUNCTIONS */
/* ================== */

function logout() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}

function navigateToPage(page, element) {
  if (element) element.classList.add('clicked');
  document.body.classList.add('page-transitioning');
  setTimeout(() => window.location.href = page, 360);
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function showError(message) {
  console.error('Error:', message);
  alert(typeof message === 'string' ? message : 'An error occurred');
}

function showSuccess(message) {
  alert(message);
}

function getErrorMessage(error, fallback = 'An error occurred') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return fallback;
}

// Animation cleanup
document.addEventListener('animationend', function(e) {
  if (e.target.classList.contains('clicked')) {
    e.target.classList.remove('clicked');
  }
});

/* ====================== */
/* DASHBOARD FUNCTIONALITY */
/* ====================== */

async function searchEmployee() {
  const empId = document.getElementById('empIdSearch').value.trim();
  if (!empId) {
    showError('Please enter an employee ID');
    return;
  }

  try {
    const employee = await fetchAPI(`/employees/${empId}`);
    if (!employee) {
      showError('Employee not found');
      return;
    }

    document.getElementById('employeeDetails').innerHTML = `
      <p><strong>Name:</strong> ${employee.name}</p>
      <p><strong>Username:</strong> ${employee.username}</p>
      <p><strong>Department:</strong> ${employee.department}</p>
      <p><strong>Designation:</strong> ${employee.designation}</p>
      <p><strong>Status:</strong> ${employee.status}</p>
    `;
    document.getElementById('employeeDetailsSection').style.display = 'block';
    sessionStorage.setItem('currentViewingEmployee', JSON.stringify(employee));
  } catch (error) {
    showError(getErrorMessage(error, 'Failed to find employee'));
  }
}

async function viewEmployeeData(dataType) {
  const employee = JSON.parse(sessionStorage.getItem('currentViewingEmployee'));
  if (!employee) {
    showError('Please search for an employee first');
    return;
  }

  try {
    const data = await fetchAPI(`/${dataType}?empId=${employee.emp_id}`);
    displayResults(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Records`, data);
  } catch (error) {
    showError(getErrorMessage(error, `Failed to load ${dataType} records`));
  }
}

async function fetchAndDisplay(dataType, title) {
  try {
    const employee = JSON.parse(sessionStorage.getItem('currentEmployee'));
    const data = await fetchAPI(`/employees/${employee.emp_id}/${dataType}`);
    displayEmployeeResults(title, data);
  } catch (error) {
    displayEmployeeResults(title, [], getErrorMessage(error));
  }
}

function displayResults(title, data) {
  const section = document.getElementById('resultsSection');
  const content = document.getElementById('resultsContent');

  document.getElementById('resultsTitle').textContent = title;

  if (!data || data.length === 0) {
    content.innerHTML = '<p>No data available</p>';
  } else {
    const headers = Object.keys(data[0]);
    let table = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
    table += data.map(row =>
      `<tr>${headers.map(h => `<td>${row[h] || 'N/A'}</td>`).join('')}</tr>`
    ).join('');
    table += '</tbody></table>';
    content.innerHTML = table;
  }

  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });
}

function displayEmployeeResults(title, data, errorMessage) {
  const section = document.getElementById('resultsSection');
  const content = document.getElementById('resultsContent');

  document.getElementById('resultsTitle').textContent = title;

  if (errorMessage) {
    content.innerHTML = `<p class="error">${errorMessage}</p>`;
  } else if (!data || data.length === 0) {
    content.innerHTML = '<p>No records found</p>';
  } else {
    const headers = Object.keys(data[0]);
    let table = `<table class="data-table"><thead><tr>`;
    headers.forEach(header => {
      table += `<th>${header.replace('_', ' ').toUpperCase()}</th>`;
    });
    table += `</tr></thead><tbody>`;

    data.forEach(item => {
      table += `<tr>`;
      headers.forEach(header => {
        table += `<td>${item[header] !== null ? item[header] : 'N/A'}</td>`;
      });
      table += `</tr>`;
    });

    table += `</tbody></table>`;
    content.innerHTML = table;
  }

  section.style.display = 'block';
}

async function showAddEmployeeForm() {
  const today = new Date().toISOString().split('T')[0];
  const formHTML = `
    <section class="add-employee-form employee-wizard" aria-labelledby="employeeWizardTitle">
      <header class="wizard-header">
        <div><p class="eyebrow">EMPLOYEE DIRECTORY</p><h2 id="employeeWizardTitle">Add an employee</h2><p class="wizard-description">Create a profile and set up their sign-in.</p></div>
        <button type="button" id="closeAddEmployee" class="icon-button" aria-label="Close form"><i class="fas fa-xmark"></i></button>
      </header>
      <div class="wizard-progress" aria-label="Employee setup progress">
        <div class="wizard-progress-track"><span id="wizardProgressFill"></span></div>
        <div class="wizard-progress-label"><span id="wizardStepLabel">Step 1 of 2 · Profile</span><span><i class="fas fa-lock"></i> Secure account setup</span></div>
      </div>
      <form id="newEmployeeForm">
        <fieldset class="wizard-step" data-wizard-step="0">
          <legend>Profile information</legend>
          <p class="wizard-step-copy">Start with the employee’s contact and role details.</p>
          <div class="wizard-fields">
            <div class="form-group wizard-field--wide"><label for="newEmpName">Full name</label><input type="text" id="newEmpName" autocomplete="name" required></div>
            <div class="form-group"><label for="newEmpEmail">Work email</label><input type="email" id="newEmpEmail" autocomplete="email" required></div>
            <div class="form-group"><label for="newEmpPhone">Phone number</label><input type="tel" id="newEmpPhone" placeholder="Phone number" autocomplete="tel" required></div>
            <div class="form-group"><label for="newEmpDept">Department</label><input type="text" id="newEmpDept" required></div>
            <div class="form-group"><label for="newEmpDesignation">Job title</label><input type="text" id="newEmpDesignation" required></div>
          </div>
          <div class="wizard-actions"><button type="button" id="cancelAddEmployee" class="secondary-btn">Cancel</button><button type="button" id="employeeWizardNext" class="primary-btn">Continue <i class="fas fa-arrow-right"></i></button></div>
        </fieldset>
        <fieldset class="wizard-step" data-wizard-step="1" hidden disabled>
          <legend>Sign-in and status</legend>
          <p class="wizard-step-copy">Create a username and temporary password for this employee.</p>
          <div class="wizard-fields wizard-fields--access">
            <div class="form-group"><label for="newEmpUsername">Username</label><input type="text" id="newEmpUsername" placeholder="Choose a username" autocomplete="off" required></div>
            <div class="form-group"><label for="newEmpJoinDate">Joining date</label><input type="date" id="newEmpJoinDate" value="${today}" required></div>
            <div class="form-group wizard-field--wide"><label for="newEmpPassword">Temporary password</label><div class="password-input-wrap"><input type="password" id="newEmpPassword" placeholder="At least 8 characters" minlength="8" autocomplete="new-password" required><button type="button" id="toggleEmployeePassword" class="password-toggle" aria-label="Show password"><i class="fas fa-eye"></i></button></div><div class="password-strength" aria-live="polite"><span class="password-strength-track"><span id="passwordStrengthFill"></span></span><span id="passwordStrengthLabel">Use at least 8 characters.</span></div></div>
            <div class="form-group"><label for="newEmpStatus">Employment status</label><select id="newEmpStatus" required><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
          </div>
          <div class="wizard-actions"><button type="button" id="employeeWizardBack" class="secondary-btn"><i class="fas fa-arrow-left"></i> Back</button><button type="submit" id="saveEmployeeBtn" class="primary-btn"><i class="fas fa-user-plus"></i> Add employee</button></div>
        </fieldset>
      </form>
    </section>
  `;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-content wizard-modal">${formHTML}</div>`;
  document.body.appendChild(modal);

  const form = document.getElementById('newEmployeeForm');
  const steps = [...form.querySelectorAll('.wizard-step')];
  let activeStep = 0;

  const setStep = stepIndex => {
    activeStep = stepIndex;
    steps.forEach((step, index) => {
      step.hidden = index !== activeStep;
      step.disabled = index !== activeStep;
    });
    document.getElementById('wizardProgressFill').style.width = activeStep === 0 ? '50%' : '100%';
    document.getElementById('wizardStepLabel').textContent = activeStep === 0
      ? 'Step 1 of 2 · Profile'
      : 'Step 2 of 2 · Access';
  };
  const closeModal = () => modal.remove();

  document.getElementById('employeeWizardNext').addEventListener('click', () => {
    const invalidField = [...steps[0].querySelectorAll(':required')].find(field => !field.checkValidity());
    if (invalidField) {
      invalidField.reportValidity();
      return;
    }
    setStep(1);
    document.getElementById('newEmpUsername').focus();
  });
  document.getElementById('employeeWizardBack').addEventListener('click', () => setStep(0));
  document.getElementById('cancelAddEmployee').addEventListener('click', closeModal);
  document.getElementById('closeAddEmployee').addEventListener('click', closeModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  document.getElementById('toggleEmployeePassword').addEventListener('click', event => {
    const passwordInput = document.getElementById('newEmpPassword');
    const shouldShow = passwordInput.type === 'password';
    passwordInput.type = shouldShow ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
    event.currentTarget.innerHTML = `<i class="fas fa-eye${shouldShow ? '-slash' : ''}"></i>`;
  });

  document.getElementById('newEmpPassword').addEventListener('input', event => {
    const value = event.currentTarget.value;
    const checks = [value.length >= 8, /[A-Z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)];
    const score = checks.filter(Boolean).length;
    const labels = ['Use at least 8 characters.', 'Weak password', 'Fair password', 'Good password', 'Strong password'];
    const fill = document.getElementById('passwordStrengthFill');
    fill.style.width = `${score * 25}%`;
    fill.dataset.strength = score < 2 ? 'weak' : score < 4 ? 'fair' : 'strong';
    document.getElementById('passwordStrengthLabel').textContent = labels[score];
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const submitButton = document.getElementById('saveEmployeeBtn');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating employee…';

    const newEmployee = {
      name: document.getElementById('newEmpName').value.trim(),
      username: document.getElementById('newEmpUsername').value.trim(),
      email: document.getElementById('newEmpEmail').value.trim(),
      password: document.getElementById('newEmpPassword').value.trim(),
      phone_no: document.getElementById('newEmpPhone').value.trim(),
      department: document.getElementById('newEmpDept').value,
      designation: document.getElementById('newEmpDesignation').value.trim(),
      joining_date: document.getElementById('newEmpJoinDate').value,
      status: document.getElementById('newEmpStatus').value
    };

    try {
      const response = await fetchAPI('/employees', 'POST', newEmployee);
      showSuccess(`Employee ${response.name} added successfully!`);
      closeModal();
      document.getElementById('empIdSearch').value = '';
      document.getElementById('employeeDetailsSection').style.display = 'none';
      loadAdminDashboardSummary();
    } catch (error) {
      showError(error.message || 'Failed to add employee');
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Add employee';
    }
  });

  setStep(0);
}

async function showLeaveApplicationForm(employee) {
  const today = new Date().toISOString().split('T')[0];
  const leaveForm = `
    <div class="leave-form">
      <form id="leaveApplicationForm">
        <select id="leaveType" required>
          <option value="">Select Leave Type</option>
          <option value="Sick">Sick Leave</option>
          <option value="Casual">Casual Leave</option>
          <option value="Earned">Earned Leave</option>
        </select>
        <input type="date" id="startDate" min="${today}" required>
        <input type="date" id="endDate" min="${today}" required>
        <textarea id="leaveReason" placeholder="Reason" required></textarea>
        <button type="submit" class="primary-btn">Apply</button>
        <button type="button" id="cancelLeaveBtn" class="secondary-btn">Cancel</button>
      </form>
    </div>
  `;

  document.getElementById('resultsTitle').textContent = 'Apply for Leave';
  document.getElementById('resultsContent').innerHTML = leaveForm;
  document.getElementById('resultsSection').style.display = 'block';

  document.getElementById('startDate').addEventListener('change', function() {
    document.getElementById('endDate').min = this.value;
  });

  document.getElementById('leaveApplicationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (new Date(endDate) < new Date(startDate)) {
      showError('End date cannot be before start date');
      return;
    }

    const leaveData = {
      emp_id: employee.emp_id,
      leave_type: document.getElementById('leaveType').value,
      start_date: startDate,
      end_date: endDate,
      reason: document.getElementById('leaveReason').value
    };

    try {
      await fetchAPI('/leaves', 'POST', leaveData);
      showSuccess('Leave application submitted successfully!');

      // Refresh pending leaves count
      const stats = await fetchAPI(`/employees/${employee.emp_id}/stats`);
      document.getElementById('pendingLeaves').textContent = stats.pendingLeaves;

      document.getElementById('resultsSection').style.display = 'none';
    } catch (error) {
      showError(error.message || 'Failed to submit leave application');
    }
  });

  document.getElementById('cancelLeaveBtn').addEventListener('click', function() {
    document.getElementById('resultsSection').style.display = 'none';
  });
}

async function generateReport() {
  const employee = JSON.parse(sessionStorage.getItem('currentViewingEmployee'));
  if (!employee) {
    showError('Please select an employee first');
    return;
  }

  try {
    const report = await fetchAPI(`/reports/employee/${employee.emp_id}`);
    generateEmployeeReport(report);
  } catch (error) {
    showError(error.message || 'Failed to generate report');
  }
}

function generateEmployeeReport(reportData) {
  let reportContent = `EMPLOYEE REPORT\n================\n\n`;
  reportContent += `Employee ID: ${reportData.emp_id}\n`;
  reportContent += `Name: ${reportData.name}\n`;
  reportContent += `Username: ${reportData.username}\n`;
  reportContent += `Department: ${reportData.department}\n`;
  reportContent += `Designation: ${reportData.designation}\n`;
  reportContent += `Status: ${reportData.status}\n\n`;

  reportContent += `ATTENDANCE SUMMARY\n------------------\n`;
  reportContent += `Total Records: ${reportData.attendance.total}\n`;
  reportContent += `Present Days: ${reportData.attendance.present}\n`;
  reportContent += `Absent Days: ${reportData.attendance.absent}\n`;
  reportContent += `Underground Days: ${reportData.attendance.underground}\n\n`;

  reportContent += `SHIFT SUMMARY\n-------------\n`;
  reportContent += `Total Shifts: ${reportData.shifts.total}\n`;
  reportContent += `Night Shifts: ${reportData.shifts.night}\n\n`;

  reportContent += `LEAVE SUMMARY\n-------------\n`;
  reportContent += `Total Leave Requests: ${reportData.leaves.total}\n`;
  reportContent += `Approved Leaves: ${reportData.leaves.approved}\n`;
  reportContent += `Pending Leaves: ${reportData.leaves.pending}\n`;

  const reportWindow = window.open('', '_blank');
  reportWindow.document.write(`<pre>${reportContent}</pre>`);
  reportWindow.document.close();
}

async function confirmDelete() {
  const employee = JSON.parse(sessionStorage.getItem('currentViewingEmployee'));
  if (!employee) {
    showError('No employee selected');
    return;
  }

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
            <li>All attendance records</li>
            <li>All leave requests</li>
            <li>All shift records</li>
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

  document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
    try {
      await deleteEmployeeData(employee.emp_id);
      document.querySelector('.confirmation-modal').remove();
    } catch (error) {
      showError(error.message || 'Failed to delete employee');
    }
  });

  document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
    document.querySelector('.confirmation-modal').remove();
  });
}

async function deleteEmployeeData(empId) {
  await fetchAPI(`/employees/${empId}`, 'DELETE');
  showSuccess(`Employee ID ${empId} deleted successfully`);

  // Clear UI
  document.getElementById('employeeDetailsSection').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('empIdSearch').value = '';

  // If admin deleted their own account
  const currentAdmin = JSON.parse(sessionStorage.getItem('currentAdmin'));
  if (currentAdmin && currentAdmin.emp_id === empId) {
    sessionStorage.clear();
    window.location.href = 'index.html';
  }
}