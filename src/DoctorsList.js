import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Link } from 'react-router-dom';
import './DoctorsList.css';

const DoctorsList = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctorsCollection = collection(db, 'doctors');
        const doctorsSnapshot = await getDocs(doctorsCollection);
        const doctorsList = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Fetched doctors:', doctorsList); // Log fetched data
        setDoctors(doctorsList);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading doctors: {error.message}</div>;

  return (
    <div>
      <h2>Our Doctors</h2>
      {doctors.length === 0 ? (
        <p>No doctors available</p>
      ) : (
        <ul>
          {doctors.map(doctor => (
            <li key={doctor.id}>
              {doctor.name} - {doctor.specialization}
              <Link to={`/doctor/${doctor.id}`}>Book an Appointment</Link>
              <p>Week Offs: {doctor.weekOffs?.join(', ') || 'None'}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DoctorsList;
