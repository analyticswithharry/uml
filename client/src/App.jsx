import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import Home from './pages/Home.jsx';
import Practice from './pages/Practice.jsx';
import Play from './pages/Play.jsx';
import Studio from './pages/Studio.jsx';
import Cheatsheet from './pages/Cheatsheet.jsx';
import { useStore } from './store.js';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  // Work lives in memory only, so warn before a refresh or tab close throws it away.
  useEffect(() => {
    const warn = (e) => {
      const { docs } = useStore.getState();
      const hasWork = Object.values(docs).some((d) => d.nodes.length > 0 && (!d.puzzleId || d.past.length > 0));
      if (!hasWork) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return (
    <Shell>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/practice/:id" element={<Play />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/cheatsheet" element={<Cheatsheet />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
