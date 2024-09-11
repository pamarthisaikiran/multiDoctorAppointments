// src/DoctorsList.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Link } from 'react-router-dom';
import './DoctorsList.css';


const DoctorsList = () => {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctorsCollection = collection(db, 'doctors');
        const doctorsSnapshot = await getDocs(doctorsCollection);
        const doctorsList = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDoctors(doctorsList);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };

    fetchDoctors();
  }, []);

  return (
    <div>
      <h2>Our Doctors</h2>
      <ul>
        {doctors.map(doctor => (
          <li key={doctor.id}>
            {doctor.name} - {doctor.specialization}
            <Link to={`/doctor/${doctor.id}`}>Book an Appointment</Link>
            <p>Week Offs: {doctor.weekOffs?.join(', ') || 'None'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DoctorsList;
