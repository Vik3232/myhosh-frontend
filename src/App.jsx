import { useEffect, useState } from 'react'
import './App.css'

function App() {
  // --- STATE VARIABLES ---
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

 // --- STAFF AUTHENTICATION STATES ---
 const [isAuthenticated, setIsAuthenticated] = useState(false)
 const [currentUser, setCurrentUser] = useState(null) // stores { id, username, role }
 const [loginUsername, setLoginUsername] = useState("")
 const [loginPassword, setLoginPassword] = useState("")
 const [loginError, setLoginError] = useState("")

 // --- NEW STAFF REGISTRATION STATES (ADMIN ONLY) ---
 const [newStaffUsername, setNewStaffUsername] = useState("")
 const [newStaffPassword, setNewStaffPassword] = useState("")
 const [newStaffRole, setNewStaffRole] = useState("STAFF")
 const [staffRegMessage, setStaffRegMessage] = useState("")
 const [adminDateFilter, setAdminDateFilter] = useState("ALL")
 // --- CANCELLATION MODAL & NOTES STATES ---
 const [cancelModalBooking, setCancelModalBooking] = useState(null);
 const [cancelReason, setCancelReason] = useState("Guest requested cancellation");
 const [customReasonText, setCustomReasonText] = useState("");
 const [activeNotes, setActiveNotes] = useState({});

  // --- BUSINESS RULES VARIABLES ---
  const today = new Date();
  const minDate = today.toISOString().split('T')[0]; 
  const futureDate = new Date(today);
  futureDate.setMonth(today.getMonth() + 3);
  const maxDate = futureDate.toISOString().split('T')[0]; 

  // --- DATA FETCHING ---
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

  // --- BOOKING SUBMISSION LOGIC ---
  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay(); 
    const selectedTime = time; 

    // 1. Basic Business Hours Checks
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

    // 2. COMMERCIAL FEATURE: STRICT LIVE ANTI-SPAM PHONE BLOCK
    setMessage("Verifying availability...");
    
    try {
      const liveResponse = await fetch('https://myhosh-backend.onrender.com/api/bookings');
      if (!liveResponse.ok) throw new Error("Network response was not OK");
      const liveBookings = await liveResponse.json();

      const cleanInputPhone = String(phone).replace(/\D/g, '');
      const inputDate = String(date);

      const phoneAlreadyBooked = liveBookings.some((booking) => {
        const existingPhone = String(booking.customer?.phone || "").replace(/\D/g, '');
        const existingDate = String(booking.bookingDate);
        return existingDate === inputDate && existingPhone === cleanInputPhone;
      });

      if (phoneAlreadyBooked) {
        setIsSuccess(false);
        setMessage("❌ Anti-Spam Protection: A reservation is already secured under this phone number for this date.");
        return; 
      }
    } catch (err) {
      console.error("Anti-spam security check failed to complete:", err);
      setIsSuccess(false);
      setMessage("System verification timeout. Please click submit again.");
      return; 
    }

    // 3. Process the Actual Booking
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

 
  // --- STAFF SECURITY GATEWAY LOGIC (BACKEND INTEGRATED) ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch('https://myhosh-backend.onrender.com/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword
        })
      });

      if (response.ok) {
        const staffData = await response.json();
        setIsAuthenticated(true);
        setCurrentUser(staffData);
        setLoginUsername("");
        setLoginPassword("");
        setLoginError("");
      } else {
        const errorText = await response.text();
        setLoginError(errorText || "Invalid username or password.");
      }
    } catch (err) {
      console.error("Login connection error:", err);
      setLoginError("Unable to reach authentication server. Please try again.");
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffRegMessage("Creating account...");

    try {
      const response = await fetch('https://myhosh-backend.onrender.com/api/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newStaffUsername.trim(),
          password: newStaffPassword,
          role: newStaffRole
        })
      });

      if (response.ok) {
        setStaffRegMessage(`Account created successfully for ${newStaffUsername} (${newStaffRole}).`);
        setNewStaffUsername("");
        setNewStaffPassword("");
        setNewStaffRole("STAFF");
      } else {
        const errText = await response.text();
        setStaffRegMessage(`Error: ${errText || "Could not create user."}`);
      }
    } catch (err) {
      console.error("Staff creation error:", err);
      setStaffRegMessage("Error: Failed to connect to server.");
    }
  };

  // --- CANCEL BOOKING (STAFF & ADMIN) ---
  // --- SAVE STAFF NOTE ---
  const handleSaveNote = async (bookingId) => {
    const noteText = activeNotes[bookingId] ?? "";
    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${bookingId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteText })
      });
      if (response.ok) {
        const updated = await response.json();
        setAllBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
        alert("Staff note saved successfully.");
      } else {
        alert("Failed to save note.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error saving note.");
    }
  };

  // --- CONFIRM CANCEL WITH REASON ---
  const handleConfirmCancellation = async () => {
    if (!cancelModalBooking) return;
    const finalReason = cancelReason === "Other" ? customReasonText : cancelReason;

    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${cancelModalBooking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason })
      });

      if (response.ok) {
        setAllBookings(prev => prev.filter(b => b.id !== cancelModalBooking.id));
        alert(`Reservation cancelled. Customer notified with reason: "${finalReason}"`);
        setCancelModalBooking(null);
        setCustomReasonText("");
      } else {
        alert("Failed to process cancellation.");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      alert("Network error processing cancellation.");
    }
  };

  // --- REASSIGN TABLE (STAFF & ADMIN) ---
  const handleReassignTable = async (bookingId, newTableId) => {
    if (!newTableId) return;

    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${bookingId}/table/${newTableId}`, {
        method: 'PUT'
      });

      if (response.ok) {
        const updatedBooking = await response.json();
        // Update booking in local state
        setAllBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      } else {
        const errorMsg = await response.text();
        alert(`Cannot reassign table: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Reassign error:", err);
      alert("Network error: Could not reassign table.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginUsername("");
    setLoginPassword("");
    setStaffRegMessage("");
    setView("customer");
  };

  // --- ADMIN DASHBOARD DATE FILTER LOGIC ---
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const displayedBookings = allBookings.filter(b => {
    if (adminDateFilter === "ALL") return true;
    return b.bookingDate === adminDateFilter;
  });

  const totalGuests = displayedBookings.reduce((sum, b) => sum + (b.partySize || 0), 0);

  // --- UI RENDER ---
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
          {!isAuthenticated ? (
            <div className="login-container" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
              <h2>Staff Gateway</h2>
              <p style={{ color: '#888', marginBottom: '20px' }}>Authorized personnel only.</p>
              <form onSubmit={handleAdminLogin}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                  <input 
                    type="text" 
                    placeholder="Staff Username" 
                    value={loginUsername} 
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    autoComplete="off"
                    style={{ textAlign: 'center' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <input 
                    type="password" 
                    placeholder="Staff Password" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ textAlign: 'center' }}
                  />
                </div>
                {loginError && <div style={{ color: '#ff4444', margin: '10px 0', fontSize: '0.9rem' }}>{loginError}</div>}
                <button type="submit" className="submit-btn" style={{ marginTop: '15px' }}>ACCESS SYSTEM</button>
              </form>
            </div>
          ) : (
            <>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: 0 }}>Live Reservations Dashboard</h2>
                  <small style={{ color: '#ffcc00' }}>
                    Logged in as: <strong>{currentUser?.username}</strong> ({currentUser?.role})
                  </small>
                </div>
                <button onClick={handleLogout} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}>
                  Secure Logout
                </button>
              </div>

              {/* ADMIN-ONLY PANEL: CREATE NEW STAFF */}
              {currentUser?.role === "ADMIN" && (
                <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #333' }}>
                  <h3 style={{ marginTop: 0, color: '#ffcc00' }}>Admin Control: Register New Staff Member</h3>
                  <form onSubmit={handleCreateStaff} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1', minWidth: '160px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Username</label>
                      <input 
                        type="text" 
                        required 
                        value={newStaffUsername} 
                        onChange={(e) => setNewStaffUsername(e.target.value)} 
                        placeholder="e.g. manager1"
                      />
                    </div>
                    <div style={{ flex: '1', minWidth: '160px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Password</label>
                      <input 
                        type="password" 
                        required 
                        value={newStaffPassword} 
                        onChange={(e) => setNewStaffPassword(e.target.value)} 
                        placeholder="Temporary password"
                      />
                    </div>
                    <div style={{ width: '130px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Role</label>
                      <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)}>
                        <option value="STAFF">STAFF</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                    <button type="submit" className="submit-btn" style={{ padding: '10px 20px', width: 'auto' }}>
                      CREATE ACCOUNT
                    </button>
                  </form>
                  {staffRegMessage && (
                    <div style={{ marginTop: '10px', fontSize: '0.85rem', color: staffRegMessage.startsWith('Error') ? '#ff4444' : '#00ff88' }}>
                      {staffRegMessage}
                    </div>
                  )}
                </div>
              )}

              {/* FILTER TOOLBAR & SHIFT METRICS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', backgroundColor: '#181818', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #2a2a2a' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>FILTER SERVICE:</span>
                  <button 
                    type="button"
                    onClick={() => setAdminDateFilter("ALL")}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: adminDateFilter === "ALL" ? '#ffcc00' : '#2b2b2b', color: adminDateFilter === "ALL" ? '#000' : '#fff', fontWeight: 'bold' }}>
                    All Dates
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAdminDateFilter(todayStr)}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: adminDateFilter === todayStr ? '#ffcc00' : '#2b2b2b', color: adminDateFilter === todayStr ? '#000' : '#fff', fontWeight: 'bold' }}>
                    Today
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAdminDateFilter(tomorrowStr)}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: adminDateFilter === tomorrowStr ? '#ffcc00' : '#2b2b2b', color: adminDateFilter === tomorrowStr ? '#000' : '#fff', fontWeight: 'bold' }}>
                    Tomorrow
                  </button>
                  <input 
                    type="date"
                    value={adminDateFilter === "ALL" ? "" : adminDateFilter}
                    onChange={(e) => setAdminDateFilter(e.target.value || "ALL")}
                    style={{ padding: '5px 10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
                  <div>Reservations: <strong style={{ color: '#ffcc00' }}>{displayedBookings.length}</strong></div>
                  <div>Expected Covers: <strong style={{ color: '#ffcc00' }}>{totalGuests}</strong></div>
                </div>
              </div>
             
                  {/* RESERVATIONS DISPLAYED IN DATE BLOCKS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {Array.from(new Set(displayedBookings.map(b => b.bookingDate))).sort().map(bookingDate => {
                  const dateBookings = displayedBookings.filter(b => b.bookingDate === bookingDate);

                  return (
                    <div key={bookingDate} style={{ background: '#121212', borderRadius: '10px', border: '1px solid #2a2a2a', overflow: 'hidden' }}>
                      {/* DATE HEADER BANNER ON TOP */}
                      <div style={{ background: 'linear-gradient(90deg, #222, #181818)', padding: '12px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ffcc00' }}>
                          📅 {new Date(bookingDate + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#888' }}>
                          {dateBookings.length} {dateBookings.length === 1 ? 'reservation' : 'reservations'}
                        </span>
                      </div>

                      {/* BOOKING CARDS GRID */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '15px', padding: '15px' }}>
                        {dateBookings.map(booking => (
                          <div key={booking.id} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>

                            {/* Card Header: Time & Table */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a2a', paddingBottom: '8px' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffcc00' }}>
                                ⏰ {booking.bookingTime}
                              </span>
                              <span style={{ background: '#2b2304', color: '#ffcc00', border: '1px solid #665200', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                Table {booking.restaurantTable?.tableNumber || "N/A"} ({booking.partySize} Guests)
                              </span>
                             </div>

                            {/* Guest Information */}
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#fff' }}>
                                {booking.customer?.fullName || "No Name"}
                              </h4>
                              <div style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: '1.4' }}>
                                📞 {booking.customer?.phone || "N/A"} <br />
                                ✉️ {booking.customer?.email || "N/A"}
                              </div>
                              {booking.specialRequests && (
                                <div style={{ marginTop: '8px', padding: '6px 10px', background: '#242424', borderRadius: '4px', fontSize: '0.8rem', color: '#ddd' }}>
                                  <strong>Guest Note:</strong> {booking.specialRequests}
                                </div>
                              )}
                            </div>

                            {/* Staff Internal Notes Field */}
                            <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: '6px', padding: '10px' }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#ffcc00', fontWeight: 'bold', marginBottom: '4px' }}>
                                📝 STAFF INTERNAL NOTES:
                              </label>
                              <textarea
                                rows="2"
                                placeholder="Add notes (e.g. VIP, anniversary, high chair)..."
                                value={activeNotes[booking.id] !== undefined ? activeNotes[booking.id] : (booking.staffNotes || "")}
                                onChange={(e) => setActiveNotes({ ...activeNotes, [booking.id]: e.target.value })}
                                style={{ width: '100%', background: '#202020', border: '1px solid #3d3d3d', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem', resize: 'vertical' }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveNote(booking.id)}
                                style={{ marginTop: '6px', padding: '4px 10px', fontSize: '0.75rem', background: '#2e2e2e', color: '#ffcc00', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', float: 'right' }}>
                                Save Note
                              </button>
                              <div style={{ clear: 'both' }}></div>
                            </div>

                            {/* Card Actions: Move Table & Cancel */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #2a2a2a', gap: '8px' }}>
                              <select 
                                defaultValue=""
                                onChange={(e) => {
                                  handleReassignTable(booking.id, e.target.value);
                                  e.target.value = "";
                                }}
                                style={{ flex: '1', padding: '6px', fontSize: '0.8rem', background: '#222', color: '#ccc', border: '1px solid #444', borderRadius: '4px' }}>
                                <option value="" disabled>Move Table...</option>
                                {tables.map(t => (
                                  <option key={t.id} value={t.id} disabled={t.id === booking.restaurantTable?.id}>
                                    Table {t.tableNumber} (Seats {t.capacity})
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => setCancelModalBooking(booking)}
                                style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#3d1212', color: '#ff7777', border: '1px solid #6b2020', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                CANCEL
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {displayedBookings.length === 0 && (
                  <p style={{ textAlign: 'center', marginTop: '30px', color: '#888' }}>No reservations found for this selection.</p>
                )}
              </div>

              {/* CANCELLATION MODAL (POPUP) */}
              {cancelModalBooking && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                  <div style={{ background: '#1c1c1c', border: '1px solid #444', borderRadius: '10px', padding: '25px', width: '90%', maxWidth: '460px', color: '#fff' }}>
                    <h3 style={{ marginTop: 0, color: '#ff6666' }}>Cancel Reservation</h3>
                    <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '15px' }}>
                      Are you sure you want to cancel the booking for <strong>{cancelModalBooking.customer?.fullName}</strong> on <strong>{cancelModalBooking.bookingDate}</strong> at <strong>{cancelModalBooking.bookingTime}</strong>?
                    </p>

                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#ffcc00' }}>
                      Cancellation Reason (sent to guest):
                    </label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#252525', border: '1px solid #444', color: '#fff', borderRadius: '4px', marginBottom: '12px' }}>
                      <option value="Guest requested cancellation">Guest requested cancellation</option>
                      <option value="Customer was a no-show">Customer was a no-show</option>
                      <option value="Operational capacity / kitchen issue">Operational capacity / kitchen issue</option>
                      <option value="Table double-booking resolved">Table double-booking resolved</option>
                      <option value="Other">Other (Enter custom reason)</option>
                    </select>

                    {cancelReason === "Other" && (
                      <textarea
                        rows="3"
                        placeholder="Type cancellation details for the customer..."
                        value={customReasonText}
                        onChange={(e) => setCustomReasonText(e.target.value)}
                        style={{ width: '100%', padding: '8px', background: '#252525', border: '1px solid #444', color: '#fff', borderRadius: '4px', marginBottom: '15px' }}
                      />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                      <button
                        type="button"
                        onClick={() => setCancelModalBooking(null)}
                        style={{ padding: '8px 16px', background: '#333', color: '#ccc', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}>
                        Keep Booking
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCancellation}
                        style={{ padding: '8px 16px', background: '#8a1c1c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Confirm & Notify Guest
                      </button>
                    </div>
                  </div>
                </div>
              )}  
                 
              
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App