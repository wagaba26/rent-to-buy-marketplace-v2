ALTER TABLE telematics_data ADD COLUMN IF NOT EXISTS weather_data JSONB;
ALTER TABLE telematics_data ADD COLUMN IF NOT EXISTS weather_risk_score INTEGER DEFAULT 0;
