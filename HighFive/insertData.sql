INSERT INTO Users
    (password_hash, email, user_type, status, created_at)
VALUES
    ('eeac43ccab0d7a588d758fb72fd2811e7c29f03f1d4c834e2e5b67058506bdd4', 'admin@gmail.com', 'Admin', 'Active', NOW());

INSERT INTO Address
    (block_name, district_name, state_name, pin_code, country)
VALUES
    ('Jawahar Block', 'Palghar', 'Maharashtra', '401603', 'India'),
    ('Vikramgad Block', 'Thane', 'Maharashtra', '401605', 'India'),
    ('Shahuwadi Block', 'Kolhapur', 'Maharashtra', '416213', 'India'),
    ('Patan Block', 'Satara', 'Maharashtra', '415206', 'India'),
    ('Maval Block', 'Pune', 'Maharashtra', '410506', 'India');

INSERT INTO Panchayats
    (panchayat_name, establishment_date, area_sq_km, contact_email, contact_phone, address_id)
VALUES
    ('Gram Panchayat Dongare', '2000-03-15', 25.7, 'dongare.gp@example.com', '9876543210', 1),
    ('Gram Panchayat Kalamb', '1998-07-22', 18.3, 'kalamb.panchayat@example.com', '8765432109', 2),
    ('Gram Panchayat Vadgaon', '2001-11-10', 32.5, 'vadgaon.gp@example.com', '7654321098', 3),
    ('Gram Panchayat Shirol', '1999-05-08', 27.8, 'shirol.panchayat@example.com', '6543210987', 4),
    ('Gram Panchayat Khed', '2002-09-30', 21.4, 'khed.gp@example.com', '5432109876', 5);

-- insert Admin citizen profile and citizen profiles for each panchayat
INSERT INTO Citizens
    (user_id, panchayat_id, first_name, last_name, gender, dob, educational_qualification, occupation, annual_income, tax_due_amount, marital_status, phone_number, email)
VALUES
    (1, 1, 'Panchayat', 'Admin', 'Other', '1990-01-01', 'Graduate', 'Employed', 0, 0, 'Un_married', '0000000000', 'admin@gmail.com'),
    (NULL, 1, 'Manish', 'Kumar', 'Male', '2003-09-23', 'Graduate', 'Employed', 500000, 1000, 'Un_married', '9876543210', 'manish2003@gmail.com'),
    (NULL, 2, 'Rahul', 'Kumar', 'Male', '2003-07-14', 'Higher Secondary', 'Student', 0, 0, 'Un_married', '6352417856', 'rahul2004@gmail.com'),
    (NULL, 2, 'Priya', 'Sharma', 'Female', '2002-05-19', 'Post Graduate', 'Employed', 600000, 1500, 'Married', '7896541230', 'priya2002@gmail.com'),
    (NULL, 3, 'Anjali', 'Verma', 'Female', '2001-11-30', 'Graduate', 'Unemployed', 0, 0, 'Un_married', '9871234560', 'anjali2001@gmail.com'),
    (NULL, 2, 'Rohit', 'Singh', 'Male', '2000-03-25', 'Secondary', 'Business', 300000, 500, 'Married', '7894561230', 'rohit2000@gmail.com');

INSERT INTO Households
    (household_id,citizen_id, details)
VALUES
    (101, 3, 'Sethi Nivas'),
    (102, 3, 'Gupta House'),
    (103, 4, 'Sharma House'),
    (104, 5, 'Verma House'),
    (104, 6, 'Singh House');
-- manish, rahul, priya, anjali, rohit as password

INSERT INTO Users
    (password_hash, email, user_type, status, created_at)
values
    ('a79fd720a40343cbfa6c1c1a2a12564326127aebcd8f21c6490102054e388a5c', 'manish2003@gmail.com', 'Employee', 'Active', NOW()),
    ('9134bf18ecad4889c3e7814e82e4ec775e7774a30142228b4a33e11e311de59a', 'rahul2004@gmail.com', 'Employee', 'Active', NOW()),
    ('1ca2560f3a75be8235861a3d4e8af3cffa36399b6be0b61464f84fc2b23ce3c0', 'priya2002@gmail.com', 'Employee', 'Active', NOW()),
    ('0e7ab176f31a5dee90e75a94c934db17b8d45ad0008d79aac72d59de292a1ccb', 'anjali2001@gmail.com', 'Citizen', 'Active', NOW()),
    ('26e0e25301d6c453d6d74d04545d956e22e62958be0d4166e05c1e4e26b79a7e', 'rohit2000@gmail.com', 'Employee', 'Active', NOW());

update Citizens set user_id = 2 where email = 'manish2003@gmail.com';
update Citizens set user_id = 3 where email = 'rahul2004@gmail.com';
update Citizens set user_id = 4 where email = 'priya2002@gmail.com';
update Citizens set user_id = 5 where email = 'anjali2001@gmail.com';
update Citizens set user_id = 6 where email = 'rohit2000@gmail.com';

INSERT INTO Employees
    (user_id, panchayat_id, citizen_id, designation, join_date, end_date, department, employment_type, salary)
VALUES
    (1, 1, 1, 'Panchayat Admin', '2020-01-01', '2099-12-31', 'Certificate', 'Permanent', 0),
    (1, 1, 1, 'Panchayat Admin', '2020-01-01', '2099-12-31', 'Patwari', 'Permanent', 0),
    (1, 1, 1, 'Panchayat Admin', '2020-01-01', '2099-12-31', 'Budget', 'Permanent', 0),
    (1, 1, 1, 'Panchayat Admin', '2020-01-01', '2099-12-31', 'Service', 'Permanent', 0),
    (1, 1, 1, 'Panchayat Admin', '2020-01-01', '2099-12-31', 'Tax', 'Permanent', 0),
    (2, 1, 2, 'Officer', '2021-01-01', '2022-01-01', 'Patwari', 'Contract', 20000),
    (3, 2, 3, 'Officer', '2021-01-01', '2022-01-01', 'Certificate', 'Contract', 25000),
    (4, 3, 4, 'Officer', '2021-01-01', '2022-01-01', 'Budget', 'Permanent', 30000),
    (6, 2, 6, 'Officer', '2021-01-01', '2022-01-01', 'Tax', 'Contract', 25000);

-- Inserting data into the Announcements table
INSERT INTO Announcements
    (heading, detail,date)
VALUES
    ('Health camp', 'Health camp will be organized on 15th August 2021', '2021-08-15'),
    ('Vaccination Drive', 'A COVID-19 and general vaccination camp is scheduled on 15 Mar 2025.', '2025-03-01'),
    ('Water Maintenance', 'Water supply will be interrupted on 05 Mar 2025 due to maintenance work.', '2025-02-25'),
    ('Gram Sabha Meeting', 'Annual Gram Sabha meeting will be held on March 20, 2025 at the Panchayat Hall.', '2025-02-28'),
    ('Agriculture Subsidy', 'New agricultural subsidies announced for farmers. Apply before April 15, 2025.', '2025-02-20'),
    ('Road Construction', 'Main village road will be under construction from March 10-15, 2025. Please use alternate routes.', '2025-02-15');

insert into Service
    (type, description)
values
    ('Water', 'Water supply service'),
    ('Electricity', 'Electricity supply service'),
    ('Sewage', 'Sewage maintenance service');

-- Insert welfare schemes into schema_type table
INSERT INTO schema_type
    (type, description)
VALUES
    ('PM-KISAN', 'Income support for farmer families'),
    ('Other', 'Additional government welfare schemes for eligible citizens');

-- Inserting data into Budget_Revenue
INSERT INTO Budget_Revenue
    (panchayat_id,amount,revenue_date,description)
VALUES
    (1, 100000, '2025-01-01', 'Property Tax'),
    (2, 200000, '2025-01-01', 'Building Permission'),
    (3, 300000, '2025-01-01', 'Property Tax'),
    (4, 400000, '2025-01-01', 'Property Tax'),
    (5, 500000, '2025-01-01', 'SPONSORSHIP');

-- Inserting data into Budget_Expense
INSERT INTO Budget_Expense
    (panchayat_id,amount,expense_date,description)
VALUES
    (1, 50000, '2025-01-01', 'Road Construction'),
    (2, 10000, '2025-01-01', 'Water Supply'),
    (3, 50000, '2025-01-01', 'Electricity Supply'),
    (4, 60000, '2025-01-01', 'Sewage Maintenance'),
    (5, 80000, '2025-01-01', 'Health Camp'),
    (5, 9000, '2025-01-01', 'Water Supply'),
    (1, 10000, '2025-01-01', 'Electricity Supply'),
    (2, 20000, '2025-01-01', 'Sewage Maintenance');

INSERT INTO Users
    (password_hash, email, user_type, status, created_at)
VALUES
    ('cc641471a32e2e5d5f49c1f8b1051c6c5b71d971a97541dcec4e377aa357f30d', 'gov1@gmail.com', 'Monitor', 'Active', NOW());

INSERT INTO Environmental_Initiatives
    (panchayat_id, name, start_date, area_covered, type, status, description)
VALUES
    (1, 'Solar Panel Installation', '2025-03-10', 0.5, 'Renewable Energy', 'Ongoing', 'Installation of solar panels on the community center roof.'),
    (1, 'Waste Recycling Initiative', '2025-06-01', 0.0, 'Waste Management', 'Planning', 'Setting up recycling units to process municipal waste.');



INSERT INTO Irrigation_Systems
    (panchayat_id, name, location, coverage, water_source, status, description, added_date)
VALUES
    (1, 'Drip Irrigation System', 'North Field', 100.0, 'Borewell', 'Operational', 'Efficient drip irrigation system covering major farmland areas.', '2025-04-01'),
    (1, 'Canal Renovation', 'East Zone', 250.0, 'River', 'In Progress', 'Renovation of the existing canal to improve water distribution.', '2025-04-05');


INSERT INTO Citizen_Lands
    (land_id, citizen_id, area, type, crop_type)
VALUES
    (101, 1, 4.5, 'Agricultural', 'Wheat, Rice'),
    (102, 2, 2.8, 'Residential', 'Not Specified'),
    (103, 3, 3.7, 'Agricultural', 'Cotton, Maize');
 
 INSERT INTO Certificate_Type (type, description) 
VALUES 
    ('Birth', 'Official document certifying the date and place of birth'),
    ('Income', 'Official proof of income for various government schemes'),
    ('Aadhar', 'National identity document with unique identification number'),
    ('Voter', 'Official voter identification card'),
    ('BPL', 'Below Poverty Line certification for welfare programs')
ON CONFLICT (type) DO NOTHING;