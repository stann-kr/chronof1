import React from "react";
import { Routes, Route } from 'react-router-dom';
import Home from "../pages/Home";
import Calendar from "../pages/Calendar";
import Dashboard from "../pages/Dashboard";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="dashboard" element={<Dashboard />} />
        </Routes>
    );
}

export default AppRoutes;