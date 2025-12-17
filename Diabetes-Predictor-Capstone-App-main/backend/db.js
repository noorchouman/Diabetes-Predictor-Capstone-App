import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'predictions.db'));

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT (datetime('now')),
    session_id TEXT,
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

// Add session_id column if it doesn't exist (for existing databases)
try {
  const tableInfo = db.prepare("PRAGMA table_info(predictions)").all();
  const hasSessionId = tableInfo.some(col => col.name === 'session_id');
  
  if (!hasSessionId) {
    db.exec(`ALTER TABLE predictions ADD COLUMN session_id TEXT;`);
    console.log('Added session_id column to predictions table');
  }
} catch (e) {
  console.warn('Warning checking/adding session_id column:', e.message);
}

export default db;
