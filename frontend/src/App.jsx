// src/App.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { predict, getMetrics } from "./api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Pima feature defaults
const DEFAULTS = {
  pregnancies: "",
  glucose: "",
  blood_pressure: "",
  skin_thickness: "",
  insulin: "",
  bmi: "",
  diabetes_pedigree_function: "",
  age: "",
};

// Input validation ranges and help text
const FIELD_INFO = {
  pregnancies: {
    min: 0,
    max: 20,
    help: "Number of times you have been pregnant. Enter 0 if not applicable.",
    normal: "0-1 (typical range)"
  },
  glucose: {
    min: 70,
    max: 600,
    help: "Plasma glucose concentration from a 2-hour oral glucose tolerance test (mg/dL). Normal fasting: 70-100 mg/dL.",
    normal: "70-100 mg/dL (fasting)"
  },
  blood_pressure: {
    min: 40,
    max: 200,
    help: "Diastolic blood pressure (mmHg). Normal: 60-80 mmHg.",
    normal: "60-80 mmHg (normal)"
  },
  skin_thickness: {
    min: 0,
    max: 100,
    help: "Triceps skin fold thickness (mm). Used to estimate body fat. Normal: 10-30 mm for adults.",
    normal: "10-30 mm (typical)"
  },
  insulin: {
    min: 0,
    max: 1000,
    help: "2-hour serum insulin level (µU/mL). Normal fasting: 2-25 µU/mL.",
    normal: "2-25 µU/mL (fasting)"
  },
  bmi: {
    min: 10,
    max: 60,
    help: "Body Mass Index (kg/m²). Normal: 18.5-24.9, Overweight: 25-29.9, Obese: ≥30.",
    normal: "18.5-24.9 (normal)"
  },
  diabetes_pedigree_function: {
    min: 0,
    max: 3,
    step: 0.001,
    help: "Diabetes pedigree function - a function that scores the likelihood of diabetes based on family history. Higher values indicate stronger family history.",
    normal: "0.0-2.0 (typical range)"
  },
  age: {
    min: 1,
    max: 120,
    help: "Age in years. Type 2 diabetes risk increases with age, especially after 45.",
    normal: "Any age (risk increases after 45)"
  }
};

function riskBucket(p) {
  if (p >= 0.75) return { label: "Very high", color: "bg-rose-600" };
  if (p >= 0.5) return { label: "High", color: "bg-orange-600" };
  if (p >= 0.2) return { label: "Moderate", color: "bg-amber-500" };
  return { label: "Low", color: "bg-emerald-600" };
}

function recommendations(p) {
  const common = [
    "Educational use only — not a medical diagnosis.",
    "If you have concerning symptoms (excessive thirst, frequent urination, weight loss, fatigue), seek care promptly.",
  ];
  if (p >= 0.75)
    return {
      title: "Recommended next steps",
      bullets: [
        "Book a clinician visit for confirmatory labs (HbA1c, fasting glucose or OGTT).",
        "Bring home measurements if available (glucose, BP, weight).",
        "Discuss nutrition, activity, sleep, smoking cessation.",
      ].concat(common),
    };
  if (p >= 0.5)
    return {
      title: "Suggested actions",
      bullets: [
        "Schedule a check-up and discuss screening labs.",
        "Improve diet quality and daily movement.",
        "Track weight and any symptoms.",
      ].concat(common),
    };
  if (p >= 0.2)
    return {
      title: "Keep an eye on things",
      bullets: [
        "Consider a preventive check-up and routine labs.",
        "Reduce sugary drinks; keep regular activity.",
      ].concat(common),
    };
  return {
    title: "General wellness tips",
    bullets: [
      "Regular physical activity and balanced meals.",
      "Routine check-ups as advised by your clinician.",
    ].concat(common),
  };
}

// Get or create session ID for tracking user's predictions
const getSessionId = () => {
  let sessionId = localStorage.getItem('diabetes_predictor_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('diabetes_predictor_session_id', sessionId);
  }
  return sessionId;
};

export default function App() {
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showTooltip, setShowTooltip] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    getMetrics().then(setMetrics).catch(() => setMetrics(null));
  }, []);

  const setNum = (name) => (e) => {
    const v = e.target.value;
    const numValue = v === "" ? "" : Number(v);
    setForm((f) => ({ ...f, [name]: numValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((e) => ({ ...e, [name]: null }));
    }
    
    // Validate on blur
    if (v !== "" && numValue !== "") {
      const info = FIELD_INFO[name];
      if (numValue < info.min || numValue > info.max) {
        setErrors((e) => ({
          ...e,
          [name]: `Please enter a value between ${info.min} and ${info.max}`
        }));
      }
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    for (const key of Object.keys(DEFAULTS)) {
      const value = form[key];
      const info = FIELD_INFO[key];
      
      if (value === "" || value === undefined) {
        newErrors[key] = "This field is required";
      } else if (value < info.min || value > info.max) {
        newErrors[key] = `Please enter a value between ${info.min} and ${info.max}`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        document.querySelector(`[name="${firstErrorField}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setLoading(true);
    setResult(null);
    setErrors({});

    try {
      // Create payload with only the features needed for the model
      // Include session_id to track this user's predictions
      const payload = {
        session_id: getSessionId(),
        pregnancies: form.pregnancies,
        glucose: form.glucose,
        blood_pressure: form.blood_pressure,
        skin_thickness: form.skin_thickness,
        insulin: form.insulin,
        bmi: form.bmi,
        diabetes_pedigree_function: form.diabetes_pedigree_function,
        age: form.age,
      };
      const out = await predict(payload);
      setResult(out);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrors({ submit: err.message || "Prediction failed. Please try again." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setForm(DEFAULTS);
    setResult(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  const Tooltip = ({ field, children }) => {
    const info = FIELD_INFO[field];
    return (
      <div className="relative inline-block">
        <button
          type="button"
          className="ml-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          onMouseEnter={() => setShowTooltip((s) => ({ ...s, [field]: true }))}
          onMouseLeave={() => setShowTooltip((s) => ({ ...s, [field]: false }))}
          onClick={() => setShowTooltip((s) => ({ ...s, [field]: !s[field] }))}
          aria-label="Help"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </button>
        {showTooltip[field] && (
          <div className="absolute z-50 left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
            <p className="font-semibold mb-1">{children}</p>
            <p className="text-gray-300 mb-2">{info.help}</p>
            <p className="text-emerald-300 text-[11px]">Normal range: {info.normal}</p>
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    );
  };

  const exportPdf = async () => {
    try {
      const node = document.getElementById("result-card");
      if (!node) return;
      const canvas = await html2canvas(node, { scale: 2 });
      const img = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      const imgWidth = pageWidth - margin * 2;
      const ratio = canvas.height / canvas.width;
      const imgHeight = imgWidth * ratio;

      pdf.setFontSize(16);
      pdf.text("Diabetes Prediction Result", margin, 40);
      pdf.addImage(img, "PNG", margin, 60, imgWidth, imgHeight);
      pdf.save("diabetes_prediction.pdf");
    } catch {
      alert("Failed to export PDF");
    }
  };

  const prob = result?.probability ?? null;
  const bucket = prob != null ? riskBucket(prob) : null;
  const recs = prob != null ? recommendations(prob) : null;

  return (
    <div className="relative bg-gradient-to-br from-gray-50 via-blue-50/30 to-emerald-50/40 min-h-screen">
      {/* Enhanced gradient background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-emerald-100/60 via-blue-50/40 to-transparent -z-10" />

      <main className="relative max-w-6xl mx-auto px-5 py-10 space-y-8">
        {/* Enhanced Hero */}
        <section className="card p-6 md:p-8 flex flex-col gap-4 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Diabetes Risk Estimator
              </h1>
              <p className="text-gray-600 max-w-2xl text-sm md:text-base mt-2 leading-relaxed">
                Powered by a <span className="font-semibold text-emerald-700">Random Forest</span> machine learning model trained on the Pima Indians Diabetes dataset. 
                Enter your health measurements to get an instant risk assessment. 
                <span className="font-semibold text-amber-700"> For educational purposes only.</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-emerald-700 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live ML Prediction
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-blue-700 font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Random Forest Model
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-purple-700 font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              High Accuracy
            </span>
          </div>
        </section>

        {/* Enhanced Metrics section */}
        <section className="card p-6 md:p-8 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Model Performance</h2>
              <p className="text-sm text-gray-600 mt-1">
                Performance metrics from the Random Forest model on held-out test data
              </p>
            </div>
            <button
              type="button"
              className="btn text-sm hover:scale-105 transition-transform"
              onClick={() => navigate("/history")}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View History
            </button>
          </div>

          {metrics ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Accuracy</p>
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-emerald-900">
                  {(metrics.accuracy * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-emerald-700 mt-1">Correct predictions</p>
              </div>
              <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">F1 Score</p>
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {metrics.f1.toFixed(3)}
                </p>
                <p className="text-xs text-blue-700 mt-1">Balanced metric</p>
              </div>
              <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">ROC-AUC</p>
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {metrics.roc_auc.toFixed(3)}
                </p>
                <p className="text-xs text-purple-700 mt-1">Classification quality</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 text-sm font-medium">Model metrics not available</p>
              <p className="text-gray-500 text-xs mt-1">Train the model first to see performance metrics</p>
            </div>
          )}
        </section>

        {/* Form + Result */}
        <section className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
          {/* Form */}
          <form
            onSubmit={onSubmit}
            className="card p-5 md:p-6 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Patient inputs</h2>
                <p className="text-xs text-gray-500">
                  These are the classic Pima risk factors used in the model.
                </p>
              </div>
            </div>

            {errors.submit && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold">Error</p>
                    <p>{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {Object.keys(DEFAULTS).map((field) => {
                const info = FIELD_INFO[field];
                const getFieldLabel = (f) => {
                  if (f === "glucose") return "Glucose (mg/dL)";
                  if (f === "blood_pressure") return "Blood Pressure (mmHg)";
                  if (f === "skin_thickness") return "Skin Thickness (mm)";
                  if (f === "diabetes_pedigree_function") return "Diabetes Pedigree Function";
                  return f.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                };
                const fieldLabel = getFieldLabel(field);
                return (
                  <div key={field}>
                    <label className="label flex items-center">
                      {fieldLabel}
                      <Tooltip field={field}>{fieldLabel}</Tooltip>
                    </label>
                    <input
                      name={field}
                      type="number"
                      min={info.min}
                      max={info.max}
                      step={info.step || (field.includes("bmi") || field.includes("diabetes_pedigree") ? "any" : "1")}
                      value={form[field]}
                      onChange={setNum(field)}
                      onBlur={() => {
                        if (form[field] !== "" && form[field] !== undefined) {
                          const numValue = Number(form[field]);
                          if (numValue < info.min || numValue > info.max) {
                            setErrors((e) => ({
                              ...e,
                              [field]: `Value must be between ${info.min} and ${info.max}`
                            }));
                          }
                        }
                      }}
                      className={`input ${errors[field] ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
                      placeholder={`e.g., ${field === "pregnancies" ? "2" : field === "glucose" ? "120" : field === "blood_pressure" ? "70" : field === "skin_thickness" ? "20" : field === "insulin" ? "80" : field === "bmi" ? "32.0" : field === "diabetes_pedigree_function" ? "0.5" : "45"}`}
                    />
                    {errors[field] && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors[field]}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-500 mt-1">Range: {info.min} - {info.max}</p>
                  </div>
                );
              })}

            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className={`btn btn-primary text-sm px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-all ${
                  loading ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Get Prediction
                  </>
                )}
              </button>
              <button 
                type="button" 
                onClick={onReset} 
                className="btn text-sm px-6 py-3 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>
          </form>

          {/* Enhanced Result */}
          <section id="result-card" className="card p-6 md:p-8 space-y-5 shadow-md sticky top-8">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Prediction Result</h2>
                <p className="text-xs text-gray-500 mt-0.5">AI-powered risk assessment</p>
              </div>
              {result && (
                <button
                  type="button"
                  onClick={exportPdf}
                  className="btn text-xs px-3 py-2 hover:bg-gray-100"
                  title="Download as PDF"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </button>
              )}
            </div>

            {!result && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 font-medium mb-1">Ready for prediction</p>
                <p className="text-xs text-gray-500">
                  Fill out the form and click <span className="font-semibold text-gray-700">Get Prediction</span> to see your risk assessment
                </p>
              </div>
            )}

            {result && bucket && recs && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`badge ${bucket.color} text-sm px-4 py-2 shadow-md`}>
                    <svg className="w-4 h-4 mr-1.5 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Risk Level: {bucket.label}
                  </span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-xs text-gray-500">Probability:</span>
                    <span className="text-base font-bold text-gray-900">
                      {(prob * 100).toFixed(1).replace(".0", "")}%
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="progress bg-gray-200 h-3 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`${bucket.color} h-full transition-all duration-1000 ease-out rounded-full`}
                      style={{ width: `${Math.round(prob * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                    <span>Low (0%)</span>
                    <span className="font-medium">Risk Scale</span>
                    <span>High (100%)</span>
                  </div>
                </div>

                <div className="pt-2 space-y-4">
                  <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-2 text-base">{recs.title}</h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {recs.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1.5 flex-shrink-0">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Professional consultation reminder */}
                  <div className="rounded-xl border-2 border-amber-200 bg-amber-50/80 px-4 py-3">
                    <p className="text-xs text-amber-900 mb-1 font-semibold">
                      ⚠️ Important: Consult a Healthcare Professional
                    </p>
                    <p className="text-xs text-amber-800 mb-2">
                      This prediction is for educational purposes only. If you have concerns about your diabetes risk, 
                      please consult with a healthcare provider for proper evaluation and testing.
                    </p>
                    {prob >= 0.5 && (
                      <p className="text-xs text-amber-900 font-medium">
                        Given your risk level, we strongly recommend scheduling a medical consultation.
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-500">
                    This tool does not provide a diagnosis. Always confirm with
                    lab tests and a healthcare professional.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
