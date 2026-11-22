import { useEffect, useState } from 'react';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const DEFAULT_SITE_CONTENT = {
  slide1Enabled: true,
  slide1ImageUrl: '/images/meze-spread.webp',
  slide1Headline: 'Authentic Turkish Hospitality',
  slide1Subheadline: 'Charcoal grill, fresh meze, and a warm dining experience in the heart of Salisbury.',
  slide1CtaText: 'Reserve a table',
  slide2Enabled: false,
  slide2ImageUrl: '',
  slide2Headline: '',
  slide2Subheadline: '',
  slide2CtaText: 'Reserve a table',
  slide3Enabled: false,
  slide3ImageUrl: '',
  slide3Headline: '',
  slide3Subheadline: '',
  slide3CtaText: 'Reserve a table',
  posterEnabled: false,
  posterImageUrl: '',
  posterTitle: '',
  posterSubtitle: '',
  posterCtaText: 'Reserve a table'
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
      aria-label={siteContent.posterTitle || 'MyHosh event poster'}
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
            alt={siteContent.posterTitle || 'MyHosh special event poster, click to reserve'}
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
  const [statusType, setStatusType] = useState('info');
  const [previewPoster, setPreviewPoster] = useState(false);

  useEffect(() => {
    if (siteContent) {
      setDraft({ ...DEFAULT_SITE_CONTENT, ...siteContent });
    }
  }, [siteContent]);

  const handleImageUpload = async (file, fieldName) => {
    if (!file) return;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setStatusType('error');
      setStatusMsg('Cloudinary preset is not set in Vercel. Paste a direct image URL below instead.');
      return;
    }

    setUploadingField(fieldName);
    setStatusType('info');
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
          setStatusType('success');
          setStatusMsg('Image uploaded. Click Save hero and event poster to publish live.');
        }
      } else {
        setStatusType('error');
        setStatusMsg('Image upload failed. Check your file format and try again.');
      }
    } catch (_) {
      setStatusType('error');
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
        setStatusType('success');
        setStatusMsg('Hero banners and event poster are now live on the website.');
      } else {
        setStatusType('error');
        setStatusMsg((await res.text()) || 'Could not save changes.');
      }
    } catch (_) {
      setStatusType('error');
      setStatusMsg('Network error while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSlideCount = [1, 2, 3].filter(n => draft[`slide${n}Enabled`]).length;
  const slides = [
    { num: 1, title: 'Hero slide 1', subtitle: 'Main homepage banner' },
    { num: 2, title: 'Hero slide 2', subtitle: 'Optional promotion' },
    { num: 3, title: 'Hero slide 3', subtitle: 'Optional promotion' }
  ];

  return (
    <div className="cms-shell">
      <div className="cms-header">
        <div>
          <h3 className="cms-title">Hero banners and event poster</h3>
          <p className="cms-subtitle">
            Control up to 3 rotating homepage banners and your popup event flyer. Changes go live immediately after saving.
          </p>
        </div>
        <div className="cms-header-badges">
          <span className="cms-pill cms-pill--emerald">{activeSlideCount} active hero {activeSlideCount === 1 ? 'slide' : 'slides'}</span>
          <span className={`cms-pill ${draft.posterEnabled && draft.posterImageUrl ? 'cms-pill--gold' : 'cms-pill--muted'}`}>
            {draft.posterEnabled && draft.posterImageUrl ? 'Event poster live' : 'Event poster hidden'}
          </span>
        </div>
      </div>

      <div className="size-guide-banner">
        <div>
          <strong>Hero banner size:</strong> <span className="mono-data">1920 × 1080 px</span> (16:9 landscape, JPG or WebP). Keep food and key details near the centre for mobile screens.
        </div>
        <div>
          <strong>Event poster size:</strong> <span className="mono-data">1080 × 1350 px</span> (4:5 portrait flyer) or <span className="mono-data">1080 × 1080 px</span> (square). Clicking anywhere on the poster takes guests straight to Reserve.
        </div>
      </div>

      <form onSubmit={handleSave} className="cms-form-stack">
        {/* HERO SLIDES 1 - 3 */}
        <div className="cms-section-label">Homepage hero slides</div>
        <div className="promo-admin-grid">
          {slides.map(({ num, title, subtitle }) => {
            const enabledKey = `slide${num}Enabled`;
            const imgKey = `slide${num}ImageUrl`;
            const headKey = `slide${num}Headline`;
            const subKey = `slide${num}Subheadline`;
            const ctaKey = `slide${num}CtaText`;
            const isActive = Boolean(draft[enabledKey]);
            const isUploadingThis = uploadingField === imgKey;

            return (
              <div key={num} className={`promo-admin-card ${isActive ? 'is-active-card' : 'is-dimmed-card'}`}>
                <div className="cms-card-top">
                  <div>
                    <strong className="cms-card-heading">{title}</strong>
                    <span className="cms-card-caption">{subtitle}</span>
                  </div>
                  <label className={`cms-toggle-pill ${isActive ? 'is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setDraft(prev => ({ ...prev, [enabledKey]: e.target.checked }))}
                    />
                    <span>{isActive ? 'Active' : 'Hidden'}</span>
                  </label>
                </div>

                {/* Live Mini Hero Preview */}
                <div className="cms-hero-preview">
                  {draft[imgKey] ? (
                    <img src={draft[imgKey]} alt={`Hero slide ${num} preview`} />
                  ) : (
                    <div className="cms-hero-preview-empty">No background photo set</div>
                  )}
                  <div className="cms-hero-preview-scrim" />
                  <div className="cms-hero-preview-overlay">
                    <div className="cms-hero-preview-headline">
                      {draft[headKey] || 'Your hero headline appears here'}
                    </div>
                    {draft[subKey] && (
                      <div className="cms-hero-preview-sub">{draft[subKey]}</div>
                    )}
                    <span className="cms-hero-preview-cta">{draft[ctaKey] || 'Reserve a table'}</span>
                  </div>
                </div>

                {/* Styled Upload Actions */}
                <div className="cms-upload-row">
                  <label className="cms-upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={Boolean(uploadingField)}
                      onChange={e => {
                        handleImageUpload(e.target.files?.[0], imgKey);
                        e.target.value = '';
                      }}
                    />
                    {isUploadingThis ? 'Uploading...' : 'Upload photo'}
                  </label>

                  {draft[imgKey] && (
                    <button
                      type="button"
                      className="cms-clear-btn"
                      onClick={() => setDraft(prev => ({ ...prev, [imgKey]: '' }))}
                    >
                      Remove
                    </button>
                  )}

                  {num === 1 && draft[imgKey] !== DEFAULT_SITE_CONTENT.slide1ImageUrl && (
                    <button
                      type="button"
                      className="cms-clear-btn"
                      onClick={() => setDraft(prev => ({ ...prev, [imgKey]: DEFAULT_SITE_CONTENT.slide1ImageUrl }))}
                    >
                      Reset default
                    </button>
                  )}
                </div>

                <div className="cms-fields">
                  <div className="cms-field">
                    <label>Image URL</label>
                    <input
                      type="text"
                      placeholder="/images/meze-spread.webp or https://..."
                      value={draft[imgKey] || ''}
                      onChange={e => setDraft(prev => ({ ...prev, [imgKey]: e.target.value }))}
                      className="admin-input"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Headline</label>
                    <input
                      type="text"
                      placeholder="Authentic Turkish Hospitality"
                      value={draft[headKey] || ''}
                      onChange={e => setDraft(prev => ({ ...prev, [headKey]: e.target.value }))}
                      className="admin-input"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Subheadline</label>
                    <textarea
                      rows="2"
                      placeholder="Short promotion note or restaurant description"
                      value={draft[subKey] || ''}
                      onChange={e => setDraft(prev => ({ ...prev, [subKey]: e.target.value }))}
                      className="admin-input"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Button label</label>
                    <input
                      type="text"
                      placeholder="Reserve a table"
                      value={draft[ctaKey] || ''}
                      onChange={e => setDraft(prev => ({ ...prev, [ctaKey]: e.target.value }))}
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* EVENT POSTER POPUP CARD */}
        <div className="cms-section-label">Opening event poster popup</div>
        <div className={`promo-admin-card cms-poster-card ${draft.posterEnabled ? 'is-active-card' : ''}`}>
          <div className="cms-card-top">
            <div>
              <strong className="cms-card-heading">Event poster popup</strong>
              <span className="cms-card-caption">
                Shows borderless when visitors open the website. Tapping anywhere on the poster scrolls straight to booking.
              </span>
            </div>
            <label className={`cms-toggle-pill ${draft.posterEnabled ? 'is-on' : ''}`}>
              <input
                type="checkbox"
                checked={Boolean(draft.posterEnabled)}
                onChange={e => setDraft(prev => ({ ...prev, posterEnabled: e.target.checked }))}
              />
              <span>{draft.posterEnabled ? 'Visible to guests' : 'Hidden'}</span>
            </label>
          </div>

          <div className="cms-poster-grid">
            <div className="cms-poster-preview-col">
              {draft.posterImageUrl ? (
                <div className="promo-preview-box promo-preview-box--poster">
                  <img src={draft.posterImageUrl} alt="Event poster preview" />
                </div>
              ) : (
                <div className="cms-poster-empty">
                  <strong>No poster uploaded</strong>
                  <span>Recommended size: 1080 × 1350 px (4:5 portrait)</span>
                </div>
              )}

              <div className="cms-upload-row">
                <label className="cms-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={Boolean(uploadingField)}
                    onChange={e => {
                      handleImageUpload(e.target.files?.[0], 'posterImageUrl');
                      e.target.value = '';
                    }}
                  />
                  {uploadingField === 'posterImageUrl' ? 'Uploading...' : 'Upload poster'}
                </label>

                {draft.posterImageUrl && (
                  <button
                    type="button"
                    className="cms-clear-btn"
                    onClick={() => setDraft(prev => ({ ...prev, posterImageUrl: '', posterEnabled: false }))}
                  >
                    Remove poster
                  </button>
                )}
              </div>
            </div>

            <div className="cms-fields">
              <div className="cms-field">
                <label>Poster image URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={draft.posterImageUrl || ''}
                  onChange={e => setDraft(prev => ({ ...prev, posterImageUrl: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div className="cms-field">
                <label>Event name (internal label)</label>
                <input
                  type="text"
                  placeholder="Example: Festive evening menu"
                  value={draft.posterTitle || ''}
                  onChange={e => setDraft(prev => ({ ...prev, posterTitle: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <p className="cms-helper-note">
                Tip: Include a short line like &ldquo;Tap poster to book&rdquo; inside your poster design so guests immediately know it links to reservations.
              </p>

              {draft.posterImageUrl && (
                <div>
                  <button
                    type="button"
                    onClick={() => setPreviewPoster(true)}
                    className="btn btn-secondary"
                  >
                    Preview borderless popup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAVE ACTION BAR */}
        <div className="cms-save-bar">
          <div>
            {statusMsg && (
              <div className={`cms-status cms-status--${statusType}`}>
                {statusMsg}
              </div>
            )}
          </div>
          <button type="submit" disabled={isSaving || Boolean(uploadingField)} className="btn btn-emerald">
            {isSaving ? 'Saving...' : 'Save hero and event poster'}
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