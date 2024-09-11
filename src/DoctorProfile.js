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

  // Function to generate hourly time slots from 10 AM to 7 PM, excluding 1 PM
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

  // Function to check if a date is a week-off
  const isWeekOff = (date) => {
    return weekOffs.some(weekOff => new Date(weekOff).toDateString() === date.toDateString());
  };

  // Function to check if a slot is already booked for the selected date
  const isSlotBooked = (slot) => {
    return appointments.some(appointment => {
      const appointmentDate = new Date(appointment.slot);
      return (
        appointmentDate.getHours() === slot.getHours() &&
        appointmentDate.toDateString() === new Date(selectedDate).toDateString()
      );
    });
  };

  // Function to check if a slot has passed (only for the current date)
  const isSlotPassed = (slot) => {
    const now = new Date();
    const slotDate = new Date(slot);
    return selectedDate && new Date(selectedDate).toDateString() === now.toDateString() && now > slotDate;
  };

  // Check if the selected date is in the past
  const isDatePast = (date) => {
    return new Date(date) < new Date();
  };

  // Filter available slots based on week-off days and passed slots
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
      // Check if there are any available slots for the selected date
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

  // Handle appointment booking
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

    // Combine selected date and time into a single Date object
    const fullSlot = new Date(selectedDate);
    fullSlot.setHours(new Date(selectedSlot).getHours(), 0, 0, 0);

    if (isWeekOff(fullSlot)) {
      alert('Cannot book on a week-off day.');
      return;
    }

    if (!isSlotBooked(fullSlot)) {
      try {
        await addDoc(collection(db, 'appointments'), { 
            doctorId, 
            slot: fullSlot, 
            doctorName: doctor.name,            // Add doctor's name
            doctorSpecialization: doctor.specialization, // Add doctor's specialization
            patientName: name,                 // Add patient's name
            patientPhone: phone,               // Add patient's phone number
            patientEmail: email,               // Add patient's email
        });
        alert('Appointment booked!');
        // Refresh the appointments list after booking
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
        // Clear patient details
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

  if (loading) return <div>Loading...</div>;

  if (!doctor) return <div>No doctor found.</div>;

  return (
    <div>
      <h2>{doctor.name} - {doctor.specialization}</h2>
      <h3>Book an Appointment</h3>

      {/* Select a Date */}
      <div>
        <label>
          Choose Date:
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]} // Disable past dates
          />
        </label>
      </div>

      {/* Display Available Time Slots with Status */}
      {selectedDate && (
        <div>
          {isWeekOffDate ? (
            <p>This date is a week-off. Please select another date.</p>
          ) : (
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
                          disabled={isSlotBooked(slot)} // Disable if slot is already booked
                          onChange={() => setSelectedSlot(slot)}
                        />
                        {/* Display time in 12-hour format with AM/PM */}
                        {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        {/* Show whether the slot is booked or available */}
                        {isSlotBooked(slot) ? ' (Booked)' : ' (Available)'}
                        {/* Show whether the slot has passed */}
                        {isSlotPassed(slot) ? ' (Passed)' : ''}
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      )}

            {/* Patient Details Form */}
            <div>
        {!isWeekOffDate && (
          <div>
            <h4>Your Details</h4>
            <form>
              <div>
                <label>
                  Name:
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </label>
              </div>
              <div>
                <label>
                  Phone:
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                  />
                </label>
              </div>
              <div>
                <label>
                  Email:
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </label>
              </div>
              <button type="button" onClick={handleBooking}>
                Book Appointment
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Display Booked Slots */}
      {selectedDate && !isWeekOffDate && (
        <div>
          <h4>Booked Slots for {new Date(selectedDate).toLocaleDateString()}:</h4>
          <ul>
            {appointments.filter(appointment => 
              new Date(appointment.slot).toDateString() === new Date(selectedDate).toDateString()
            ).map((appointment, index) => (
              <li key={index}>
                {new Date(appointment.slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;
