import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

const decide = httpsCallable(functions, 'decideApproval');

export default function Approvals() {
  const [items, setItems] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(null);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => onSnapshot(
    query(collection(db, 'approvals'), orderBy('createdAt', 'desc'), limit(100)),
    s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() })))), []);

  const act = async (it, decision) => {
    setBusy(it.id);
    try {
      await decide({ id: it.id, decision, content: edits[it.id] ?? it.content });
      setOpen(null);
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  const list = items.filter(i => showAll || i.status === 'pending');
  return (
    <>
      <div className="row"><h2>Approvals</h2>
        <button className="link" onClick={() => setShowAll(!showAll)}>{showAll ? 'Pending only' : 'Show history'}</button></div>
      {!list.length && <p className="muted">Nothing waiting. Agents post here via the submitApproval endpoint.</p>}
      {list.map(it => (
        <div key={it.id} className="card">
          <div className="row tap" onClick={() => setOpen(open === it.id ? null : it.id)}>
            <div><b>{it.title}</b><div className="muted">{it.agent} · {it.type} · {it.createdAt?.toDate?.().toLocaleString('en-IN')}</div></div>
            <span className={'badge ' + it.status}>{it.status}</span>
          </div>
          {open === it.id && (
            it.status === 'pending' ? <>
              <textarea rows={8} value={edits[it.id] ?? it.content}
                onChange={e => setEdits({ ...edits, [it.id]: e.target.value })} />
              <div className="row gap">
                <button className="btn" disabled={busy} onClick={() => act(it, 'rejected')}>Reject</button>
                <button className="btn primary" disabled={busy} onClick={() => act(it, 'approved')}>
                  {busy === it.id ? 'Sending…' : 'Approve'}</button>
              </div>
            </> : <p className="pre">{it.content}</p>
          )}
        </div>))}
    </>
  );
}
