-- PostgreSQL Index Creation Script for Gram Panchayat Management System
-- Run this script on your PostgreSQL database to optimize query execution speeds.

SET search_path TO public; -- or set to highfive if using custom schema

-- Foreign key indexes for rapid join queries
CREATE INDEX IF NOT EXISTS idx_citizens_panchayat_id ON Citizens(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_citizens_user_id ON Citizens(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_panchayat_id ON Employees(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_employees_citizen_id ON Employees(citizen_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON Employees(user_id);

-- Composite and single column indexes for frequent dashboard lookups
CREATE INDEX IF NOT EXISTS idx_certificate_citizen_status ON certificate(citizen_id, status);
CREATE INDEX IF NOT EXISTS idx_service_request_citizen_status ON Service_Request(citizen_id, status);
CREATE INDEX IF NOT EXISTS idx_welfare_citizen ON Citizen_welfare_Schema(citizen_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_citizen_date ON Tax_Payments(citizen_id, date_of_payment DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_date ON Announcements(date DESC);
CREATE INDEX IF NOT EXISTS idx_budget_revenue_panchayat ON Budget_Revenue(panchayat_id, revenue_date DESC);
CREATE INDEX IF NOT EXISTS idx_budget_expense_panchayat ON Budget_Expense(panchayat_id, expense_date DESC);
