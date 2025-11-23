import { getDb } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    try {
        console.log('Running weather migration...');
        const db = getDb();
        const sqlPath = path.join(__dirname, 'migration-add-weather-columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await db.query(sql);
        console.log('Weather migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to run weather migration:', error);
        process.exit(1);
    }
}

main();
