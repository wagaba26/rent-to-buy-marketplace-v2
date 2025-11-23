import { getDb } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    try {
        console.log('Running migration...');
        const db = getDb();
        const sqlPath = path.join(__dirname, 'migration-add-address-columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await db.query(sql);
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to run migration:', error);
        process.exit(1);
    }
}

main();
