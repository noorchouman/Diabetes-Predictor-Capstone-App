// backend/server.js
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import db from './db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic paths - works on Windows, Mac, and Linux
const ML_DIR = path.join(__dirname, '..', 'ml');
const PREDICT_SCRIPT = path.join(ML_DIR, 'predict.py');

// Use system Python (or python3 on Unix)
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';

const app = express();
app.use(cors());
app.use(express.json());

// Artifacts folder: holds model.pkl, scaler.pkl, metrics.json
const ARTIFACTS = path.join(__dirname, 'artifacts');

const MODEL_PATH = path.join(ARTIFACTS, 'model.pkl'); // just used for existence check
const METRICS_PATH = path.join(ARTIFACTS, 'metrics.json');

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    modelExists: fs.existsSync(MODEL_PATH)
  });
});

// --- Metrics from training (whatever you saved in metrics.json) ---
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

// --- Recent predictions history (for /history page) ---
app.get('/predictions', (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const sessionId = req.query.session_id || null;
    
    // If session_id provided, filter by it; otherwise show all (for admin/debugging)
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

// --- Predict: calls YOUR ml/predict.py (Pima model) ---
app.post('/predict', (req, res) => {
  if (!fs.existsSync(MODEL_PATH)) {
    return res.status(400).json({ error: 'Model not trained yet.' });
  }

  const py = spawn(PYTHON_CMD, [
    PREDICT_SCRIPT,
    '--artifacts', ARTIFACTS
  ]);
  
  // Save session_id before removing it (it's not a feature for the model)
  const sessionId = req.body.session_id || null;
  
  // Create payload for Python (exclude session_id - it's not a feature)
  const { session_id, ...predictionPayload } = req.body;
  
  // send request body (JSON) to Python stdin (without session_id)
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
      const result = JSON.parse(out); // { probability, predicted }

      // Save to SQLite (Pima inputs)
      // Use session_id saved earlier
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
      console.error('Bad predictor output:', out, e);
      res.status(500).json({ error: 'Bad predictor output' });
    }
  });
});

const PORT = 8000;
app.listen(PORT, () =>
  console.log(`✅ Backend running on http://localhost:${PORT}`)
);
