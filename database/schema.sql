-- Run in MySQL as root or your DB user
-- Step 1: Create database
CREATE DATABASE IF NOT EXISTS attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attendance_db;

-- Step 2: Create tables
CREATE TABLE IF NOT EXISTS employee (
    emp_id       INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) UNIQUE NOT NULL,
    phone_no     VARCHAR(20),
    department   VARCHAR(100),
    designation  VARCHAR(100),
    joining_date DATE,
    status       VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS employee_login (
    login_id  INT AUTO_INCREMENT PRIMARY KEY,
    emp_id    INT NOT NULL,
    username  VARCHAR(100) UNIQUE NOT NULL,
    password  VARCHAR(255) NOT NULL,
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id)
);

CREATE TABLE IF NOT EXISTS admin (
    admin_id  INT AUTO_INCREMENT PRIMARY KEY,
    username  VARCHAR(100) UNIQUE NOT NULL,
    password  VARCHAR(255) NOT NULL,
    role      VARCHAR(50) DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id        INT NOT NULL,
    date_col      DATE NOT NULL,
    check_in      VARCHAR(10),
    check_out     VARCHAR(10),
    status        VARCHAR(20) DEFAULT 'Present',
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id)
);

CREATE TABLE IF NOT EXISTS shift (
    shift_id    INT AUTO_INCREMENT PRIMARY KEY,
    emp_id      INT NOT NULL,
    shift_type  VARCHAR(50),
    shift_date  DATE NOT NULL,
    start_time  VARCHAR(10),
    end_time    VARCHAR(10),
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id)
);

CREATE TABLE IF NOT EXISTS leave_request (
    leave_id    INT AUTO_INCREMENT PRIMARY KEY,
    emp_id      INT NOT NULL,
    leave_type  VARCHAR(50) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    reason      VARCHAR(500),
    status      VARCHAR(20) DEFAULT 'Pending',
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id)
);

-- Step 3: Seed default admin (username: admin, password: Admin@123)
INSERT INTO admin (username, password, role)
VALUES ('admin', '$2b$10$sjesbsIYIfNBORmk3rS7/OjbdKyds0atLkiiUek1qwatAXT6slw6K', 'admin')
ON DUPLICATE KEY UPDATE username = username;
