// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App.jsx";                // predictor form
import Providers from "./Providers.jsx";
import History from "./History.jsx";
import DiabetesInfo from "./DiabetesInfo.jsx";
import Nav from "./components/Nav.jsx";
import Landing from "./Landing.jsx";        // NEW

import "./index.css";

function Layout({ children }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* New home / landing route */}
          <Route path="/" element={<Landing />} />

          {/* Predictor moved here */}
          <Route path="/predictor" element={<App />} />

          <Route path="/providers" element={<Providers />} />
          <Route path="/history" element={<History />} />
          <Route path="/info" element={<DiabetesInfo />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </React.StrictMode>
);
