-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Department Configs Table
CREATE TABLE IF NOT EXISTS department_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dept_name TEXT NOT NULL,
    head_username TEXT NOT NULL,
    staffs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cars Table
CREATE TABLE IF NOT EXISTS cars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    car TEXT NOT NULL,
    driver TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vehicle Requests Table
CREATE TABLE IF NOT EXISTS vehicle_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_name TEXT NOT NULL,
    department TEXT NOT NULL,
    destination TEXT NOT NULL,
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    dept_status VARCHAR(50) DEFAULT 'Pending',
    admin_status VARCHAR(50) DEFAULT 'Pending',
    driver_status VARCHAR(50) DEFAULT 'Pending',
    assigned_driver TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Fuel & Maintenance Table
CREATE TABLE IF NOT EXISTS fuel_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver TEXT NOT NULL,
    car TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    value NUMERIC NOT NULL,
    note TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tech Support Table
CREATE TABLE IF NOT EXISTS tech_support (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_name TEXT NOT NULL,
    issue TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);