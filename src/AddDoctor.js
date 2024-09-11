import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, writeBatch, where , setDoc, getDoc} from 'firebase/firestore';
import { db } from './firebase';
import './AddDoctor.css';

const AddDoctor = () => {
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [weekOffs, setWeekOffs] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [newWeekOff, setNewWeekOff] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [messages, setMessages] = useState({});
  const [messageInputs, setMessageInputs] = useState({});
  const [weekOffToEdit, setWeekOffToEdit] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);

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

    const fetchAppointments = async () => {
      try {
        const appointmentsQuery = query(collection(db, 'appointments'));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsList = appointmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            doctorId: data.doctorId,
            slot: data.slot?.toDate ? data.slot.toDate() : new Date(data.slot),
            status: data.status || 'available',
            message: data.message || ''
          };
        });
        setAppointments(appointmentsList);

        const initialMessages = appointmentsList.reduce((acc, appointment) => {
          if (appointment.message) {
            acc[appointment.id] = appointment.message;
          }
          return acc;
        }, {});
        setMessages(initialMessages);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };

    fetchDoctors();
    fetchAppointments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingDoctorId) {
      try {
        const doctorRef = doc(db, 'doctors', editingDoctorId);
        await updateDoc(doctorRef, { name, specialization, weekOffs });
        alert('Doctor updated successfully');
        setEditingDoctorId(null);
        setName('');
        setSpecialization('');
        setWeekOffs([]);
      } catch (error) {
        console.error('Error updating doctor:', error);
        alert('Error updating doctor');
      }
    } else {
      try {
        await addDoc(collection(db, 'doctors'), {
          name,
          specialization,
          weekOffs,
        });
        alert('Doctor added successfully');
        setName('');
        setSpecialization('');
        setWeekOffs([]);
        const doctorsCollection = collection(db, 'doctors');
        const doctorsSnapshot = await getDocs(doctorsCollection);
        const doctorsList = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDoctors(doctorsList);
      } catch (error) {
        console.error('Error adding doctor:', error);
        alert('Error adding doctor');
      }
    }
  };

  const handleEdit = (doctor) => {
    setEditingDoctorId(doctor.id);
    setName(doctor.name);
    setSpecialization(doctor.specialization);
    setWeekOffs(doctor.weekOffs || []);
  };

  const handleDelete = async (doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        // Fetch completed appointments for the doctor
        const completedAppointmentsQuery = query(
          collection(db, 'appointments'),
          where('doctorId', '==', doctorId),
          where('status', '==', 'completed')
        );
        const completedAppointmentsSnapshot = await getDocs(completedAppointmentsQuery);
        const completedAppointmentsList = completedAppointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Store completed appointments in a separate collection
        const batch = writeBatch(db);
        completedAppointmentsList.forEach(appointment => {
          const completedAppointmentRef = doc(db, 'completed_appointments_by_resined_doctors', appointment.id);
          batch.set(completedAppointmentRef, appointment);
        });
  
        // Commit the batch write for completed appointments
        await batch.commit();
  
        // Delete associated appointments
        const appointmentsQuery = query(collection(db, 'appointments'), where('doctorId', '==', doctorId));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsList = appointmentsSnapshot.docs.map(doc => doc.id);
        for (const appointmentId of appointmentsList) {
          await deleteDoc(doc(db, 'appointments', appointmentId));
        }
  
        // Delete the doctor
        await deleteDoc(doc(db, 'doctors', doctorId));
  
        // Update state
        setDoctors(prevDoctors => prevDoctors.filter(doctor => doctor.id !== doctorId));
        alert('Doctor and associated data deleted successfully');
      } catch (error) {
        console.error('Error deleting doctor:', error);
        alert('Error deleting doctor');
      }
    }
  };

  const handleAddWeekOff = () => {
    if (newWeekOff) {
      setWeekOffs(prev => [...prev, newWeekOff]);
      setNewWeekOff('');
    }
  };

  const handleEditWeekOff = (weekOff) => {
    setWeekOffToEdit(weekOff);
    setNewWeekOff(weekOff);
  };

  const handleSaveEditedWeekOff = () => {
    if (weekOffToEdit && newWeekOff) {
      setWeekOffs(prev => prev.map(weekOff => weekOff === weekOffToEdit ? newWeekOff : weekOff));
      setWeekOffToEdit(null);
      setNewWeekOff('');
    }
  };

  const handleRemoveWeekOff = (weekOff) => {
    setWeekOffs(prev => prev.filter(existingWeekOff => existingWeekOff !== weekOff));
  };


  const saveCanceledAppointment = async (appointment) => {
    try {
      // Define a reference to the collection where canceled appointments will be stored
      const canceledAppointmentRef = doc(db, 'canceled_appointments', appointment.id);
      // Store the canceled appointment in the separate collection
      await setDoc(canceledAppointmentRef, appointment );
    } catch (error) {
      console.error('Error saving canceled appointment:', error);
      alert('Error saving canceled appointment');
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, { status: newStatus });
       // Update the status of the appointment
    await updateDoc(appointmentRef, { status: newStatus });

    // Get the updated appointment data
    const updatedAppointmentSnapshot = await getDoc(appointmentRef);
    const updatedAppointment = { id: appointmentId, ...updatedAppointmentSnapshot.data() };

    // Save to canceled appointments collection if the new status is 'canceled'
    if (newStatus === 'canceled') {
      await saveCanceledAppointment(updatedAppointment);
    }



      setAppointments(prevAppointments =>
        prevAppointments.map(appointment =>
          appointment.id === appointmentId ? { ...appointment, status: newStatus } : appointment
        )
      );
      alert(`Slot ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} successfully`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Error updating appointment status');
    }
  };

  const handleAddMessage = async (appointmentId) => {
    try {
      const message = messageInputs[appointmentId] || '';
      if (message) {
        const appointmentRef = doc(db, 'appointments', appointmentId);
        await updateDoc(appointmentRef, { message });
        setMessages(prevMessages => ({ ...prevMessages, [appointmentId]: message }));
        setMessageInputs(prevInputs => ({ ...prevInputs, [appointmentId]: '' }));
        alert('Message added successfully');
      }
    } catch (error) {
      console.error('Error adding message:', error);
      alert('Error adding message');
    }
  };

  const handleEditMessage = (appointmentId) => {
    setEditingMessageId(appointmentId);
  };

  const handleSaveMessage = async (appointmentId) => {
    try {
      const message = messageInputs[appointmentId] || '';
      if (message) {
        const appointmentRef = doc(db, 'appointments', appointmentId);
        await updateDoc(appointmentRef, { message });
        setMessages(prevMessages => ({ ...prevMessages, [appointmentId]: message }));
        setMessageInputs(prevInputs => ({ ...prevInputs, [appointmentId]: '' }));
        alert('Message updated successfully');
      }
      setEditingMessageId(null);
    } catch (error) {
      console.error('Error updating message:', error);
      alert('Error updating message');
    }
  };

  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
  };

  const getDoctorAppointments = (doctorId) => {
    return appointments
      .filter(appointment => appointment.doctorId === doctorId && appointment.slot.toDateString() === new Date(selectedDate).toDateString())
      .sort((a, b) => new Date(a.slot) - new Date(b.slot));
  };

  const getAppointmentStatus = (status) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Available';
  };

  const getDoctorSummary = (doctorId) => {
    const doctorAppointments = appointments.filter(appointment => appointment.doctorId === doctorId);
    const completedCount = doctorAppointments.filter(appointment => appointment.status === 'completed').length;
    const canceledCount = doctorAppointments.filter(appointment => appointment.status === 'canceled').length;
    const totalCount = doctorAppointments.length;

    return { completedCount, canceledCount, totalCount };
  };

  const doctorsCount = doctors.length;

  return (
    <div>
      <h2>{editingDoctorId ? 'Edit Doctor' : 'Add Doctor'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Doctor Name:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Specialization:</label>
          <input
            type="text"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Week Offs:</label>
          <input
            type="date"
            value={newWeekOff}
            onChange={(e) => setNewWeekOff(e.target.value)}
          />
          {weekOffToEdit ? (
            <>
              <button className='save-but' type="button" onClick={handleSaveEditedWeekOff}>Save</button>
              <button type="button" onClick={() => setWeekOffToEdit(null)}>Cancel Edit</button>
            </>
          ) : (
            <button type="button" onClick={handleAddWeekOff}>Add Week Off</button>
          )}
          <ul>
            {weekOffs.map((date, index) => (
              <li key={index}>
                {date}
                <button type="button" onClick={() => handleEditWeekOff(date)}>Edit</button>
                <button type="button" onClick={() => handleRemoveWeekOff(date)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
        <button className='upd-but' type="submit">{editingDoctorId ? 'Update Doctor' : 'Add Doctor'}</button>
        {editingDoctorId && (
          <button type="button" onClick={() => setEditingDoctorId(null)}>Cancel</button>
        )}
      </form>

      <h3>Doctors List</h3>
      {doctorsCount === 0 ? (
        <p>No doctors available. Please add doctors.</p>
      ) : (
        <>
          <p>Total Doctors: {doctorsCount}</p>
          <ul>
            {doctors.map(doctor => {
              const { completedCount, canceledCount, totalCount } = getDoctorSummary(doctor.id);

              return (
                <li key={doctor.id}>
                  <h4>{doctor.name} - {doctor.specialization}</h4>
                  <p>Week Offs: {doctor.weekOffs.join(', ')}</p>
                  <p>Completed Appointments: {completedCount}</p>
                  <p>Canceled Appointments: {canceledCount}</p>
                  <p>Total Appointments: {totalCount}</p>
                  <button onClick={() => handleEdit(doctor)}>Edit</button>
                  <button onClick={() => handleDelete(doctor.id)}>Delete</button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3>Appointments</h3>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />

      {doctors.map((doctor) => {
        const doctorAppointments = getDoctorAppointments(doctor.id);
        return (
          <div key={doctor.id}>
            <h4>{doctor.name} - {doctor.specialization}</h4>
            <table>
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {doctorAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{appointment.slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',hour12: true })}</td>
                    <td>{getAppointmentStatus(appointment.status)}</td>
                    <td>
                      {appointment.status === 'available' && (
                        <>
                        
                          <button className='m-c-button' onClick={() => updateAppointmentStatus(appointment.id, 'completed')}>Mark as Completed</button>
                          
                          <button onClick={() => updateAppointmentStatus(appointment.id, 'canceled')}>Mark as Canceled</button>
                        </>
                      )}
                      {(appointment.status === 'completed' || appointment.status === 'canceled') && (
                        <>
                          {editingMessageId === appointment.id ? (
                            <>
                              <input
                                type="text"
                                value={messageInputs[appointment.id] || messages[appointment.id] || ''}
                                onChange={(e) => setMessageInputs(prev => ({ ...prev, [appointment.id]: e.target.value }))}
                                placeholder="Edit message"
                              />
                              <button onClick={() => handleSaveMessage(appointment.id)}>Save Message</button>
                             
                            </>
                          ) : (
                            <>
                              <p>{messages[appointment.id]}</p>
                              <button onClick={() => handleEditMessage(appointment.id)}>Edit Message</button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default AddDoctor;

