import { useEffect, useState } from 'react'
import './App.css'

function App() {
  // Navigation State
  const [view, setView] = useState("customer") 

  // Data States
  const [tables, setTables] = useState([])
  const [allBookings, setAllBookings] = useState([])

  // Form States
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

  // --- DATE LIMIT LOGIC ---
  const today = new Date();
  const minDate = today.toISOString().split('T')[0]; 
  const futureDate = new Date(today);
  futureDate.setMonth(today.getMonth() + 3);
  const maxDate = futureDate.toISOString().split('T')[0]; 

  // Fetch Tables
  useEffect(() => {
    fetch('https://myhosh-backend.onrender.com/api/tables')
      .then(response => response.json())
      .then(data => setTables(data))
      .catch(err => console.error("Error fetching tables:", err))
  }, [])

  // Fetch Bookings (Staff View)
  useEffect(() => {
    if (view === "admin") {
      fetch('https://myhosh-backend.onrender.com/api/bookings')
        .then(response => response.json())
        .then(data => setAllBookings(data))
        .catch(err => console.error("Error fetching bookings:", err))
    }
  }, [view])

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay(); 
    const selectedTime = time; 

    // Rule 1: Closed on Tuesdays
    if (dayOfWeek === 2) {
      setIsSuccess(false);
      setMessage("We are closed on Tuesdays. Please select another day.");
      return; 
    }

    // Rule 2: Opening and Closing Times
    let minTime = "16:00"; // Mon-Fri
    let maxTime = "21:00"; 

    if (dayOfWeek === 0 || dayOfWeek === 6) { 
      minTime = "12:00"; // Weekends
    }
    if (dayOfWeek === 0) { 
      maxTime = "20:45"; // Sunday early close
    }

    // Rule 3: Time window validation
    if (selectedTime < minTime || selectedTime > maxTime) {
      setIsSuccess(false);
      setMessage(`For the selected day, please choose a time between ${minTime} and ${maxTime}.`);
      return; 
    }

    // Rule 4: Same-Day Cutoff Logic
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

  // --- SMART TABLE FILTERING LOGIC ---
  const availableTables = tables.filter(table => {
    const numGuests = parseInt(partySize) || 2;
    if (numGuests >= 11) return table.tableNumber === 5;
    if (numGuests >= 9) return table.tableNumber === 2 || table.tableNumber === 5;
    if (numGuests >= 7) return table.tableNumber === 1 || table.tableNumber === 2 || table.tableNumber === 5;
    return true; 
  });

  return (
    <div className="restaurant-container">
      
      {/* NAVIGATION BAR */}
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
                <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                  {availableTables.map(table => {
                    
                    // --- ALL TABLE LOCATIONS DEFINED HERE ---
                    let locationText = " - Main Restaurant"; // Default for 2, 3, 4, 6, 7, 8, 9, 10
                    
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
                
                {tables.find(t => t.id === parseInt(selectedTable))?.tableNumber === 13 && (
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
                <input type="number" min="1" max="20" required value={partySize} onChange={(e) => setPartySize(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Special Requests</label>
              <textarea rows="2" value={requests} onChange={(e) => setRequests(e.target.value)} />
            </div>

            <button type="submit" className="submit-btn">REQUEST RESERVATION</button>
          </form>
          {message && <div className={`message-box ${isSuccess ? 'success' : 'error'}`}>{message}</div>}
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