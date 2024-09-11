import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, addDoc, where, query } from 'firebase/firestore';
import { db } from './firebase';
import "./DoctorProfile.css";

const DoctorProfile = () => {
  const { doctorId } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [weekOffs, setWeekOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWeekOffDate, setIsWeekOffDate] = useState(false);
  const [slotsStatusMessage, setSlotsStatusMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const generateSlots = () => {
    const slots = [];
    for (let hour = 10; hour <= 19; hour++) {
      if (hour !== 13) { // Exclude 1 PM (13:00)
        const time = new Date();
        time.setHours(hour, 0, 0, 0); // Set hours from 10 AM to 7 PM
        slots.push(time);
      }
    }
    return slots;
  };

  const [availableSlots, setAvailableSlots] = useState(generateSlots());

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const doctorRef = doc(db, 'doctors', doctorId);
        const doctorSnapshot = await getDoc(doctorRef);
        if (doctorSnapshot.exists()) {
          const doctorData = doctorSnapshot.data();
          setDoctor(doctorData);
          setWeekOffs(doctorData?.weekOffs || []);
          setLoading(false);
        } else {
          console.log('No such doctor!');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching doctor:', error);
        setLoading(false);
      }
    };

    const fetchAppointments = async () => {
      try {
        const appointmentsQuery = query(collection(db, 'appointments'), where('doctorId', '==', doctorId));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsList = appointmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            doctorId: data.doctorId,
            slot: data.slot?.toDate ? data.slot.toDate() : new Date(data.slot)
          };
        });
        setAppointments(appointmentsList);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };

    fetchDoctor();
    fetchAppointments();
  }, [doctorId]);

  const isWeekOff = (date) => {
    return weekOffs.some(weekOff => new Date(weekOff).toDateString() === date.toDateString());
  };

  const isSlotBooked = (slot) => {
    return appointments.some(appointment => {
      const appointmentDate = new Date(appointment.slot);
      return (
        appointmentDate.getHours() === slot.getHours() &&
        appointmentDate.toDateString() === new Date(selectedDate).toDateString()
      );
    });
  };

  const isSlotPassed = (slot) => {
    const now = new Date();
    const slotDate = new Date(slot);
    return selectedDate && new Date(selectedDate).toDateString() === now.toDateString() && now > slotDate;
  };

  const isDatePast = (date) => {
    const selected = new Date(date);
    const today = new Date();
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const filteredSlots = selectedDate ? availableSlots.filter(slot => {
    const date = new Date(selectedDate);
    const fullSlot = new Date(date);
    fullSlot.setHours(slot.getHours(), slot.getMinutes(), slot.getSeconds(), slot.getMilliseconds());
    return !isWeekOff(date) && !isSlotPassed(fullSlot);
  }) : availableSlots;

  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      setIsWeekOffDate(isWeekOff(date));
      if (filteredSlots.length === 0) {
        setSlotsStatusMessage('No slots available today.');
      } else {
        setSlotsStatusMessage('');
      }
    } else {
      setIsWeekOffDate(false);
      setSlotsStatusMessage('');
    }
  }, [selectedDate, filteredSlots]);

  const handleBooking = async () => {
    if (!selectedDate) {
      alert('Please select a date.');
      return;
    }

    if (isDatePast(selectedDate)) {
      alert('Cannot book an appointment for a past date.');
      return;
    }

    if (!selectedSlot) {
      alert('Please choose a slot.');
      return;
    }

    if (!name || !phone || !email) {
      alert('Please fill in all your details.');
      return;
    }

    const fullSlot = new Date(selectedDate);
    fullSlot.setHours(new Date(selectedSlot).getHours(), new Date(selectedSlot).getMinutes(), 0, 0);

    if (isWeekOff(fullSlot)) {
      alert('Cannot book on a week-off day.');
      return;
    }

    if (!isSlotBooked(fullSlot)) {
      try {
        await addDoc(collection(db, 'appointments'), { 
          doctorId, 
          slot: fullSlot, 
          doctorName: doctor.name,
          doctorSpecialization: doctor.specialization,
          patientName: name,
          patientPhone: phone,
          patientEmail: email,
        });
        alert('Appointment booked!');
        const appointmentsQuery = query(collection(db, 'appointments'), where('doctorId', '==', doctorId));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsList = appointmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            doctorId: data.doctorId,
            slot: data.slot?.toDate ? data.slot.toDate() : new Date(data.slot)
          };
        });
        setAppointments(appointmentsList);
        setName('');
        setPhone('');
        setEmail('');
      } catch (error) {
        console.error('Error booking appointment:', error);
        alert('Error booking appointment');
      }
    } else {
      alert('Slot already booked, please choose another.');
    }
  };

  const bookedSlots = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.slot);
    return selectedDate && appointmentDate.toDateString() === new Date(selectedDate).toDateString();
  });

  if (loading) return <div>Loading...</div>;

  if (!doctor) return <div>No doctor found.</div>;

  return (
    <div>
      <h2>{doctor.name} - {doctor.specialization}</h2>
      <h3>Book an Appointment</h3>

      <div>
        <label>
          Choose Date:
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </label>
      </div>

      {selectedDate && isWeekOffDate ? (
        <p>There are no slots available on this date due to a week-off.</p>
      ) : selectedDate ? (
        <>
          <h4>Select a Time Slot (From 10 AM to 7 PM, excluding 1 PM):</h4>
          <ul>
            {filteredSlots.length === 0 ? (
              <p>No slots available today.</p>
            ) : (
              filteredSlots.map((slot, index) => (
                <li key={index}>
                  <label>
                    <input
                      type="radio"
                      name="slot"
                      value={slot}
                      disabled={isSlotBooked(slot)}
                      onChange={() => setSelectedSlot(slot)}
                    />
                    {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    {isSlotBooked(slot) ? ' (Booked)' : ' (Available)'}
                    {isSlotPassed(slot) ? ' (Past)' : ''}
                  </label>
                </li>
              ))
            )}
          </ul>
          {slotsStatusMessage && <p>{slotsStatusMessage}</p>}
        </>
      ) : null}

      {!isWeekOffDate && (
        <div>
          <h4>Enter Your Details</h4>
          <label>
            Name:
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Phone:
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label>
            Email:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button onClick={handleBooking}>Book Appointment</button>
        </div>
      )}

      <div>
        <h4>Booked Slots</h4>
        <ul>
          {bookedSlots.length === 0 ? (
            <p>No appointments booked for this date.</p>
          ) : (
            bookedSlots.map((appointment) => (
              <li key={appointment.id}>
                {new Date(appointment.slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} 
                {new Date(appointment.slot).toLocaleDateString()}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default DoctorProfile;

           
