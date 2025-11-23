import { getDb } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    try {
        console.log('Running currency migration...');
        const db = getDb();
        const sqlPath = path.join(__dirname, 'migration-add-currency-columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await db.query(sql);
        console.log('Currency migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to run currency migration:', error);
        process.exit(1);
    }
}

main();
