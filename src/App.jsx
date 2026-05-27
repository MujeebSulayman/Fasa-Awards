import { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import VoterPortal from './components/VoterPortal.jsx';
import AdminPortal from './components/AdminPortal.jsx';

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'voter' | 'admin'

  // This app doesn't use routes; normalize accidental paths like "/login" back to "/".
  useEffect(() => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  // Lightweight "admin access" via URL hash (no visible button for voters).
  useEffect(() => {
    const applyHashView = () => {
      if (window.location.hash === '#admin') setView('admin');
    };
    applyHashView();
    window.addEventListener('hashchange', applyHashView);
    return () => window.removeEventListener('hashchange', applyHashView);
  }, []);

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      {view === 'landing' && <LandingPage onEnter={() => setView('voter')} />}
      {view === 'voter'   && <VoterPortal />}
      {view === 'admin'   && <AdminPortal onNavigateToVoter={() => { window.location.hash = ''; setView('voter'); }} />}
    </div>
  );
}

export default App;
