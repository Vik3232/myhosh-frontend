import { useEffect, useRef, useState } from 'react';

export function useScrollReveal(depKey) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('[data-reveal]'));
    if (elements.length === 0) return;

    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    let observer;
    const rafId = window.requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
      );

      elements.forEach(el => observer.observe(el));
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
    };
  }, [depKey]);
}

export function TaglineReveal({
  eyebrow = 'Fisherton Street, Salisbury',
  text = 'Fresh meze prepared every morning and live charcoal flames every evening, brought together at one warm table.'
}) {
  const sectionRef = useRef(null);
  const words = text.split(' ');
  const [litCount, setLitCount] = useState(0);

  useEffect(() => {
    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setLitCount(words.length);
      return;
    }

    let rafId = null;

    const computeLitWords = () => {
      rafId = null;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const start = vh * 0.88;
      const end = vh * 0.28;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      setLitCount(Math.round(progress * words.length));
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(computeLitWords);
      }
    };

    computeLitWords();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [words.length]);

  return (
    <section ref={sectionRef} className="tagline-reveal-section" aria-label="Our dining promise">
      <div className="tagline-reveal-inner">
        <span className="tagline-reveal-eyebrow">{eyebrow}</span>
        <p className="tagline-reveal-text">
          {words.map((word, idx) => (
            <span
              key={`${word}-${idx}`}
              className={`tagline-reveal-word ${idx < litCount ? 'is-lit' : ''}`}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}