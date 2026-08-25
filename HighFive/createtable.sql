CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL DEFAULT '1b0ce6ad7d50c0352b9e0e825567faca9208ec3e00298eae502532c1cfeb6b74',
    email VARCHAR(255) NOT NULL UNIQUE,
    user_type VARCHAR(30)  NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    check (user_type IN ('Admin', 'Citizen', 'Employee', 'Monitor')),
    check (status IN ('Active', 'Inactive'))
);

CREATE TABLE IF NOT EXISTS Address (
    address_id SERIAL PRIMARY KEY,
    block_name VARCHAR(255) NOT NULL DEFAULT 'Not Specified',
    district_name VARCHAR(255) NOT NULL DEFAULT 'Not Specified',
    state_name VARCHAR(255) NOT NULL DEFAULT 'Not Specified',
    pin_code VARCHAR(10) NOT NULL DEFAULT '------',
    country VARCHAR(255) NOT NULL DEFAULT 'India'
);

-- 2. Panchayats
CREATE TABLE IF NOT EXISTS Panchayats (
    panchayat_id SERIAL PRIMARY KEY,
    panchayat_name VARCHAR(255) NOT NULL DEFAULT 'Not Specified',
    establishment_date DATE DEFAULT '1999-01-01',
    area_sq_km FLOAT DEFAULT 0,
    contact_email VARCHAR(255) DEFAULT 'NotSpecified@gmail.com',
    contact_phone VARCHAR(15) DEFAULT '----------',
    address_id INT NOT NULL,
    FOREIGN KEY (address_id) REFERENCES Address(address_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Citizens
CREATE TABLE IF NOT EXISTS Citizens (
    citizen_id SERIAL PRIMARY KEY,
    user_id INT,
    panchayat_id INT,
    first_name VARCHAR(255) NOT NULL DEFAULT 'Not Specified',
    last_name VARCHAR(255) NOT NULL DEFAULT 'Not Specified',
    gender VARCHAR(10) NOT NULL DEFAULT 'Not Specified',
    dob DATE NOT NULL DEFAULT '1999-01-01',
    educational_qualification VARCHAR(255) DEFAULT 'Illiterate',
    occupation VARCHAR(255) DEFAULT 'Unemployed',
    annual_income FLOAT DEFAULT 0,
    tax_due_amount FLOAT DEFAULT 0,
    marital_status VARCHAR(255) DEFAULT 'Un_married',
    phone_number VARCHAR(15) NOT NULL DEFAULT '----------',
    email VARCHAR(255) NOT NULL UNIQUE,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (panchayat_id) REFERENCES Panchayats(panchayat_id) ON DELETE CASCADE ON UPDATE CASCADE,

    check (educational_qualification IN ('Illiterate', 'Primary', 'Secondary', 'Higher Secondary', 'Graduate', 'Post Graduate')),
    check (occupation IN ('Student', 'Employed', 'Unemployed', 'Retired', 'Farmer', 'Business', 'Other')),
    check (marital_status IN ('Un_married', 'Married', 'Widowed', 'Divorced')),
    check (gender IN ('Male', 'Female', 'Other','Not Specified')),
    check (annual_income >= 0)
);


CREATE TABLE IF NOT EXISTS Households (
    household_id INT,
    citizen_id INT,
    details VARCHAR(255)  DEFAULT 'Not Specified',
    FOREIGN KEY (citizen_id) REFERENCES Citizens(citizen_id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (household_id, citizen_id)
);


CREATE TABLE IF NOT EXISTS Employees (
    employee_id SERIAL PRIMARY KEY,
    user_id INT,
    panchayat_id INT,
    citizen_id INT,
    designation VARCHAR(255) NOT NULL DEFAULT 'Not Specified',
    join_date DATE NOT NULL DEFAULT '1999-01-01',
    end_date DATE NOT NULL DEFAULT '1999-12-31',
    department VARCHAR(255) NOT NULL DEFAULT 'Certificate',
    employment_type VARCHAR(255) NOT NULL DEFAULT 'Contract',
    salary FLOAT NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (panchayat_id) REFERENCES Panchayats(panchayat_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (citizen_id) REFERENCES Citizens(citizen_id) ON DELETE CASCADE ON UPDATE CASCADE,
    check (employment_type IN ('Permanent', 'Contract')),
    check (salary >= 0),
    check (join_date <= end_date),
    check (department IN ('Certificate', 'Patwari','Budget' ,'Service','Tax'))
);

CREATE TABLE IF NOT EXISTS certificate (
    certificate_id SERIAL PRIMARY KEY,
    citizen_id INT,
    application_date DATE NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    type VARCHAR(50) NOT NULL,
    description TEXT,
    document_path VARCHAR(255),
    CHECK (type IN ('Income', 'Birth', 'Aadhar', 'Voter', 'BPL')),
    FOREIGN KEY (citizen_id) REFERENCES Citizens(citizen_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);
CREATE TABLE IF NOT EXISTS Certificate_Type (
    type_id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- creating the table for the welfare schema 
CREATE TABLE IF NOT EXISTS schema_type (
    schema_id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    description TEXT
);

-- a table that combines the citizen and the welfare schema
CREATE TABLE IF NOT EXISTS Citizen_welfare_Schema (
    enrollment_id SERIAL PRIMARY KEY,
    citizen_id INT,
    schema_id INT,
    joining_date DATE NOT NULL DEFAULT NOW(),
    request_date DATE NOT NULL DEFAULT NOW(),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    document_path VARCHAR(255),
    FOREIGN KEY (citizen_id) REFERENCES Citizens(citizen_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (schema_id) REFERENCES schema_type(schema_id) ON DELETE CASCADE ON UPDATE CASCADE,
    check (status IN ('Pending', 'In Progress', 'Enrolled', 'Rejected'))
);

-- tax transaction payment
CREATE TABLE IF NOT EXISTS Tax_Payments (
    citizen_id INT,
    tax_payment_id SERIAL Primary Key,
    amount FLOAT NOT NULL,
    date_of_payment DATE NOT NULL,
    mode_of_payment VARCHAR(50) NOT NULL DEFAULT 'Cash',
    FOREIGN KEY (citizen_id) REFERENCES Citizens(citizen_id) ON DELETE CASCADE ON UPDATE CASCADE,
    check (mode_of_payment IN ('Cash', 'Online', 'Cheque'))
);

-- land record
CREATE TABLE IF NOT EXISTS Citizen_Lands (
    land_id INT,
    citizen_id INT,
    area FLOAT NOT NULL,
    type VARCHAR(50) NOT NULL,
    crop_type TEXT NOT NULL DEFAULT 'Not Specified',
    PRIMARY KEY (land_id),
    FOREIGN KEY (citizen_id) REFERENCES Citizens(citizen_id) ON DELETE CASCADE ON UPDATE CASCADE,
    check (type IN ('Agricultural', 'Residential', 'Commercial'))
);

-- assets table 
CREATE TABLE IF NOT EXISTS Assets (
    asset_id INT PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    installation_date DATE NOT NULL,
    panchayat_id INT,
    FOREIGN KEY (panchayat_id) REFERENCES Panchayats(panchayat_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- services table 
CREATE TABLE IF NOT EXISTS Service (
    service_id SERIAL PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    description TEXT
);

-- service request table
CREATE TABLE IF NOT EXISTS Service_Request (
    request_id SERIAL PRIMARY KEY,
    citizen_id INT,
    service_id INT,
    request_date DATE NOT NULL DEFAULT NOW(),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    document_path VARCHAR(255),
    FOREIGN KEY (citizen_id) REFERENCES Citizens(citizen_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (service_id) REFERENCES Service(service_id) ON DELETE CASCADE ON UPDATE CASCADE,
    check (status IN ('Pending', 'In Progress', 'Resolved', 'Rejected'))
);

CREATE TABLE IF NOT EXISTS Announcements (
    announcement_id SERIAL PRIMARY KEY,
    heading VARCHAR(255) NOT NULL,
    detail TEXT NOT NULL,
    date DATE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Budget_Expense(
    expense_id SERIAL PRIMARY KEY,
    panchayat_id INT,
    amount FLOAT NOT NULL,
    expense_date DATE NOT NULL DEFAULT NOW(),
    description TEXT,
    FOREIGN KEY (panchayat_id) REFERENCES Panchayats(panchayat_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Budget_Revenue(
    revenue_id SERIAL PRIMARY KEY,
    panchayat_id INT,
    amount FLOAT NOT NULL,
    revenue_date DATE NOT NULL DEFAULT NOW(),
    description TEXT,
    FOREIGN KEY (panchayat_id) REFERENCES Panchayats(panchayat_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Environmental_Initiatives (
    initiative_id SERIAL PRIMARY KEY,
    panchayat_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE DEFAULT NOW(),
    area_covered FLOAT NOT NULL,
    type VARCHAR(100) NOT NULL,  -- e.g., 'Afforestation', 'Waste Management', etc.
    status VARCHAR(50) DEFAULT 'Pending',
    description TEXT,
    FOREIGN KEY (panchayat_id) REFERENCES Panchayats(panchayat_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Irrigation_Systems (
    system_id SERIAL PRIMARY KEY,
    panchayat_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    coverage FLOAT NOT NULL,
    water_source VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Planning',
    description TEXT,
    added_date DATE DEFAULT NOW(),
    FOREIGN KEY (panchayat_id) REFERENCES Panchayats(panchayat_id) ON DELETE CASCADE
);

ALTER TABLE certificate DROP CONSTRAINT IF EXISTS certificate_type_check;


ALTER TABLE certificate 
ADD COLUMN IF NOT EXISTS type_id INT,
ADD CONSTRAINT fk_certificate_type FOREIGN KEY (type_id) REFERENCES Certificate_Type(type_id);