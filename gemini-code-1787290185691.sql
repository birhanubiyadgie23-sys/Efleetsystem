-- 1. Users / Profiles Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    username TEXT,
    role TEXT CHECK (role IN ('staff', 'dept', 'driver', 'admin')) DEFAULT 'staff',
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Vehicle Requests Table
CREATE TABLE IF NOT EXISTS public.vehicle_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_name TEXT NOT NULL,
    department TEXT NOT NULL,
    destination TEXT NOT NULL,
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    dept_status TEXT DEFAULT 'Pending',
    admin_status TEXT DEFAULT 'Pending',
    driver_status TEXT DEFAULT 'Pending',
    assigned_driver TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Department Configs Table
CREATE TABLE IF NOT EXISTS public.department_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dept_name TEXT NOT NULL,
    head_username TEXT NOT NULL,
    staffs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Cars Table
CREATE TABLE IF NOT EXISTS public.cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car TEXT NOT NULL,
    driver TEXT NOT NULL,
    status TEXT CHECK (status IN ('Active', 'Garage')) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Fuel & Maintenance Table
CREATE TABLE IF NOT EXISTS public.fuel_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver TEXT NOT NULL,
    car TEXT NOT NULL,
    type TEXT CHECK (type IN ('Fuel', 'Maintenance')) NOT NULL,
    value TEXT NOT NULL,
    note TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tech Support Table
CREATE TABLE IF NOT EXISTS public.tech_support (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    issue TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Public Access Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_support ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Public Access for Users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Public Access for Vehicle Requests" ON public.vehicle_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Public Access for Departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Public Access for Department Configs" ON public.department_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Public Access for Cars" ON public.cars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Public Access for Fuel Maintenance" ON public.fuel_maintenance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Public Access for Tech Support" ON public.tech_support FOR ALL USING (true) WITH CHECK (true);