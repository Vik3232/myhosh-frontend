import { useEffect, useRef, useState } from 'react';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

const BENTO_SLOTS = [
  'bento-tile bento-tile--tall-coral',
  'bento-tile bento-tile--wide-cyan',
  'bento-tile bento-tile--wide-gold',
  'bento-tile bento-tile--tall-cream',
  'bento-tile bento-tile--sq-gold',
  'bento-tile bento-tile--wide-white',
  'bento-tile bento-tile--tall-red',
  'bento-tile bento-tile--wide-coral',
  'bento-tile bento-tile--sq-cyan'
];

export function BlogPage({ posts, onBackHome }) {
  const [lightboxState, setLightboxState] = useState(null);

  const allPhotos = [];
  posts.forEach(post => {
    (post.imageUrls || []).forEach((url, idx) => {
      allPhotos.push({
        url,
        title: post.title,
        category: post.category || 'Gallery',
        caption: post.content || '',
        key: `${post.id}-${idx}`
      });
    });
  });

  useEffect(() => {
    if (!lightboxState) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxState(null);
      if (e.key === 'ArrowRight' && lightboxState.items.length > 1) {
        setLightboxState(prev => ({ ...prev, index: (prev.index + 1) % prev.items.length }));
      }
      if (e.key === 'ArrowLeft' && lightboxState.items.length > 1) {
        setLightboxState(prev => ({ ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxState]);

  const activePhoto = lightboxState ? lightboxState.items[lightboxState.index] : null;

  return (
    <div className="subpage-shell fade-in">
      <div className="subpage-hero">
        <h1>MyHosh journal and gallery</h1>
        <p>Moments from our charcoal grill, fresh daily meze, and warm evenings on Fisherton Street.</p>
        <button type="button" onClick={onBackHome} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Return to restaurant
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="subpage-empty">
          <p>Gallery stories and photos will appear here as soon as they are published.</p>
        </div>
      ) : (
        <>
          {allPhotos.length > 0 && (
            <section className="bento-showcase" aria-label="Photo gallery mosaic">
              <div className="bento-grid">
                {allPhotos.map((photo, idx) => (
                  <button
                    key={photo.key}
                    type="button"
                    className={BENTO_SLOTS[idx % BENTO_SLOTS.length]}
                    onClick={() => setLightboxState({ items: allPhotos, index: idx })}
                    aria-label={`Open ${photo.title} photo ${idx + 1}`}
                  >
                    <img src={photo.url} alt={`${photo.title} gallery item ${idx + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="editorial-blog-grid">
            {posts.map(post => {
              const postImages = Array.isArray(post.imageUrls) ? post.imageUrls : [];
              const postItems = postImages.map(url => ({
                url,
                title: post.title,
                caption: post.content || ''
              }));

              return (
                <article key={post.id} className="editorial-blog-card">
                  {postImages.length > 0 && (
                    <button
                      type="button"
                      className="editorial-card-cover"
                      onClick={() => setLightboxState({ items: postItems, index: 0 })}
                      aria-label={`View ${post.title} cover photo`}
                    >
                      <img src={postImages[0]} alt={post.title} loading="lazy" />
                      {postImages.length > 1 && (
                        <span className="editorial-photo-count">{postImages.length} photos</span>
                      )}
                    </button>
                  )}

                  <div className="editorial-card-body">
                    <div className="blog-post-meta">
                      <span className="blog-category-badge">{post.category || 'Gallery'}</span>
                      <span>{new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <h2 className="editorial-card-title">{post.title}</h2>
                    {post.content && <p className="editorial-card-text">{post.content}</p>}

                    {postImages.length > 1 && (
                      <div className="editorial-thumb-strip">
                        {postImages.map((url, idx) => (
                          <button
                            key={`${post.id}-thumb-${idx}`}
                            type="button"
                            className="editorial-thumb-btn"
                            onClick={() => setLightboxState({ items: postItems, index: idx })}
                            aria-label={`Open photo ${idx + 1} from ${post.title}`}
                          >
                            <img src={url} alt={`${post.title} ${idx + 1}`} loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {activePhoto && (
        <div className="blog-lightbox-overlay" role="dialog" aria-modal="true" onClick={() => setLightboxState(null)}>
          <div className="blog-lightbox-frame" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="blog-lightbox-close"
              aria-label="Close photo viewer"
              onClick={() => setLightboxState(null)}
            >
              ✕
            </button>

            <div className="blog-lightbox-stage">
              {lightboxState.items.length > 1 && (
                <button
                  type="button"
                  className="blog-lightbox-nav blog-lightbox-nav--prev"
                  aria-label="Previous photo"
                  onClick={() =>
                    setLightboxState(prev => ({
                      ...prev,
                      index: (prev.index - 1 + prev.items.length) % prev.items.length
                    }))
                  }
                >
                  ‹
                </button>
              )}

              <img src={activePhoto.url} alt={activePhoto.title || 'Gallery view'} className="blog-lightbox-img" />

              {lightboxState.items.length > 1 && (
                <button
                  type="button"
                  className="blog-lightbox-nav blog-lightbox-nav--next"
                  aria-label="Next photo"
                  onClick={() =>
                    setLightboxState(prev => ({
                      ...prev,
                      index: (prev.index + 1) % prev.items.length
                    }))
                  }
                >
                  ›
                </button>
              )}
            </div>

            <div className="blog-lightbox-meta">
              <div>
                <strong>{activePhoto.title}</strong>
                {activePhoto.caption && <p>{activePhoto.caption}</p>}
              </div>
              {lightboxState.items.length > 1 && (
                <span className="blog-lightbox-counter">
                  {lightboxState.index + 1} / {lightboxState.items.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminBlogManager({ apiBase, posts, getStaffHeaders, onRefresh }) {
  const editorRef = useRef(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food & Grill');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info');

  const resetForm = () => {
    setEditingPostId(null);
    setTitle('');
    setCategory('Food & Grill');
    setContent('');
    setPhotos([]);
    setManualUrlInput('');
  };

  const startEditingPost = (post) => {
    setEditingPostId(post.id);
    setTitle(post.title || '');
    setCategory(post.category || 'Food & Grill');
    setContent(post.content || '');
    setPhotos(Array.isArray(post.imageUrls) ? [...post.imageUrls] : []);
    setManualUrlInput('');
    setStatusType('info');
    setStatusMsg(`Editing "${post.title}". Add or remove individual photos below, then click Save changes.`);
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleMultiPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setStatusType('error');
      setStatusMsg('Cloudinary preset is not set in Vercel. Paste image URLs below instead.');
      return;
    }

    setIsUploading(true);
    setStatusType('info');
    setStatusMsg(`Uploading ${files.length} photo(s)...`);
    const added = [];
    try {
      for (const file of files) {
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
            const optimizedUrl = data.secure_url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_1400/');
            added.push(optimizedUrl);
          }
        }
      }
      setPhotos(prev => [...prev, ...added]);
      setStatusType('success');
      setStatusMsg(`Uploaded ${added.length} of ${files.length} photo(s). Click Save or Publish to store.`);
    } catch (_) {
      setStatusType('error');
      setStatusMsg('Upload error. Check your Cloudinary unsigned preset settings.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddManualUrl = () => {
    const trimmed = manualUrlInput.trim();
    if (!trimmed) return;
    setPhotos(prev => [...prev, trimmed]);
    setManualUrlInput('');
  };

  const handleRemoveSinglePhoto = (indexToRemove) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    setStatusMsg('');
    try {
      const endpoint = editingPostId ? `${apiBase}/api/blog/${editingPostId}` : `${apiBase}/api/blog`;
      const method = editingPostId ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: getStaffHeaders(),
        body: JSON.stringify({ title, category, content, imageUrls: photos })
      });
      if (res.ok) {
        const wasEditing = Boolean(editingPostId);
        resetForm();
        setStatusType('success');
        setStatusMsg(wasEditing ? 'Post and photos updated.' : 'Blog post published to the gallery.');
        await onRefresh();
      } else {
        setStatusType('error');
        setStatusMsg(await res.text());
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Delete this entire blog post and all its photos?')) return;
    const res = await fetch(`${apiBase}/api/blog/${id}`, {
      method: 'DELETE',
      headers: getStaffHeaders(false)
    });
    if (res.ok) {
      if (editingPostId === id) resetForm();
      setStatusType('info');
      setStatusMsg('Blog post deleted.');
      await onRefresh();
    }
  };

  return (
    <div ref={editorRef} className="cms-shell">
      <div className="cms-header">
        <div>
          <h3 className="cms-title">
            {editingPostId ? 'Edit gallery post' : 'Create gallery post'}
          </h3>
          <p className="cms-subtitle">
            Upload photos for the homepage Bento mosaic and write a short story for each gallery card. The first photo acts as the card cover.
          </p>
        </div>
        <div className="cms-header-badges">
          <span className="cms-pill cms-pill--emerald">{posts.length} published {posts.length === 1 ? 'post' : 'posts'}</span>
          {editingPostId && (
            <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ minHeight: '32px', padding: '4px 12px', fontSize: '13px' }}>
              Create new post instead
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSavePost} className="promo-admin-card cms-form-stack">
        <div className="cms-two-col">
          <div className="cms-field">
            <label>Post title</label>
            <input
              type="text"
              required
              placeholder="Example: Weekend charcoal grill spread"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="cms-field">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="admin-input">
              <option value="Food & Grill">Food &amp; Grill</option>
              <option value="Fresh Meze">Fresh Meze</option>
              <option value="Restaurant & Ambience">Restaurant &amp; Ambience</option>
              <option value="Events & Celebrations">Events &amp; Celebrations</option>
            </select>
          </div>
        </div>

        <div className="cms-field">
          <label>Story or caption</label>
          <textarea
            rows="3"
            placeholder="Write a short description that appears beneath the cover photo..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="admin-input"
          />
        </div>

        <div className="cms-field">
          <label>Gallery photos ({photos.length} attached)</label>
          <div className="cms-upload-dropzone">
            <div className="cms-upload-dropzone-copy">
              <strong>{isUploading ? 'Uploading your photos...' : 'Add photos to this post'}</strong>
              <span>Select one or multiple JPG, PNG, or WebP images from your computer or phone.</span>
            </div>

            <label className="cms-upload-btn">
              <input type="file" accept="image/*" multiple onChange={handleMultiPhotoUpload} disabled={isUploading} />
              {isUploading ? 'Uploading...' : 'Choose photos'}
            </label>
          </div>

          <div className="cms-url-row">
            <input
              type="url"
              placeholder="Or paste an https:// image URL and click Add URL"
              value={manualUrlInput}
              onChange={e => setManualUrlInput(e.target.value)}
              className="admin-input"
            />
            <button type="button" onClick={handleAddManualUrl} className="btn btn-secondary">
              Add URL
            </button>
          </div>

          {photos.length > 0 && (
            <div className="cms-thumb-grid">
              {photos.map((url, i) => (
                <div key={`${url}-${i}`} className="cms-thumb-card">
                  <img src={url} alt={`Photo ${i + 1}`} />
                  {i === 0 && <span className="cms-thumb-cover-tag">Cover</span>}
                  <button
                    type="button"
                    aria-label={`Delete photo ${i + 1}`}
                    onClick={() => handleRemoveSinglePhoto(i)}
                    className="cms-thumb-delete"
                    title="Delete this photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cms-save-bar">
          <div>
            {statusMsg && (
              <div className={`cms-status cms-status--${statusType}`}>
                {statusMsg}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {editingPostId && (
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel edit
              </button>
            )}
            <button type="submit" disabled={isSaving || isUploading} className="btn btn-emerald">
              {isSaving
                ? 'Saving...'
                : editingPostId
                  ? `Save changes (${photos.length} ${photos.length === 1 ? 'photo' : 'photos'})`
                  : `Publish post (${photos.length} ${photos.length === 1 ? 'photo' : 'photos'})`}
            </button>
          </div>
        </div>
      </form>

      {/* PUBLISHED POSTS LIST */}
      <div className="cms-section-label">Published posts ({posts.length})</div>
      {posts.length === 0 ? (
        <div className="promo-admin-card" style={{ textAlign: 'center', color: 'var(--fg-secondary)' }}>
          No blog posts published yet. Add your first set of food or restaurant photos above.
        </div>
      ) : (
        <div className="cms-post-list">
          {posts.map(p => {
            const cover = Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls[0] : '';
            const count = p.imageUrls?.length || 0;
            const isBeingEdited = editingPostId === p.id;

            return (
              <div key={p.id} className={`cms-post-row ${isBeingEdited ? 'is-editing' : ''}`}>
                <div className="cms-post-thumb">
                  {cover ? (
                    <img src={cover} alt={p.title} />
                  ) : (
                    <span>No photo</span>
                  )}
                </div>

                <div className="cms-post-info">
                  <div className="cms-post-meta">
                    <span className="blog-category-badge">{p.category || 'Gallery'}</span>
                    <span className="cms-post-date">
                      {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="mono-data cms-post-count">{count} {count === 1 ? 'photo' : 'photos'}</span>
                    {isBeingEdited && <span className="cms-pill cms-pill--gold">Editing now</span>}
                  </div>
                  <strong className="cms-post-title">{p.title}</strong>
                  {p.content && <p className="cms-post-excerpt">{p.content}</p>}
                </div>

                <div className="cms-post-actions">
                  <button
                    type="button"
                    onClick={() => startEditingPost(p)}
                    className="btn btn-secondary"
                    style={{ minHeight: '36px', padding: '6px 14px', fontSize: '14px' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(p.id)}
                    className="cms-danger-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}