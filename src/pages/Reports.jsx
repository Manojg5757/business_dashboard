import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, db, firebaseConfig, VAPID_KEY } from '../firebase';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    getDocs(query(collection(db, 'reports'), orderBy('date', 'desc'), limit(30)))
      .then(s => setReports(s.docs.map(d => d.data())));
  }, []);

  const enablePush = async () => {
    try {
      if (!(await isSupported())) throw new Error('Push not supported here. On iPhone, add this app to the Home Screen first.');
      if (await Notification.requestPermission() !== 'granted') throw new Error('Notification permission denied.');
      const reg = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js?c=' + encodeURIComponent(JSON.stringify(firebaseConfig)));
      const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
      await setDoc(doc(db, 'settings', 'push'), { tokens: arrayUnion(token) }, { merge: true });
      setMsg('Notifications on for this device ✓');
    } catch (e) { setMsg(e.message); }
  };

  return (
    <>
      <div className="row"><h2>Daily reports</h2><button className="btn" onClick={enablePush}>🔔 Enable alerts</button></div>
      {msg && <p className="small">{msg}</p>}
      {!reports.length && <p className="muted">First report arrives tomorrow at 8:00 AM.</p>}
      {reports.map(r => (
        <div key={r.date} className="card"><b>{r.date}</b><p className="pre">{r.summary}</p></div>))}
    </>
  );
}
