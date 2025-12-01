// backend/db.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database file
const db = new Database(path.join(__dirname, 'predictions.db'));

// IMPORTANT: if you had an old schema, delete predictions.db once
// so this CREATE TABLE runs with the new columns.
db.exec(`
  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT (datetime('now')),
    session_id TEXT,

    -- Pima diabetes features
    pregnancies INTEGER,
    glucose REAL,
    blood_pressure REAL,
    skin_thickness REAL,
    insulin REAL,
    bmi REAL,
    diabetes_pedigree_function REAL,
    age REAL,

    probability REAL,
    predicted INTEGER
  );
`);

export default db;
