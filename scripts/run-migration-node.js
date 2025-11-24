const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'rent_to_own',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
        console.log('🔄 Connecting to database...');
        const client = await pool.connect();

        console.log('📖 Reading migration file...');
        const migrationPath = path.join(__dirname, 'migration-security-rbac.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Running migration...');
        await client.query(migrationSQL);

        console.log('✅ Migration completed successfully!');

        client.release();
        await pool.end();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
