<<<<<<< Updated upstream
import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/AppRouter";

function App() {
    return (
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    );
=======
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import TestPage from './pages/TestPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* 주소가 '/'일 때만 MainPage 표시 */}
        <Route path="/" element={<MainPage />} />
        {/* 주소가 '/test'일 때만 TestPage 표시 */}
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </Router>
  );
>>>>>>> Stashed changes
}

export default App;