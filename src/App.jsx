import { useEffect, useState } from 'react'
import './App.css'

function App() {
  // --- STATE VARIABLES ---
  
  // --- SECURE SESSION LOCK ---
  const [view, setView] = useState(() => {
    return sessionStorage.getItem('myhosh_session') || 'customer';
  });
  useEffect(() => {
    sessionStorage.setItem('myhosh_session', view);
  }, [view]);

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
  
  // --- UI STATES ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const clientPhoneNumber = "+44 20 7946 0958"; // Confirm with client

  // --- SECURE PASSWORD & IDENTITY LOCK ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('myhosh_auth') === 'true';
  });
  useEffect(() => {
    sessionStorage.setItem('myhosh_auth', isAuthenticated);
  }, [isAuthenticated]);
  
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = sessionStorage.getItem('myhosh_currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('myhosh_currentUser', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('myhosh_currentUser');
    }
  }, [currentUser]); 
  
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  
  // --- STAFF REGISTRATION & DASHBOARD STATES ---
  const [newStaffUsername, setNewStaffUsername] = useState("")
  const [newStaffPassword, setNewStaffPassword] = useState("")
  const [newStaffRole, setNewStaffRole] = useState("STAFF")
  const [staffRegMessage, setStaffRegMessage] = useState("")
  const [adminDateFilter, setAdminDateFilter] = useState(new Date().toISOString().split('T')[0]);
  
  // --- MODAL & NOTES STATES ---
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editModalBooking, setEditModalBooking] = useState(null);
  const [modalNoteText, setModalNoteText] = useState("");
  const [cancelReason, setCancelReason] = useState("Guest requested cancellation");
  const [customReasonText, setCustomReasonText] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [viewMode, setViewMode] = useState('today');

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
      .catch(err => console.error("Error fetching tables:", err));
  }, []);

  const fetchBookings = async () => {
    try {
      const endpoint = viewMode === 'history' ? '/api/bookings/history' : '/api/bookings';
      const response = await fetch(`https://myhosh-backend.onrender.com${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        setAllBookings(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [view, isSuccess, viewMode]);

  // --- WALK-IN STATE & LOGIC ---
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInDetails, setWalkInDetails] = useState({ partySize: 2, tableId: '', customLocation: '' });

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchBookings();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSeatWalkIn = async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;

    if (dayOfWeek === 2) {
      alert("We are closed on Tuesdays. Walk-ins cannot be seated today.");
      return;
    }

    let minTime = "16:00"; 
    let maxTime = "21:00"; 
    if (dayOfWeek === 0 || dayOfWeek === 6) { minTime = "12:00"; }
    if (dayOfWeek === 0) { maxTime = "20:45"; }

    if (currentTimeStr < minTime || currentTimeStr > maxTime) {
      alert(`Walk-ins can only be seated during today's active business hours (${minTime} - ${maxTime}).`);
      return;
    }

    if (!walkInDetails.tableId) {
      alert("Please select a table or 'Other' to seat the walk-in.");
      return;
    }
    
    let finalTableId = walkInDetails.tableId;
    let guestName = "Walk-In Guest";
    if (finalTableId === 'OTHER') {
      if (tables.length === 0) return;
      finalTableId = tables[0].id; 
      guestName = `Walk-In Guest (Location: ${walkInDetails.customLocation || 'Other'})`;
    }
    
    const newBooking = {
      customer: { fullName: guestName, email: "walkin@myhosh.local", phone: "N/A" },
      restaurantTable: { id: parseInt(finalTableId) },
      bookingDate: now.toISOString().split('T')[0],
      bookingTime: currentTimeStr + ":00", 
      partySize: parseInt(walkInDetails.partySize),
      status: "ARRIVED"
    };

    try {
      const response = await fetch('https://myhosh-backend.onrender.com/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      });
      if (response.ok) {
        setShowWalkInModal(false);
        setWalkInDetails({ partySize: 2, tableId: '', customLocation: '' }); 
        fetchBookings();
      } else {
        alert("That table is currently occupied! Please select another.");
      }
    } catch (error) {
      console.error("Walk-in error", error);
    }
  };

  const handleExportCSV = () => {
    if (displayedBookings.length === 0) {
      alert("No bookings to export for this view.");
      return;
    }
    const headers = ["ID", "Guest Name", "Email", "Phone", "Date", "Time", "Party Size", "Table", "Status"];
    const rows = displayedBookings.map(b => [
      b.id, `"${b.customer?.fullName || 'Walk-In Guest'}"`, `"${b.customer?.email || 'N/A'}"`, `"${b.customer?.phone || 'N/A'}"`,
      b.bookingDate, b.bookingTime, b.partySize, b.restaurantTable?.tableNumber || "Other", b.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MyHosh_Reservations_${adminDateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- BOOKING SUBMISSION LOGIC ---
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    const selectedTime = time;
    
    if (dayOfWeek === 2) {
      setIsSuccess(false); setMessage("We are closed on Tuesdays. Please select another day."); return;
    }
    let minTime = "16:00"; let maxTime = "21:00";
    if (dayOfWeek === 0 || dayOfWeek === 6) { minTime = "12:00"; }
    if (dayOfWeek === 0) { maxTime = "20:45"; }
    
    if (selectedTime < minTime || selectedTime > maxTime) {
      setIsSuccess(false); setMessage(`For the selected day, please choose a time between ${minTime} and ${maxTime}.`); return;
    }
    if (date === minDate) {
      const currentHour = today.getHours().toString().padStart(2, '0');
      const currentMinute = today.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;
      if (currentTimeStr >= minTime) {
        setIsSuccess(false); setMessage(`Online reservations for today closed at ${minTime}. Please call the restaurant directly for walk-in availability.`); return;
      }
    }
    
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
        setIsSuccess(false); setMessage("❌ Anti-Spam Protection: A reservation is already secured under this phone number for this date."); return;
      }
    } catch (err) {
      console.error("Anti-spam security check failed to complete:", err);
      setIsSuccess(false); setMessage("System verification timeout. Please click submit again."); return;
    }

    setMessage("Processing reservation...");
    setIsProcessing(true);
    const newBooking = {
      customer: { fullName, email, phone },
      restaurantTable: { id: parseInt(selectedTable) },
      bookingDate: date, bookingTime: time + ":00", partySize: parseInt(partySize), specialRequests: requests
    };
    try {
      const response = await fetch('https://myhosh-backend.onrender.com/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBooking)
      });
      if (response.ok) {
        setIsSuccess(true);
        setMessage(`Reservation Confirmed for ${fullName}. We look forward to hosting you.`);
        setFullName(""); setEmail(""); setPhone(""); setRequests("");
      } else {
        const errorText = await response.text();
        setIsSuccess(false); setMessage(errorText || "Failed to secure reservation. Please try another time.");
      }
    } catch (err) {
      setIsSuccess(false); setMessage("System error: Unable to connect to the reservation network.");
    } finally {
      setIsProcessing(false);
    }
  };

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
          if (selectedStart < existingEnd && selectedEnd > existingStart) return false;
        }
      }
    }
    return true;
  });

  useEffect(() => {
    if (availableTables.length > 0) {
      const currentTableIsValid = availableTables.some(t => t.id.toString() === selectedTable.toString());
      if (!currentTableIsValid) {
        setSelectedTable(availableTables[0].id.toString());
      }
    }
  }, [tables, partySize, date, time]);

  // --- STAFF SECURITY GATEWAY ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const response = await fetch("https://myhosh-backend.onrender.com/api/staff/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      if (response.ok) {
        const staffData = await response.json();
        setCurrentUser(staffData); setIsAuthenticated(true); fetchBookings();
      } else {
        alert("Invalid staff username or password.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Network error: Server may be waking up. Please wait 10 seconds and try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffRegMessage("Creating account...");
    try {
      const response = await fetch('https://myhosh-backend.onrender.com/api/staff/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newStaffUsername.trim(), password: newStaffPassword, role: newStaffRole })
      });
      if (response.ok) {
        setStaffRegMessage(`Account created successfully for ${newStaffUsername} (${newStaffRole}).`);
        setNewStaffUsername(""); setNewStaffPassword(""); setNewStaffRole("STAFF");
      } else {
        const errText = await response.text();
        setStaffRegMessage(`Error: ${errText || "Could not create user."}`);
      }
    } catch (err) {
      setStaffRegMessage("Error: Failed to connect to server.");
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancelModalBooking) return;
    const finalReason = cancelReason === "Other" ? customReasonText : cancelReason;
    setIsProcessing(true);
    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${cancelModalBooking.id}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason })
      });
      if (response.ok) {
        setAllBookings(prev => prev.filter(b => b.id !== cancelModalBooking.id));
        alert(`Reservation cancelled. Customer notified with reason: "${finalReason}"`);
        setCancelModalBooking(null); setCustomReasonText("");
      } else {
        alert("Failed to process cancellation.");
      }
    } catch (err) {
      alert("Network error processing cancellation.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEdit = (booking) => {
    setEditModalBooking(booking);
    setModalNoteText(booking.staffNotes || "");
  };

  const handleSaveModalNote = async () => {
    if (!editModalBooking) return;
    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${editModalBooking.id}/notes`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: modalNoteText })
      });
      if (response.ok) {
        const updated = await response.json();
        setAllBookings(prev => prev.map(b => b.id === editModalBooking.id ? updated : b));
        setEditModalBooking(updated); alert("Staff note saved successfully.");
      } else { alert("Failed to save note."); }
    } catch (err) { alert("Network error saving note."); }
  };

  const handleModalTimeChange = async (newTime) => {
    if (!newTime || !editModalBooking) return;
    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${editModalBooking.id}/time`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingTime: newTime })
      });
      if (response.ok) {
        const updated = await response.json();
        setAllBookings(prev => prev.map(b => b.id === editModalBooking.id ? updated : b));
        setEditModalBooking(updated); alert(`Time updated to ${newTime}.`);
      } else { alert("Failed to update time."); }
    } catch (err) { alert("Network error updating time."); }
  };

  const handleModalTableChange = async (newTableId) => {
    if (!newTableId || !editModalBooking) return;
    try {
      const response = await fetch(`https://myhosh-backend.onrender.com/api/bookings/${editModalBooking.id}/table/${newTableId}`, { method: 'PUT' });
      if (response.ok) {
        const updated = await response.json();
        setAllBookings(prev => prev.map(b => b.id === editModalBooking.id ? updated : b));
        setEditModalBooking(updated); alert("Table reassigned successfully.");
      } else {
        const errMsg = await response.text(); alert(`Could not reassign table: ${errMsg}`);
      }
    } catch (err) { alert("Network error reassigning table."); }
  };

  const handleLogout = () => {
    setCurrentUser(null); setIsAuthenticated(false); setView('customer'); sessionStorage.clear();
  };

  const displayedBookings = allBookings.filter(b => {
    if (adminDateFilter === "ALL") return true;
    return b.bookingDate === adminDateFilter;
  });
  const totalGuests = displayedBookings.reduce((sum, b) => sum + (b.partySize || 0), 0);

  // --- UI RENDER ---
  return (
    <>
      {/* GLOBAL HEADER (VISIBLE IN BOTH VIEWS) */}
      <header className="site-header">
        <div className="brand-logo" onClick={() => setView('customer')} style={{cursor: 'pointer'}}>
          MYHOSH
          <small>Salisbury</small>
        </div>
        
        {/* DESKTOP NAV */}
        <nav className="nav-links">
          {view === 'customer' && (
            <>
              <a href="#menu" className="nav-link">Menu</a>
              <a href="#space" className="nav-link">Our Space</a>
              <a href="#visit" className="nav-link">Visit Us</a>
            </>
          )}
          {view === 'customer' ? (
            <button onClick={() => setView('admin')} className="nav-link" style={{background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0}}>
              Staff Login
            </button>
          ) : (
            <button onClick={() => setView('customer')} className="nav-link" style={{background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0}}>
              Return to Site
            </button>
          )}
          {view === 'customer' && (
            <a href="#reserve" className="btn btn-primary" style={{ minHeight: '40px', padding: '10px 20px' }}>Reserve</a>
          )}
        </nav>
        
        {/* MOBILE HAMBURGER BUTTON */}
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </header>

      {/* MOBILE DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <div style={{ position: 'fixed', top: '70px', left: 0, width: '100%', background: 'var(--clr-cream)', borderBottom: '1px solid var(--clr-gold-soft)', padding: '20px', zIndex: 99, display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: 'var(--shadow-soft)' }}>
          {view === 'customer' && (
            <>
              <a href="#menu" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase' }}>Menu</a>
              <a href="#space" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase' }}>Our Space</a>
              <a href="#visit" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase' }}>Visit Us</a>
            </>
          )}
          
          {view === 'customer' ? (
            <button onClick={() => { setIsMobileMenuOpen(false); setView('admin'); }} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase', background: 'none', border: 'none', textAlign: 'left', padding: 0, fontFamily: 'var(--font-body)', cursor: 'pointer', color: 'var(--clr-charcoal)' }}>
              Staff Login
            </button>
          ) : (
            <button onClick={() => { setIsMobileMenuOpen(false); setView('customer'); }} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase', background: 'none', border: 'none', textAlign: 'left', padding: 0, fontFamily: 'var(--font-body)', cursor: 'pointer', color: 'var(--clr-charcoal)' }}>
              Return to Site
            </button>
          )}
          
          {view === 'customer' && (
            <a href="#reserve" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase', color: 'var(--clr-emerald)' }}>Reserve a Table</a>
          )}
        </div>
      )}

      {view === "customer" ? (
        <div className="customer-view">
          
          {/* HERO */}
          <section className="hero-section">
            <img src="/images/meze-spread.webp" alt="Turkish meze spread" className="hero-bg fade-in" />
            <div className="hero-overlay"></div>
            <div className="hero-content fade-in">
              <h1>Authentic Turkish Hospitality</h1>
              <p>Charcoal grill, fresh meze, and a warm dining experience in the heart of Salisbury.</p>
              <div className="hero-actions">
                <a href="#reserve" className="btn btn-primary">Reserve a Table</a>
                <button onClick={() => setIsLightboxOpen(true)} className="btn btn-secondary" style={{color: '#FBF6EA', borderColor: '#FBF6EA'}}>View Menu</button>
              </div>
            </div>
          </section>

          {/* FEATURE STRIP */}
          <section className="feature-strip">
            <div className="feature-item">
              <svg className="feature-icon" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path><path d="M9.828 15.828a4 4 0 015.656-5.656S15 12 13 13c0-2-2.5-3-4-3 1.5 2 2.5 3 2.5 4.5 0 1.5-1.686 3-1.672 1.328z"></path></svg>
              <h3>Charcoal Grill</h3>
              <p>Authentic fire-roasted meats and skewers.</p>
            </div>
            <div className="feature-item">
              <svg className="feature-icon" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15c0-4.418-4.03-8-9-8s-9 3.582-9 8h18z"></path><path d="M12 7V3M8 5v2M16 5v2"></path><path d="M3 15h18v2a4 4 0 01-4 4H7a4 4 0 01-4-4v-2z"></path></svg>
              <h3>Fresh Meze</h3>
              <p>Traditional cold and hot starters prepared daily.</p>
            </div>
            <div className="feature-item">
              <svg className="feature-icon" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
              <h3>Warm Welcome</h3>
              <p>A beautifully designed space to relax and dine.</p>
            </div>
          </section>

          {/* MENU HIGHLIGHTS */}
          <section id="menu" className="menu-section">
            <div className="menu-section-header">
              <h2>Signature Dishes</h2>
              <div className="gold-divider"><span></span></div>
              <p className="text-muted">A selection of our favourites. Please verify prices against our full menu.</p>
            </div>
            <div className="menu-grid">
              <div className="menu-card">
                <div className="menu-item-info">
                  <h4>Cold Meze Platter</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Humus, Cacik, Kisir, Stuffed Vine Leaves, Beetroot Yoghurt, Aubergine Napolitana</p>
                </div>
                <div className="menu-item-price">£14.95</div>
              </div>
              <div className="menu-card">
                <div className="menu-item-info">
                  <h4>Hot Meze Platter</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Borek, Calamari, Whitebait, Halloumi Cheese, Falafel, Sucuk</p>
                </div>
                <div className="menu-item-price">£15.95</div>
              </div>
              <div className="menu-card">
                <div className="menu-item-info">
                  <h4>Adana Kebab</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Lean minced lamb skewered and grilled over charcoal</p>
                </div>
                <div className="menu-item-price">£18.95</div>
              </div>
              <div className="menu-card">
                <div className="menu-item-info">
                  <h4>Lamb Shish</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Marinated tender cubes of lamb skewered and grilled over charcoal</p>
                </div>
                <div className="menu-item-price">£21.95</div>
              </div>
              <div className="menu-card">
                <div className="menu-item-info">
                  <h4>Mixed Grill</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>A combination of Lamb Shish, Chicken Shish and Adana Kebab</p>
                </div>
                <div className="menu-item-price">£23.95</div>
              </div>
              <div className="menu-card">
                <div className="menu-item-info">
                  <h4>Grill Sharing Platter</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>For 3-4 People. Huge selection of grilled meats and starters.</p>
                </div>
                <div className="menu-item-price">£72.95</div>
              </div>
            </div>
            <div className="text-center">
              <button onClick={() => setIsLightboxOpen(true)} className="btn btn-emerald">View Full Menu</button>
            </div>
          </section>

          {/* OUR SPACE */}
          <section id="space" className="space-section">
            <div className="arch-image-container">
              <img src="/images/interior.webp" alt="MyHosh Interior" className="arch-mask" loading="lazy" />
            </div>
            <div className="space-content">
              <h2>An Elegant Atmosphere</h2>
              <div className="gold-divider" style={{justifyContent: 'flex-start', margin: '20px 0'}}><span></span></div>
              <p>Settle into our emerald velvet chairs, dine on white marble tables, and let our warm, candle-lit ambience transport you to the heart of Turkey.</p>
            </div>
          </section>

          {/* GRILL BAND */}
          <section className="image-band">
            <img src="/images/charcoal-grill.webp" alt="Charcoal Grill" loading="lazy" />
            <div className="overlay"></div>
            <h2>From the Charcoal Grill</h2>
          </section>

          {/* BOOKING SECTION */}
          <section id="reserve" className="booking-section">
            <div className="text-center" style={{ marginBottom: '40px' }}>
              <h2 style={{ color: 'var(--clr-cream)', fontSize: '2.5rem' }}>Reserve a Table</h2>
              <div className="gold-divider"><span></span></div>
              <div style={{ color: 'var(--clr-gold-pale)', fontSize: '0.95rem', background: 'rgba(0,0,0,0.3)', display: 'inline-block', padding: '15px 25px', borderRadius: '8px' }}>
                <strong>Opening Hours</strong><br/>
                Tuesday: Closed<br/>
                Mon, Wed, Thu, Fri: 16:00 - 21:00<br/>
                Sat: 12:00 - 21:00 | Sun: 12:00 - 20:45
              </div>
            </div>

            <div className="booking-container">
              <img src="/images/interior.webp" className="booking-image-side" alt="Interior Setting" loading="lazy" />
              
              <div className="booking-form-content">
                {isSuccess ? (
                  <div className="success-screen fade-in">
                    <div className="success-icon" style={{ fontSize: '4rem' }}>✅</div>
                    <h2>Reservation Confirmed</h2>
                    <p style={{ color: 'var(--clr-grey)', fontSize: '1.1rem', marginBottom: '15px' }}>
                      Thank you for booking with <strong>MyHosh</strong>.
                    </p>
                    <p style={{ color: 'var(--clr-grey)', fontSize: '0.95rem', marginBottom: '30px' }}>
                      We have successfully secured your table and sent a confirmation email to your inbox. We look forward to hosting you!
                    </p>
                    <button type="button" onClick={() => setIsSuccess(false)} className="btn btn-primary">
                      Book Another Table
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="fade-in">
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label>Full Name</label>
                        <input type="text" className="form-input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-input" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input type="tel" className="form-input" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div className="form-group full-width">
                        <label>Select Table</label>
                        {availableTables.length === 0 ? (
                          <div style={{ padding: '14px', backgroundColor: 'rgba(179, 64, 47, 0.1)', color: 'var(--clr-error)', border: '1px solid var(--clr-error)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>
                            No tables available for this time/party size online. Please try another time or call us directly!
                          </div>
                        ) : (
                          <select className="form-input" value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                            {availableTables.map(table => {
                              let locationText = " - Main Restaurant";
                              if (table.tableNumber === 1 || table.tableNumber === 5) locationText = " - Window Seat";
                              else if (table.tableNumber === 13) locationText = " - Chef's Grill";
                              return (
                                <option key={table.id} value={table.id}>
                                  Table {table.tableNumber} (Up to {table.capacity}){locationText}
                                </option>
                              )
                            })}
                          </select>
                        )}
                        {tables.find(t => t.id === parseInt(selectedTable))?.tableNumber === 13 && availableTables.length > 0 && (
                          <small style={{ color: 'var(--clr-gold)', marginTop: '8px', fontWeight: 'bold' }}>
                            *Note: This table is located directly next to the Chef's Grill.
                          </small>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" className="form-input" required min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Time</label>
                        <input type="time" className="form-input" required value={time} onChange={(e) => setTime(e.target.value)} />
                      </div>
                      <div className="form-group full-width">
                        <label>Guests</label>
                        <input type="number" className="form-input" min="1" max="25" required value={partySize} onChange={(e) => setPartySize(e.target.value)} />
                      </div>
                      <div className="form-group full-width">
                        <label>Special Requests</label>
                        <textarea className="form-input" rows="2" value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="Anniversary, allergies, high chair..."/>
                      </div>
                    </div>

                    {availableTables.length > 0 && (
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={message === "Processing reservation..." || message === "Verifying availability..."}>
                        {(message === "Processing reservation..." || message === "Verifying availability...") ? "Processing..." : "Reserve a Table"}
                      </button>
                    )}
                  </form>
                )}
                {message && <div className={`message-box ${isSuccess ? 'success' : message.includes('Processing') || message.includes('Verifying') ? 'loading' : 'error'}`}>{message}</div>}
              </div>
            </div>
          </section>

          {/* VISIT US */}
          <section id="visit" className="visit-section">
            <img src="/images/storefront.webp" alt="MyHosh Storefront" className="visit-image" loading="lazy" />
            <div className="visit-details">
              <h2>Visit Us</h2>
              <div className="gold-divider" style={{justifyContent: 'flex-start', margin: '15px 0'}}><span></span></div>
              <p>
                <strong>Address:</strong><br />
                [ADDRESS PLACEHOLDER]<br />
                Salisbury, UK
              </p>
              <p>
                <strong>Phone:</strong><br />
                <a href={`tel:${clientPhoneNumber.replace(/\s+/g, '')}`} className="text-emerald" style={{ fontWeight: 'bold' }}>{clientPhoneNumber}</a>
              </p>
              <p style={{ marginTop: '30px', fontSize: '0.95rem', color: 'var(--clr-grey)' }}>
                No online availability or booking a large event?<br />
                Please call the restaurant directly and we will do our best to accommodate you.
              </p>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="site-footer">
            <div className="footer-logo">MYHOSH</div>
            <div className="footer-links">
              <a href="#hero">Home</a>
              <a href="#menu">Menu</a>
              <a href="#reserve">Reserve</a>
              <a href="#visit">Contact</a>
            </div>
            <div className="footer-bottom">
              <span>&copy; {new Date().getFullYear()} MyHosh Salisbury. All rights reserved.</span>
            </div>
          </footer>

          {/* LIGHTBOX FOR MENU */}
          {isLightboxOpen && (
            <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
              <div className="lightbox-header">
                <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)}>✕</button>
              </div>
              <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                <img src="/images/menu.webp" alt="Full MyHosh Menu" loading="lazy" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-view">
          {!isAuthenticated ? (
            <div className="fade-in" style={{ maxWidth: '400px', margin: '10vh auto 0', padding: '40px 30px', background: 'var(--clr-marble)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(27,26,23,0.1)', textAlign: 'center', boxShadow: 'var(--shadow-soft)' }}>
              <h2 style={{ color: 'var(--clr-emerald)', margin: '0 0 10px 0' }}>Staff Gateway</h2>
              <p style={{ color: 'var(--clr-grey)', marginBottom: '30px', fontSize: '0.9rem' }}>Authorized personnel only.</p>
              <form onSubmit={handleAdminLogin}>
                <div style={{ marginBottom: '15px' }}>
                  <input type="text" placeholder="Staff Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required autoComplete="off" className="admin-input" style={{ width: '100%', textAlign: 'center' }} />
                </div>
                <div style={{ marginBottom: '25px' }}>
                  <input type="password" placeholder="Staff Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="new-password" className="admin-input" style={{ width: '100%', textAlign: 'center' }} />
                </div>
                {loginError && <div style={{ color: 'var(--clr-error)', marginBottom: '15px', fontSize: '0.9rem' }}>{loginError}</div>}
                <button type="submit" disabled={isLoggingIn} className="btn btn-primary" style={{ width: '100%' }}>
                  {isLoggingIn ? "Authenticating..." : "Access System"}
                </button>
              </form>
            </div>
          ) : (
            <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              
              {/* ADMIN HEADER */}
              <header className="admin-header">
                <div>
                  <h1>Live Reservations Dashboard</h1>
                  <div className="admin-user-badge">
                    Logged in as: <strong>{currentUser?.username}</strong> ({currentUser?.role})
                  </div>
                </div>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Secure Logout
                </button>
              </header>

              {/* ADMIN ONLY: CREATE STAFF */}
              {currentUser?.role === "ADMIN" && (
                <div style={{ backgroundColor: 'var(--clr-marble)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid rgba(27,26,23,0.05)', boxShadow: 'var(--shadow-soft)' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--clr-emerald)', fontSize: '1.2rem' }}>Admin Control: Register New Staff</h3>
                  <form onSubmit={handleCreateStaff} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--clr-grey)' }}>Username</label>
                      <input type="text" required value={newStaffUsername} onChange={(e) => setNewStaffUsername(e.target.value)} className="admin-input" style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--clr-grey)' }}>Password</label>
                      <input type="password" required value={newStaffPassword} onChange={(e) => setNewStaffPassword(e.target.value)} className="admin-input" style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: '0 0 150px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--clr-grey)' }}>Role</label>
                      <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)} className="admin-input" style={{ width: '100%' }}>
                        <option value="STAFF">STAFF</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 20px' }}>Create</button>
                  </form>
                  {staffRegMessage && (
                    <div style={{ marginTop: '15px', fontSize: '0.9rem', color: staffRegMessage.startsWith('Error') ? 'var(--clr-error)' : 'var(--clr-emerald)' }}>
                      {staffRegMessage}
                    </div>
                  )}
                </div>
              )}

              {/* MASTER TOOLBAR */}
              <div className="admin-toolbar">
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                    <button onClick={() => { setViewMode('today'); setAdminDateFilter(new Date().toISOString().split('T')[0]); }} className={`btn-admin-tab ${viewMode === 'today' ? 'active' : ''}`}>Today's Bookings</button>
                    <button onClick={() => { setViewMode('history'); setAdminDateFilter('ALL'); }} className={`btn-admin-tab ${viewMode === 'history' ? 'active' : ''}`}>Booking History</button>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                    <button onClick={handleExportCSV} className="btn btn-secondary">📥 Export CSV</button>
                    {adminDateFilter === new Date().toISOString().split('T')[0] && (
                      <button onClick={() => setShowWalkInModal(true)} className="btn btn-emerald" style={{ boxShadow: '0 4px 15px rgba(15, 77, 58, 0.2)' }}>+ Seat Walk-In</button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(27,26,23,0.1)', paddingTop: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                    <button onClick={() => setAdminDateFilter('ALL')} className={`btn-admin-tab ${adminDateFilter === 'ALL' ? 'active' : ''}`}>All Dates</button>
                    <button onClick={() => setAdminDateFilter(new Date().toISOString().split('T')[0])} className={`btn-admin-tab ${adminDateFilter === new Date().toISOString().split('T')[0] ? 'active' : ''}`}>Today</button>
                    <button onClick={() => { const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1); setAdminDateFilter(tmrw.toISOString().split('T')[0]); }} className={`btn-admin-tab ${adminDateFilter === (()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().split('T')[0]})() ? 'active' : ''}`}>Tomorrow</button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 100%', justifyContent: 'center' }}>
                    <button onClick={() => { if(adminDateFilter !== 'ALL') { const d = new Date(adminDateFilter); d.setDate(d.getDate() - 1); setAdminDateFilter(d.toISOString().split('T')[0]); } }} className="admin-input" style={{ padding: '12px 15px', cursor: adminDateFilter === 'ALL' ? 'not-allowed' : 'pointer', opacity: adminDateFilter === 'ALL' ? 0.5 : 1 }}>&larr;</button>
                    <input type="date" value={adminDateFilter === 'ALL' ? '' : adminDateFilter} onChange={(e) => setAdminDateFilter(e.target.value || 'ALL')} className="admin-input" style={{ flex: '1 1 auto', textAlign: 'center', minWidth: '150px' }} />
                    <button onClick={() => { if(adminDateFilter !== 'ALL') { const d = new Date(adminDateFilter); d.setDate(d.getDate() + 1); setAdminDateFilter(d.toISOString().split('T')[0]); } }} className="admin-input" style={{ padding: '12px 15px', cursor: adminDateFilter === 'ALL' ? 'not-allowed' : 'pointer', opacity: adminDateFilter === 'ALL' ? 0.5 : 1 }}>&rarr;</button>
                  </div>
                </div>

                <div className="metric-grid" style={{ display: 'flex', gap: '15px', borderTop: '1px solid rgba(27,26,23,0.1)', paddingTop: '15px', marginTop: '15px' }}>
                  <div className="metric-tile" style={{ flex: 1 }}>
                    <span className="metric-label">Reservations</span>
                    <span className="metric-value">{displayedBookings.length}</span>
                  </div>
                  <div className="metric-tile" style={{ flex: 1 }}>
                    <span className="metric-label">Covers</span>
                    <span className="metric-value">{totalGuests}</span>
                  </div>
                </div>
              </div>

              {/* BOOKING CARDS */}
              <div>
                {Array.from(new Set(displayedBookings.map(b => b.bookingDate))).sort().map(bookingDate => {
                  const dateBookings = displayedBookings.filter(b => b.bookingDate === bookingDate);
                  return (
                    <div key={bookingDate}>
                      <div className="date-group-header">
                        <span style={{ color: 'var(--clr-cream)' }}>📅 {new Date(bookingDate + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        <span style={{ color: 'var(--clr-gold-pale)', fontWeight: 'normal' }}>{dateBookings.length} {dateBookings.length === 1 ? 'reservation' : 'reservations'}</span>
                      </div>
                      
                      {dateBookings.map(booking => (
                        <div key={booking.id} className={`admin-card ${booking.status === 'ARRIVED' ? 'arrived' : booking.status === 'NO_SHOW' ? 'no-show' : ''}`}>
                          
                          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div className="card-time">{booking.bookingTime}</div>
                            <div className="card-table-pill">
                              Table {booking.restaurantTable?.tableNumber || "N/A"} ({booking.partySize} Guests)
                            </div>
                          </div>

                          <div className="card-guest-info" style={{ flex: '1 1 auto' }}>
                            <h3>{booking.customer?.fullName || "No Name"}</h3>
                            <p>
                              <span>📞 {booking.customer?.phone || "N/A"}</span>
                              <span>✉️ {booking.customer?.email || "N/A"}</span>
                            </p>
                            
                            {(booking.specialRequests || booking.staffNotes) && (
                              <div className="card-notes">
                                {booking.specialRequests && <div className="guest-note"><strong>Guest:</strong> {booking.specialRequests}</div>}
                                {booking.staffNotes && <div className="staff-note"><strong>Staff:</strong> {booking.staffNotes}</div>}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {booking.bookingDate === new Date().toISOString().split('T')[0] && (
                              <>
                                {booking.status !== 'ARRIVED' && (
                                  <button onClick={() => handleUpdateStatus(booking.id, 'ARRIVED')} className="btn btn-emerald" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                                    Mark Arrived
                                  </button>
                                )}
                                {booking.status !== 'NO_SHOW' && booking.status !== 'ARRIVED' && (
                                  <button onClick={() => handleUpdateStatus(booking.id, 'NO_SHOW')} className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                                    No Show
                                  </button>
                                )}
                              </>
                            )}
                            <button onClick={() => handleOpenEdit(booking)} className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: '0.85rem', borderColor: 'var(--clr-gold)', color: 'var(--clr-charcoal)' }}>
                              ⚙️ Edit
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  );
                })}
                {displayedBookings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--clr-grey)', background: 'var(--clr-marble)', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(27,26,23,0.2)', marginTop: '20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}>🍽️</div>
                    <p style={{ fontSize: '1.2rem' }}>No reservations found for this selection.</p>
                  </div>
                )}
              </div>

              {/* MODALS */}
              
              {/* 1. EDIT MODAL */}
              {editModalBooking && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <h3>Edit Reservation</h3>
                    <p style={{ marginBottom: '20px', color: 'var(--clr-grey)' }}>Guest: <strong style={{color: 'var(--clr-charcoal)'}}>{editModalBooking.customer?.fullName}</strong> ({editModalBooking.bookingDate})</p>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--clr-emerald-dark)', marginBottom: '8px', fontWeight: 'bold' }}>Change Sitting Time:</label>
                      <select value={editModalBooking.bookingTime} onChange={(e) => handleModalTimeChange(e.target.value)} className="admin-input" style={{ width: '100%' }}>
                        {["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"].map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--clr-emerald-dark)', marginBottom: '8px', fontWeight: 'bold' }}>Reassign Table:</label>
                      <select value={editModalBooking.restaurantTable?.id || ""} onChange={(e) => handleModalTableChange(e.target.value)} className="admin-input" style={{ width: '100%' }}>
                        {tables.map(t => (
                          <option key={t.id} value={t.id}>Table {t.tableNumber} (Seats {t.capacity})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ background: 'var(--clr-marble)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(27,26,23,0.1)' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--clr-emerald-dark)', fontWeight: 'bold', marginBottom: '8px' }}>📝 STAFF INTERNAL NOTES:</label>
                      <textarea rows="3" value={modalNoteText} onChange={(e) => setModalNoteText(e.target.value)} className="admin-input" style={{ width: '100%', resize: 'vertical', marginBottom: '10px' }} placeholder="Add notes for staff..." />
                      <button type="button" onClick={handleSaveModalNote} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', float: 'right' }}>Save Note</button>
                      <div style={{ clear: 'both' }}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(27,26,23,0.1)', paddingTop: '20px', marginTop: '20px' }}>
                      <button type="button" onClick={() => { const target = editModalBooking; setEditModalBooking(null); setCancelModalBooking(target); }} className="btn" style={{ background: 'rgba(179, 64, 47, 0.1)', color: 'var(--clr-error)', border: '1px solid var(--clr-error)' }}>Cancel Booking</button>
                      <button type="button" onClick={() => setEditModalBooking(null)} className="btn btn-primary">Done</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CANCEL REASON MODAL */}
              {cancelModalBooking && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <h3 style={{ color: 'var(--clr-error)', borderBottomColor: 'rgba(179, 64, 47, 0.2)' }}>Cancel Reservation</h3>
                    <p style={{ marginBottom: '20px', lineHeight: '1.5', color: 'var(--clr-grey)' }}>
                      Are you sure you want to cancel the booking for <strong style={{color: 'var(--clr-charcoal)'}}>{cancelModalBooking.customer?.fullName}</strong> on <strong style={{color: 'var(--clr-charcoal)'}}>{cancelModalBooking.bookingDate}</strong> at <strong style={{color: 'var(--clr-charcoal)'}}>{cancelModalBooking.bookingTime}</strong>?
                    </p>
                    
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--clr-emerald-dark)', fontWeight: 'bold' }}>Cancellation Reason (sent to guest):</label>
                    <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="admin-input" style={{ width: '100%', marginBottom: '15px' }}>
                      <option value="Guest requested cancellation">Guest requested cancellation</option>
                      <option value="Customer was a no-show">Customer was a no-show</option>
                      <option value="Operational capacity / kitchen issue">Operational capacity / kitchen issue</option>
                      <option value="Table double-booking resolved">Table double-booking resolved</option>
                      <option value="Other">Other (Enter custom reason)</option>
                    </select>
                    
                    {cancelReason === "Other" && (
                      <textarea rows="3" placeholder="Type cancellation details..." value={customReasonText} onChange={(e) => setCustomReasonText(e.target.value)} className="admin-input" style={{ width: '100%', marginBottom: '15px' }} />
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                      <button type="button" onClick={() => setCancelModalBooking(null)} className="btn btn-secondary">Keep Booking</button>
                      <button type="button" onClick={handleConfirmCancellation} disabled={isProcessing} className="btn" style={{ background: 'var(--clr-error)', color: '#fff' }}>
                        {isProcessing ? "Processing..." : "Confirm & Notify"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. WALK-IN MODAL */}
              {showWalkInModal && (
                <div className="modal-overlay">
                  <div className="modal-content" style={{ maxWidth: '400px' }}>
                    <h3 style={{ color: 'var(--clr-emerald)' }}>Seat Walk-In Guest</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--clr-emerald-dark)', fontSize: '0.85rem', fontWeight: 'bold' }}>Party Size:</label>
                      <input type="number" min="1" max="20" value={walkInDetails.partySize} onChange={(e) => setWalkInDetails({...walkInDetails, partySize: e.target.value})} className="admin-input" style={{ width: '100%' }} />
                    </div>
                    
                    <div style={{ marginBottom: walkInDetails.tableId === 'OTHER' ? '15px' : '25px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--clr-emerald-dark)', fontSize: '0.85rem', fontWeight: 'bold' }}>Select Table:</label>
                      <select value={walkInDetails.tableId} onChange={(e) => setWalkInDetails({...walkInDetails, tableId: e.target.value})} className="admin-input" style={{ width: '100%' }}>
                        <option value="">-- Choose a Table --</option>
                        <option value="OTHER" style={{ fontWeight: 'bold' }}>Other / Custom Location</option>
                        {tables.map(t => (
                          <option key={t.id} value={t.id}>Table {t.tableNumber} (Seats {t.capacity})</option>
                        ))}
                      </select>
                    </div>

                    {walkInDetails.tableId === 'OTHER' && (
                      <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--clr-emerald-dark)', fontSize: '0.85rem', fontWeight: 'bold' }}>Specify Location (e.g. Bar):</label>
                        <input type="text" placeholder="Where are they seated?" value={walkInDetails.customLocation} onChange={(e) => setWalkInDetails({...walkInDetails, customLocation: e.target.value})} className="admin-input" style={{ width: '100%', borderColor: 'var(--clr-gold)' }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleSeatWalkIn} className="btn btn-emerald" style={{ flex: 1 }}>Seat Now</button>
                      <button onClick={() => { setShowWalkInModal(false); setWalkInDetails({ partySize: 2, tableId: '', customLocation: '' }); }} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </>
  )
}

export default App