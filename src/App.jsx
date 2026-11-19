import { useEffect, useRef, useState } from 'react';
import './App.css';
import './enhancements.css';
import { LoadingOverlay } from './components/PremiumLoader';

const API_BASE = 'https://myhosh-backend.onrender.com';

const getLondonDateStr = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
};

const shiftDateStr = (dateStr, deltaDays) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().split('T')[0];
};

function App() {
  const [view, setView] = useState(() => sessionStorage.getItem('myhosh_session') || 'customer');
  useEffect(() => {
    sessionStorage.setItem('myhosh_session', view);
  }, [view]);

  const [tables, setTables] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [bookingRef, setBookingRef] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [loadingLabel, setLoadingLabel] = useState('Processing...');
  const [canRetryBooking, setCanRetryBooking] = useState(false);
  const idempotencyKeyRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTable, setSelectedTable] = useState('1');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [requests, setRequests] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isTimeSheetOpen, setIsTimeSheetOpen] = useState(false);
  const [timeGroupRanges] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('myhosh_time_groups'));
      if (saved) return saved;
    } catch (_) {}
    return { morningEnd: '12:00', afternoonEnd: '17:00', eveningEnd: '21:00' };
  });

  const clientPhoneNumber = '+44 7853404534';

  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('myhosh_auth') === 'true');
  useEffect(() => {
    sessionStorage.setItem('myhosh_auth', String(isAuthenticated));
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

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('STAFF');
  const [staffRegMessage, setStaffRegMessage] = useState('');
  const [staffList, setStaffList] = useState([]);

  // Menu & Category Tabs (Public + Admin)
  const [menuItems, setMenuItems] = useState([]);
  const [activeMenuCategory, setActiveMenuCategory] = useState('Cold Meze');
  const [showAdminMenuEditor, setShowAdminMenuEditor] = useState(false);
  const [adminMenuCategory, setAdminMenuCategory] = useState('Cold Meze');
  const [priceHistory, setPriceHistory] = useState([]);
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [menuDraft, setMenuDraft] = useState({
    name: '', category: '', description: '', dietaryTags: '', price: '', available: true
  });

  const [londonNow, setLondonNow] = useState(() => new Date());
  const londonTodayStr = getLondonDateStr(londonNow);
  const londonTomorrowStr = shiftDateStr(londonTodayStr, 1);

  const [adminDateFilter, setAdminDateFilter] = useState(() => getLondonDateStr());
  const [searchQuery, setSearchQuery] = useState('');

  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [deleteCustomerStep, setDeleteCustomerStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editModalBooking, setEditModalBooking] = useState(null);
  const [modalNoteText, setModalNoteText] = useState('');
  const [cancelReason, setCancelReason] = useState('Guest requested cancellation');
  const [customReasonText, setCustomReasonText] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [viewMode, setViewMode] = useState('today');

  useEffect(() => {
    const timer = setInterval(() => setLondonNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const minDate = londonTodayStr;
  const maxDate = shiftDateStr(londonTodayStr, 92);

  const getLondonMinutesOfDay = (d = londonNow) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d);
    const h = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const min = Number(parts.find(p => p.type === 'minute')?.value || 0);
    return h * 60 + min;
  };

  const normalizeRawStatus = (rawStatus) => {
    const s = (rawStatus || 'BOOKED').toUpperCase();
    return s === 'CONFIRMED' ? 'BOOKED' : s;
  };

  const getEffectiveBookingState = (booking) => {
    const raw = normalizeRawStatus(booking.status);

    // 1. Past dates (before today): normal card colour; Attended vs Did Not Show Up
    if (booking.bookingDate && booking.bookingDate < londonTodayStr) {
      if (['SEATED', 'ARRIVED', 'COMPLETED'].includes(raw)) {
        return { effectiveStatus: 'ATTENDED', visualTone: 'attended', cardClass: '', statusLabel: 'Attended' };
      }
      if (raw === 'CANCELLED') {
        return { effectiveStatus: 'CANCELLED', visualTone: 'cancelled', cardClass: '', statusLabel: 'Cancelled' };
      }
      return { effectiveStatus: 'NO_SHOW', visualTone: 'did-not-show', cardClass: '', statusLabel: 'Did Not Show Up' };
    }

    // 2. Today's bookings: Green if seated/arrived, Red if past booking time
    if (booking.bookingDate === londonTodayStr) {
      if (raw === 'SEATED' || raw === 'ARRIVED') {
        return {
          effectiveStatus: raw,
          visualTone: raw.toLowerCase(),
          cardClass: 'is-seated',
          statusLabel: raw === 'SEATED' ? 'Seated' : 'Arrived'
        };
      }
      if (raw === 'NO_SHOW') {
        return { effectiveStatus: 'NO_SHOW', visualTone: 'did-not-show', cardClass: '', statusLabel: 'Did Not Show Up' };
      }
      if (!['CANCELLED', 'COMPLETED'].includes(raw)) {
        const nowMins = getLondonMinutesOfDay();
        const [bh = 0, bm = 0] = (booking.bookingTime || '00:00').split(':').map(Number);
        if (nowMins > bh * 60 + bm) {
          return {
            effectiveStatus: 'LATE',
            visualTone: 'late',
            cardClass: 'is-late',
            statusLabel: `Late (${nowMins - (bh * 60 + bm)}m)`
          };
        }
      }
    }

    // 3. Upcoming today or future dates: normal card colour
    return {
      effectiveStatus: raw,
      visualTone: raw === 'CANCELLED' ? 'cancelled' : 'booked',
      cardClass: '',
      statusLabel: raw === 'NO_SHOW' ? 'Did Not Show Up' : raw.replace('_', ' ')
    };
  };

  const generate15MinSlots = (startStr, endStr) => {
    const slots = [];
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    let currentMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    while (currentMins <= endMins) {
      const h = String(Math.floor(currentMins / 60)).padStart(2, '0');
      const m = String(currentMins % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
      currentMins += 15;
    }
    return slots;
  };

  const customerDayOfWeek = date ? new Date(`${date}T00:00:00`).getDay() : -1;
  const isWeekendAutoSeating = customerDayOfWeek === 5 || customerDayOfWeek === 6;

  const getCustomerTimeSlots = () => {
    if (!date) return generate15MinSlots('12:00', '21:00');
    if (customerDayOfWeek === 2) return [];
    if (customerDayOfWeek === 6) return generate15MinSlots('12:00', '21:00');
    if (customerDayOfWeek === 0) return generate15MinSlots('12:00', '20:45');
    return generate15MinSlots('16:00', '21:00');
  };

  const customerTimeSlots = getCustomerTimeSlots();

  useEffect(() => {
    if (date && time && !customerTimeSlots.includes(time)) {
      setTime('');
    }
  }, [date]);

  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [fullName, phone, email, date, time, partySize, selectedTable, requests]);

  const toMinutes = (hhmm) => {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    return h * 60 + m;
  };

  const isSlotAvailableForParty = (slotStr) => {
    const numGuests = parseInt(partySize, 10) || 2;
    if (numGuests > 20 || !date) return false;
    const eligibleTables = tables.filter(table => {
      if (numGuests >= 11) return table.tableNumber === 5;
      if (numGuests >= 9) return table.tableNumber === 2 || table.tableNumber === 5;
      if (numGuests >= 7) return [1, 2, 5, 7].includes(table.tableNumber);
      if (numGuests < 4 && (table.tableNumber === 1 || table.tableNumber === 5)) return false;
      if (numGuests === 1 && ![8, 9, 10].includes(table.tableNumber)) return false;
      if (table.tableNumber === 4) return false;
      return table.capacity >= numGuests;
    });
    if (eligibleTables.length === 0) return false;

    const slotStart = new Date(`${date}T${slotStr}`);
    const slotEnd = new Date(slotStart.getTime() + 120 * 60000);

    return eligibleTables.some(table => !allBookings.some(b => {
      if (b.bookingDate !== date || b.restaurantTable?.id !== table.id) return false;
      if (['NO_SHOW', 'CANCELLED', 'COMPLETED'].includes(normalizeRawStatus(b.status))) return false;
      const [bh, bm] = (b.bookingTime || '00:00').split(':').map(Number);
      const bStart = new Date(`${date}T${String(bh).padStart(2, '0')}:${String(bm).padStart(2, '0')}`);
      const bEnd = new Date(bStart.getTime() + 120 * 60000);
      return slotStart < bEnd && slotEnd > bStart;
    }));
  };

  const groupedCustomerSlots = (() => {
    const isWeekend = customerDayOfWeek === 0 || customerDayOfWeek === 6;
    const morningCut = toMinutes(timeGroupRanges.morningEnd);
    const afternoonCut = toMinutes(timeGroupRanges.afternoonEnd);
    const eveningCut = toMinutes(timeGroupRanges.eveningEnd);

    return [
      { key: 'MORNING', label: 'Morning', enabled: isWeekend },
      { key: 'AFTERNOON', label: 'Afternoon', enabled: true },
      { key: 'EVENING', label: 'Evening', enabled: true },
      { key: 'NIGHT', label: 'Night', enabled: true }
    ]
      .filter(g => g.enabled)
      .map(g => ({
        ...g,
        slots: customerTimeSlots
          .filter(slot => {
            const mins = toMinutes(slot);
            if (g.key === 'MORNING') return mins < morningCut;
            if (g.key === 'AFTERNOON') return mins >= morningCut && mins < afternoonCut;
            if (g.key === 'EVENING') return mins >= afternoonCut && mins < eveningCut;
            return mins >= eveningCut;
          })
          .map(slot => ({ slot, available: isSlotAvailableForParty(slot) }))
      }))
      .filter(g => g.slots.length > 0);
  })();

  const getStaffHeaders = (includeJson = true) => {
    const headers = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    if (currentUser?.token) headers['X-Staff-Token'] = currentUser.token;
    return headers;
  };

  const loadMenuData = async (includeHistory = false) => {
    try {
      const mRes = await fetch(`${API_BASE}/api/menu`);
      if (mRes.ok) {
        const data = await mRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setMenuItems(data);
          const cats = Array.from(new Set(data.map(m => m.category)));
          if (cats.length > 0) {
            setActiveMenuCategory(prev => (cats.includes(prev) ? prev : cats[0]));
            setAdminMenuCategory(prev => (cats.includes(prev) ? prev : cats[0]));
          }
        }
      }
      if (includeHistory && currentUser?.role === 'ADMIN') {
        const hRes = await fetch(`${API_BASE}/api/menu/price-history`, { headers: getStaffHeaders(false) });
        if (hRes.ok) setPriceHistory(await hRes.json());
      }
    } catch (err) {
      console.error('Error loading menu:', err);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/tables`)
      .then(r => r.json())
      .then(data => setTables(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching tables:', err));

    loadMenuData(false);
  }, []);

  const fetchBookings = async () => {
    try {
      const endpoint = viewMode === 'history' ? '/api/bookings/history' : '/api/bookings';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: currentUser?.token ? { 'X-Staff-Token': currentUser.token } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setAllBookings(Array.isArray(data) ? data : []);
      } else if (response.status === 401 && isAuthenticated) {
        handleLogout();
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [view, isSuccess, viewMode, currentUser]);

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInDetails, setWalkInDetails] = useState({
    guestName: '', phone: '', partySize: 2, tableId: '', customLocation: '', notes: ''
  });

  const [showStaffBookingModal, setShowStaffBookingModal] = useState(false);
  const [staffBookingData, setStaffBookingData] = useState({
    fullName: '', email: '', phone: '', date: londonTodayStr, time: '19:00', partySize: 2, tableId: '', customLocation: '', requests: ''
  });

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: getStaffHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchBookings();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSeatWalkIn = async () => {
    const now = new Date();
    const londonDate = getLondonDateStr(now);
    const dayOfWeek = new Date(`${londonDate}T12:00:00Z`).getUTCDay();
    const londonParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(now);
    const currentTimeStr = `${londonParts.find(p => p.type === 'hour')?.value}:${londonParts.find(p => p.type === 'minute')?.value}`;

    if (dayOfWeek === 2) {
      alert('We are closed on Tuesdays. Walk-ins cannot be seated today.');
      return;
    }
    let minTime = '16:00';
    let maxTime = '21:00';
    if (dayOfWeek === 0 || dayOfWeek === 6) minTime = '12:00';
    if (dayOfWeek === 0) maxTime = '20:45';

    if (currentTimeStr < minTime || currentTimeStr > maxTime) {
      alert(`Walk-ins can only be seated during today's active business hours (${minTime} - ${maxTime}).`);
      return;
    }
    if (!walkInDetails.tableId) {
      alert("Please select a table or 'Other' to seat the walk-in.");
      return;
    }

    let finalTableId = walkInDetails.tableId;
    const baseName = walkInDetails.guestName?.trim() || 'Walk-In Guest';
    let guestName = baseName;

    if (finalTableId === 'OTHER') {
      if (tables.length === 0) return;
      finalTableId = tables[0].id;
      guestName = `${baseName} (Location: ${walkInDetails.customLocation?.trim() || 'Other'})`;
    }

    const newBooking = {
      customer: { fullName: guestName, email: 'walkin@myhosh.local', phone: walkInDetails.phone?.trim() || 'N/A' },
      restaurantTable: { id: parseInt(finalTableId, 10) },
      bookingDate: londonDate,
      bookingTime: `${currentTimeStr}:00`,
      partySize: parseInt(walkInDetails.partySize, 10),
      specialRequests: walkInDetails.notes?.trim() || null,
      status: 'SEATED'
    };

    setLoadingLabel('Seating walk-in guest...');
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST', headers: getStaffHeaders(), body: JSON.stringify(newBooking)
      });
      if (response.ok) {
        setShowWalkInModal(false);
        setWalkInDetails({ guestName: '', phone: '', partySize: 2, tableId: '', customLocation: '', notes: '' });
        await fetchBookings();
      } else {
        alert((await response.text()) || 'That table is currently occupied! Please select another.');
      }
    } catch (_) {
      alert('Network error while seating walk-in.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStaffAddBooking = async (e) => {
    e.preventDefault();
    const staffDayOfWeek = new Date(`${staffBookingData.date}T00:00:00`).getDay();
    if (staffDayOfWeek === 2) {
      alert('We are closed on Tuesdays. Please select another day.');
      return;
    }
    let minTime = '16:00';
    let maxTime = '21:00';
    if (staffDayOfWeek === 0 || staffDayOfWeek === 6) minTime = '12:00';
    if (staffDayOfWeek === 0) maxTime = '20:45';
    if (staffBookingData.time < minTime || staffBookingData.time > maxTime) {
      alert(`Reservations for this day must be between ${minTime} and ${maxTime}.`);
      return;
    }

    let finalTableId = staffBookingData.tableId;
    let guestName = staffBookingData.fullName;
    if (finalTableId === 'OTHER') {
      if (tables.length === 0) return;
      finalTableId = tables[0].id;
      guestName = `${staffBookingData.fullName} (Loc: ${staffBookingData.customLocation || 'Other'})`;
    } else if (!finalTableId) {
      alert('Please select a table to assign this booking.');
      return;
    }

    setLoadingLabel('Saving reservation...');
    setIsProcessing(true);
    const newBooking = {
      customer: {
        fullName: guestName,
        email: staffBookingData.email || 'staff-booking@myhosh.local',
        phone: staffBookingData.phone || 'N/A'
      },
      restaurantTable: { id: parseInt(finalTableId, 10) },
      bookingDate: staffBookingData.date,
      bookingTime: `${staffBookingData.time}:00`,
      partySize: parseInt(staffBookingData.partySize, 10),
      specialRequests: staffBookingData.requests
    };

    try {
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST', headers: getStaffHeaders(), body: JSON.stringify(newBooking)
      });
      if (response.ok) {
        setShowStaffBookingModal(false);
        setStaffBookingData({ fullName: '', email: '', phone: '', date: londonTodayStr, time: '19:00', partySize: 2, tableId: '', customLocation: '', requests: '' });
        fetchBookings();
        alert('Reservation manually added to the system.');
      } else {
        alert(`Failed to add booking: ${await response.text()}`);
      }
    } catch (_) {
      alert('Network error. Could not connect to server.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sanitizeCSVCell = (value) => {
    if (value === null || value === undefined) return '""';
    let str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    return `"${str.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = () => {
    if (displayedBookings.length === 0) {
      alert('No bookings to export for this view.');
      return;
    }
    const headers = ['ID', 'Guest Name', 'Email', 'Phone', 'Date', 'Time', 'Party Size', 'Table', 'Status'];
    const rows = displayedBookings.map(b => [
      sanitizeCSVCell(b.id),
      sanitizeCSVCell(b.customer?.fullName || 'Walk-In Guest'),
      sanitizeCSVCell(b.customer?.email || 'N/A'),
      sanitizeCSVCell(b.customer?.phone || 'N/A'),
      sanitizeCSVCell(b.bookingDate),
      sanitizeCSVCell(b.bookingTime),
      sanitizeCSVCell(b.partySize),
      sanitizeCSVCell(b.restaurantTable?.tableNumber || 'Other'),
      sanitizeCSVCell(b.status)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `MyHosh_Reservations_${adminDateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableTables = tables.filter(table => {
    const numGuests = parseInt(partySize, 10) || 2;
    if (numGuests > 20) return false;
    if (numGuests >= 11) return table.tableNumber === 5;
    if (numGuests >= 9) return table.tableNumber === 2 || table.tableNumber === 5;
    if (numGuests >= 7) return [1, 2, 5, 7].includes(table.tableNumber);
    if (numGuests < 4 && (table.tableNumber === 1 || table.tableNumber === 5)) return false;
    if (numGuests === 1 && ![8, 9, 10].includes(table.tableNumber)) return false;
    if (table.tableNumber === 4) return false;
    if (table.capacity < numGuests) return false;

    if (date && time) {
      const selectedStart = new Date(`${date}T${time}`);
      const selectedEnd = new Date(selectedStart.getTime() + 120 * 60000);
      for (const booking of allBookings) {
        if (booking.bookingDate === date && booking.restaurantTable?.id === table.id) {
          if (['NO_SHOW', 'CANCELLED', 'COMPLETED'].includes(normalizeRawStatus(booking.status))) continue;
          const parts = (booking.bookingTime || '00:00').split(':');
          const existingStart = new Date(`${date}T${parts[0]}:${parts[1]}`);
          const existingEnd = new Date(existingStart.getTime() + 120 * 60000);
          if (selectedStart < existingEnd && selectedEnd > existingStart) return false;
        }
      }
    }
    return true;
  });

  useEffect(() => {
    if (availableTables.length > 0) {
      const exists = availableTables.some(t => String(t.id) === String(selectedTable));
      if (!exists) setSelectedTable(String(availableTables[0].id));
    }
  }, [date, time, partySize, allBookings, tables]);

  const selectedTableObj = availableTables.find(t => String(t.id) === String(selectedTable));

  const handleBookingSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isProcessing) return;
    setCanRetryBooking(false);

    if (!acceptedTerms) {
      setIsSuccess(false);
      setMessage('Please accept the Terms & Conditions to proceed.');
      return;
    }
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!/^(?:\+44|0)7\d{9}$/.test(cleanPhone)) {
      setIsSuccess(false);
      setMessage('Please enter a valid UK mobile number (e.g. 07123456789).');
      return;
    }

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    if (dayOfWeek === 2) {
      setIsSuccess(false);
      setMessage('We are closed on Tuesdays. Please select another day.');
      return;
    }
    let minTime = '16:00';
    let maxTime = '21:00';
    if (dayOfWeek === 0 || dayOfWeek === 6) minTime = '12:00';
    if (dayOfWeek === 0) maxTime = '20:45';

    if (!time || time < minTime || time > maxTime) {
      setIsSuccess(false);
      setMessage(`For the selected day, please choose a time between ${minTime} and ${maxTime}.`);
      return;
    }
    if (availableTables.length === 0) {
      setIsSuccess(false);
      setMessage('We are currently fully booked for this time and party size. Please select another time or call us directly.');
      return;
    }

    setMessage('');
    setLoadingLabel('Securing your table at MyHosh...');
    setIsProcessing(true);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `mh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    const sortedTables = [...availableTables].sort((a, b) => a.capacity - b.capacity);
    let optimalTable = sortedTables[0];
    if (!isWeekendAutoSeating && selectedTable) {
      const manualChoice = availableTables.find(t => String(t.id) === String(selectedTable));
      if (manualChoice) optimalTable = manualChoice;
    }

    const newBooking = {
      customer: { fullName, email: email || null, phone: cleanPhone },
      restaurantTable: { id: optimalTable.id },
      bookingDate: date,
      bookingTime: `${time}:00`,
      partySize: parseInt(partySize, 10),
      specialRequests: requests,
      idempotencyKey: idempotencyKeyRef.current
    };

    try {
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBooking)
      });
      if (response.ok) {
        const savedBooking = await response.json();
        const ref = `MH-${String(savedBooking.id).padStart(4, '0')}`;
        setBookingRef(ref);
        setConfirmedBooking({
          ref,
          fullName: savedBooking.customer?.fullName || fullName,
          email: savedBooking.customer?.email || email || '',
          date: savedBooking.bookingDate || date,
          time: (savedBooking.bookingTime || time).slice(0, 5),
          partySize: savedBooking.partySize || parseInt(partySize, 10)
        });
        setIsSuccess(true);
        setMessage('');
        idempotencyKeyRef.current = null;
        setFullName(''); setEmail(''); setPhone(''); setRequests(''); setAcceptedTerms(false);
      } else {
        const errorText = await response.text();
        setIsSuccess(false);
        setCanRetryBooking(response.status >= 500);
        setMessage(errorText || 'Failed to secure reservation. Please try another time.');
      }
    } catch (_) {
      setIsSuccess(false);
      setCanRetryBooking(true);
      setMessage('System error: Unable to connect to the reservation network. Tap Retry to try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const response = await fetch(`${API_BASE}/api/staff/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      if (response.ok) {
        const staffData = await response.json();
        setCurrentUser(staffData);
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid staff username or password.');
      }
    } catch (_) {
      setLoginError('Network error: Server may be waking up. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    setStaffRegMessage('');
    setLoadingLabel('Creating staff account...');
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/staff/register`, {
        method: 'POST', headers: getStaffHeaders(),
        body: JSON.stringify({ username: newStaffUsername.trim(), password: newStaffPassword, role: newStaffRole })
      });
      if (response.ok) {
        setStaffRegMessage(`Account created successfully for ${newStaffUsername} (${newStaffRole}).`);
        setNewStaffUsername(''); setNewStaffPassword(''); setNewStaffRole('STAFF');
      } else {
        setStaffRegMessage(`Error: ${(await response.text()) || 'Could not create user.'}`);
      }
    } catch (_) {
      setStaffRegMessage('Error: Failed to connect to server.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancelModalBooking || isProcessing) return;
    const finalReason = cancelReason === 'Other' ? customReasonText : cancelReason;
    setLoadingLabel('Cancelling reservation...');
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${cancelModalBooking.id}/cancel`, {
        method: 'POST', headers: getStaffHeaders(), body: JSON.stringify({ reason: finalReason })
      });
      if (response.ok) {
        setAllBookings(prev => prev.filter(b => b.id !== cancelModalBooking.id));
        setCancelModalBooking(null);
        setCustomReasonText('');
      } else {
        alert('Failed to process cancellation.');
      }
    } catch (_) {
      alert('Network error processing cancellation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEdit = (booking) => {
    setDeleteCustomerStep(0);
    setEditModalBooking(booking);
    setModalNoteText(booking.staffNotes || '');
  };

  const handleSaveModalNote = async () => {
    if (!editModalBooking) return;
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${editModalBooking.id}/notes`, {
        method: 'PUT', headers: getStaffHeaders(), body: JSON.stringify({ notes: modalNoteText })
      });
      if (response.ok) {
        const updated = await response.json();
        setAllBookings(prev => prev.map(b => (b.id === editModalBooking.id ? updated : b)));
        setEditModalBooking(updated);
      }
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  const handleModalTimeChange = async (newTime) => {
    if (!newTime || !editModalBooking) return;
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${editModalBooking.id}/time`, {
        method: 'PUT', headers: getStaffHeaders(), body: JSON.stringify({ bookingTime: newTime })
      });
      if (response.ok) {
        const updated = await response.json();
        setAllBookings(prev => prev.map(b => (b.id === editModalBooking.id ? updated : b)));
        setEditModalBooking(updated);
      }
    } catch (err) {
      console.error('Error updating time:', err);
    }
  };

  const handleModalTableChange = async (newTableId) => {
    if (!newTableId || !editModalBooking) return;
    try {
      const response = await fetch(`${API_BASE}/api/bookings/${editModalBooking.id}/table/${newTableId}`, {
        method: 'PUT', headers: getStaffHeaders(false)
      });
      if (response.ok) {
        const updated = await response.json();
        setAllBookings(prev => prev.map(b => (b.id === editModalBooking.id ? updated : b)));
        setEditModalBooking(updated);
      } else {
        alert(`Could not reassign table: ${await response.text()}`);
      }
    } catch (_) {
      alert('Network error reassigning table.');
    }
  };

  const handleLogout = () => {
    if (currentUser?.token) {
      fetch(`${API_BASE}/api/staff/logout`, {
        method: 'POST', headers: getStaffHeaders(false)
      }).catch(() => {});
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    setView('customer');
    sessionStorage.clear();
  };

  const displayedBookings = allBookings.filter(b => {
    const matchesDate = adminDateFilter === 'ALL' || b.bookingDate === adminDateFilter;
    if (!searchQuery.trim()) return matchesDate;
    const query = searchQuery.toLowerCase().trim();
    const guestName = (b.customer?.fullName || '').toLowerCase();
    const guestPhone = (b.customer?.phone || '').toLowerCase();
    const refCode = `mh-${String(b.id || '').padStart(4, '0')}`.toLowerCase();
    return matchesDate && (guestName.includes(query) || guestPhone.includes(query) || refCode.includes(query));
  });

  const totalGuests = displayedBookings.reduce((sum, b) => sum + (b.partySize || 0), 0);
  const activeStaffTables = tables.filter(t => t.tableNumber !== 4);
  const floorPlanDate = adminDateFilter === 'ALL' ? londonTodayStr : adminDateFilter;

  const publicMenuCategories = Array.from(new Set(menuItems.filter(m => m.available !== false).map(m => m.category)));
  const currentPublicCat = publicMenuCategories.includes(activeMenuCategory) ? activeMenuCategory : (publicMenuCategories[0] || '');
  const visiblePublicDishes = menuItems.filter(m => m.available !== false && m.category === currentPublicCat);

  const adminMenuCategories = Array.from(new Set(menuItems.map(m => m.category)));
  const currentAdminCat = adminMenuCategories.includes(adminMenuCategory) ? adminMenuCategory : (adminMenuCategories[0] || '');
  const visibleAdminDishes = menuItems.filter(m => m.category === currentAdminCat);

  return (
    <>
      <header className="site-header">
        <div className="brand-logo" onClick={() => setView('customer')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', margin: '-12px 0' }}>
          <img
            src="/images/myhosh-salisbury-logo-horizontal-transparent.png"
            alt="MyHosh Salisbury"
            style={{ height: '75px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <nav className="nav-links">
          {view === 'customer' && (
            <>
              <a href="#menu" className="nav-link">Menu</a>
              <a href="#space" className="nav-link">Our Space</a>
              <a href="#visit" className="nav-link">Visit Us</a>
            </>
          )}
          <button
            type="button"
            onClick={() => setView(view === 'customer' ? 'admin' : 'customer')}
            className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}
          >
            {view === 'customer' ? 'Staff Login' : 'Return to Site'}
          </button>
          {view === 'customer' && (
            <a href="#reserve" className="btn btn-primary" style={{ minHeight: '40px', padding: '10px 20px' }}>Reserve</a>
          )}
        </nav>

        <button type="button" className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </header>

      {isMobileMenuOpen && (
        <div style={{ position: 'fixed', top: '70px', left: 0, width: '100%', background: 'var(--clr-cream)', borderBottom: '1px solid var(--clr-gold-soft)', padding: '20px', zIndex: 99, display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: 'var(--shadow-soft)' }}>
          {view === 'customer' && (
            <>
              <a href="#menu" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase' }}>Menu</a>
              <a href="#space" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase' }}>Our Space</a>
              <a href="#visit" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase' }}>Visit Us</a>
            </>
          )}
          <button
            type="button"
            onClick={() => { setIsMobileMenuOpen(false); setView(view === 'customer' ? 'admin' : 'customer'); }}
            style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase', background: 'none', border: 'none', textAlign: 'left', padding: 0, fontFamily: 'var(--font-body)', cursor: 'pointer', color: 'var(--clr-charcoal)' }}
          >
            {view === 'customer' ? 'Staff Login' : 'Return to Site'}
          </button>
          {view === 'customer' && (
            <a href="#reserve" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, textTransform: 'uppercase', color: 'var(--clr-emerald)' }}>Reserve a Table</a>
          )}
        </div>
      )}

      {view === 'customer' ? (
        <div className="customer-view">
          <section id="hero" className="hero-section">
            <img src="/images/meze-spread.webp" alt="Turkish meze spread" className="hero-bg fade-in" />
            <div className="hero-overlay"></div>
            <div className="hero-content fade-in">
              <h1>Authentic Turkish Hospitality</h1>
              <p>Charcoal grill, fresh meze, and a warm dining experience in the heart of Salisbury.</p>
              <div className="hero-actions">
                <a href="#reserve" className="btn btn-primary">Reserve a Table</a>
                <button type="button" onClick={() => setIsLightboxOpen(true)} className="btn btn-secondary" style={{ color: '#FBF6EA', borderColor: '#FBF6EA' }}>View Menu</button>
              </div>
            </div>
          </section>

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

          <section id="menu" className="menu-section">
            <div className="menu-section-header">
              <h2>Our Menu</h2>
              <div className="gold-divider"><span></span></div>
              <p className="text-muted">Tap a category to explore our dishes. Please inform staff of any food allergies or intolerances.</p>
            </div>

            {publicMenuCategories.length > 0 ? (
              <>
                <div className="menu-category-tabs" role="tablist" aria-label="Menu categories">
                  {publicMenuCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={currentPublicCat === cat}
                      onClick={() => setActiveMenuCategory(cat)}
                      className={`menu-cat-tab ${currentPublicCat === cat ? 'active' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="menu-grid">
                  {visiblePublicDishes.map(dish => (
                    <div key={dish.id} className="menu-card">
                      <div className="menu-item-info">
                        <h4>
                          {dish.name}{' '}
                          {dish.dietaryTags && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--clr-emerald)', fontWeight: 600 }}>({dish.dietaryTags})</span>
                          )}
                        </h4>
                        {dish.description && <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>{dish.description}</p>}
                      </div>
                      <div className="menu-item-price">£{Number(dish.price).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="menu-grid">
                <div className="menu-card">
                  <div className="menu-item-info">
                    <h4>Cold Meze Platter</h4>
                    <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Humus, Cacik, Kisir, Stuffed Vine Leaves, Beetroot Yoghurt, Aubergine Napolitana</p>
                  </div>
                  <div className="menu-item-price">£16.95</div>
                </div>
                <div className="menu-card">
                  <div className="menu-item-info">
                    <h4>Hot Meze Platter</h4>
                    <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Borek, Calamari, Whitebait, Halloumi Cheese, Falafel, Sucuk</p>
                  </div>
                  <div className="menu-item-price">£17.95</div>
                </div>
                <div className="menu-card">
                  <div className="menu-item-info">
                    <h4>Grill Sharing Platter (For 3-4 People)</h4>
                    <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Selection of charcoal grill meats, meze, rice, bulgur, salad, and chips</p>
                  </div>
                  <div className="menu-item-price">£79.95</div>
                </div>
              </div>
            )}

            <div className="text-center" style={{ marginTop: '24px' }}>
              <button type="button" onClick={() => setIsLightboxOpen(true)} className="btn btn-emerald">View Full Menu Image</button>
            </div>
          </section>

          <section id="space" className="space-section">
            <div className="arch-image-container">
              <img src="/images/interior.webp" alt="MyHosh Interior" className="arch-mask" loading="lazy" />
            </div>
            <div className="space-content">
              <h2>An Elegant Atmosphere</h2>
              <div className="gold-divider" style={{ justifyContent: 'flex-start', margin: '20px 0' }}><span></span></div>
              <p>Settle into our emerald velvet chairs, dine on white marble tables, and let our warm, candle-lit ambience transport you to the heart of Turkey.</p>
            </div>
          </section>

          <section className="image-band">
            <img src="/images/charcoal-grill.webp" alt="Charcoal Grill" loading="lazy" />
            <div className="overlay"></div>
            <h2>From the Charcoal Grill</h2>
          </section>

          <section id="reserve" className="booking-section">
            <div className="text-center" style={{ marginBottom: '40px' }}>
              <h2 style={{ color: 'var(--clr-cream)', fontSize: '2.5rem' }}>Reserve a Table</h2>
              <div className="gold-divider"><span></span></div>
              <div style={{ color: 'var(--clr-gold-pale)', fontSize: '0.95rem', background: 'rgba(0,0,0,0.3)', display: 'inline-block', padding: '15px 25px', borderRadius: '8px' }}>
                <strong>Opening Hours</strong><br />
                Tuesday: Closed<br />
                Mon, Wed, Thu, Fri: 16:00 - 22:30<br />
                Sat: 12:00 - 22:30 | Sun: 12:00 - 22:00
              </div>
            </div>

            <div className="booking-container">
              <img src="/images/interior.webp" className="booking-image-side" alt="Interior Setting" loading="lazy" />

              <div className="booking-form-content">
                <LoadingOverlay show={isProcessing} label={loadingLabel} />
                {isSuccess ? (
                  <div className="success-screen fade-in" role="status" aria-live="polite">
                    <div className="success-icon" style={{ fontSize: '3rem' }}>✓</div>
                    <h2>Reservation Confirmed</h2>
                    <div style={{ background: 'rgba(15, 77, 58, 0.08)', border: '2px dashed var(--clr-emerald)', padding: '18px', margin: '18px 0', borderRadius: '10px' }}>
                      <p style={{ margin: '0 0 5px 0', color: 'var(--clr-grey)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Booking Reference</p>
                      <h3 style={{ color: 'var(--clr-emerald)', margin: 0, fontSize: '2rem', letterSpacing: '2px' }}>{confirmedBooking?.ref || bookingRef}</h3>
                    </div>

                    {confirmedBooking && (
                      <div className="booking-summary-grid">
                        <div className="booking-summary-item"><span>Guest</span><strong>{confirmedBooking.fullName}</strong></div>
                        <div className="booking-summary-item"><span>Guests</span><strong>{confirmedBooking.partySize}</strong></div>
                        <div className="booking-summary-item"><span>Date</span><strong>{confirmedBooking.date}</strong></div>
                        <div className="booking-summary-item"><span>Time</span><strong>{confirmedBooking.time}</strong></div>
                      </div>
                    )}

                    <p style={{ color: 'var(--clr-grey)', fontSize: '0.95rem', marginBottom: '24px' }}>
                      {confirmedBooking?.email
                        ? <>A confirmation email has been sent to <strong>{confirmedBooking.email}</strong>.</>
                        : <>Please keep or screenshot your reference code and show it on arrival.</>}
                    </p>

                    <button
                      type="button"
                      onClick={() => { setIsSuccess(false); setBookingRef(''); setConfirmedBooking(null); setMessage(''); }}
                      className="btn btn-primary"
                    >
                      Book Another Table
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="fade-in">
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label>Full Name</label>
                        <input type="text" className="form-input" required value={fullName} placeholder="Enter your Booking Name" onChange={e => setFullName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Email (Optional)</label>
                        <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email confirmation" />
                      </div>
                      <div className="form-group">
                        <label>UK Mobile Number *</label>
                        <input type="tel" className="form-input" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 07123456789" />
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" className="form-input" required min={minDate} max={maxDate} value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label htmlFor="customer-time-picker-btn">Time</label>
                        <button
                          id="customer-time-picker-btn"
                          type="button"
                          className="time-trigger-btn"
                          disabled={customerDayOfWeek === 2}
                          onClick={() => {
                            if (!date) setDate(minDate);
                            setIsTimeSheetOpen(true);
                          }}
                        >
                          <span>{customerDayOfWeek === 2 ? 'Closed on Tuesdays' : (time || 'Select Time')}</span>
                          <span aria-hidden="true">▾</span>
                        </button>
                      </div>
                      <div className="form-group full-width">
                        <label>Guests</label>
                        <input type="number" className="form-input" min="1" max="25" required value={partySize} onChange={e => setPartySize(e.target.value)} />
                      </div>

                      {date && customerDayOfWeek !== 2 && !isWeekendAutoSeating && availableTables.length > 0 && (
                        <div className="form-group full-width">
                          <label>Select Table</label>
                          <select className="form-input" value={selectedTable} onChange={e => setSelectedTable(e.target.value)} required>
                            {availableTables.map(t => (
                              <option key={t.id} value={t.id}>
                                Table {t.tableNumber} (Seats up to {t.capacity})
                                {t.tableNumber === 1 || t.tableNumber === 5 ? ' — Window Table (4+ Guests)' : ''}
                                {t.tableNumber === 13 ? " — Next to Chef's Grill" : ''}
                              </option>
                            ))}
                          </select>
                          {selectedTableObj?.tableNumber === 13 && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: 'rgba(200, 157, 84, 0.15)', border: '1px solid var(--clr-gold)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                              🔥 <strong>Chef's Grill Table:</strong> Table 13 is right next to our open charcoal grill and may be warmer during busy service.
                            </div>
                          )}
                        </div>
                      )}

                      <div className="form-group full-width">
                        <label>Special Requests</label>
                        <textarea className="form-input" rows="2" value={requests} onChange={e => setRequests(e.target.value)} placeholder="Anniversary, allergies, high chair..." />
                      </div>

                      <div className="form-group full-width" style={{ marginTop: '5px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'normal' }}>
                          <input type="checkbox" required checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop: '3px' }} />
                          <span>
                            <strong>Terms &amp; Conditions:</strong> I agree to the 2-hour table sitting (15-min hold) and 6-month UK GDPR data retention policy.
                          </span>
                        </label>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={isProcessing}>
                      Reserve a Table
                    </button>
                  </form>
                )}

                {!isSuccess && !isProcessing && message && (
                  <div className="error-banner-retry" role="alert">
                    <span>{message}</span>
                    {canRetryBooking && (
                      <button type="button" onClick={handleBookingSubmit} className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                        Try Again
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section id="visit" className="visit-section">
            <img src="/images/storefront.webp" alt="MyHosh Storefront" className="visit-image" loading="lazy" />
            <div className="visit-details">
              <h2>Visit Us</h2>
              <div className="gold-divider" style={{ justifyContent: 'flex-start', margin: '15px 0' }}><span></span></div>
              <p><strong>Address:</strong><br />99 Fisherton Street<br />SP2 7SP Salisbury, UK</p>
              <p><strong>Phone:</strong><br /><a href={`tel:${clientPhoneNumber.replace(/\s+/g, '')}`} className="text-emerald" style={{ fontWeight: 'bold' }}>{clientPhoneNumber}</a></p>
              <p style={{ marginTop: '30px', fontSize: '0.95rem', color: 'var(--clr-grey)' }}>
                No online availability or booking a large event?<br />
                Please call the restaurant directly and we will do our best to accommodate you.
              </p>
            </div>
          </section>

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

          {isTimeSheetOpen && (
            <div className="time-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Choose reservation time" onClick={() => setIsTimeSheetOpen(false)}>
              <div className="time-sheet-card" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: 'var(--clr-emerald)', fontSize: '1.25rem' }}>Choose a Time ({date || minDate})</h3>
                  <button type="button" onClick={() => setIsTimeSheetOpen(false)} style={{ fontSize: '1.25rem', padding: '6px 10px' }}>✕</button>
                </div>
                {groupedCustomerSlots.length === 0 ? (
                  <p style={{ color: 'var(--clr-error)' }}>No time slots available for this date.</p>
                ) : (
                  groupedCustomerSlots.map(group => (
                    <div key={group.key} className="time-group-section">
                      <div className="time-group-title">{group.label}</div>
                      <div className="time-chips-grid">
                        {group.slots.map(({ slot, available }) => (
                          <button
                            key={slot}
                            type="button"
                            disabled={!available}
                            aria-pressed={time === slot}
                            onClick={() => { setTime(slot); setIsTimeSheetOpen(false); }}
                            className={`time-slot-chip ${time === slot ? 'selected' : ''}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {isLightboxOpen && (
            <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
              <div className="lightbox-header">
                <button type="button" className="lightbox-close" onClick={() => setIsLightboxOpen(false)}>✕</button>
              </div>
              <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                <img src="/images/menu.webp" alt="Full MyHosh Menu" loading="lazy" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-view">
          <LoadingOverlay show={isProcessing || isLoggingIn} label={isLoggingIn ? 'Signing into Staff Gateway...' : loadingLabel} fullscreen />

          {!isAuthenticated ? (
            <div className="fade-in" style={{ maxWidth: '400px', margin: '10vh auto 0', padding: '40px 30px', background: 'var(--clr-marble)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(27,26,23,0.1)', textAlign: 'center', boxShadow: 'var(--shadow-soft)' }}>
              <h2 style={{ color: 'var(--clr-emerald)', margin: '0 0 10px 0' }}>Staff Gateway</h2>
              <p style={{ color: 'var(--clr-grey)', marginBottom: '30px', fontSize: '0.9rem' }}>Authorized personnel only.</p>
              <form onSubmit={handleAdminLogin}>
                <div style={{ marginBottom: '15px' }}>
                  <input type="text" placeholder="Staff Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required autoComplete="off" className="admin-input" style={{ width: '100%', textAlign: 'center' }} />
                </div>
                <div style={{ marginBottom: '25px' }}>
                  <input type="password" placeholder="Staff Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required autoComplete="new-password" className="admin-input" style={{ width: '100%', textAlign: 'center' }} />
                </div>
                {loginError && <div style={{ color: 'var(--clr-error)', marginBottom: '15px', fontSize: '0.9rem' }}>{loginError}</div>}
                <button type="submit" disabled={isLoggingIn} className="btn btn-primary" style={{ width: '100%' }}>Access System</button>
              </form>
            </div>
          ) : (
            <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <header className="admin-header">
                <div>
                  <h1>Live Reservations Dashboard</h1>
                  <div className="admin-user-badge">
                    Logged in as: <strong>{currentUser?.username}</strong> ({currentUser?.role})
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {currentUser?.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showAdminMenuEditor;
                        setShowAdminMenuEditor(next);
                        if (next) loadMenuData(true);
                      }}
                      className="btn btn-emerald"
                    >
                      {showAdminMenuEditor ? 'Close Menu Editor' : 'Edit Menu & Prices'}
                    </button>
                  )}
                  <button type="button" onClick={handleLogout} className="btn btn-secondary">Secure Logout</button>
                </div>
              </header>

              {currentUser?.role === 'ADMIN' && showAdminMenuEditor && (
                <div style={{ backgroundColor: 'var(--clr-marble)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid rgba(27,26,23,0.08)', boxShadow: 'var(--shadow-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, color: 'var(--clr-emerald)' }}>Menu &amp; Price Editor (By Category)</h3>
                    <button type="button" onClick={() => loadMenuData(true)} className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
                      Refresh Menu
                    </button>
                  </div>

                  {adminMenuCategories.length > 0 ? (
                    <>
                      <div className="menu-category-tabs menu-category-tabs--left" role="tablist" aria-label="Admin menu categories">
                        {adminMenuCategories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            role="tab"
                            aria-selected={currentAdminCat === cat}
                            onClick={() => { setAdminMenuCategory(cat); setEditingMenuId(null); }}
                            className={`menu-cat-tab ${currentAdminCat === cat ? 'active' : ''}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {visibleAdminDishes.map(item => (
                        <div key={item.id} style={{ padding: '12px', marginBottom: '8px', borderRadius: '8px', background: '#fff', border: '1px solid rgba(27,26,23,0.1)' }}>
                          {editingMenuId === item.id ? (
                            <div style={{ display: 'grid', gap: '8px' }}>
                              <input type="text" value={menuDraft.name} onChange={e => setMenuDraft({ ...menuDraft, name: e.target.value })} className="admin-input" placeholder="Dish name" />
                              <input type="text" value={menuDraft.category} onChange={e => setMenuDraft({ ...menuDraft, category: e.target.value })} className="admin-input" placeholder="Category" />
                              <input type="number" step="0.01" min="0" value={menuDraft.price} onChange={e => setMenuDraft({ ...menuDraft, price: e.target.value })} className="admin-input" placeholder="Price (£)" />
                              <input type="text" value={menuDraft.dietaryTags} onChange={e => setMenuDraft({ ...menuDraft, dietaryTags: e.target.value })} className="admin-input" placeholder="Dietary tags (e.g. V, VG, GF)" />
                              <textarea rows="2" value={menuDraft.description} onChange={e => setMenuDraft({ ...menuDraft, description: e.target.value })} className="admin-input" placeholder="Description" />
                              <label style={{ fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input type="checkbox" checked={menuDraft.available} onChange={e => setMenuDraft({ ...menuDraft, available: e.target.checked })} />
                                Available on public menu
                              </label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={async () => {
                                    const numVal = Number(menuDraft.price);
                                    if (!Number.isFinite(numVal) || numVal < 0) {
                                      alert('Enter a valid non-negative price.');
                                      return;
                                    }
                                    setLoadingLabel('Updating dish...');
                                    setIsProcessing(true);
                                    try {
                                      const res = await fetch(`${API_BASE}/api/menu/${item.id}`, {
                                        method: 'PUT', headers: getStaffHeaders(),
                                        body: JSON.stringify({ ...menuDraft, price: numVal.toFixed(2) })
                                      });
                                      if (res.ok) {
                                        const updated = await res.json();
                                        setMenuItems(prev => prev.map(m => (m.id === item.id ? updated : m)));
                                        setEditingMenuId(null);
                                        loadMenuData(true);
                                      } else {
                                        alert(await res.text());
                                      }
                                    } finally {
                                      setIsProcessing(false);
                                    }
                                  }}
                                  className="btn btn-emerald"
                                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                                >
                                  Save Changes
                                </button>
                                <button type="button" onClick={() => setEditingMenuId(null)} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <div>
                                <strong>{item.name}</strong> — <strong style={{ color: 'var(--clr-emerald)' }}>£{Number(item.price).toFixed(2)}</strong>
                                {!item.available && <span style={{ marginLeft: '8px', color: 'var(--clr-error)', fontSize: '0.8rem' }}>[Hidden]</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMenuId(item.id);
                                  setMenuDraft({
                                    name: item.name, category: item.category,
                                    description: item.description || '', dietaryTags: item.dietaryTags || '',
                                    price: Number(item.price).toFixed(2), available: item.available
                                  });
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {priceHistory.length > 0 && (
                        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(27,26,23,0.1)', fontSize: '0.82rem', color: 'var(--clr-grey)' }}>
                          <strong>Recent Price Changes:</strong>
                          {priceHistory.slice(0, 6).map(h => (
                            <div key={h.id} style={{ padding: '3px 0' }}>
                              {h.dishName}: £{Number(h.oldPrice).toFixed(2)} → £{Number(h.newPrice).toFixed(2)} by <strong>{h.changedBy}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: 'var(--clr-grey)', margin: 0 }}>No menu items loaded yet. Click Refresh Menu once the backend is live.</p>
                  )}
                </div>
              )}

              {currentUser?.role === 'ADMIN' && (
                <div style={{ backgroundColor: 'var(--clr-marble)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid rgba(27,26,23,0.05)', boxShadow: 'var(--shadow-soft)' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--clr-emerald)', fontSize: '1.2rem' }}>Admin Control: Register &amp; Manage Staff</h3>
                  <form onSubmit={handleCreateStaff} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--clr-grey)' }}>Username</label>
                      <input type="text" required value={newStaffUsername} onChange={e => setNewStaffUsername(e.target.value)} className="admin-input" style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--clr-grey)' }}>Password</label>
                      <input type="password" required value={newStaffPassword} onChange={e => setNewStaffPassword(e.target.value)} className="admin-input" style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: '0 0 150px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--clr-grey)' }}>Role</label>
                      <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)} className="admin-input" style={{ width: '100%' }}>
                        <option value="STAFF">STAFF</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                    <button type="submit" disabled={isProcessing} className="btn btn-primary" style={{ padding: '12px 20px' }}>Create</button>
                  </form>
                  {staffRegMessage && (
                    <div style={{ marginTop: '12px', fontSize: '0.9rem', color: staffRegMessage.startsWith('Error') ? 'var(--clr-error)' : 'var(--clr-emerald)' }}>
                      {staffRegMessage}
                    </div>
                  )}

                  <div style={{ marginTop: '18px', borderTop: '1px solid rgba(27,26,23,0.1)', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.92rem' }}>Existing Staff Accounts</strong>
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await fetch(`${API_BASE}/api/staff`, { headers: getStaffHeaders(false) });
                          if (r.ok) setStaffList(await r.json());
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Load Staff List
                      </button>
                    </div>
                    {staffList.map(stf => (
                      <div key={stf.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(27,26,23,0.06)' }}>
                        <span><strong>{stf.username}</strong> ({stf.role})</span>
                        <button
                          type="button"
                          disabled={stf.username === currentUser?.username || isProcessing}
                          onClick={async () => {
                            if (!window.confirm(`Remove staff user "${stf.username}" and revoke active sessions?`)) return;
                            setLoadingLabel('Removing staff account...');
                            setIsProcessing(true);
                            try {
                              const res = await fetch(`${API_BASE}/api/staff/${stf.id}`, { method: 'DELETE', headers: getStaffHeaders(false) });
                              const txt = await res.text();
                              if (res.ok) setStaffList(prev => prev.filter(x => x.id !== stf.id));
                              alert(txt);
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          className="btn"
                          style={{ background: 'rgba(179, 64, 47, 0.12)', color: 'var(--clr-error)', padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="admin-toolbar">
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                    <button type="button" onClick={() => { setViewMode('today'); setAdminDateFilter(londonTodayStr); }} className={`btn-admin-tab ${viewMode === 'today' ? 'active' : ''}`}>Today's Bookings</button>
                    <button type="button" onClick={() => { setViewMode('history'); setAdminDateFilter('ALL'); }} className={`btn-admin-tab ${viewMode === 'history' ? 'active' : ''}`}>Booking History</button>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={handleExportCSV} className="btn btn-secondary">📥 Export CSV</button>
                    <button type="button" onClick={() => setShowWalkInModal(true)} className="btn btn-secondary" style={{ borderColor: 'var(--clr-emerald)', color: 'var(--clr-emerald)' }}>+ Walk-In</button>
                    <button type="button" onClick={() => setShowStaffBookingModal(true)} className="btn btn-emerald" style={{ boxShadow: '0 4px 15px rgba(15, 77, 58, 0.2)' }}>+ Add Reservation</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(27,26,23,0.1)', paddingTop: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                    <button type="button" onClick={() => setAdminDateFilter('ALL')} className={`btn-admin-tab ${adminDateFilter === 'ALL' ? 'active' : ''}`}>All Dates</button>
                    <button type="button" onClick={() => setAdminDateFilter(londonTodayStr)} className={`btn-admin-tab ${adminDateFilter === londonTodayStr ? 'active' : ''}`}>Today</button>
                    <button type="button" onClick={() => setAdminDateFilter(londonTomorrowStr)} className={`btn-admin-tab ${adminDateFilter === londonTomorrowStr ? 'active' : ''}`}>Tomorrow</button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      aria-label="Previous day"
                      onClick={() => {
                        const base = adminDateFilter === 'ALL' ? londonTodayStr : adminDateFilter;
                        setAdminDateFilter(shiftDateStr(base, -1));
                      }}
                      className="admin-input"
                      style={{ padding: '10px 16px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      &larr;
                    </button>
                    <input
                      type="date"
                      value={adminDateFilter === 'ALL' ? '' : adminDateFilter}
                      onChange={e => setAdminDateFilter(e.target.value || 'ALL')}
                      className="admin-input"
                      style={{ flex: '1 1 auto', textAlign: 'center', minWidth: '150px' }}
                    />
                    <button
                      type="button"
                      aria-label="Next day"
                      onClick={() => {
                        const base = adminDateFilter === 'ALL' ? londonTodayStr : adminDateFilter;
                        setAdminDateFilter(shiftDateStr(base, 1));
                      }}
                      className="admin-input"
                      style={{ padding: '10px 16px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      &rarr;
                    </button>
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

              {tables.length > 0 && (
                <div style={{ backgroundColor: 'var(--clr-marble)', padding: '18px 20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid rgba(27,26,23,0.08)', boxShadow: 'var(--shadow-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--clr-emerald)' }}>
                      Live Floor Status ({floorPlanDate})
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--clr-grey)' }}>
                      <span>🟢 Free</span>
                      <span>🟡 Reserved</span>
                      <span>🔴 Seated / Late</span>
                      <span>⚪ Offline</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))', gap: '10px' }}>
                    {[...tables].sort((a, b) => a.tableNumber - b.tableNumber).map(t => {
                      const isOffline = t.tableNumber === 4;
                      const tableBookings = allBookings.filter(
                        b => b.bookingDate === floorPlanDate
                          && Number(b.restaurantTable?.id) === Number(t.id)
                          && !['NO_SHOW', 'CANCELLED', 'COMPLETED'].includes(normalizeRawStatus(b.status))
                      );
                      const isSeated = tableBookings.some(b => ['SEATED', 'ARRIVED'].includes(normalizeRawStatus(b.status)));
                      const isLate = !isSeated && tableBookings.some(b => getEffectiveBookingState(b).effectiveStatus === 'LATE');
                      const isReserved = tableBookings.length > 0;

                      let bg = 'rgba(15, 77, 58, 0.08)';
                      let border = '1px solid var(--clr-emerald)';
                      let badge = '🟢 Free';
                      if (isOffline) {
                        bg = 'rgba(0,0,0,0.05)';
                        border = '1px dashed rgba(27,26,23,0.25)';
                        badge = '⚪ Offline';
                      } else if (isLate) {
                        bg = 'rgba(179, 64, 47, 0.16)';
                        border = '1px solid var(--clr-error)';
                        badge = `⚠️ Late (${tableBookings.map(b => (b.bookingTime || '').slice(0, 5)).join(', ')})`;
                      } else if (isSeated) {
                        bg = 'rgba(179, 64, 47, 0.12)';
                        border = '1px solid var(--clr-error)';
                        badge = '🔴 Seated';
                      } else if (isReserved) {
                        bg = 'rgba(200, 157, 84, 0.18)';
                        border = '1px solid var(--clr-gold)';
                        badge = `🟡 ${tableBookings.map(b => (b.bookingTime || '').slice(0, 5)).join(', ')}`;
                      }

                      return (
                        <div key={t.id} style={{ padding: '10px', borderRadius: '8px', background: bg, border, textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--clr-charcoal)' }}>Table {t.tableNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--clr-grey)', marginBottom: '4px' }}>Seats {t.capacity}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-charcoal)' }}>{badge}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by guest name, phone, or reference code (e.g. MH-0012)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="admin-input"
                  style={{ width: '100%', padding: '12px 16px', fontSize: '0.95rem' }}
                />
              </div>

              <div>
                {Array.from(new Set(displayedBookings.map(b => b.bookingDate))).sort().map(bookingDate => {
                  const dateBookings = displayedBookings.filter(b => b.bookingDate === bookingDate);
                  return (
                    <div key={bookingDate}>
                      <div className="date-group-header">
                        <span style={{ color: 'var(--clr-cream)' }}>📅 {new Date(`${bookingDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        <span style={{ color: 'var(--clr-gold-pale)', fontWeight: 'normal' }}>{dateBookings.length} {dateBookings.length === 1 ? 'reservation' : 'reservations'}</span>
                      </div>

                      {dateBookings.map(booking => {
                        const st = getEffectiveBookingState(booking);
                        const raw = normalizeRawStatus(booking.status);
                        return (
                          <div key={booking.id} className={`admin-card ${st.cardClass}`}>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <div className="card-time">{booking.bookingTime}</div>
                              <div className="card-table-pill">Table {booking.restaurantTable?.tableNumber || 'N/A'} ({booking.partySize} Guests)</div>
                              <span className={`status-pill status-pill--${st.visualTone}`}>
                                {st.visualTone === 'late' ? '⚠' : st.visualTone === 'seated' ? '✓' : '●'} {st.statusLabel}
                              </span>
                            </div>

                            <div className="card-guest-info" style={{ flex: '1 1 auto' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h3>{booking.customer?.fullName || 'No Name'}</h3>
                                <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--clr-marble)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--clr-gold)' }}>
                                  Ref: MH-{String(booking.id).padStart(4, '0')}
                                </span>
                              </div>
                              <p>
                                <span>📞 {booking.customer?.phone || 'N/A'}</span>
                                {booking.customer?.email && <span>✉️ {booking.customer.email}</span>}
                              </p>
                              {(booking.specialRequests || booking.staffNotes) && (
                                <div className="card-notes">
                                  {booking.specialRequests && <div className="guest-note"><strong>Guest:</strong> {booking.specialRequests}</div>}
                                  {booking.staffNotes && <div className="staff-note"><strong>Staff:</strong> {booking.staffNotes}</div>}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              {booking.bookingDate === londonTodayStr && !['SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(raw) && (
                                <>
                                  {raw !== 'ARRIVED' && (
                                    <button type="button" onClick={() => handleUpdateStatus(booking.id, 'ARRIVED')} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: '0.85rem' }}>Arrived</button>
                                  )}
                                  <button type="button" onClick={() => handleUpdateStatus(booking.id, 'SEATED')} className="btn btn-emerald" style={{ padding: '10px 14px', fontSize: '0.85rem' }}>Seat Guest</button>
                                  <button type="button" onClick={() => handleUpdateStatus(booking.id, 'NO_SHOW')} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: '0.85rem' }}>No Show</button>
                                </>
                              )}
                              <button type="button" onClick={() => handleOpenEdit(booking)} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: '0.85rem', borderColor: 'var(--clr-gold)', color: 'var(--clr-charcoal)' }}>⚙️ Edit</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {displayedBookings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--clr-grey)', background: 'var(--clr-marble)', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(27,26,23,0.2)', marginTop: '20px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.5 }}>🍽️</div>
                    <p style={{ fontSize: '1.1rem' }}>No reservations found for this selection.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ALL 4 STAFF MODALS (Outside .fade-in so they center cleanly across the full screen) */}
      {view === 'admin' && isAuthenticated && showStaffBookingModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3 style={{ color: 'var(--clr-emerald)' }}>+ Add Reservation (Staff)</h3>
            <form onSubmit={handleStaffAddBooking}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Guest Name *</label>
                  <input type="text" required value={staffBookingData.fullName} onChange={e => setStaffBookingData({ ...staffBookingData, fullName: e.target.value })} className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Phone (Optional)</label>
                  <input type="tel" value={staffBookingData.phone} onChange={e => setStaffBookingData({ ...staffBookingData, phone: e.target.value })} className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Email (Optional)</label>
                  <input type="email" value={staffBookingData.email} onChange={e => setStaffBookingData({ ...staffBookingData, email: e.target.value })} className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" required value={staffBookingData.date} onChange={e => setStaffBookingData({ ...staffBookingData, date: e.target.value })} className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input type="time" required value={staffBookingData.time} onChange={e => setStaffBookingData({ ...staffBookingData, time: e.target.value })} className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Party Size *</label>
                  <input type="number" min="1" required value={staffBookingData.partySize} onChange={e => setStaffBookingData({ ...staffBookingData, partySize: e.target.value })} className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Assign Table *</label>
                  <select required value={staffBookingData.tableId} onChange={e => setStaffBookingData({ ...staffBookingData, tableId: e.target.value })} className="admin-input">
                    <option value="">-- Choose --</option>
                    <option value="OTHER">Other / Custom Location</option>
                    {activeStaffTables.map(t => (
                      <option key={t.id} value={t.id}>Table {t.tableNumber} (Seats {t.capacity})</option>
                    ))}
                  </select>
                </div>
                {staffBookingData.tableId === 'OTHER' && (
                  <div className="form-group full-width">
                    <label>Custom Location Details *</label>
                    <input type="text" required value={staffBookingData.customLocation} onChange={e => setStaffBookingData({ ...staffBookingData, customLocation: e.target.value })} className="admin-input" />
                  </div>
                )}
                <div className="form-group full-width">
                  <label>Notes / Special Requests (Optional)</label>
                  <textarea rows="2" value={staffBookingData.requests} onChange={e => setStaffBookingData({ ...staffBookingData, requests: e.target.value })} className="admin-input" />
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" onClick={() => setShowStaffBookingModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={isProcessing} className="btn btn-emerald" style={{ flex: 1 }}>Create Reservation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {view === 'admin' && isAuthenticated && editModalBooking && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Reservation</h3>
            <p style={{ marginBottom: '16px', color: 'var(--clr-grey)' }}>
              Guest: <strong>{editModalBooking.customer?.fullName}</strong> ({editModalBooking.bookingDate})
            </p>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 'bold' }}>Change Sitting Time:</label>
              <select value={(editModalBooking.bookingTime || '').slice(0, 5)} onChange={e => handleModalTimeChange(e.target.value)} className="admin-input" style={{ width: '100%' }}>
                {generate15MinSlots('12:00', '22:00').map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 'bold' }}>Reassign Table:</label>
              <select value={editModalBooking.restaurantTable?.id || ''} onChange={e => handleModalTableChange(e.target.value)} className="admin-input" style={{ width: '100%' }}>
                {activeStaffTables.map(t => <option key={t.id} value={t.id}>Table {t.tableNumber} (Seats {t.capacity})</option>)}
              </select>
            </div>
            <div style={{ background: 'var(--clr-marble)', padding: '14px', borderRadius: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>Staff Internal Notes:</label>
              <textarea rows="3" value={modalNoteText} onChange={e => setModalNoteText(e.target.value)} className="admin-input" style={{ width: '100%', marginBottom: '10px' }} />
              <button type="button" onClick={handleSaveModalNote} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Save Note</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid rgba(27,26,23,0.1)', paddingTop: '18px', marginTop: '18px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { const target = editModalBooking; setEditModalBooking(null); setCancelModalBooking(target); }}
                  className="btn"
                  style={{ background: 'rgba(179, 64, 47, 0.1)', color: 'var(--clr-error)', border: '1px solid var(--clr-error)', padding: '10px 14px', fontSize: '0.85rem' }}
                >
                  Cancel Booking
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCustomerStep(1)}
                  className="btn"
                  style={{ background: '#3B0D0C', color: '#FBF6EA', padding: '10px 14px', fontSize: '0.85rem' }}
                >
                  Delete Customer Data
                </button>
              </div>
              <button type="button" onClick={() => { setDeleteCustomerStep(0); setEditModalBooking(null); }} className="btn btn-primary">Done</button>
            </div>

            {deleteCustomerStep > 0 && (
              <div style={{ marginTop: '14px', padding: '14px', borderRadius: '8px', background: 'rgba(179, 64, 47, 0.1)', border: '1px solid var(--clr-error)' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--clr-error)', fontWeight: '600', marginBottom: '10px' }}>
                  {deleteCustomerStep === 1
                    ? 'Step 1 of 2: Full deletion permanently removes customer name, phone, email, notes, and booking data. Continue?'
                    : 'Step 2 of 2 (Final Warning): This cannot be undone. Permanently delete all customer data for this booking now?'}
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setDeleteCustomerStep(0)} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>Keep Data</button>
                  {deleteCustomerStep === 1 ? (
                    <button type="button" onClick={() => setDeleteCustomerStep(2)} className="btn" style={{ background: 'var(--clr-error)', color: '#fff', padding: '8px 14px', fontSize: '0.82rem' }}>Yes, Next Step</button>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={async () => {
                        const targetId = editModalBooking.id;
                        setLoadingLabel('Deleting customer data...');
                        setIsProcessing(true);
                        try {
                          const res = await fetch(`${API_BASE}/api/bookings/${targetId}/customer-data`, {
                            method: 'DELETE', headers: getStaffHeaders(false)
                          });
                          if (res.ok) {
                            setAllBookings(prev => prev.filter(b => b.id !== targetId));
                            setDeleteCustomerStep(0);
                            setEditModalBooking(null);
                          } else {
                            alert((await res.text()) || 'Could not delete customer data.');
                          }
                        } catch (_) {
                          alert('Network error while deleting customer data.');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      className="btn"
                      style={{ background: '#3B0D0C', color: '#fff', padding: '8px 14px', fontSize: '0.82rem' }}
                    >
                      Permanently Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'admin' && isAuthenticated && cancelModalBooking && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ color: 'var(--clr-error)' }}>Cancel Reservation</h3>
            <p style={{ marginBottom: '16px', color: 'var(--clr-grey)' }}>
              Cancel booking for <strong>{cancelModalBooking.customer?.fullName}</strong> on <strong>{cancelModalBooking.bookingDate}</strong> at <strong>{cancelModalBooking.bookingTime}</strong>?
            </p>
            <select value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="admin-input" style={{ width: '100%', marginBottom: '14px' }}>
              <option value="Guest requested cancellation">Guest requested cancellation</option>
              <option value="Customer was a no-show">Customer was a no-show</option>
              <option value="Operational capacity / kitchen issue">Operational capacity / kitchen issue</option>
              <option value="Table double-booking resolved">Table double-booking resolved</option>
              <option value="Other">Other (Enter custom reason)</option>
            </select>
            {cancelReason === 'Other' && (
              <textarea rows="3" placeholder="Type cancellation details..." value={customReasonText} onChange={e => setCustomReasonText(e.target.value)} className="admin-input" style={{ width: '100%', marginBottom: '14px' }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setCancelModalBooking(null)} className="btn btn-secondary">Keep Booking</button>
              <button type="button" onClick={handleConfirmCancellation} disabled={isProcessing} className="btn" style={{ background: 'var(--clr-error)', color: '#fff' }}>Confirm &amp; Notify</button>
            </div>
          </div>
        </div>
      )}

      {view === 'admin' && isAuthenticated && showWalkInModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="walkin-modal-title">
          <div className="modal-content walkin-panel">
            <h3 id="walkin-modal-title" style={{ color: 'var(--clr-emerald)', marginBottom: '4px' }}>Seat Walk-In Guest</h3>
            <p style={{ color: 'var(--clr-grey)', fontSize: '0.85rem', marginBottom: '14px' }}>Name, phone, and notes are optional.</p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.84rem', fontWeight: '600' }}>Party Size</label>
              <div className="party-stepper-row">
                <button type="button" disabled={Number(walkInDetails.partySize) <= 1} onClick={() => setWalkInDetails(p => ({ ...p, partySize: Math.max(1, Number(p.partySize) - 1) }))} className="party-step-btn">−</button>
                <div className="party-count-display">{walkInDetails.partySize} {Number(walkInDetails.partySize) === 1 ? 'Guest' : 'Guests'}</div>
                <button type="button" disabled={Number(walkInDetails.partySize) >= 20} onClick={() => setWalkInDetails(p => ({ ...p, partySize: Math.min(20, Number(p.partySize) + 1) }))} className="party-step-btn">+</button>
              </div>
              <div className="quick-party-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWalkInDetails(p => ({ ...p, partySize: n }))}
                    className={`quick-party-chip ${Number(walkInDetails.partySize) === n ? 'active' : ''}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.84rem', fontWeight: '600' }}>Table *</label>
              <select value={walkInDetails.tableId} onChange={e => setWalkInDetails(p => ({ ...p, tableId: e.target.value }))} className="admin-input" style={{ width: '100%', minHeight: '42px' }}>
                <option value="">-- Choose a Table --</option>
                <option value="OTHER">Other / Custom Location</option>
                {activeStaffTables.map(t => <option key={t.id} value={t.id}>Table {t.tableNumber} (Seats {t.capacity})</option>)}
              </select>
            </div>

            {walkInDetails.tableId === 'OTHER' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.84rem', fontWeight: '600' }}>Custom Location *</label>
                <input type="text" placeholder="e.g. Bar counter" value={walkInDetails.customLocation} onChange={e => setWalkInDetails(p => ({ ...p, customLocation: e.target.value }))} className="admin-input" style={{ width: '100%', minHeight: '42px' }} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.84rem', fontWeight: '600' }}>Guest Name (Optional)</label>
                <input type="text" placeholder="Walk-In Guest" value={walkInDetails.guestName} onChange={e => setWalkInDetails(p => ({ ...p, guestName: e.target.value }))} className="admin-input" style={{ width: '100%', minHeight: '42px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.84rem', fontWeight: '600' }}>Phone (Optional)</label>
                <input type="tel" placeholder="e.g. 07123456789" value={walkInDetails.phone} onChange={e => setWalkInDetails(p => ({ ...p, phone: e.target.value }))} className="admin-input" style={{ width: '100%', minHeight: '42px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.84rem', fontWeight: '600' }}>Notes (Optional)</label>
              <input type="text" placeholder="High chair, allergy note..." value={walkInDetails.notes} onChange={e => setWalkInDetails(p => ({ ...p, notes: e.target.value }))} className="admin-input" style={{ width: '100%', minHeight: '42px' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" disabled={isProcessing} onClick={handleSeatWalkIn} className="btn btn-emerald" style={{ flex: 1, minHeight: '44px' }}>Seat Now</button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => { setShowWalkInModal(false); setWalkInDetails({ guestName: '', phone: '', partySize: 2, tableId: '', customLocation: '', notes: '' }); }}
                className="btn btn-secondary"
                style={{ flex: 1, minHeight: '44px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;