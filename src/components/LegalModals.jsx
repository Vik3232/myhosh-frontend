export function LegalModals({ activeModal, onClose }) {
    if (!activeModal) return null;
  
    const isPrivacy = activeModal === 'privacy';
    const docTitle = isPrivacy
      ? 'MyHosh Salisbury — Privacy Policy (UK GDPR)'
      : 'MyHosh Salisbury — Reservation Terms & Conditions';
  
    const handleSaveAsPdf = () => {
      const printWin = window.open('', '_blank', 'width=820,height=900');
      if (!printWin) {
        window.print();
        return;
      }
  
      const bodyHtml = isPrivacy
        ? `
          <p><strong>Data Controller:</strong> MyHosh Salisbury, 99 Fisherton Street, Salisbury, SP2 7SP, United Kingdom. Phone: +44 7853404534.</p>
          <h3>1. Personal Data We Collect</h3>
          <p>When you reserve a table, we collect your full name, UK mobile number, optional email address, reservation date and time, party size, and any special requests or allergy notes you provide.</p>
          <h3>2. Lawful Basis &amp; Purpose</h3>
          <p>We process your booking details under <strong>Contract</strong> to confirm, manage, and honour your reservation and send confirmation or cancellation notices.</p>
          <h3>3. Storage &amp; Automatic 6-Month Deletion</h3>
          <p>Reservation records are stored securely in our encrypted database and are <strong>automatically and permanently purged 6 months</strong> after your reservation date.</p>
          <h3>4. Your UK GDPR Rights &amp; Immediate Erasure</h3>
          <p>You can request access, correction, or <strong>immediate permanent deletion</strong> of your personal data at any time—even before the 6-month retention window expires. Call <strong>+44 7853404534</strong> or speak to our manager with your booking reference (MH-xxxx). You also have the right to complain to the UK Information Commissioner's Office (ICO) at <strong>ico.org.uk</strong>.</p>
        `
        : `
          <p><strong>Venue:</strong> MyHosh Salisbury, 99 Fisherton Street, Salisbury, SP2 7SP, United Kingdom. Phone: +44 7853404534.</p>
          <h3>1. Two-Hour Sitting Policy</h3>
          <p>All online table reservations are allocated for a <strong>2-hour sitting</strong> so we can welcome all guests comfortably.</p>
          <h3>2. 15-Minute Table Hold</h3>
          <p>Reserved tables are held for <strong>15 minutes</strong> past your booking time. If you are delayed, please call <strong>+44 7853404534</strong> so we can hold your table where possible.</p>
          <h3>3. Table Allocation &amp; Group Bookings</h3>
          <p>On Friday and Saturday evenings, tables are automatically assigned for best availability. Window Tables 1 and 5 require 4 or more guests, and Table 13 sits next to our open charcoal grill. For groups over 20 or busy days showing no online availability, please call us directly.</p>
          <h3>4. Allergies &amp; Dietary Requirements</h3>
          <p>Please list any allergies or intolerances in the Special Requests box and inform your server before ordering. Our kitchen handles nuts, sesame, gluten, dairy, and seafood.</p>
          <h3>5. Cancellations &amp; Data Retention</h3>
          <p>If your plans change, please call <strong>+44 7853404534</strong> as early as possible. Booking records are automatically deleted 6 months after your reservation date under UK GDPR.</p>
        `;
  
      printWin.document.write(`<!doctype html>
  <html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <title>${docTitle}</title>
    <style>
      body { font-family: Georgia, serif; color: #1B1A17; padding: 36px; line-height: 1.65; max-width: 740px; margin: 0 auto; }
      h1 { color: #0F4D3A; border-bottom: 2px solid #D9A520; padding-bottom: 10px; font-size: 22px; }
      h3 { color: #0F4D3A; margin-top: 20px; margin-bottom: 6px; font-size: 16px; }
      p { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; margin: 0 0 10px; }
      .meta { color: #5E5A52; font-size: 12px; margin-bottom: 20px; }
      @media print { body { padding: 16px; } }
    </style>
  </head>
  <body>
    <h1>${docTitle}</h1>
    <p class="meta">MyHosh Salisbury • 99 Fisherton Street, SP2 7SP • https://myhosh-salisbury.co.uk</p>
    ${bodyHtml}
  </body>
  </html>`);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 250);
    };
  
    return (
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onClick={onClose}
      >
        <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
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
                <p>We process your booking details under <strong>Contract</strong> to confirm, manage, and honour your reservation and send confirmation or cancellation notices.</p>
  
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
                <p>On Friday and Saturday evenings, tables are automatically assigned for best availability. Window Tables 1 and 5 require 4 or more guests, and Table 13 sits next to our open charcoal grill. For groups over 20 or busy days, please call us directly.</p>
  
                <h4>4. Allergies &amp; Dietary Requirements</h4>
                <p>Please list any allergies or intolerances in the Special Requests box and inform your server before ordering. Our kitchen handles nuts, sesame, gluten, dairy, and seafood.</p>
  
                <h4>5. Cancellations</h4>
                <p>If your plans change, please call <strong>+44 7853404534</strong> as early as possible so we can release the table.</p>
              </>
            )}
          </div>
  
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSaveAsPdf} className="btn btn-secondary">
              📄 Save / Print as PDF
            </button>
            <button type="button" onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }