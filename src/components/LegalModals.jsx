
import { FileDown, X } from 'lucide-react';
const LAST_UPDATED = 'November 2026';
const PRIVACY_SECTIONS = [
  {
    heading: '1. Personal Data We Collect',
    items: [
      {
        lead: 'Reservation details:',
        text: 'When you book a table, we collect your full name, UK mobile number, optional email address, reservation date and time, party size, and any special requests or allergy notes you provide.'
      },
      {
        lead: 'Optional consent records:',
        text: 'If you tick either optional checkbox (post visit Google review invitation or marketing updates), we store a separate record of each choice along with the exact date and time you gave consent, as required under UK GDPR Article 7.'
      }
    ]
  },
  {
    heading: '2. Lawful Basis & Purpose',
    items: [
      {
        lead: 'Contract (UK GDPR Art. 6(1)(b)):',
        text: 'We process your booking details to confirm, manage, and honour your table reservation and to send essential booking confirmation or cancellation notices.'
      },
      {
        lead: 'Post-Visit Review Invitation — Explicit Consent (UK GDPR Art. 6(1)(a) & PECR Reg 22):',
        text: 'Only if you tick the optional review checkbox and provide an email address, we send a single, one time email approximately 3.5 hours after your visit is marked completed inviting you to leave an honest Google review.'
      },
      {
        lead: 'Marketing & Offers — Separate Explicit Consent (UK GDPR Art. 6(1)(a) & PECR Reg 22):',
        text: 'Only if you tick the separate optional marketing checkbox and provide an email address, we may send occasional emails about seasonal menus, events, and offers from MyHosh Salisbury. Opting in is never required to book a table, and we share only your name, email address, and consent timestamp for marketing (never your phone number or allergy notes).'
      }
    ]
  },
  {
    heading: '3. Third-Party Service Providers (Processors)',
    items: [
      {
        lead: 'Hosting & Email Delivery:',
        text: 'We use trusted technical processors to operate our booking system: Render and Neon (secure cloud hosting and encrypted PostgreSQL database) and Brevo (transactional email delivery for confirmations, cancellations, and opted in invitations). We never sell or rent your personal data.'
      },
      {
        lead: 'External Google Reviews:',
        text: 'If you choose to click the review link in your email or on our website, you will be taken to Google, where any review you publish is governed by Google’s own Privacy Policy.'
      }
    ]
  },
  {
    heading: '4. Storage & Automatic 6-Month Deletion',
    items: [
      {
        lead: 'Retention window:',
        text: 'Reservation records and any associated consent timestamps are stored securely in our encrypted database and are automatically and permanently purged 6 months after your reservation date.'
      }
    ]
  },
  {
    heading: '5. Your UK GDPR Rights, Withdrawing Consent & Immediate Erasure',
    items: [
      {
        lead: 'Access, Correction & Erasure:',
        text: 'You can request access to, correction of, or immediate permanent deletion of your personal data at any time, even before the 6 month retention window expires. Call +44 7853404534 or speak to our manager with your booking reference (MH-xxxx) and staff will erase your record immediately.'
      },
      {
        lead: 'Withdrawing Review or Marketing Consent:',
        text: 'You may withdraw consent for review or marketing emails at any time by clicking the unsubscribe link in any marketing email, replying to your booking email, or calling +44 7853404534. Booking records are still purged after 6 months; marketing subscribers remain on our mailing list only until they unsubscribe.'
      },
      {
        lead: 'Complaints:',
        text: 'You have the right to lodge a complaint with the UK Information Commissioner’s Office (ICO) at ico.org.uk.'
      }
    ]
  }
];

const TERMS_SECTIONS = [
  {
    heading: '1. Two-Hour Sitting Policy',
    items: [
      {
        lead: 'Table allocation:',
        text: 'All online table reservations are allocated for a two hour sitting so we can welcome all guests comfortably.'
      }
    ]
  },
  {
    heading: '2. 15-Minute Table Hold',
    items: [
      {
        lead: 'Late arrivals:',
        text: 'Reserved tables are held for 15 minutes past your booking time. If you are delayed, please call +44 7853404534 so we can hold your table where possible.'
      }
    ]
  },
  {
    heading: '3. Table Allocation & Group Bookings',
    items: [
      {
        lead: 'Seating rules:',
        text: 'On Friday and Saturday evenings, tables are automatically assigned for best availability. Window Tables 1 and 5 require 4 or more guests, and Table 13 sits next to our open charcoal grill. For groups over 20 or busy days showing no online availability, please call us directly.'
      }
    ]
  },
  {
    heading: '4. Allergies & Dietary Requirements',
    items: [
      {
        lead: 'Kitchen notice:',
        text: 'Please list any allergies or intolerances in the Special Requests box and inform your server before ordering. Our kitchen handles nuts, sesame, gluten, dairy, and seafood.'
      }
    ]
  },
  {
    heading: '5. Cancellations & Data Retention',
    items: [
      {
        lead: 'Changes & UK GDPR:',
        text: 'If your plans change, please call +44 7853404534 as early as possible so we can release the table. Booking records are automatically deleted 6 months after your reservation date under UK GDPR.'
      }
    ]
  }
];

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function LegalModals({ activeModal, onClose }) {
  if (!activeModal) return null;

  const isPrivacy = activeModal === 'privacy';
  const docTitle = isPrivacy
    ? 'MyHosh Salisbury — Privacy Policy (UK GDPR)'
    : 'MyHosh Salisbury — Reservation Terms & Conditions';
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  const controllerLine = isPrivacy
    ? 'Data Controller: MyHosh Salisbury, 99 Fisherton Street, Salisbury, SP2 7SP, United Kingdom. Phone: +44 7853404534.'
    : 'Venue: MyHosh Salisbury, 99 Fisherton Street, Salisbury, SP2 7SP, United Kingdom. Phone: +44 7853404534.';

  const handleSaveAsPdf = () => {
    const printWin = window.open('', '_blank', 'width=820,height=900');
    if (!printWin) {
      window.print();
      return;
    }

    const sectionsHtml = sections
      .map(
        (sec) => `
          <h3>${escapeHtml(sec.heading)}</h3>
          ${sec.items
            .map(
              (item) =>
                `<p><strong>${escapeHtml(item.lead)}</strong> ${escapeHtml(item.text)}</p>`
            )
            .join('')}
        `
      )
      .join('');

    printWin.document.write(`<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(docTitle)}</title>
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
  <h1>${escapeHtml(docTitle)}</h1>
  <p class="meta">MyHosh Salisbury &bull; 99 Fisherton Street, SP2 7SP &bull; https://myhosh-salisbury.co.uk &bull; Updated ${escapeHtml(LAST_UPDATED)}</p>
  <p><strong>${escapeHtml(controllerLine)}</strong></p>
  ${sectionsHtml}
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
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="legal-modal-body">
          <p><strong>{controllerLine}</strong></p>
          <p style={{ fontSize: '0.82rem', color: 'var(--clr-grey)' }}>Last updated: {LAST_UPDATED}</p>

          {sections.map((sec) => (
            <div key={sec.heading}>
              <h4>{sec.heading}</h4>
              {sec.items.map((item) => (
                <p key={item.lead}>
                  <strong>{item.lead}</strong> {item.text}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" onClick={handleSaveAsPdf} className="btn btn-secondary btn-inline-icon">
            <FileDown size={16} aria-hidden="true" />
            <span>Save / Print as PDF</span>
          </button>
          <button type="button" onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}