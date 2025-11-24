-- Security Architecture & RBAC Migration
-- This migration adds retailer support, access codes, refresh tokens, MFA, and audit logging

-- ============================================================================
-- 1. RETAILERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  trading_license VARCHAR(255),
  trading_license_url TEXT,
  tax_id VARCHAR(100),
  business_type VARCHAR(100) NOT NULL CHECK (business_type IN ('sole_proprietor', 'partnership', 'corporation', 'llc', 'other')),
  business_address TEXT NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  encrypted_contact_phone VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'suspended')),
  approval_date TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  denial_reason TEXT,
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retailers_user_id ON retailers(user_id);
CREATE INDEX IF NOT EXISTS idx_retailers_status ON retailers(status);

-- ============================================================================
-- 2. RETAILER ACCESS CODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON retailer_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_retailer ON retailer_access_codes(retailer_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires ON retailer_access_codes(expires_at);

-- ============================================================================
-- 3. REFRESH TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(500) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  device_info JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================================
-- 4. MFA SECRETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mfa_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secret VARCHAR(255) NOT NULL,
  backup_codes TEXT[],
  enabled BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_secrets_user ON mfa_secrets(user_id);

-- ============================================================================
-- 5. AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- 6. CREDIT APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrawn')),
  credit_score_id UUID REFERENCES credit_scores(id),
  documents JSONB DEFAULT '[]',
  encrypted_documents JSONB DEFAULT '[]',
  income_verification TEXT,
  encrypted_income_verification VARCHAR(500),
  employment_status VARCHAR(50),
  monthly_income DECIMAL(12, 2),
  rejection_reason TEXT,
  approved_amount DECIMAL(12, 2),
  approved_terms JSONB,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_customer ON credit_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_applications_vehicle ON credit_applications(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_applications_retailer ON credit_applications(retailer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON credit_applications(status);

-- ============================================================================
-- 7. ADD RETAILER RELATIONSHIP TO VEHICLES
-- ============================================================================
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS retailer_id UUID REFERENCES retailers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_retailer ON vehicles(retailer_id);

-- ============================================================================
-- 8. UPDATE ROLE PERMISSIONS FOR RETAILER ROLE
-- ============================================================================

-- Remove old agent permissions (will be replaced with retailer)
DELETE FROM role_permissions WHERE role = 'agent';

-- Add retailer permissions
INSERT INTO role_permissions (role, permission) VALUES
  -- Retailer: Own Profile Management
  ('retailer', 'view_own_profile'),
  ('retailer', 'update_own_profile'),
  
  -- Retailer: Vehicle Management (own vehicles only)
  ('retailer', 'create_vehicle'),
  ('retailer', 'view_own_vehicles'),
  ('retailer', 'update_own_vehicles'),
  ('retailer', 'delete_own_vehicles'),
  
  -- Retailer: Application Management (for own vehicles)
  ('retailer', 'view_own_applications'),
  ('retailer', 'view_application_summary'),
  
  -- Retailer: Limited Customer Info
  ('retailer', 'view_applicant_basic_info'),
  
  -- Customer: Existing + New Permissions
  ('customer', 'view_vehicles'),
  ('customer', 'apply_for_vehicle'),
  ('customer', 'view_own_applications'),
  ('customer', 'upload_documents'),
  ('customer', 'track_application_status'),
  
  -- Admin: Full Access
  ('admin', 'manage_retailers'),
  ('admin', 'approve_retailers'),
  ('admin', 'generate_access_codes'),
  ('admin', 'view_all_applications'),
  ('admin', 'update_application_status'),
  ('admin', 'view_audit_logs'),
  ('admin', 'manage_all_vehicles'),
  ('admin', 'view_all_users')
ON CONFLICT (role, permission) DO NOTHING;

-- ============================================================================
-- 9. MIGRATE EXISTING AGENT USERS TO RETAILER ROLE
-- ============================================================================

-- Update users table to change 'agent' role to 'retailer'
UPDATE users SET role = 'retailer' WHERE role = 'agent';

-- Create retailer profiles for existing agent users
INSERT INTO retailers (user_id, business_name, business_type, business_address, contact_person, status)
SELECT 
  id,
  COALESCE(first_name || ' ' || last_name, email) || ' Business',
  'sole_proprietor',
  'Address to be updated',
  COALESCE(first_name || ' ' || last_name, email),
  'approved'
FROM users 
WHERE role = 'retailer' 
  AND id NOT IN (SELECT user_id FROM retailers WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 10. ADD ENCRYPTED FIELDS TO EXISTING TABLES
-- ============================================================================

-- Add encrypted NIN field to users if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS nin VARCHAR(50),
ADD COLUMN IF NOT EXISTS encrypted_nin VARCHAR(500);

-- Add encrypted fields to kyc_verifications if not exists
ALTER TABLE kyc_verifications
ADD COLUMN IF NOT EXISTS encrypted_document_url VARCHAR(500);

-- ============================================================================
-- 11. CREATE FUNCTION TO AUTO-UPDATE updated_at TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_retailers_updated_at ON retailers;
CREATE TRIGGER update_retailers_updated_at
  BEFORE UPDATE ON retailers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mfa_secrets_updated_at ON mfa_secrets;
CREATE TRIGGER update_mfa_secrets_updated_at
  BEFORE UPDATE ON mfa_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_applications_updated_at ON credit_applications;
CREATE TRIGGER update_credit_applications_updated_at
  BEFORE UPDATE ON credit_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. CREATE VIEW FOR RETAILER DASHBOARD
-- ============================================================================

CREATE OR REPLACE VIEW retailer_dashboard_stats AS
SELECT 
  r.id AS retailer_id,
  r.business_name,
  COUNT(DISTINCT v.id) AS total_vehicles,
  COUNT(DISTINCT CASE WHEN v.status = 'available' THEN v.id END) AS available_vehicles,
  COUNT(DISTINCT ca.id) AS total_applications,
  COUNT(DISTINCT CASE WHEN ca.status = 'pending' THEN ca.id END) AS pending_applications,
  COUNT(DISTINCT CASE WHEN ca.status = 'approved' THEN ca.id END) AS approved_applications
FROM retailers r
LEFT JOIN vehicles v ON v.retailer_id = r.id
LEFT JOIN credit_applications ca ON ca.retailer_id = r.id
GROUP BY r.id, r.business_name;

-- ============================================================================
-- 13. CLEANUP AND OPTIMIZATION
-- ============================================================================

-- Vacuum analyze to update statistics
-- Vacuum analyze to update statistics
-- VACUUM ANALYZE retailers;
-- VACUUM ANALYZE retailer_access_codes;
-- VACUUM ANALYZE refresh_tokens;
-- VACUUM ANALYZE mfa_secrets;
-- VACUUM ANALYZE audit_logs;
-- VACUUM ANALYZE credit_applications;
-- VACUUM ANALYZE vehicles;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'New tables created: retailers, retailer_access_codes, refresh_tokens, mfa_secrets, audit_logs, credit_applications';
  RAISE NOTICE 'Vehicles table updated with retailer_id column';
  RAISE NOTICE 'Role permissions updated for retailer role';
  RAISE NOTICE 'Existing agent users migrated to retailer role';
END $$;
