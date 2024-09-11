// src/App.js
import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';

import DoctorsList from './DoctorsList';
import DoctorProfile from './DoctorProfile';
import AddDoctor from './AddDoctor';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DoctorsList />} />
        <Route path="/doctor/:doctorId" element={<DoctorProfile />} />
        <Route path="/add-doctor" element={<AddDoctor />} />
      </Routes>
    </Router>
  );
};

export default App;
