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
  const handleCancelBooking = async (bookingId, guestName) => {
    const confirmCancel = window.confirm(`Are you sure you want to cancel the reservation for ${guestName || "this guest"}?`);
    if (!confirmCancel) return;

    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAllBookings(prev => prev.filter(b => b.id !== bookingId));
      } else {
        const errorText = await response.text();
        alert(`Server Error ${response.status}: ${errorText || "Action rejected by backend"}`);
      }
    } catch (err) {
      console.error("Cancel error:", err);
      alert(`Network connection failure: ${err.message}`);
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
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Guest Name</th>
                    <th>Current Table</th>
                    <th>Party Size</th>
                    <th>Special Requests</th>
                    <th style={{ textAlign: 'center' }}>Staff Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedBookings.map(booking => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.bookingDate}</strong> <br /> 
                        {booking.bookingTime}
                      </td>
                      <td>
                        {booking.customer?.fullName || "No Name"} <br /> 
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>{booking.customer?.phone}</span>
                      </td>
                      <td>
                        <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>
                          Table {booking.restaurantTable?.tableNumber || "N/A"}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#777' }}>
                          (Cap: {booking.restaurantTable?.capacity || "N/A"})
                        </div>
                      </td>
                      <td>{booking.partySize} Guests</td>
                      <td>{booking.specialRequests || "None"}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          {/* Reassign Table Dropdown */}
                          <select 
                            defaultValue=""
                            onChange={(e) => {
                              handleReassignTable(booking.id, e.target.value);
                              e.target.value = ""; // reset dropdown back to default
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer' }}>
                            <option value="" disabled>Move Table...</option>
                            {tables.map(t => (
                              <option 
                                key={t.id} 
                                value={t.id} 
                                disabled={t.id === booking.restaurantTable?.id}>
                                Table {t.tableNumber} (Seats {t.capacity})
                              </option>
                            ))}
                          </select>

                          {/* Cancel Booking Button */}
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(booking.id, booking.customer?.fullName)}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#441111', color: '#ff6666', border: '1px solid #772222', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            CANCEL
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayedBookings.length === 0 && <p style={{ textAlign: 'center', marginTop: '20px' }}>No reservations found for this selection.</p>}
              
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App