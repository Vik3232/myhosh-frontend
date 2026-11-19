export function LegalModals({ activeModal, onClose }) {
    if (!activeModal) return null;
  
    const isPrivacy = activeModal === 'privacy';
  
    return (
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onClick={onClose}
      >
        <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 id="legal-modal-title" style={{ margin: 0, color: 'var(--clr-emerald)' }}>
              {isPrivacy ? 'Privacy Policy (UK GDPR)' : 'Reservation Terms & Conditions'}
            </h3>
            <button
              type="button"
              aria-label="Close legal notice"
              onClick={onClose}
              style={{ fontSize: '1.25rem', padding: '6px 10px' }}
            >
              ✕
            </button>
          </div>
  
          <div className="legal-modal-body">
            {isPrivacy ? (
              <>
                <p><strong>Data Controller:</strong> MyHosh Salisbury, 99 Fisherton Street, Salisbury, SP2 7SP, United Kingdom. Phone: +44 7853404534.</p>
  
                <h4>1. Personal Data We Collect</h4>
                <p>When you book a table, we collect your full name, UK mobile number, optional email address, reservation date/time, party size, and any special requests or allergy notes you provide.</p>
  
                <h4>2. Lawful Basis &amp; Purpose</h4>
                <p>We process your booking details under <strong>Contract</strong> to confirm, manage, and honour your reservation and send confirmation or cancellation notices. Any optional marketing updates are sent only with your consent and you may opt out at any time.</p>
  
                <h4>3. Storage &amp; Automatic 6-Month Deletion</h4>
                <p>Reservation records are stored securely in our encrypted database and are <strong>automatically and permanently purged 6 months</strong> after your reservation date.</p>
  
                <h4>4. Your UK GDPR Rights &amp; Immediate Erasure</h4>
                <p>You can request access, correction, or <strong>immediate permanent deletion</strong> of your personal data at any time—even before the 6-month retention window expires. Call <strong>+44 7853404534</strong> or speak to our manager with your booking reference (MH-xxxx) and staff will erase your record immediately. You also have the right to complain to the UK Information Commissioner's Office (ICO) at <strong>ico.org.uk</strong>.</p>
              </>
            ) : (
              <>
                <h4>1. Two-Hour Sitting Policy</h4>
                <p>All online table reservations are allocated for a <strong>2-hour sitting</strong> so we can welcome all guests comfortably.</p>
  
                <h4>2. 15-Minute Table Hold</h4>
                <p>Reserved tables are held for <strong>15 minutes</strong> past your booking time. If you are delayed, please call <strong>+44 7853404534</strong> so we can hold your table where possible.</p>
  
                <h4>3. Table Allocation &amp; Group Bookings</h4>
                <p>On Friday and Saturday evenings, tables are automatically assigned for best availability. Window Tables 1 and 5 require 4 or more guests, and Table 13 sits next to our open charcoal grill. For groups over 20 or private events, please call us directly.</p>
  
                <h4>4. Allergies &amp; Dietary Requirements</h4>
                <p>Please list any allergies or intolerances in the Special Requests box and inform your server before ordering. Our kitchen handles nuts, sesame, gluten, dairy, and seafood.</p>
  
                <h4>5. Cancellations</h4>
                <p>If your plans change, please call <strong>+44 7853404534</strong> as early as possible so we can release the table.</p>
              </>
            )}
          </div>
  
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button type="button" onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }