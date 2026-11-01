import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { BUSINESSES, today, inr } from '../lib/businesses';

export default function Home({ go }) {
  const [entries, setEntries] = useState({});
  const [fba, setFba] = useState([]);
  const [pending, setPending] = useState(0);
  const [report, setReport] = useState(null);

  useEffect(() => {
    getDocs(query(collection(db, 'entries'), where('date', '==', today())))
      .then(s => setEntries(Object.fromEntries(s.docs.map(d => [d.data().biz, d.data().values]))));
    getDocs(collection(db, 'fba_products')).then(s => setFba(s.docs.map(d => d.data())));
    getDocs(query(collection(db, 'approvals'), where('status', '==', 'pending')))
      .then(s => setPending(s.size));
    getDocs(query(collection(db, 'reports'), orderBy('date', 'desc'), limit(1)))
      .then(s => setReport(s.docs[0]?.data() || null));
  }, []);

  const selling = fba.filter(p => p.status === 'selling' || p.status === 'acos').length;
  const card = b => {
    if (b.id === 'fba') return (
      <div key={b.id} className="card tap" onClick={() => go('fba')}>
        <div className="muted">{b.icon} {b.name}</div>
        <div className="big">{selling}/{fba.length || 0}</div>
        <div className="muted">products selling</div>
      </div>);
    const v = entries[b.id];
    const f = b.fields.find(x => x.k === b.key);
    const val = v?.[b.key];
    return (
      <div key={b.id} className="card tap" onClick={() => go('log')}>
        <div className="muted">{b.icon} {b.name}</div>
        <div className="big">{val == null || val === '' ? '—' : f.l.includes('₹') ? inr(val) : val}</div>
        <div className="muted">{v ? f.l.replace(' ₹', '') + ' today' : 'Not logged today'}</div>
      </div>);
  };

  return (
    <>
      <div className={'card tap ' + (pending ? 'alert' : '')} onClick={() => go('approvals')}>
        <div className="row"><b>Approval queue</b><span className="badge">{pending} pending</span></div>
      </div>
      <div className="grid">{BUSINESSES.map(card)}</div>
      {report && (
        <div className="card tap" onClick={() => go('reports')}>
          <div className="muted">Latest daily report · {report.date}</div>
          <p className="pre">{report.summary}</p>
        </div>)}
    </>
  );
}
