-- Update admin@cityuniversitylibrary.com to have ADMIN role
-- This script updates the user role to ADMIN for the specified email

UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'admin@cityuniversitylibrary.com';

-- Verify the update
SELECT id, email, role, org_id, instance_id 
FROM users 
WHERE email = 'admin@cityuniversitylibrary.com';