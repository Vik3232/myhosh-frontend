import { useState } from 'react';

// Optional: set these 2 values from your free Cloudinary account (cloudinary.com -> Settings -> Upload -> Add unsigned preset)
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export function BlogPage({ posts, onBackHome }) {
  const [lightboxImg, setLightboxImg] = useState(null);

  return (
    <div className="subpage-shell fade-in">
      <div className="subpage-hero">
        <h1>MyHosh Journal &amp; Gallery</h1>
        <div className="gold-divider"><span></span></div>
        <p>Stories from our charcoal grill, fresh daily meze, and warm evenings on Fisherton Street.</p>
        <button type="button" onClick={onBackHome} className="btn btn-secondary" style={{ marginTop: '14px' }}>
          &larr; Back to Restaurant
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="subpage-empty">
          <p>Our gallery and stories are being prepared. Check back soon!</p>
        </div>
      ) : (
        <div className="blog-list">
          {posts.map(post => (
            <article key={post.id} className="blog-post-card">
              <div className="blog-post-meta">
                <span className="blog-category-badge">{post.category || 'Gallery'}</span>
                <span>{new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <h2>{post.title}</h2>
              {post.content && <p className="blog-post-body">{post.content}</p>}

              {Array.isArray(post.imageUrls) && post.imageUrls.length > 0 && (
                <div className="blog-photo-grid">
                  {post.imageUrls.map((url, idx) => (
                    <button
                      key={`${post.id}-${idx}`}
                      type="button"
                      className="blog-photo-tile"
                      onClick={() => setLightboxImg(url)}
                      aria-label={`View photo ${idx + 1} from ${post.title}`}
                    >
                      <img src={url} alt={`${post.title} photo ${idx + 1}`} loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="lightbox-header">
            <button type="button" className="lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
          </div>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxImg} alt="Gallery full view" />
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminBlogManager({ apiBase, posts, getStaffHeaders, onRefresh }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food & Grill');
  const [content, setContent] = useState('');
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleMultiPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setStatusMsg('Missing Vercel env vars: VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET (redeploy after adding).');
      return;
    }

    setIsUploading(true);
    setStatusMsg(`Uploading ${files.length} photo(s)...`);
    const added = [];
    let lastError = '';

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.secure_url) {
          const optimizedUrl = data.secure_url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_1400/');
          added.push(optimizedUrl);
        } else {
          lastError = data?.error?.message || `HTTP ${res.status} from Cloudinary`;
        }
      }

      if (added.length > 0) {
        setUploadedUrls(prev => [...prev, ...added]);
      }

      if (lastError) {
        setStatusMsg(`Uploaded ${added.length}/${files.length}. Error: ${lastError}`);
      } else {
        setStatusMsg(`Uploaded ${added.length} of ${files.length} photo(s).`);
      }
    } catch (err) {
      setStatusMsg(`Network error during upload: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddManualUrl = () => {
    const trimmed = manualUrlInput.trim();
    if (!trimmed) return;
    setUploadedUrls(prev => [...prev, trimmed]);
    setManualUrlInput('');
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${apiBase}/api/blog`, {
        method: 'POST',
        headers: getStaffHeaders(),
        body: JSON.stringify({ title, category, content, imageUrls: uploadedUrls })
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setUploadedUrls([]);
        setStatusMsg('Blog post published!');
        await onRefresh();
      } else {
        setStatusMsg(await res.text());
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this blog post and its gallery?')) return;
    const res = await fetch(`${apiBase}/api/blog/${id}`, {
      method: 'DELETE',
      headers: getStaffHeaders(false)
    });
    if (res.ok) await onRefresh();
  };

  return (
    <div style={{ backgroundColor: 'var(--clr-marble)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid rgba(27,26,23,0.08)', boxShadow: 'var(--shadow-soft)' }}>
      <h3 style={{ marginTop: 0, color: 'var(--clr-emerald)' }}>Admin Blog &amp; Multi-Photo Gallery Manager</h3>
      <form onSubmit={handlePublish} style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <input type="text" required placeholder="Post / Gallery Title *" value={title} onChange={e => setTitle(e.target.value)} className="admin-input" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="admin-input">
            <option value="Food & Grill">Food &amp; Grill</option>
            <option value="Fresh Meze">Fresh Meze</option>
            <option value="Restaurant & Ambience">Restaurant &amp; Ambience</option>
            <option value="Events & Celebrations">Events &amp; Celebrations</option>
          </select>
        </div>

        <textarea rows="3" placeholder="Write a short story or caption about these dishes / photos..." value={content} onChange={e => setContent(e.target.value)} className="admin-input" />

        <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px dashed rgba(15,77,58,0.35)' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>
            Upload Multiple Photos (Cloudinary CDN)
          </label>
          <input type="file" accept="image/*" multiple onChange={handleMultiPhotoUpload} disabled={isUploading} />

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
              type="url"
              placeholder="Or paste an image URL (https://...) and click Add"
              value={manualUrlInput}
              onChange={e => setManualUrlInput(e.target.value)}
              className="admin-input"
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleAddManualUrl} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
              + Add URL
            </button>
          </div>

          {uploadedUrls.length > 0 && (
            <div className="admin-thumb-grid">
              {uploadedUrls.map((url, i) => (
                <div key={`${url}-${i}`} className="admin-thumb-item">
                  <img src={url} alt={`Upload ${i + 1}`} />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setUploadedUrls(prev => prev.filter((_, idx) => idx !== i))}
                    className="admin-thumb-remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {statusMsg && <div style={{ fontSize: '0.88rem', color: 'var(--clr-emerald)' }}>{statusMsg}</div>}

        <button type="submit" disabled={isSaving || isUploading} className="btn btn-emerald" style={{ justifySelf: 'start' }}>
          {isSaving ? 'Publishing...' : `Publish Post (${uploadedUrls.length} photo${uploadedUrls.length === 1 ? '' : 's'})`}
        </button>
      </form>

      {posts.length > 0 && (
        <div style={{ marginTop: '18px', borderTop: '1px solid rgba(27,26,23,0.1)', paddingTop: '14px' }}>
          <strong style={{ display: 'block', marginBottom: '10px' }}>Published Posts ({posts.length})</strong>
          {posts.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(27,26,23,0.06)' }}>
              <span>
                <strong>{p.title}</strong> ({p.imageUrls?.length || 0} photos)
              </span>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="btn"
                style={{ background: 'rgba(179,64,47,0.12)', color: 'var(--clr-error)', padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}