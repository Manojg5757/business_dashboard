const { setGlobalOptions } = require('firebase-functions/v2');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
setGlobalOptions({ region: 'asia-south1', maxInstances: 3 });

const AGENT_API_KEY = defineSecret('AGENT_API_KEY');
const OWNER_EMAIL = defineString('OWNER_EMAIL');

const istDate = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// 1) Agents submit items for approval.
// POST https://asia-south1-<project>.cloudfunctions.net/submitApproval
// Header: x-api-key: <AGENT_API_KEY>
// Body: { agent, type, title, content, callbackUrl?, meta? }
exports.submitApproval = onRequest({ secrets: [AGENT_API_KEY], cors: false }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('POST only');
  if (req.get('x-api-key') !== AGENT_API_KEY.value()) return res.status(401).send('Bad key');
  const { agent, type, title, content, callbackUrl, meta } = req.body || {};
  if (!agent || !title || !content) return res.status(400).send('agent, title and content are required');
  const ref = await db.collection('approvals').add({
    agent: String(agent), type: String(type || 'general'), title: String(title).slice(0, 200),
    content: String(content).slice(0, 20000), callbackUrl: callbackUrl || null, meta: meta || null,
    status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await notify('New approval', `${agent}: ${title}`);
  res.json({ id: ref.id, status: 'pending' });
});

// 2) Dashboard approves/rejects; result is posted back to the agent's callbackUrl (e.g. an n8n webhook).
exports.decideApproval = onCall(async req => {
  const email = (req.auth?.token?.email || '').toLowerCase();
  const owners = OWNER_EMAIL.value().toLowerCase().split(',').map(s => s.trim());
  if (!email || !owners.includes(email)) throw new HttpsError('permission-denied', 'Not allowed');
  const { id, decision, content } = req.data || {};
  if (!['approved', 'rejected'].includes(decision)) throw new HttpsError('invalid-argument', 'Bad decision');
  const ref = db.collection('approvals').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'No such item');
  const it = snap.data();
  if (it.status !== 'pending') throw new HttpsError('failed-precondition', 'Already decided');
  const update = { status: decision, decidedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (typeof content === 'string' && content !== it.content) { update.content = content; update.edited = true; }
  await ref.update(update);
  if (it.callbackUrl) {
    try {
      const r = await fetch(it.callbackUrl, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, decision, content: update.content ?? it.content, meta: it.meta }),
      });
      await ref.update({ callbackStatus: r.status });
    } catch (e) { await ref.update({ callbackStatus: 'error: ' + e.message }); }
  }
  return { ok: true };
});

// 3) Daily report at 8:00 AM IST covering yesterday.
exports.dailyReport = onSchedule({ schedule: 'every day 08:00', timeZone: 'Asia/Kolkata' }, async () => {
  const day = istDate(-1);
  const [entries, products, pending] = await Promise.all([
    db.collection('entries').where('date', '==', day).get(),
    db.collection('fba_products').get(),
    db.collection('approvals').where('status', '==', 'pending').get(),
  ]);
  const e = Object.fromEntries(entries.docs.map(d => [d.data().biz, d.data().values || {}]));
  const st = {}; products.docs.forEach(d => { const s = d.data().status; st[s] = (st[s] || 0) + 1; });
  const selling = (st.selling || 0) + (st.acos || 0);
  const missing = ['agents', 'digital', 'goat', 'shop'].filter(b => !e[b]);

  const lines = [
    `✅ Approvals pending: ${pending.size}`,
    `📦 FBA: ${selling}/${products.size} selling` +
      (st.exit ? ` · ${st.exit} exit candidates` : '') + (st.listing ? ` · ${st.listing} need listing fix` : ''),
    e.agents && `🤖 Agents: ${e.agents.leads ?? 0} leads, ${e.agents.calls ?? 0} calls, ${inr(e.agents.revenue)}`,
    e.digital && `💾 Digital: ${e.digital.sales ?? 0} sales, ${inr(e.digital.revenue)}`,
    e.goat && `🐐 Farm: herd ${e.goat.herd ?? '—'}, sales ${inr(e.goat.sales)}, costs ${inr((e.goat.feed || 0) + (e.goat.expenses || 0))}` +
      (e.goat.health ? `\n   Health: ${e.goat.health}` : ''),
    e.shop && `🔧 Shop: sales ${inr(e.shop.sales)}, expenses ${inr(e.shop.expenses)}` +
      (e.shop.lowStock ? `\n   Low stock: ${e.shop.lowStock}` : ''),
    missing.length && `⚠️ Not logged: ${missing.join(', ')}`,
  ].filter(Boolean);
  const summary = lines.join('\n');

  await db.collection('reports').doc(day).set({ date: day, summary, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  await notify(`Daily report · ${day}`, lines.slice(0, 3).join(' | '));
});

async function notify(title, body) {
  const s = await db.doc('settings/push').get();
  const tokens = s.exists ? s.data().tokens || [] : [];
  if (!tokens.length) return;
  const r = await admin.messaging().sendEachForMulticast({
    tokens, notification: { title, body: body.slice(0, 200) }, webpush: { fcmOptions: { link: '/' } },
  });
  const dead = tokens.filter((_, i) => !r.responses[i].success &&
    ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.responses[i].error?.code));
  if (dead.length) await db.doc('settings/push').update({ tokens: admin.firestore.FieldValue.arrayRemove(...dead) });
}
