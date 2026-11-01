import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, provider, OWNER_EMAILS } from './firebase';
import Home from './pages/Home.jsx';
import Approvals from './pages/Approvals.jsx';
import Fba from './pages/Fba.jsx';
import Log from './pages/Log.jsx';
import Reports from './pages/Reports.jsx';

// Local preview only: VITE_SKIP_AUTH=true in .env.local bypasses sign-in under `npm run dev`
const SKIP_AUTH = import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true';

const TABS = [
  ['home', '🏠', 'Home'], ['approvals', '✅', 'Approvals'], ['fba', '📦', 'FBA'],
  ['log', '✏️', 'Log'], ['reports', '📊', 'Reports'],
];

export default function App() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState(location.hash.slice(1) || 'home');
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { location.hash = tab; }, [tab]);

  if (!SKIP_AUTH) {
  if (user === undefined) return <div className="center">Loading…</div>;
  if (!user) return (
    <div className="center">
      <h1>Business HQ</h1>
      <button className="btn primary" onClick={() =>
        signInWithPopup(auth, provider).catch(() => signInWithRedirect(auth, provider))}>
        Sign in with Google</button>
    </div>
  );
  if (OWNER_EMAILS.length && !OWNER_EMAILS.includes(user.email.toLowerCase())) return (
    <div className="center"><p>{user.email} is not allowed.</p>
      <button className="btn" onClick={() => signOut(auth)}>Sign out</button></div>
  );
  }

  const Page = { home: Home, approvals: Approvals, fba: Fba, log: Log, reports: Reports }[tab] || Home;
  return (
    <>
      <header><b>Business HQ</b><button className="link" onClick={() => signOut(auth)}>Sign out</button></header>
      <main><Page go={setTab} /></main>
      <nav>{TABS.map(([id, ic, l]) => (
        <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
          <span>{ic}</span>{l}</button>))}</nav>
    </>
  );
}
