import Papa from 'papaparse';

const num = v => Number(String(v ?? '').replace(/[₹$,%\s]/g, '')) || 0;
const col = (headers, cands) => headers.find(h => cands.some(c => h.toLowerCase().trim() === c))
  || headers.find(h => cands.some(c => h.toLowerCase().includes(c)));

export function parseCsv(file) {
  return new Promise((res, rej) => Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: r => res(r), error: rej,
  }));
}

// Detects Business Report (Sales & Traffic by Child Item) or Sponsored Products "Advertised product" report.
export function readReport({ data, meta }) {
  const h = meta.fields || [];
  const adAsin = col(h, ['advertised asin']);
  if (adAsin) {
    const spend = col(h, ['spend']), clicks = col(h, ['clicks']), imp = col(h, ['impressions']);
    const sales = col(h, ['7 day total sales', '14 day total sales', 'total sales', 'sales']);
    const out = {};
    for (const r of data) {
      const a = (r[adAsin] || '').trim(); if (!a) continue;
      const o = out[a] ||= { asin: a, adSpend: 0, adClicks: 0, adImpr: 0, adSales: 0 };
      o.adSpend += num(r[spend]); o.adClicks += num(r[clicks]);
      o.adImpr += num(r[imp]); o.adSales += num(r[sales]);
    }
    return { type: 'ads', rows: Object.values(out) };
  }
  const asin = col(h, ['(child) asin', 'child asin', 'asin']);
  if (!asin) throw new Error('Could not find an ASIN column. Upload a Business Report or an Advertised Product report.');
  const title = col(h, ['title']), sess = col(h, ['sessions - total', 'sessions']);
  const units = col(h, ['units ordered']), sales = col(h, ['ordered product sales']);
  const out = {};
  for (const r of data) {
    const a = (r[asin] || '').trim(); if (!a) continue;
    const o = out[a] ||= { asin: a, title: r[title] || '', sessions: 0, units: 0, sales: 0 };
    o.sessions += num(r[sess]); o.units += num(r[units]); o.sales += num(r[sales]);
  }
  return { type: 'business', rows: Object.values(out) };
}

// One clear next action per product.
export function triage(p) {
  const days = p.firstSeen ? (Date.now() - p.firstSeen) / 864e5 : 0;
  const traffic = Math.max(p.sessions || 0, p.adClicks || 0);
  const acos = p.adSales ? p.adSpend / p.adSales : null;
  if ((p.units || 0) > 0) {
    if (acos !== null && acos > 0.4) return { s: 'acos', label: 'Selling, ACoS high', tip: 'Cut bids or negate wasted search terms.' };
    return { s: 'selling', label: 'Selling', tip: 'Protect stock; test small budget increase.' };
  }
  if (days >= 30) return { s: 'exit', label: 'Exit candidate', tip: '30+ days, no sales. Create removal or liquidation order.' };
  if (traffic >= 50) return { s: 'listing', label: 'Fix listing', tip: 'Gets traffic but no sales: main image, price, reviews.' };
  return { s: 'traffic', label: 'No traffic', tip: 'Add exact-match ads, check keywords and price.' };
}
