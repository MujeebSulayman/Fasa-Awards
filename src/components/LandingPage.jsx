import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function LandingPage({ onEnter }) {
  const [visible, setVisible] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const isMobile = viewportWidth <= 640;
  const isTablet = viewportWidth <= 900;
  const isLaptop = viewportWidth <= 1366;
  const [liveStats, setLiveStats] = useState({
    categories: null,
    nominees: null,
  });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ count: categoriesCount }, { count: nomineesCount }] = await Promise.all([
          supabase.from('categories').select('*', { count: 'exact', head: true }),
          supabase.from('contestants').select('*', { count: 'exact', head: true }),
        ]);

        setLiveStats({
          categories: categoriesCount ?? 0,
          nominees: nomineesCount ?? 0,
        });
      } catch (_error) {
        setLiveStats({
          categories: 0,
          nominees: 0,
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <div style={styles.root}>
      {/* Top nav bar */}
      <header style={{ ...styles.nav, padding: isMobile ? '14px 16px' : '24px 48px' }}>
        <img src="/logo.jpg" alt="FASA logo" style={{ ...styles.navLogo, width: isMobile ? '42px' : isLaptop ? '44px' : '56px', height: isMobile ? '42px' : isLaptop ? '44px' : '56px' }} />
        <span style={styles.navYear}>2026</span>
      </header>

      {/* Hero */}
      <main style={{ ...styles.hero, padding: isMobile ? '44px 18px 28px' : isTablet ? '64px 24px 34px' : styles.hero.padding, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: 'opacity 0.8s ease, transform 0.8s ease' }}>
        <img src="/logo.jpg" alt="FASA logo" style={{ ...styles.logo, width: isMobile ? '76px' : '96px', height: isMobile ? '76px' : '96px' }} />
        {/* Decorative divider */}
        <div style={styles.topLine} />

        <p style={styles.eyebrow}>THE OFFICIAL AWARD NIGHT</p>

        <h1 style={{ ...styles.title, fontSize: isMobile ? '2.8rem' : isTablet ? '4.3rem' : styles.title.fontSize }}>
          FASA<br />
          <span style={styles.titleOutline}>AWARDS</span>
        </h1>

        <p style={{ ...styles.subtitle, fontSize: isMobile ? '0.94rem' : styles.subtitle.fontSize }}>
          Celebrate excellence. Honour achievement.<br />Vote for the best.
        </p>

        <div style={styles.divider} />

        <button style={{ ...styles.ctaButton, padding: isMobile ? '14px 28px' : styles.ctaButton.padding, fontSize: isMobile ? '0.74rem' : styles.ctaButton.fontSize }} onClick={onEnter} onMouseEnter={e => {
          e.currentTarget.style.background = '#d7b35c';
          e.currentTarget.style.color = '#2b1236';
        }} onMouseLeave={e => {
          e.currentTarget.style.background = '#f1ddac';
          e.currentTarget.style.color = '#2b1236';
        }}>
          CAST YOUR VOTE
        </button>

        <button
          type="button"
          style={styles.hintButton}
          onClick={onEnter}
        >
          ↓ view nominees
        </button>
      </main>

      {/* Stats row */}
      <section style={{ ...styles.statsRow, flexDirection: isMobile ? 'column' : 'row' }}>
        {[
          { value: liveStats.categories, label: 'Categories' },
          { value: liveStats.nominees, label: 'Nominees' },
          { value: '2026', label: 'Edition' },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              ...styles.statItem,
              padding: isMobile ? '20px 16px' : isTablet ? '24px 30px' : styles.statItem.padding,
              borderRight: isMobile ? 'none' : styles.statItem.borderRight,
              borderBottom: isMobile && i !== 2 ? '1px solid #5a3d66' : 'none',
            }}
          >
            <span style={styles.statValue}>{s.value === null ? '...' : s.value}</span>
            <span style={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>© {new Date().getFullYear()} Fasa Awards. All rights reserved.</span>
      </footer>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#180920',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "var(--font-body)",
    overflowX: 'hidden',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    borderBottom: '1px solid #5a3d66',
    letterSpacing: '0.2em',
    fontSize: '0.8rem',
  },
  navLogo: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    objectFit: 'cover',
    border: '1px solid #5a3d66',
  },
  navYear: {
    opacity: 0.8,
    letterSpacing: '0.2em',
    fontFamily: "var(--font-display)",
    fontSize: '0.85rem',
  },
  hero: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 32px 40px',
  },
  logo: {
    width: '96px',
    height: '96px',
    borderRadius: '16px',
    objectFit: 'cover',
    border: '1px solid #5a3d66',
    marginBottom: '20px',
  },
  topLine: {
    width: '1px',
    height: '60px',
    background: '#b4871f',
    marginBottom: '28px',
  },
  eyebrow: {
    fontFamily: "var(--font-display)",
    fontSize: '0.7rem',
    letterSpacing: '0.35em',
    opacity: 0.85,
    marginBottom: '28px',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 'clamp(64px, 14vw, 160px)',
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    marginBottom: '8px',
    fontFamily: "var(--font-display)",
  },
  titleOutline: {
    WebkitTextStroke: '2px #b4871f',
    color: 'transparent',
  },
  subtitle: {
    fontSize: '1.05rem',
    opacity: 0.9,
    letterSpacing: '0.05em',
    lineHeight: 1.7,
    marginTop: '32px',
    fontFamily: "var(--font-body)",
    fontWeight: 300,
  },
  divider: {
    width: '60px',
    height: '1px',
    background: '#b4871f',
    margin: '40px auto',
  },
  ctaButton: {
    background: '#f1ddac',
    color: '#2b1236',
    border: '1px solid #f1ddac',
    padding: '18px 56px',
    fontSize: '0.8rem',
    letterSpacing: '0.3em',
    fontFamily: "var(--font-display)",
    cursor: 'pointer',
    transition: 'background 0.3s ease, color 0.3s ease',
    textTransform: 'uppercase',
  },
  hint: {
    marginTop: '32px',
    fontSize: '0.75rem',
    opacity: 0.7,
    letterSpacing: '0.1em',
    fontFamily: "var(--font-body)",
  },
  hintButton: {
    marginTop: '32px',
    fontSize: '0.75rem',
    opacity: 0.75,
    letterSpacing: '0.1em',
    fontFamily: "var(--font-display)",
    background: 'transparent',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0',
    borderTop: '1px solid #5a3d66',
    borderBottom: '1px solid #5a3d66',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 64px',
    borderRight: '1px solid #5a3d66',
    gap: '6px',
  },
  statValue: {
    fontSize: '2.2rem',
    fontWeight: 300,
    fontFamily: "var(--font-display)",
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontSize: '0.65rem',
    letterSpacing: '0.25em',
    opacity: 0.85,
    fontFamily: "var(--font-display)",
    textTransform: 'uppercase',
  },
  footer: {
    textAlign: 'center',
    padding: '24px',
    fontSize: '0.7rem',
    opacity: 0.8,
    letterSpacing: '0.1em',
    fontFamily: "var(--font-body)",
  },
};
