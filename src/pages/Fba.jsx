import { useEffect, useState } from 'react';
import { collection, getDocs, writeBatch, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { parseCsv, readReport, triage } from '../lib/fba';
import { inr } from '../lib/businesses';

const ORDER = { exit: 0, listing: 1, traffic: 2, acos: 3, selling: 4 };

export default function Fba() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');

  const load = () => getDocs(collection(db, 'fba_products'))
    .then(s => setItems(s.docs.map(d => d.data())));
  useEffect(() => { load(); }, []);

  const upload = async e => {
    const file = e.target.files[0]; if (!file) return;
    setMsg('Reading…');
    try {
      const rep = readReport(await parseCsv(file));
      const byAsin = Object.fromEntries(items.map(p => [p.asin, p]));
      const batch = writeBatch(db);
      for (const r of rep.rows) {
        const p = { firstSeen: Date.now(), ...byAsin[r.asin], ...r, updatedAt: Date.now() };
        if (!p.title) p.title = r.asin;
        const t = triage(p);
        batch.set(doc(db, 'fba_products', r.asin), { ...p, status: t.s });
      }
      await batch.commit();
      await addDoc(collection(db, 'fba_uploads'), { file: file.name, type: rep.type, rows: rep.rows.length, at: serverTimestamp() });
      setMsg(`Imported ${rep.rows.length} products from ${rep.type === 'ads' ? 'ads' : 'business'} report.`);
      load();
    } catch (err) { setMsg(err.message); }
    e.target.value = '';
  };

  const rows = items.map(p => ({ ...p, t: triage(p) }))
    .filter(p => filter === 'all' || p.t.s === filter)
    .sort((a, b) => ORDER[a.t.s] - ORDER[b.t.s]);
  const counts = items.reduce((c, p) => (c[triage(p).s] = (c[triage(p).s] || 0) + 1, c), {});

  return (
    <>
      <h2>Amazon FBA triage</h2>
      <div className="card">
        <label className="btn primary full">Upload CSV report
          <input type="file" accept=".csv,text/csv" hidden onChange={upload} /></label>
        <p className="muted small">Seller Central → Reports → Business Reports → "Detailed Page Sales and Traffic by Child Item".
          Optional: Advertising → Reports → Sponsored Products "Advertised product" report. Upload both for the full picture.</p>
        {msg && <p className="small">{msg}</p>}
      </div>
      <div className="chips">
        {['all', 'exit', 'listing', 'traffic', 'acos', 'selling'].map(f => (
          <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {f} {f === 'all' ? items.length : counts[f] || 0}</button>))}
      </div>
      {rows.map(p => (
        <div key={p.asin} className="card">
          <div className="row"><b className="clip">{p.title}</b><span className={'badge ' + p.t.s}>{p.t.label}</span></div>
          <div className="muted small">{p.asin}</div>
          <div className="stats">
            <span>Sessions <b>{p.sessions || 0}</b></span><span>Units <b>{p.units || 0}</b></span>
            <span>Sales <b>{inr(p.sales)}</b></span><span>Ad spend <b>{inr(p.adSpend)}</b></span>
            <span>Clicks <b>{p.adClicks || 0}</b></span>
            <span>ACoS <b>{p.adSales ? Math.round(p.adSpend / p.adSales * 100) + '%' : '—'}</b></span>
          </div>
          <div className="tip">→ {p.t.tip}</div>
        </div>))}
    </>
  );
}
