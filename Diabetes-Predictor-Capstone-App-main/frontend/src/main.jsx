import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App.jsx";
import History from "./History.jsx";
import DiabetesInfo from "./DiabetesInfo.jsx";
import Nav from "./components/Nav.jsx";
import Landing from "./Landing.jsx";

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
          <Route path="/" element={<Landing />} />
          <Route path="/predictor" element={<App />} />
          <Route path="/history" element={<History />} />
          <Route path="/info" element={<DiabetesInfo />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </React.StrictMode>
);
