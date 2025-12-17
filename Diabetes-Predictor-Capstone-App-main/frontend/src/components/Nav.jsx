import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export default function Nav() {
  const location = useLocation();

  const linkClasses = ({ isActive }) =>
    `text-sm font-medium px-3 py-1.5 rounded-xl transition ${
      isActive
        ? "bg-gray-900 text-white"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  const onLanding = location.pathname === "/";

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold">
            T2
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm md:text-base">
              Type 2 Diabetes Predictor
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/" className={linkClasses} end>
            Home
          </NavLink>
          <NavLink to="/predictor" className={linkClasses}>
            Risk test
          </NavLink>
          <NavLink to="/info" className={linkClasses}>
            Info
          </NavLink>
          <NavLink to="/history" className={linkClasses}>
            History
          </NavLink>
          <a
            href="https://www.dialeb.org/"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium px-3 py-1.5 rounded-xl border border-emerald-500 text-emerald-700 hover:bg-emerald-50 transition hidden sm:inline-flex"
          >
            Donate
          </a>
        </nav>
      </div>

      {onLanding && (
        <div className="bg-emerald-50 border-t border-emerald-100">
          <div className="max-w-5xl mx-auto px-5 py-2">
            <p className="text-[11px] text-emerald-900">
              This tool focuses on <span className="font-semibold">Type 2</span>{" "}
              diabetes risk in adults.
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
