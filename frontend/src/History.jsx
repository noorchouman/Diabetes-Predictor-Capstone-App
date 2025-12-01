// src/History.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function History() {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Get session ID to fetch only this user's predictions
  const getSessionId = () => {
    return localStorage.getItem('diabetes_predictor_session_id');
  };

  useEffect(() => {
    const sessionId = getSessionId();
    const url = sessionId 
      ? `http://localhost:8000/predictions?session_id=${encodeURIComponent(sessionId)}`
      : "http://localhost:8000/predictions";
    
    fetch(url)
      .then((r) => r.json())
      .then((d) => setRows(d.items || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const sortedRows = rows ? [...rows].sort((a, b) => {
    let aVal, bVal;
    if (sortBy === "date") {
      aVal = new Date(a.created_at);
      bVal = new Date(b.created_at);
    } else if (sortBy === "probability") {
      aVal = a.probability;
      bVal = b.probability;
    } else {
      aVal = a[sortBy];
      bVal = b[sortBy];
    }
    
    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  }) : [];

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const stats = rows ? {
    total: rows.length,
    diabetes: rows.filter(r => r.predicted === 1).length,
    avgProbability: (rows.reduce((sum, r) => sum + r.probability, 0) / rows.length * 100).toFixed(1)
  } : null;

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Prediction History</h1>
          <p className="text-gray-600 text-sm">
            View your past predictions. Useful for tracking progress and monitoring changes after lifestyle modifications.
          </p>
        </div>
        <Link to="/predictor" className="btn btn-primary">
          New Prediction
        </Link>
      </div>

      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Total Predictions</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">High Risk Predictions</p>
            <p className="text-2xl font-bold text-red-600">{stats.diabetes}</p>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.diabetes / stats.total) * 100).toFixed(1)}% of total
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Average Risk</p>
            <p className="text-2xl font-bold">{stats.avgProbability}%</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-3"></div>
            <p className="text-gray-500">Loading predictions...</p>
          </div>
        ) : rows && rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th 
                    className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-2">
                      Date & Time
                      {sortBy === "date" && (
                        <span className="text-gray-400">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold">Glucose</th>
                  <th className="text-left p-4 font-semibold">BP</th>
                  <th className="text-left p-4 font-semibold">BMI</th>
                  <th className="text-left p-4 font-semibold">Age</th>
                  <th 
                    className="text-left p-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("probability")}
                  >
                    <div className="flex items-center gap-2">
                      Risk %
                      {sortBy === "probability" && (
                        <span className="text-gray-400">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r, idx) => {
                  const prob = r.probability;
                  const riskColor = prob >= 0.75 ? "text-red-600" : prob >= 0.5 ? "text-orange-600" : prob >= 0.2 ? "text-amber-600" : "text-green-600";
                  return (
                    <tr key={r.id} className={`border-t hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="p-4">
                        <div className="text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">{r.glucose}</span>
                        <span className="text-xs text-gray-500 ml-1">mg/dL</span>
                      </td>
                      <td className="p-4">{r.blood_pressure} mmHg</td>
                      <td className="p-4">
                        <span className="font-medium">{r.bmi}</span>
                        <span className="text-xs text-gray-500 ml-1">kg/m²</span>
                      </td>
                      <td className="p-4">{r.age} yrs</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${riskColor}`}>
                            {(prob * 100).toFixed(1)}%
                          </span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${prob >= 0.75 ? "bg-red-600" : prob >= 0.5 ? "bg-orange-600" : prob >= 0.2 ? "bg-amber-500" : "bg-green-600"}`}
                              style={{ width: `${prob * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {r.predicted === 1 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            High Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Low Risk
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 font-medium mb-2">No predictions yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Start by making your first diabetes risk prediction
            </p>
            <Link to="/predictor" className="btn btn-primary">
              Make Prediction
            </Link>
          </div>
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="text-center text-xs text-gray-500">
          Showing {rows.length} most recent prediction{rows.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
