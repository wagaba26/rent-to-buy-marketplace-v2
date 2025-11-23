#!/usr/bin/env node
/**
 * Database Seeder - Creates test data for development
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rent_to_own',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function seedDatabase() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // Create admin user
        console.log('Creating admin user...');
        const adminPassword = await bcrypt.hash('Admin123!', 10);

        const adminResult = await pool.query(
            `INSERT INTO users (email, password_hash, role, status, first_name, last_name)
       VALUES ($1, $2, 'admin', 'active', 'System', 'Administrator')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id, email`,
            ['admin@rentobuy.com', adminPassword]
        );
        console.log(`✅ Admin user: ${adminResult.rows[0].email}`);

        // Create test customer
        console.log('\nCreating test customer...');
        const customerPassword = await bcrypt.hash('Customer123!', 10);

        const customerResult = await pool.query(
            `INSERT INTO users (email, password_hash, role, status, first_name, last_name, phone_number)
       VALUES ($1, $2, 'customer', 'active', 'John', 'Doe', '+1234567890')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id, email`,
            ['customer@example.com', customerPassword]
        );
        console.log(`✅ Customer user: ${customerResult.rows[0].email}`);

        // Create test retailer user
        console.log('\nCreating test retailer...');
        const retailerPassword = await bcrypt.hash('Retailer123!', 10);

        const retailerUserResult = await pool.query(
            `INSERT INTO users (email, password_hash, role, status, first_name, last_name, phone_number)
       VALUES ($1, $2, 'retailer', 'active', 'Premium', 'Auto Sales', '+1987654321')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id, email`,
            ['retailer@example.com', retailerPassword]
        );

        // Create retailer profile
        const retailerProfileResult = await pool.query(
            `INSERT INTO retailers (
        user_id, business_name, trading_license, tax_id, business_type,
        business_address, contact_person, contact_phone, status, approved_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9)
      ON CONFLICT (user_id) DO UPDATE SET status = 'approved'
      RETURNING id, business_name`,
            [
                retailerUserResult.rows[0].id,
                'Premium Auto Sales',
                'TL123456',
                'TAX789012',
                'corporation',
                '123 Main Street, City, Country',
                'Premium Auto Sales',
                '+1987654321',
                adminResult.rows[0].id
            ]
        );
        console.log(`✅ Retailer: ${retailerProfileResult.rows[0].business_name}`);

        // Generate access code for retailer
        const accessCode = 'TEST1234ABCD5678';
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await pool.query(
            `INSERT INTO retailer_access_codes (code, retailer_id, generated_by, expires_at, is_used)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (code) DO NOTHING`,
            [accessCode, retailerProfileResult.rows[0].id, adminResult.rows[0].id, expiresAt]
        );
        console.log(`✅ Access code generated: ${accessCode}`);

        // Create test vehicles
        console.log('\nCreating test vehicles...');
        const vehicles = [
            {
                make: 'Toyota',
                model: 'Camry',
                year: 2023,
                type: 'car',
                price: 25000,
                deposit: 5000,
                monthly: 500,
            },
            {
                make: 'Honda',
                model: 'Civic',
                year: 2022,
                type: 'car',
                price: 22000,
                deposit: 4500,
                monthly: 450,
            },
            {
                make: 'Ford',
                model: 'F-150',
                year: 2023,
                type: 'truck',
                price: 35000,
                deposit: 7000,
                monthly: 700,
            },
        ];

        for (const vehicle of vehicles) {
            await pool.query(
                `INSERT INTO vehicles (
          make, model, year, vehicle_type, price, deposit_amount,
          monthly_payment, payment_frequency, payment_term_months,
          retailer_id, status, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'monthly', 36, $8, 'available', $9)
        ON CONFLICT DO NOTHING`,
                [
                    vehicle.make,
                    vehicle.model,
                    vehicle.year,
                    vehicle.type,
                    vehicle.price,
                    vehicle.deposit,
                    vehicle.monthly,
                    retailerProfileResult.rows[0].id,
                    `${vehicle.year} ${vehicle.make} ${vehicle.model} in excellent condition`,
                ]
            );
            console.log(`✅ Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Database seeding completed successfully!');
        console.log('='.repeat(60));
        console.log('\n📋 Test Credentials:\n');
        console.log('Admin:');
        console.log('  Email: admin@rentobuy.com');
        console.log('  Password: Admin123!\n');
        console.log('Customer:');
        console.log('  Email: customer@example.com');
        console.log('  Password: Customer123!\n');
        console.log('Retailer:');
        console.log('  Email: retailer@example.com');
        console.log('  Password: Retailer123!');
        console.log(`  Access Code: ${accessCode}\n`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seedDatabase();
