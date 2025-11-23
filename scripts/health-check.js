#!/usr/bin/env node
/**
 * Health Check Script
 * Verifies all services and dependencies are running correctly
 */

const http = require('http');
const { Pool } = require('pg');

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
};

async function checkDatabase() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'rent_to_own',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
        const result = await pool.query('SELECT NOW()');
        await pool.end();
        return { status: 'healthy', message: 'Database connection successful', time: result.rows[0].now };
    } catch (error) {
        return { status: 'unhealthy', message: error.message };
    }
}

async function checkAPI() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 4007,
            path: '/api/health',
            method: 'GET',
            timeout: 5000,
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({ status: 'healthy', message: 'API is responding', statusCode: res.statusCode });
                } else {
                    resolve({ status: 'unhealthy', message: `API returned ${res.statusCode}`, statusCode: res.statusCode });
                }
            });
        });

        req.on('error', (error) => {
            resolve({ status: 'unhealthy', message: error.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'unhealthy', message: 'Request timeout' });
        });

        req.end();
    });
}

async function checkTables() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'rent_to_own',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    const requiredTables = [
        'users',
        'retailers',
        'retailer_access_codes',
        'refresh_tokens',
        'mfa_secrets',
        'audit_logs',
        'credit_applications',
        'vehicles',
    ];

    try {
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

        const existingTables = result.rows.map((row) => row.table_name);
        const missingTables = requiredTables.filter((table) => !existingTables.includes(table));

        await pool.end();

        if (missingTables.length === 0) {
            return { status: 'healthy', message: 'All required tables exist', tables: existingTables.length };
        } else {
            return { status: 'unhealthy', message: `Missing tables: ${missingTables.join(', ')}` };
        }
    } catch (error) {
        return { status: 'unhealthy', message: error.message };
    }
}

async function runHealthCheck() {
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}🏥 Health Check - Rent-to-Buy Car Marketplace${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

    const checks = [
        { name: 'Database Connection', fn: checkDatabase },
        { name: 'Database Tables', fn: checkTables },
        { name: 'API Server', fn: checkAPI },
    ];

    let allHealthy = true;

    for (const check of checks) {
        process.stdout.write(`Checking ${check.name}... `);
        const result = await check.fn();

        if (result.status === 'healthy') {
            console.log(`${colors.green}✅ ${result.message}${colors.reset}`);
        } else {
            console.log(`${colors.red}❌ ${result.message}${colors.reset}`);
            allHealthy = false;
        }
    }

    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    if (allHealthy) {
        console.log(`${colors.green}✅ All systems healthy!${colors.reset}`);
        process.exit(0);
    } else {
        console.log(`${colors.red}❌ Some systems are unhealthy${colors.reset}`);
        console.log(`${colors.yellow}Run 'npm run setup' to fix issues${colors.reset}`);
        process.exit(1);
    }
}

runHealthCheck();
