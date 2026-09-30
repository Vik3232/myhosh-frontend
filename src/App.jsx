import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [view, setView] = useState("customer") 
  const [tables, setTables] = useState([])
  const [allBookings, setAllBookings] = useState([])

  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [selectedTable, setSelectedTable] = useState("1")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [partySize, setPartySize] = useState(2)
  const [requests, setRequests] = useState("")

  const today = new Date();
  const minDate = today.toISOString().split('T')[0]; 
  const futureDate = new Date(today);
  futureDate.setMonth(today.getMonth() + 3);
  const maxDate = futureDate.toISOString().split('T')[0]; 

  useEffect(() => {
    fetch('https://myhosh-backend.onrender.com/api/tables')
      .then(response => response.json())
      .then(data => setTables(data))
      .catch(err => console.error("Error fetching tables:", err))
  }, [])

  useEffect(() => {
    fetch('https://myhosh-backend.onrender.com/api/bookings')
      .then(response => response.json())
      .then(data => setAllBookings(data))
      .catch(err => console.error("Error fetching bookings:", err))
  }, [view, isSuccess]) 

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay(); 
    const selectedTime = time; 

    // --- 1. Basic Business Hours Checks ---
    if (dayOfWeek === 2) {
      setIsSuccess(false);
      setMessage("We are closed on Tuesdays. Please select another day.");
      return; 
    }

    let minTime = "16:00"; 
    let maxTime = "21:00"; 

    if (dayOfWeek === 0 || dayOfWeek === 6) { 
      minTime = "12:00"; 
    }
    if (dayOfWeek === 0) { 
      maxTime = "20:45"; 
    }

    if (selectedTime < minTime || selectedTime > maxTime) {
      setIsSuccess(false);
      setMessage(`For the selected day, please choose a time between ${minTime} and ${maxTime}.`);
      return; 
    }

    if (date === minDate) {
      const currentHour = today.getHours().toString().padStart(2, '0');
      const currentMinute = today.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;
      
      if (currentTimeStr >= minTime) {
        setIsSuccess(false);
        setMessage(`Online reservations for today closed at ${minTime}. Please call the restaurant directly for walk-in availability.`);
        return;
      }
    }

    // --- 2. COMMERCIAL FEATURE: LIVE ANTI-SPAM PHONE NUMBER BLOCK ---
    setMessage("Verifying availability...");
    
    try {
      const liveResponse = await fetch('https://myhosh-backend.onrender.com/api/bookings');
      const liveBookings = await liveResponse.json();

      const cleanInputPhone = phone.replace(/\D/g, '');

      const phoneAlreadyBooked = liveBookings.some((booking) => {
        const existingPhone = booking.customer?.phone?.replace(/\D/g, '') || "";
        return booking.bookingDate === date && existingPhone === cleanInputPhone;
      });

      if (phoneAlreadyBooked) {
        setIsSuccess(false);
        setMessage("❌ Anti-Spam Protection: A reservation is already secured under this phone number for this date.");
        return; 
      }
    } catch (err) {
      console.error("Failed to verify anti-spam status", err);
    }

    // --- 3. Process the Actual Booking ---
    setMessage("Processing reservation...");

    const newBooking = {
      customer: { fullName, email, phone },
      restaurantTable: { id: parseInt(selectedTable) },
      bookingDate: date,
      bookingTime: time + ":00",
      partySize: parseInt(partySize),
      specialRequests: requests
    }

    try {
      const response = await fetch('https://myhosh-backend.onrender.com/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      });

      if (response.ok) {
        setIsSuccess(true);
        setMessage(`Reservation Confirmed for ${fullName}. We look forward to hosting you.`);
        setFullName(""); setEmail(""); setPhone(""); setRequests("");
      } else {
        const errorText = await response.text();
        setIsSuccess(false);
        setMessage(errorText || "Failed to secure reservation. Please try another time.");
      }
    } catch (err) {
      setIsSuccess(false);
      setMessage("System error: Unable to connect to the reservation network.");
    }
  }

  // --- REFINED SMART TABLE FILTERING LOGIC ---
  const availableTables = tables.filter(table => {
    const numGuests = parseInt(partySize) || 2;
    
    if (numGuests > 20) return false; 
    if (numGuests >= 11) return table.tableNumber === 5;
    if (numGuests >= 9) return table.tableNumber === 2 || table.tableNumber === 5;
    if (numGuests >= 7) return table.tableNumber === 1 || table.tableNumber === 2 || table.tableNumber === 5 || table.tableNumber === 7;
    if (numGuests <= 2 && (table.tableNumber === 1 || table.tableNumber === 5)) return false;
    if (table.tableNumber === 4) return false;
    if (table.capacity < numGuests) return false;

    if (date && time) {
      const selectedStart = new Date(`${date}T${time}`);
      const selectedEnd = new Date(selectedStart.getTime() + 120 * 60000); 

      for (let booking of allBookings) {
        if (booking.bookingDate === date && booking.restaurantTable?.id === table.id) {
          const bookingTimeParts = booking.bookingTime.split(':');
          const existingStart = new Date(`${date}T${bookingTimeParts[0]}:${bookingTimeParts[1]}`);
          const existingEnd = new Date(existingStart.getTime() + 120 * 60000);
          
          if (selectedStart < existingEnd && selectedEnd > existingStart) {
            return false; 
          }
        }
      }
    }

    return true; 
  });

  // --- PREVENT GHOST STATE GLITCH ---
  useEffect(() => {
    if (availableTables.length > 0) {
      const currentTableIsValid = availableTables.some(t => t.id.toString() === selectedTable.toString());
      if (!currentTableIsValid) {
        setSelectedTable(availableTables[0].id.toString());
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, partySize, date, time]); 

  return (
    <div className="restaurant-container">
      <div className="nav-container">
        <button className={`nav-btn ${view === 'customer' ? 'active' : ''}`} onClick={() => setView('customer')}>
          Customer View
        </button>
        <button className={`nav-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
          Staff Login
        </button>
      </div>

      <h1 className="restaurant-title">MYHOSH</h1>
      <div className="restaurant-subtitle">London</div>

      {view === "customer" ? (
        <div className="booking-panel">
          <h2>Reserve a Table</h2>
          <form onSubmit={handleBookingSubmit}>
            <div className="flex-row">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="flex-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              
              <div className="form-group">
                <label>Select Table</label>
                
                {availableTables.length === 0 ? (
                  <div style={{ padding: '10px', backgroundColor: '#333', color: '#ffcc00', borderRadius: '5px', fontSize: '0.9rem' }}>
                    No tables available for this time/party size online. Please try another time or call us directly!
                  </div>
                ) : (
                  <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                    {availableTables.map(table => {
                      let locationText = " - Main Restaurant"; 
                      if (table.tableNumber === 1 || table.tableNumber === 5) {
                        locationText = " - Window Seat";
                      } else if (table.tableNumber === 13) {
                        locationText = " - Chef's Grill";
                      }
                      return (
                        <option key={table.id} value={table.id}>
                          Table {table.tableNumber} (Up to {table.capacity}){locationText}
                        </option>
                      )
                    })}
                  </select>
                )}
                
                {tables.find(t => t.id === parseInt(selectedTable))?.tableNumber === 13 && availableTables.length > 0 && (
                  <small style={{color: '#ffcc00', marginTop: '5px', display: 'block', fontWeight: 'bold'}}>
                    *Note: This table is located directly next to the Chef's Grill.
                  </small>
                )}
              </div>
            </div>

            <div className="flex-row">
              <div className="form-group">
                <label>Date</label>
                <input type="date" required min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: '0.5' }}>
                <label>Guests</label>
                <input type="number" min="1" max="25" required value={partySize} onChange={(e) => setPartySize(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Special Requests</label>
              <textarea rows="2" value={requests} onChange={(e) => setRequests(e.target.value)} />
            </div>

            {availableTables.length > 0 && (
              <button type="submit" className="submit-btn">REQUEST RESERVATION</button>
            )}
          </form>

          {message && <div className={`message-box ${isSuccess ? 'success' : 'error'}`}>{message}</div>}

          <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #444', textAlign: 'center' }}>
            <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
              No availability or booking a large event? Call us directly!
            </p>
            <p style={{ margin: '0', fontSize: '1.2rem', color: '#ffcc00', fontWeight: 'bold' }}>
              +44 20 7946 0958
            </p>
          </div>

        </div>
      ) : (
        <div className="booking-panel" style={{ maxWidth: '1000px' }}>
          <h2>Upcoming Reservations</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Guest Name</th>
                <th>Table #</th>
                <th>Party Size</th>
                <th>Special Requests</th>
              </tr>
            </thead>
            <tbody>
              {allBookings.map(booking => (
                <tr key={booking.id}>
                  <td><strong>{booking.bookingDate}</strong> <br /> {booking.bookingTime}</td>
                  <td>{booking.customer?.fullName || "No Name"} <br /> <span style={{ fontSize: '0.8rem', color: '#888' }}>{booking.customer?.phone}</span></td>
                  <td>{booking.restaurantTable?.tableNumber || "N/A"}</td>
                  <td>{booking.partySize} Guests</td>
                  <td>{booking.specialRequests || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {allBookings.length === 0 && <p style={{ textAlign: 'center', marginTop: '20px' }}>No reservations found.</p>}
        </div>
      )}
    </div>
  )
}

export default App