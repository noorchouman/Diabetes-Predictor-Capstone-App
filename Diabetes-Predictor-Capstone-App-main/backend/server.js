import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import db from './db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ML_DIR = path.join(__dirname, '..', 'ml');
const PREDICT_SCRIPT = path.join(ML_DIR, 'predict.py');
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';

const app = express();
app.use(cors());
app.use(express.json());

const ARTIFACTS = path.join(__dirname, 'artifacts');
const MODEL_PATH = path.join(ARTIFACTS, 'model.pkl');
const METRICS_PATH = path.join(ARTIFACTS, 'metrics.json');

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    modelExists: fs.existsSync(MODEL_PATH)
  });
});

app.get('/metrics', (req, res) => {
  if (!fs.existsSync(METRICS_PATH)) {
    return res.status(404).json({ error: 'No metrics found. Train the model first.' });
  }

  try {
    const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
    res.json(metrics);
  } catch (e) {
    console.error('Error reading metrics.json', e);
    res.status(500).json({ error: 'Failed to read metrics' });
  }
});

app.get('/predictions', (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const sessionId = req.query.session_id || null;
    
    let query, params;
    if (sessionId) {
      query = `
        SELECT
          id,
          created_at,
          pregnancies,
          glucose,
          blood_pressure,
          skin_thickness,
          insulin,
          bmi,
          diabetes_pedigree_function,
          age,
          probability,
          predicted
        FROM predictions
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT ?
      `;
      params = [sessionId, limit];
    } else {
      query = `
        SELECT
          id,
          created_at,
          pregnancies,
          glucose,
          blood_pressure,
          skin_thickness,
          insulin,
          bmi,
          diabetes_pedigree_function,
          age,
          probability,
          predicted
        FROM predictions
        ORDER BY id DESC
        LIMIT ?
      `;
      params = [limit];
    }
    
    const rows = db.prepare(query).all(...params);

    res.json({ items: rows });
  } catch (e) {
    console.error('Error fetching predictions', e);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

app.post('/predict', (req, res) => {
  if (!fs.existsSync(MODEL_PATH)) {
    return res.status(400).json({ error: 'Model not trained yet.' });
  }

  const py = spawn(PYTHON_CMD, [
    PREDICT_SCRIPT,
    '--artifacts', ARTIFACTS
  ]);
  
  const sessionId = req.body.session_id || null;
  const { session_id, ...predictionPayload } = req.body;
  
  py.stdin.write(JSON.stringify(predictionPayload));
  py.stdin.end();

  let out = '';
  let err = '';

  py.stdout.on('data', (d) => {
    out += d.toString();
  });

  py.stderr.on('data', (d) => {
    err += d.toString();
  });

  py.on('close', (code) => {
    if (code !== 0) {
      console.error('Predict error:', err);
      return res.status(500).json({ error: 'Prediction failed', details: err });
    }

    try {
      // Clean output - remove any warnings or extra text
      const cleanOutput = out.trim().split('\n').pop(); // Get last line (JSON should be last)
      
      if (!cleanOutput) {
        throw new Error('Empty output from prediction script');
      }

      const result = JSON.parse(cleanOutput);

      // Validate result structure
      if (typeof result.probability === 'undefined' || typeof result.predicted === 'undefined') {
        throw new Error('Invalid result structure');
      }

      // Verify table structure before inserting
      const tableInfo = db.prepare("PRAGMA table_info(predictions)").all();
      const columnNames = tableInfo.map(col => col.name);
      
      if (!columnNames.includes('session_id')) {
        throw new Error('Database schema error: session_id column missing. Please restart the backend server.');
      }

      const stmt = db.prepare(`
        INSERT INTO predictions (
          session_id,
          pregnancies,
          glucose,
          blood_pressure,
          skin_thickness,
          insulin,
          bmi,
          diabetes_pedigree_function,
          age,
          probability,
          predicted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const p = req.body;
      stmt.run(
        sessionId,
        p.pregnancies,
        p.glucose,
        p.blood_pressure,
        p.skin_thickness,
        p.insulin,
        p.bmi,
        p.diabetes_pedigree_function,
        p.age,
        result.probability,
        result.predicted
      );

      res.json(result);
    } catch (e) {
      console.error('Bad predictor output:', out);
      console.error('Error:', e.message);
      console.error('Stderr:', err);
      res.status(500).json({ 
        error: 'Bad predictor output', 
        details: e.message,
        rawOutput: out.substring(0, 200) // First 200 chars for debugging
      });
    }
  });
});

const PORT = 8000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
