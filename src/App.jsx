import { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import VoterPortal from './components/VoterPortal.jsx';
import AdminPortal from './components/AdminPortal.jsx';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Custom router state listener
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    // Custom event to listen to pushState triggers
    window.addEventListener('pushstate-navigate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate-navigate', handleLocationChange);
    };
  }, []);

  const navigate = (path) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new Event('pushstate-navigate'));
  };

  const isContestantPath = currentPath.startsWith('/contestant/');
  const isContestantsPath = currentPath === '/contestants';
  const isAdminPath = currentPath === '/admin';

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      {(currentPath === '/' || (!isContestantsPath && !isContestantPath && !isAdminPath)) && (
        <LandingPage onEnter={() => navigate('/contestants')} />
      )}
      {(isContestantsPath || isContestantPath) && (
        <VoterPortal currentPath={currentPath} navigate={navigate} />
      )}
      {isAdminPath && (
        <AdminPortal onNavigateToVoter={() => navigate('/contestants')} navigate={navigate} />
      )}
    </div>
  );
}

export default App;

