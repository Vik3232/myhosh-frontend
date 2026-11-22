import { useEffect, useState } from 'react';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const DEFAULT_SITE_CONTENT = {
  slide1Enabled: true,
  slide1ImageUrl: '/images/meze-spread.webp',
  slide1Headline: 'Authentic Turkish Hospitality',
  slide1Subheadline: 'Charcoal grill, fresh meze, and a warm dining experience in the heart of Salisbury.',
  slide1CtaText: 'Reserve a Table',
  slide2Enabled: false,
  slide2ImageUrl: '',
  slide2Headline: '',
  slide2Subheadline: '',
  slide2CtaText: 'Reserve a Table',
  slide3Enabled: false,
  slide3ImageUrl: '',
  slide3Headline: '',
  slide3Subheadline: '',
  slide3CtaText: 'Reserve a Table',
  posterEnabled: false,
  posterImageUrl: '',
  posterTitle: '',
  posterSubtitle: '',
  posterCtaText: 'Reserve for This Event'
};

export function EventPosterModal({ siteContent, forceOpen = false, onForceClose }) {
  const [dismissedKey, setDismissedKey] = useState(() => sessionStorage.getItem('myhosh_dismissed_poster') || '');

  const posterKey = `${siteContent?.posterImageUrl || ''}|${siteContent?.posterTitle || ''}`;
  const shouldShow = forceOpen || Boolean(
    siteContent?.posterEnabled &&
    siteContent?.posterImageUrl &&
    siteContent.posterImageUrl.trim() !== '' &&
    dismissedKey !== posterKey
  );

  const handleClose = () => {
    if (forceOpen && onForceClose) {
      onForceClose();
      return;
    }
    sessionStorage.setItem('myhosh_dismissed_poster', posterKey);
    setDismissedKey(posterKey);
  };

  const handlePosterClick = (e) => {
    e.preventDefault();
    handleClose();
    if (!forceOpen) {
      const reserveSection = document.getElementById('reserve');
      if (reserveSection) {
        reserveSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.hash = '#reserve';
      }
    }
  };

  useEffect(() => {
    if (!shouldShow) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shouldShow, forceOpen, posterKey]);

  if (!shouldShow) return null;

  return (
    <div
      className="poster-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={siteContent.posterTitle || 'MyHosh Event Poster'}
      onClick={handleClose}
    >
      <div className="poster-modal-card" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className="poster-modal-close"
          aria-label="Close event poster"
          onClick={handleClose}
        >
          ✕
        </button>

        <a
          href="#reserve"
          onClick={handlePosterClick}
          className="poster-modal-link"
          aria-label="Click poster to reserve a table"
        >
          <img
            src={siteContent.posterImageUrl}
            alt={siteContent.posterTitle || 'MyHosh Special Event — Click to Reserve'}
          />
        </a>
      </div>
    </div>
  );
}

export function AdminSiteContentManager({ apiBase, siteContent, getStaffHeaders, onSaved }) {
  const [draft, setDraft] = useState({ ...DEFAULT_SITE_CONTENT, ...(siteContent || {}) });
  const [uploadingField, setUploadingField] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [previewPoster, setPreviewPoster] = useState(false);

  useEffect(() => {
    if (siteContent) {
      setDraft({ ...DEFAULT_SITE_CONTENT, ...siteContent });
    }
  }, [siteContent]);

  const handleImageUpload = async (file, fieldName) => {
    if (!file) return;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setStatusMsg('Cloudinary preset not configured in Vercel env. Paste a direct image URL instead.');
      return;
    }

    setUploadingField(fieldName);
    setStatusMsg('Uploading image...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.secure_url) {
          const widthTransform = fieldName === 'posterImageUrl' ? 'w_1200' : 'w_1920';
          const optimizedUrl = data.secure_url.replace('/image/upload/', `/image/upload/f_auto,q_auto,${widthTransform}/`);
          setDraft(prev => ({
            ...prev,
            [fieldName]: optimizedUrl,
            ...(fieldName === 'posterImageUrl' ? { posterEnabled: true } : {})
          }));
          setStatusMsg('Image uploaded. Click Save Hero & Event Poster to publish.');
        }
      } else {
        setStatusMsg('Image upload failed. Please try again.');
      }
    } catch (_) {
      setStatusMsg('Network error during upload.');
    } finally {
      setUploadingField('');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${apiBase}/api/site-content`, {
        method: 'PUT',
        headers: getStaffHeaders(),
        body: JSON.stringify(draft)
      });
      if (res.ok) {
        const updated = await res.json();
        setDraft({ ...DEFAULT_SITE_CONTENT, ...updated });
        onSaved(updated);
        setStatusMsg('Hero promotions and event poster saved live.');
      } else {
        setStatusMsg((await res.text()) || 'Could not save changes.');
      }
    } catch (_) {
      setStatusMsg('Network error while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const slides = [
    { num: 1, title: 'Hero Slide 1 (Main Banner)' },
    { num: 2, title: 'Hero Slide 2 (Promotion)' },
    { num: 3, title: 'Hero Slide 3 (Promotion)' }
  ];

  return (
    <div style={{ backgroundColor: 'var(--clr-marble)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(27,26,23,0.08)', boxShadow: 'var(--shadow-soft)' }}>
      <h3 style={{ marginTop: 0, color: 'var(--clr-emerald)' }}>Hero Promotions (Up to 3 Slides) &amp; Event Poster Popup</h3>
      <p style={{ color: 'var(--clr-grey)', fontSize: '0.9rem', marginBottom: '12px' }}>
        Enable 1, 2, or 3 slides to rotate promotions on the homepage hero. Turn on the Event Poster to show a full-image clickable popup when guests open the site.
      </p>

      {/* RECOMMENDED SIZE GUIDE BANNER */}
      <div className="size-guide-banner">
        <div>
          <strong>Hero Banner Size:</strong> 1920 × 1080 px (16:9 landscape, JPG/WebP). Keep key subject centered for mobile screens.
        </div>
        <div>
          <strong>Event Poster Size:</strong> 1080 × 1350 px (4:5 portrait flyer) or 1080 × 1080 px (square). Clicking anywhere on the poster takes guests directly to Reserve.
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: '18px' }}>
        {/* HERO SLIDES 1 - 3 */}
        <div className="promo-admin-grid">
          {slides.map(({ num, title }) => {
            const enabledKey = `slide${num}Enabled`;
            const imgKey = `slide${num}ImageUrl`;
            const headKey = `slide${num}Headline`;
            const subKey = `slide${num}Subheadline`;
            const ctaKey = `slide${num}CtaText`;

            return (
              <div key={num} className="promo-admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
                  <strong style={{ color: 'var(--clr-emerald)' }}>{title}</strong>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(draft[enabledKey])}
                      onChange={e => setDraft(prev => ({ ...prev, [enabledKey]: e.target.checked }))}
                    />
                    Active
                  </label>
                </div>

                {draft[imgKey] && (
                  <div className="promo-preview-box">
                    <img src={draft[imgKey]} alt={`Hero slide ${num} preview`} />
                  </div>
                )}

                <div style={{ display: 'grid', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Upload Background Photo (1920 × 1080 px / 16:9)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={Boolean(uploadingField)}
                    onChange={e => {
                      handleImageUpload(e.target.files?.[0], imgKey);
                      e.target.value = '';
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Or paste image URL (e.g. /images/meze-spread.webp)"
                    value={draft[imgKey] || ''}
                    onChange={e => setDraft(prev => ({ ...prev, [imgKey]: e.target.value }))}
                    className="admin-input"
                  />
                  <input
                    type="text"
                    placeholder="Hero Headline (e.g. Friday Live Grill Night)"
                    value={draft[headKey] || ''}
                    onChange={e => setDraft(prev => ({ ...prev, [headKey]: e.target.value }))}
                    className="admin-input"
                  />
                  <textarea
                    rows="2"
                    placeholder="Hero Subheadline / Promotion details"
                    value={draft[subKey] || ''}
                    onChange={e => setDraft(prev => ({ ...prev, [subKey]: e.target.value }))}
                    className="admin-input"
                  />
                  <input
                    type="text"
                    placeholder="Button text (default: Reserve a Table)"
                    value={draft[ctaKey] || ''}
                    onChange={e => setDraft(prev => ({ ...prev, [ctaKey]: e.target.value }))}
                    className="admin-input"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* EVENT POSTER POPUP CARD */}
        <div className="promo-admin-card" style={{ borderColor: 'var(--clr-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div>
              <strong style={{ color: 'var(--clr-emerald)', fontSize: '1.05rem' }}>Event Poster Popup (1080 × 1350 px / 4:5 Portrait)</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--clr-grey)' }}>
                Displays borderless with only a top close button (✕). Clicking anywhere on the poster takes guests straight to Reserve.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(draft.posterEnabled)}
                onChange={e => setDraft(prev => ({ ...prev, posterEnabled: e.target.checked }))}
              />
              Show Popup to Visitors
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', alignItems: 'start' }}>
            <div>
              {draft.posterImageUrl ? (
                <div className="promo-preview-box promo-preview-box--poster">
                  <img src={draft.posterImageUrl} alt="Event poster preview" />
                </div>
              ) : (
                <div style={{ padding: '28px', textAlign: 'center', borderRadius: '8px', border: '1px dashed rgba(27,26,23,0.2)', color: 'var(--clr-grey)', fontSize: '0.85rem' }}>
                  No poster uploaded yet. Recommended: 1080 × 1350 px.
                </div>
              )}
              <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                <input
                  type="file"
                  accept="image/*"
                  disabled={Boolean(uploadingField)}
                  onChange={e => {
                    handleImageUpload(e.target.files?.[0], 'posterImageUrl');
                    e.target.value = '';
                  }}
                />
                <input
                  type="text"
                  placeholder="Or paste poster image URL"
                  value={draft.posterImageUrl || ''}
                  onChange={e => setDraft(prev => ({ ...prev, posterImageUrl: e.target.value }))}
                  className="admin-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--clr-charcoal)' }}>
                Poster Name (for accessibility &amp; tracking updates)
              </label>
              <input
                type="text"
                placeholder="e.g. New Year Gala 2026"
                value={draft.posterTitle || ''}
                onChange={e => setDraft(prev => ({ ...prev, posterTitle: e.target.value }))}
                className="admin-input"
              />
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--clr-grey)' }}>
                Tip: Include a small &quot;Tap to Reserve&quot; line in your poster design so guests know clicking it jumps to booking.
              </p>
              {draft.posterImageUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewPoster(true)}
                  className="btn btn-secondary"
                  style={{ justifySelf: 'start', padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Preview Borderless Popup
                </button>
              )}
            </div>
          </div>
        </div>

        {statusMsg && (
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: statusMsg.toLowerCase().includes('error') || statusMsg.toLowerCase().includes('failed') ? 'var(--clr-error)' : 'var(--clr-emerald)' }}>
            {statusMsg}
          </div>
        )}

        <div>
          <button type="submit" disabled={isSaving || Boolean(uploadingField)} className="btn btn-emerald">
            {isSaving ? 'Saving...' : 'Save Hero & Event Poster'}
          </button>
        </div>
      </form>

      <EventPosterModal
        siteContent={draft}
        forceOpen={previewPoster}
        onForceClose={() => setPreviewPoster(false)}
      />
    </div>
  );
}