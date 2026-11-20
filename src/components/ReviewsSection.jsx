import { useState } from 'react';

const renderStars = (rating) => {
  const full = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
};

export function ReviewsPage({
  apiBase,
  reviewData,
  isAdmin,
  getStaffHeaders,
  onRefresh,
  onBackHome
}) {
  const [guestName, setGuestName] = useState('');
  const [rating, setRating] = useState(5);
  const [foodHighlight, setFoodHighlight] = useState('Charcoal Grill');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const google = reviewData?.google || {};
  const websiteReviews = reviewData?.websiteReviews || [];
  const googleMapsLink = google.googleMapsUri || 'https://www.google.com/maps/search/?api=1&query=MyHosh+99+Fisherton+Street+Salisbury+SP2+7SP';

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const res = await fetch(`${apiBase}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName, rating, foodHighlight, comment })
      });
      if (res.ok) {
        setGuestName('');
        setRating(5);
        setComment('');
        setFeedback('Thank you! Your review has been published.');
        await onRefresh();
      } else {
        setFeedback(await res.text());
      }
    } catch (_) {
      setFeedback('Could not submit review right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminDelete = async (id) => {
    if (!window.confirm('Remove this review? (Only remove spam/abusive content.)')) return;
    const res = await fetch(`${apiBase}/api/reviews/${id}`, {
      method: 'DELETE',
      headers: getStaffHeaders(false)
    });
    if (res.ok) await onRefresh();
  };

  return (
    <div className="subpage-shell fade-in">
      <div className="subpage-hero">
        <h1>Guest Reviews &amp; Ratings</h1>
        <div className="gold-divider"><span></span></div>
        <p>Honest feedback from guests dining on our charcoal grill, homemade cold &amp; hot meze, and Turkish hospitality in Salisbury.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
          <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            ⭐ Review Us on Google
          </a>
          <button type="button" onClick={onBackHome} className="btn btn-secondary">
            &larr; Back to Restaurant
          </button>
        </div>
      </div>

      {/* LIVE OVERALL RATING + FOOD CONTEXT CARD */}
      <div className="reviews-summary-card">
        <div className="reviews-score-block">
          <div className="reviews-big-score">
            {google.configured && google.rating ? Number(google.rating).toFixed(1) : (reviewData?.siteAverageRating ? Number(reviewData.siteAverageRating).toFixed(1) : 'New')}
          </div>
          <div className="reviews-stars-lg">
            {renderStars(google.configured && google.rating ? google.rating : (reviewData?.siteAverageRating || 5))}
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--clr-grey)' }}>
            {google.configured
              ? `Live Google Rating • ${google.totalReviews} Google reviews`
              : `${reviewData?.siteReviewCount || 0} Website guest review(s)`}
          </div>
        </div>

        <div className="reviews-context-block">
          <h3>What Guests Come For at MyHosh</h3>
          <p>
            Every skewer is cooked fresh over glowing charcoal, paired with house-made cold and hot meze, warm lavash bread, and attentive table service at 99 Fisherton Street.
          </p>
          <div className="food-context-tags">
            <span>🔥 Charcoal Grill &amp; Adana</span>
            <span>🥗 Homemade Cold &amp; Hot Meze</span>
            <span>🐟 Fresh Grilled Seabass</span>
            <span>✨ Warm Velvet Ambience</span>
          </div>
        </div>
      </div>

      {/* LIVE GOOGLE REVIEWS */}
      {google.configured && Array.isArray(google.reviews) && google.reviews.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, color: 'var(--clr-emerald)' }}>Featured Google Reviews</h2>
            <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="legal-inline-link">
              Read all {google.totalReviews} reviews on Google &rarr;
            </a>
          </div>
          <div className="reviews-grid">
            {google.reviews.map((rev, idx) => (
              <div key={idx} className="review-card">
                <div className="review-card-top">
                  <strong>{rev.authorName}</strong>
                  <span className="review-source-pill">Google</span>
                </div>
                <div className="review-stars">{renderStars(rev.rating)} <span>{rev.relativeTime}</span></div>
                <p>{rev.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* WEBSITE GUEST REVIEWS + SUBMISSION FORM */}
      <section className="website-reviews-split">
        <div className="review-form-card">
          <h2 style={{ marginTop: 0, color: 'var(--clr-emerald)' }}>Leave a Review on Our Website</h2>
          <p style={{ color: 'var(--clr-grey)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Dined with us recently? Share your honest experience with future guests.
          </p>
          <form onSubmit={handleSubmitReview} style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}>Your Rating *</label>
              <div className="star-picker-row">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`star-pick-btn ${rating >= star ? 'active' : ''}`}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}>Your Name *</label>
              <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="e.g. Sarah T." className="form-input" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}>What stood out most?</label>
              <select value={foodHighlight} onChange={e => setFoodHighlight(e.target.value)} className="form-input">
                <option value="Charcoal Grill">Charcoal Grill</option>
                <option value="Cold & Hot Meze">Cold &amp; Hot Meze</option>
                <option value="Authentic Turkish Dishes">Authentic Turkish Dishes</option>
                <option value="Seafood & Vegetarian">Seafood &amp; Vegetarian</option>
                <option value="Service & Atmosphere">Service &amp; Atmosphere</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}>Your Review *</label>
              <textarea rows="4" required value={comment} onChange={e => setComment(e.target.value)} placeholder="Tell us about your food, service, and evening..." className="form-input" />
            </div>

            {feedback && (
              <div style={{ fontSize: '0.9rem', color: feedback.startsWith('Thank') ? 'var(--clr-emerald)' : 'var(--clr-error)' }}>
                {feedback}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn btn-emerald">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ marginTop: 0, color: 'var(--clr-emerald)' }}>Website Guest Reviews ({websiteReviews.length})</h2>
          {websiteReviews.length === 0 ? (
            <div className="subpage-empty" style={{ padding: '28px' }}>
              <p style={{ margin: 0 }}>Be the first guest to leave a review right here on our site!</p>
            </div>
          ) : (
            <div className="reviews-grid" style={{ gridTemplateColumns: '1fr' }}>
              {websiteReviews.map(rev => (
                <div key={rev.id} className="review-card">
                  <div className="review-card-top">
                    <strong>{rev.guestName}</strong>
                    <span className="review-source-pill">{rev.foodHighlight || 'MyHosh Guest'}</span>
                  </div>
                  <div className="review-stars">
                    {renderStars(rev.rating)}{' '}
                    <span>{new Date(rev.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <p>{rev.comment}</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleAdminDelete(rev.id)}
                      className="btn"
                      style={{ marginTop: '8px', background: 'rgba(179,64,47,0.1)', color: 'var(--clr-error)', padding: '5px 10px', fontSize: '0.78rem' }}
                    >
                      Remove Spam
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}