import { useState } from 'react';
import { createPortal } from 'react-dom';

export function getPasswordChecks(pw = '') {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9\s]/.test(pw)
  };
}

export function isPasswordStrong(pw = '') {
  return Object.values(getPasswordChecks(pw)).every(Boolean);
}

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  autoComplete = 'current-password',
  required = false,
  id,
  ariaLabel
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field-wrap">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-label={ariaLabel || placeholder}
        className="admin-input password-field-input"
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible(prev => !prev)}
        aria-label={visible ? `Hide ${placeholder}` : `Show ${placeholder}`}
        aria-pressed={visible}
        title={visible ? 'Hide' : 'Show'}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function PasswordStrengthChecklist({ password }) {
  const checks = getPasswordChecks(password);
  const rules = [
    { key: 'length', label: '8+ chars' },
    { key: 'upper', label: 'Uppercase (A-Z)' },
    { key: 'lower', label: 'Lowercase (a-z)' },
    { key: 'number', label: 'Number (0-9)' },
    { key: 'symbol', label: 'Symbol (@ ! # $)' }
  ];

  return (
    <ul className="pw-rules-list" aria-label="Password security requirements">
      {rules.map(rule => (
        <li key={rule.key} className={checks[rule.key] ? 'is-met' : ''}>
          {checks[rule.key] ? '✓' : '·'} {rule.label}
        </li>
      ))}
    </ul>
  );
}

export function EditStaffModal({ staff, apiBase, getStaffHeaders, onClose, onSaved }) {
  const [username, setUsername] = useState(staff?.username || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!staff) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password && !isPasswordStrong(password)) {
      setError('New password must meet all 5 security rules below.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/staff/${staff.id}`, {
        method: 'PUT',
        headers: getStaffHeaders(),
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      if (res.ok) {
        await onSaved();
        onClose();
      } else {
        setError((await res.text()) || 'Could not update staff account.');
      }
    } catch (_) {
      setError('Network error while saving credentials.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Edit Staff Login</h3>
        <p className="text-muted" style={{ marginBottom: '16px', fontSize: '0.875rem' }}>
          Existing passwords are one-way encrypted and cannot be viewed. Leave the password blank to keep their current password, or enter a new strong password to reset it.
        </p>

        <form onSubmit={handleSubmit} className="cms-fields">
          <div className="cms-field">
            <label htmlFor="edit-staff-username">Username / Staff ID</label>
            <input
              id="edit-staff-username"
              type="text"
              required
              minLength={3}
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="cms-field">
            <label htmlFor="edit-staff-password">New Password (Optional)</label>
            <PasswordInput
              id="edit-staff-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Leave blank to keep existing password"
              autoComplete="new-password"
            />
            {password && <PasswordStrengthChecklist password={password} />}
          </div>

          {error && <div className="cms-status cms-status--error">{error}</div>}

          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (Boolean(password) && !isPasswordStrong(password))}
              className="btn btn-emerald"
              style={{ flex: 1 }}
            >
              {saving ? 'Saving...' : 'Save Credentials'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}