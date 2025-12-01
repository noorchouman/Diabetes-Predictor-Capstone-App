// src/Landing.jsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      {/* soft gradient header */}
      <div className="bg-gradient-to-b from-emerald-100/70 via-sky-50 to-transparent border-b border-emerald-100/60">
        <div className="max-w-5xl mx-auto px-5 py-10 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-semibold">
            Type 2 diabetes • Risk test
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
            Take the Type 2 Diabetes Risk Test
          </h1>
          <p className="text-gray-700 max-w-2xl text-sm md:text-base">
            Answer a few questions and enter simple health measurements to
            estimate your probability of having{" "}
            <span className="font-semibold">Type 2 diabetes</span>. This tool is
            for education only and does not replace medical advice.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/predictor")}
              className="btn btn-primary text-sm px-5 py-2.5"
            >
              Start risk test
            </button>
            <Link to="/info" className="btn text-sm">
              Learn about diabetes
            </Link>
          </div>

          <p className="text-[11px] text-gray-500 pt-1">
            Focus: adults and Type 2 diabetes risk. Not designed for Type 1
            diabetes or children.
          </p>
        </div>
      </div>

      {/* three info cards */}
      <main className="max-w-5xl mx-auto px-5 py-10 space-y-8">
        <section className="grid md:grid-cols-3 gap-4">
          <div className="card p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">1. Check your risk</h2>
              <p className="text-sm text-gray-600">
                Enter your health measurements (glucose, blood pressure, BMI, age, etc.) to get an instant diabetes risk assessment powered by machine learning.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/predictor")}
              className="btn mt-4 text-sm"
            >
              Go to risk test →
            </button>
          </div>

          <div className="card p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                2. View prediction history
              </h2>
              <p className="text-sm text-gray-600">
                See your past predictions. Useful if you want to track changes after lifestyle modifications or compare results over time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/history")}
              className="btn mt-4 text-sm"
            >
              View history →
            </button>
          </div>

          <div className="card p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                3. Learn about diabetes
              </h2>
              <p className="text-sm text-gray-600">
                Understand Type 2 diabetes, its symptoms, risk factors, prevention strategies, and how to manage it effectively.
              </p>
            </div>
            <Link
              to="/info"
              className="btn mt-4 text-sm"
            >
              Read more →
            </Link>
          </div>
        </section>

        <section className="card p-5 md:p-6 space-y-2">
          <h2 className="text-lg font-semibold">
            What this tool is (and isn&apos;t)
          </h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>
              Built for <span className="font-semibold">Type 2 diabetes</span>{" "}
              risk in adults, using a predictive model trained on a health
              dataset.
            </li>
            <li>
              <span className="font-semibold">Not</span> a diagnostic test, and
              it doesn&apos;t replace laboratory testing or professional
              medical advice.
            </li>
            <li>
              Results should always be discussed with a clinician, especially if
              you have symptoms or other risk factors.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
