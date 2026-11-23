import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
const GALLERY_GRID_CATEGORY = 'Gallery Grid';

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

const isGridPost = (post) =>
  (post?.category || '').trim().toLowerCase() === GALLERY_GRID_CATEGORY.toLowerCase();

export function BlogPage({ posts, onBackHome }) {
  const [lightboxState, setLightboxState] = useState(null);

  // Strictly separate Bento Grid uploads from Editorial Blog Story cards (zero duplication)
  const gridPosts = posts.filter(isGridPost);
  const storyPosts = posts.filter(post => !isGridPost(post));

  const gridPhotos = [];
  gridPosts.forEach(post => {
    (post.imageUrls || []).forEach((url, idx) => {
      gridPhotos.push({
        url,
        title: post.title,
        category: 'Gallery',
        caption: post.content || '',
        key: `${post.id}-${idx}`
      });
    });
  });

  useEffect(() => {
    if (!lightboxState) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

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
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
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

      {gridPhotos.length === 0 && storyPosts.length === 0 ? (
        <div className="subpage-empty">
          <p>Gallery stories and photos will appear here as soon as they are published.</p>
        </div>
      ) : (
        <>
          {gridPhotos.length > 0 && (
            <section className="bento-showcase" aria-label="Photo gallery mosaic">
              <div className="bento-grid">
                {gridPhotos.map((photo, idx) => (
                  <button
                    key={photo.key}
                    type="button"
                    className={BENTO_SLOTS[idx % BENTO_SLOTS.length]}
                    onClick={() => setLightboxState({ items: gridPhotos, index: idx })}
                    aria-label={`Open ${photo.title} photo ${idx + 1}`}
                  >
                    <img src={photo.url} alt={`${photo.title} gallery item ${idx + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {storyPosts.length > 0 && (
            <div className="editorial-blog-grid">
              {storyPosts.map(post => {
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
                        <span className="blog-category-badge">{post.category || 'Journal'}</span>
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
          )}
        </>
      )}

      {activePhoto && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
}

export function AdminBlogManager({ apiBase, posts, getStaffHeaders, onRefresh }) {
  const editorRef = useRef(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [placement, setPlacement] = useState('story'); // 'grid' | 'story'
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food & Grill');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info');

  const gridCount = posts.filter(isGridPost).length;
  const storyCount = posts.length - gridCount;

  const resetForm = () => {
    setEditingPostId(null);
    setPlacement('story');
    setTitle('');
    setCategory('Food & Grill');
    setContent('');
    setPhotos([]);
    setManualUrlInput('');
  };

  const startEditingPost = (post) => {
    const isGrid = isGridPost(post);
    setEditingPostId(post.id);
    setPlacement(isGrid ? 'grid' : 'story');
    setTitle(post.title || '');
    setCategory(isGrid ? 'Food & Grill' : (post.category || 'Food & Grill'));
    setContent(post.content || '');
    setPhotos(Array.isArray(post.imageUrls) ? [...post.imageUrls] : []);
    setManualUrlInput('');
    setStatusType('info');
    setStatusMsg(`Editing "${post.title}". You can switch its placement or edit photos below, then click Save changes.`);
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
      const finalCategory = placement === 'grid' ? GALLERY_GRID_CATEGORY : category;
      const res = await fetch(endpoint, {
        method,
        headers: getStaffHeaders(),
        body: JSON.stringify({ title, category: finalCategory, content, imageUrls: photos })
      });
      if (res.ok) {
        const wasEditing = Boolean(editingPostId);
        resetForm();
        setStatusType('success');
        setStatusMsg(
          wasEditing
            ? 'Updated successfully.'
            : placement === 'grid'
              ? 'Photos published to the Top Photo Grid only.'
              : 'Story published to the Blog Cards only.'
        );
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
    if (!window.confirm('Delete this entry and all its photos?')) return;
    const res = await fetch(`${apiBase}/api/blog/${id}`, {
      method: 'DELETE',
      headers: getStaffHeaders(false)
    });
    if (res.ok) {
      if (editingPostId === id) resetForm();
      setStatusType('info');
      setStatusMsg('Entry deleted.');
      await onRefresh();
    }
  };

  return (
    <div ref={editorRef} className="cms-shell">
      <div className="cms-header">
        <div>
          <h3 className="cms-title">
            {editingPostId ? 'Edit gallery or blog entry' : 'Add gallery photos or blog story'}
          </h3>
          <p className="cms-subtitle">
            Choose whether photos appear in the Top Photo Grid (Bento mosaic) or as a Blog Story Card below. Photos never duplicate between the two.
          </p>
        </div>
        <div className="cms-header-badges">
          <span className="cms-pill cms-pill--gold">{gridCount} photo grid {gridCount === 1 ? 'set' : 'sets'}</span>
          <span className="cms-pill cms-pill--emerald">{storyCount} blog {storyCount === 1 ? 'card' : 'cards'}</span>
          {editingPostId && (
            <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ minHeight: '32px', padding: '4px 12px', fontSize: '13px' }}>
              Create new instead
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSavePost} className="promo-admin-card cms-form-stack">
        {/* Clear Placement Toggle: Top Bento Grid vs Blog Story Card */}
        <div className="cms-field">
          <label>Where should these photos appear?</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setPlacement('grid')}
              className={`btn-admin-tab ${placement === 'grid' ? 'active' : ''}`}
            >
              Top Photo Grid only (Bento)
            </button>
            <button
              type="button"
              onClick={() => setPlacement('story')}
              className={`btn-admin-tab ${placement === 'story' ? 'active' : ''}`}
            >
              Blog Story Card only
            </button>
          </div>
        </div>

        <div className={placement === 'story' ? 'cms-two-col' : 'cms-fields'}>
          <div className="cms-field">
            <label>{placement === 'grid' ? 'Photo set title (shown in lightbox)' : 'Story title'}</label>
            <input
              type="text"
              required
              placeholder={placement === 'grid' ? 'Example: Evening charcoal grill photos' : 'Example: Weekend charcoal grill spread'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="admin-input"
            />
          </div>

          {placement === 'story' && (
            <div className="cms-field">
              <label>Story category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="admin-input">
                <option value="Food & Grill">Food &amp; Grill</option>
                <option value="Fresh Meze">Fresh Meze</option>
                <option value="Restaurant & Ambience">Restaurant &amp; Ambience</option>
                <option value="Events & Celebrations">Events &amp; Celebrations</option>
              </select>
            </div>
          )}
        </div>

        <div className="cms-field">
          <label>{placement === 'grid' ? 'Short caption (optional, shown when clicked)' : 'Story text'}</label>
          <textarea
            rows={placement === 'grid' ? '2' : '3'}
            placeholder={
              placement === 'grid'
                ? 'Optional short caption displayed inside the photo viewer...'
                : 'Write a short story that appears on the blog card...'
            }
            value={content}
            onChange={e => setContent(e.target.value)}
            className="admin-input"
          />
        </div>

        <div className="cms-field">
          <label>Photos ({photos.length} attached)</label>
          <div className="cms-upload-dropzone">
            <div className="cms-upload-dropzone-copy">
              <strong>{isUploading ? 'Uploading your photos...' : 'Add photos'}</strong>
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
                  {placement === 'story' && i === 0 && <span className="cms-thumb-cover-tag">Cover</span>}
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
                  : placement === 'grid'
                    ? `Publish to Photo Grid (${photos.length})`
                    : `Publish Blog Card (${photos.length})`}
            </button>
          </div>
        </div>
      </form>

      <div className="cms-section-label">Published entries ({posts.length})</div>
      {posts.length === 0 ? (
        <div className="promo-admin-card" style={{ textAlign: 'center', color: 'var(--text-2, var(--text-muted))' }}>
          No entries published yet. Add photos to the Top Photo Grid or publish your first Blog Story Card above.
        </div>
      ) : (
        <div className="cms-post-list">
          {posts.map(p => {
            const cover = Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls[0] : '';
            const count = p.imageUrls?.length || 0;
            const isBeingEdited = editingPostId === p.id;
            const entryIsGrid = isGridPost(p);

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
                    <span className={`cms-pill ${entryIsGrid ? 'cms-pill--gold' : 'cms-pill--emerald'}`}>
                      {entryIsGrid ? 'Top Photo Grid' : `Blog Card · ${p.category || 'Journal'}`}
                    </span>
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