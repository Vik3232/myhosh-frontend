import { useEffect, useState } from 'react';

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
  const [lightboxState, setLightboxState] = useState(null); // { items: [{url, title, caption}], index: 0 }

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
        <h1>MyHosh Journal &amp; Gallery</h1>
        <div className="gold-divider"><span></span></div>
        <p>Moments from our charcoal grill, fresh daily meze, and warm evenings on Fisherton Street.</p>
        <button type="button" onClick={onBackHome} className="btn btn-secondary" style={{ marginTop: '14px' }}>
          Return to Restaurant
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
  const [editingPostId, setEditingPostId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food & Grill');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

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
    setStatusMsg(`Editing "${post.title}". Add or remove individual photos below, then click Save Changes.`);
  };

  const handleMultiPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setStatusMsg('Cloudinary preset not configured in frontend env. Paste image URLs below or add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in Vercel.');
      return;
    }

    setIsUploading(true);
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
      setStatusMsg(`Uploaded ${added.length} of ${files.length} photo(s). Click Save or Publish to store.`);
    } catch (_) {
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
        setStatusMsg(wasEditing ? 'Post and photos updated.' : 'Blog post published.');
        await onRefresh();
      } else {
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
      await onRefresh();
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--clr-marble)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(27,26,23,0.08)', boxShadow: 'var(--shadow-soft)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: 'var(--clr-emerald)' }}>
          {editingPostId ? 'Edit Blog Post & Photos' : 'Create Blog Post & Photo Grid'}
        </h3>
        {editingPostId && (
          <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            New Post Instead
          </button>
        )}
      </div>

      <form onSubmit={handleSavePost} style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <input type="text" required placeholder="Post / Gallery Title" value={title} onChange={e => setTitle(e.target.value)} className="admin-input" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="admin-input">
            <option value="Food & Grill">Food &amp; Grill</option>
            <option value="Fresh Meze">Fresh Meze</option>
            <option value="Restaurant & Ambience">Restaurant &amp; Ambience</option>
            <option value="Events & Celebrations">Events &amp; Celebrations</option>
          </select>
        </div>

        <textarea rows="3" placeholder="Story or caption for this photo set..." value={content} onChange={e => setContent(e.target.value)} className="admin-input" />

        <div style={{ padding: '14px', background: '#fff', borderRadius: '8px', border: '1px dashed rgba(15,77,58,0.35)' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>
            Add Photos (Select multiple files or paste URLs)
          </label>
          <input type="file" accept="image/*" multiple onChange={handleMultiPhotoUpload} disabled={isUploading} />

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
              type="url"
              placeholder="Paste https:// image URL and click Add"
              value={manualUrlInput}
              onChange={e => setManualUrlInput(e.target.value)}
              className="admin-input"
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleAddManualUrl} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
              Add URL
            </button>
          </div>

          {photos.length > 0 && (
            <div className="admin-thumb-grid">
              {photos.map((url, i) => (
                <div key={`${url}-${i}`} className="admin-thumb-item">
                  <img src={url} alt={`Photo ${i + 1}`} />
                  <button
                    type="button"
                    aria-label={`Delete photo ${i + 1}`}
                    onClick={() => handleRemoveSinglePhoto(i)}
                    className="admin-thumb-remove"
                    title="Delete this photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {statusMsg && <div style={{ fontSize: '0.88rem', color: 'var(--clr-emerald)' }}>{statusMsg}</div>}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="submit" disabled={isSaving || isUploading} className="btn btn-emerald">
            {isSaving
              ? 'Saving...'
              : editingPostId
                ? `Save Changes (${photos.length} photo${photos.length === 1 ? '' : 's'})`
                : `Publish Post (${photos.length} photo${photos.length === 1 ? '' : 's'})`}
          </button>
          {editingPostId && (
            <button type="button" onClick={resetForm} className="btn btn-secondary">
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {posts.length > 0 && (
        <div style={{ marginTop: '22px', borderTop: '1px solid rgba(27,26,23,0.1)', paddingTop: '16px' }}>
          <strong style={{ display: 'block', marginBottom: '10px' }}>Published Posts ({posts.length})</strong>
          {posts.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(27,26,23,0.06)', flexWrap: 'wrap' }}>
              <div>
                <strong>{p.title}</strong> — <span style={{ color: 'var(--clr-grey)', fontSize: '0.85rem' }}>{p.imageUrls?.length || 0} photo(s)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => startEditingPost(p)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePost(p.id)}
                  className="btn"
                  style={{ background: 'rgba(179,64,47,0.12)', color: 'var(--clr-error)', padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}