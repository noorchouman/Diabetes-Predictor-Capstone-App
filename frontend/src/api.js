// frontend/src/api.js

const API_BASE = "http://localhost:8000";  // backend server

export async function predict(body) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) return null;
  return res.json();
}

export async function getHistory(limit = 50) {
  const res = await fetch(`${API_BASE}/predictions?limit=${limit}`);
  if (!res.ok) return { items: [] };
  return res.json();
}
