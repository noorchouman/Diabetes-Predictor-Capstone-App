import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { predict, getMetrics } from "./api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  if (p >= 0.75)
    return {
      title: "Recommended next steps",
      bullets: [
        "Book a clinician visit for confirmatory labs (HbA1c, fasting glucose or OGTT).",
        "Bring home measurements if available (glucose, BP, weight).",
        "Discuss nutrition, activity, sleep, and smoking cessation with your healthcare provider.",
        "If you have concerning symptoms (excessive thirst, frequent urination, weight loss, fatigue), seek care promptly.",
      ],
    };
  if (p >= 0.5)
    return {
      title: "Suggested actions",
      bullets: [
        "Schedule a check-up and discuss screening labs with your doctor.",
        "Improve diet quality and increase daily physical activity.",
        "Track weight and monitor any symptoms.",
        "Consider discussing your risk factors with a healthcare professional.",
      ],
    };
  if (p >= 0.2)
    return {
      title: "Keep an eye on things",
      bullets: [
        "Consider a preventive check-up and routine labs.",
        "Reduce sugary drinks and maintain regular physical activity.",
        "Monitor your health and discuss any concerns with your doctor.",
      ],
    };
  return {
    title: "General wellness tips",
    bullets: [
      "Maintain regular physical activity and balanced meals.",
      "Continue routine check-ups as advised by your clinician.",
      "Stay informed about your health and risk factors.",
    ],
  };
}

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
      if (!result) return;

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;
      let yPos = margin;

      // Header with colored background
      pdf.setFillColor(16, 185, 129); // emerald-500
      pdf.rect(0, 0, pageWidth, 80, "F");
      
      // Title in header
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont(undefined, "bold");
      pdf.text("Diabetes Risk Assessment", margin, 45);
      
      // Date in header
      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      const date = new Date().toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
      pdf.text(date, pageWidth - margin - pdf.getTextWidth(date), 45);
      
      yPos = 110;

      // Risk Level Box
      pdf.setFillColor(249, 250, 251); // gray-50
      pdf.setDrawColor(229, 231, 235); // gray-200
      pdf.setLineWidth(1);
      pdf.roundedRect(margin, yPos, contentWidth, 60, 5, 5, "FD");
      
      pdf.setTextColor(17, 24, 39); // gray-900
      pdf.setFontSize(12);
      pdf.setFont(undefined, "normal");
      pdf.text("Risk Level", margin + 15, yPos + 20);
      
      pdf.setFontSize(18);
      pdf.setFont(undefined, "bold");
      const riskColor = prob >= 0.75 ? [220, 38, 38] : prob >= 0.5 ? [234, 88, 12] : prob >= 0.2 ? [245, 158, 11] : [5, 150, 105];
      pdf.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
      pdf.text(bucket.label, margin + 15, yPos + 45);
      
      // Probability Box (right side)
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(pageWidth - margin - 150, yPos, 150, 60, 5, 5, "FD");
      
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(12);
      pdf.setFont(undefined, "normal");
      pdf.text("Probability", pageWidth - margin - 135, yPos + 20);
      
      pdf.setFontSize(18);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
      pdf.text(`${(prob * 100).toFixed(1)}%`, pageWidth - margin - 135, yPos + 45);
      
      yPos += 85;

      // Progress Bar
      pdf.setFillColor(229, 231, 235); // gray-200
      pdf.roundedRect(margin, yPos, contentWidth, 20, 10, 10, "F");
      
      pdf.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
      const barWidth = (contentWidth * prob);
      pdf.roundedRect(margin, yPos, barWidth, 20, 10, 10, "F");
      
      // Progress bar labels
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text("Low Risk", margin + 5, yPos + 14);
      pdf.text("High Risk", pageWidth - margin - 50, yPos + 14);
      
      yPos += 40;

      // Recommendations Section
      if (recs) {
        pdf.setFillColor(249, 250, 251);
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(1);
        pdf.roundedRect(margin, yPos, contentWidth, 0, 8, 8, "FD");
        
        // Section title
        pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(16);
        pdf.setFont(undefined, "bold");
        pdf.text(recs.title, margin + 15, yPos + 25);
        
        yPos += 40;
        
        // Bullet points
        pdf.setFontSize(11);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(55, 65, 81); // gray-700
        
        recs.bullets.forEach((bullet, index) => {
          if (yPos > pageHeight - 60) {
            pdf.addPage();
            yPos = margin + 20;
          }
          
          // Bullet point
          pdf.setFillColor(107, 114, 128);
          pdf.circle(margin + 20, yPos - 3, 3, "F");
          
          // Text
          const lines = pdf.splitTextToSize(bullet, contentWidth - 40);
          pdf.text(lines, margin + 35, yPos);
          yPos += lines.length * 14 + 8;
        });
        
        // Close the box
        const boxHeight = yPos - (margin + 50);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(margin, margin + 50, contentWidth, boxHeight, 8, 8, "D");
      }

      // Footer note (only for high risk)
      if (prob >= 0.5) {
        yPos += 20;
        if (yPos > pageHeight - 80) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.setFillColor(254, 243, 199); // amber-100
        pdf.setDrawColor(251, 191, 36); // amber-400
        pdf.setLineWidth(1);
        pdf.roundedRect(margin, yPos, contentWidth, 50, 6, 6, "FD");
        
        pdf.setTextColor(146, 64, 14); // amber-800
        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.text("Consider a Medical Consultation", margin + 15, yPos + 18);
        
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);
        pdf.text("Given your risk level, we recommend discussing these results with a healthcare provider.", margin + 15, yPos + 35);
      }

      // Footer
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
      
      pdf.setTextColor(156, 163, 175); // gray-400
      pdf.setFontSize(8);
      pdf.setFont(undefined, "normal");
      pdf.text("Generated by Diabetes Risk Predictor", margin, pageHeight - 15);
      pdf.text(`Page 1 of 1`, pageWidth - margin - pdf.getTextWidth("Page 1 of 1"), pageHeight - 15);

      pdf.save("diabetes_prediction.pdf");
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  const prob = result?.probability ?? null;
  const bucket = prob != null ? riskBucket(prob) : null;
  const recs = prob != null ? recommendations(prob) : null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-6xl mx-auto px-5 py-10 space-y-8">
        <section className="card p-6 md:p-8">
          <div className="mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Diabetes Risk Estimator
              </h1>
            <p className="text-gray-600 text-sm md:text-base">
              Enter your health measurements to get a risk assessment. This tool uses a machine learning model trained on the Pima Indians Diabetes dataset. For educational purposes only.
            </p>
          </div>
        </section>

        <section className="card p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Model Performance</h2>
              <p className="text-sm text-gray-600 mt-1">
                Model performance metrics
              </p>
            </div>
            <button
              type="button"
              className="btn text-sm"
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
              <div className="border border-gray-200 rounded-lg px-5 py-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Accuracy</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(metrics.accuracy * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600 mt-1">Correct predictions</p>
              </div>
              <div className="border border-gray-200 rounded-lg px-5 py-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">F1 Score</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.f1.toFixed(3)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Balanced metric</p>
              </div>
              <div className="border border-gray-200 rounded-lg px-5 py-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">ROC-AUC</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.roc_auc.toFixed(3)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Classification quality</p>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center rounded-lg">
              <p className="text-gray-600 text-sm">Model metrics not available</p>
              <p className="text-gray-500 text-xs mt-1">Train the model first to see performance metrics</p>
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
          <form
            onSubmit={onSubmit}
            className="card p-5 md:p-6 space-y-4"
          >
              <div>
              <h2 className="text-lg font-semibold mb-1">Patient Information</h2>
                <p className="text-xs text-gray-500">
                Enter the required health measurements below.
                </p>
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
                className={`btn btn-primary text-sm px-6 py-3 font-semibold ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
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

          <section id="result-card" className="card p-6 md:p-8 space-y-5 sticky top-8">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Prediction Result</h2>
                <p className="text-xs text-gray-500 mt-0.5">Risk assessment</p>
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
                <p className="text-sm text-gray-600 font-medium mb-1">Ready for prediction</p>
                <p className="text-xs text-gray-500">
                  Fill out the form and click Get Prediction to see your risk assessment
                </p>
              </div>
            )}

            {result && bucket && recs && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`badge ${bucket.color} text-sm px-4 py-2`}>
                    Risk Level: {bucket.label}
                  </span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-xs text-gray-500">Probability:</span>
                    <span className="text-base font-bold text-gray-900">
                      {(prob * 100).toFixed(1)}%
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
                  <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3">{recs.title}</h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {recs.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-2">
                          <span className="text-gray-400 mt-1.5 flex-shrink-0">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                  </div>

                  {prob >= 0.5 && (
                    <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-amber-900 mb-1 font-semibold">
                        Consider a Medical Consultation
                    </p>
                      <p className="text-xs text-amber-800">
                        Given your risk level, we recommend discussing these results with a healthcare provider. 
                        They can help interpret your risk and recommend appropriate screening tests.
                  </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
