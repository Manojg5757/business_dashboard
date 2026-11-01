import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MANUAL, today } from '../lib/businesses';

export default function Log() {
  const [biz, setBiz] = useState(MANUAL[0].id);
  const [date, setDate] = useState(today());
  const [vals, setVals] = useState({});
  const [msg, setMsg] = useState('');
  const b = MANUAL.find(x => x.id === biz);
  const id = `${date}_${biz}`;

  useEffect(() => {
    setMsg('');
    getDoc(doc(db, 'entries', id)).then(s => setVals(s.exists() ? s.data().values : {}));
  }, [id]);

  const save = async () => {
    const values = {};
    for (const f of b.fields) {
      const v = vals[f.k];
      if (v !== undefined && v !== '') values[f.k] = f.text ? v : Number(v);
    }
    await setDoc(doc(db, 'entries', id), { biz, date, values, updatedAt: serverTimestamp() });
    setMsg('Saved ✓');
  };

  return (
    <>
      <h2>Daily log</h2>
      <div className="chips">{MANUAL.map(x => (
        <button key={x.id} className={biz === x.id ? 'on' : ''} onClick={() => setBiz(x.id)}>{x.icon} {x.name}</button>))}</div>
      <div className="card">
        <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        {b.fields.map(f => (
          <label key={f.k}>{f.l}
            {f.text
              ? <textarea rows={2} value={vals[f.k] ?? ''} onChange={e => setVals({ ...vals, [f.k]: e.target.value })} />
              : <input inputMode="decimal" type="number" value={vals[f.k] ?? ''} onChange={e => setVals({ ...vals, [f.k]: e.target.value })} />}
          </label>))}
        <button className="btn primary full" onClick={save}>Save</button>
        {msg && <p className="small">{msg}</p>}
      </div>
    </>
  );
}
