import React from "react";
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from "../pages/Home";
import Calendar from "../pages/Calendar";
import Dashboard from "../pages/Dashboard";
import { CURRENT_YEAR } from "../utils/getDecadeRange";
import Results from "../pages/Results";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />

            <Route path="schedule" element={<Navigate to={`/schedule/${CURRENT_YEAR}`} replace />} />
            <Route path="schedule/:year" element={<Calendar />} />

            <Route path="results" element={<Navigate to={`/results/${CURRENT_YEAR}/race`} replace />} />
            <Route path="results/:year/:tab" element={<Results />} />

            <Route path="dashboard" element={<Dashboard />} />
        </Routes>
    );
}

export default AppRoutes;