// Edit fields here to change what you track daily. "key" = the number shown on the home card.
export const BUSINESSES = [
  { id: 'fba', name: 'Amazon FBA', icon: '📦', manual: false },
  { id: 'agents', name: 'AI Agents', icon: '🤖', key: 'revenue', fields: [
    { k: 'leads', l: 'New leads' }, { k: 'calls', l: 'Calls booked' },
    { k: 'clients', l: 'Active clients' }, { k: 'revenue', l: 'Revenue ₹' },
    { k: 'posts', l: 'Content posted' } ] },
  { id: 'digital', name: 'Digital Products', icon: '💾', key: 'revenue', fields: [
    { k: 'sales', l: 'Sales (units)' }, { k: 'revenue', l: 'Revenue ₹' } ] },
  { id: 'goat', name: 'Goat Farm', icon: '🐐', key: 'herd', fields: [
    { k: 'herd', l: 'Herd count' }, { k: 'sales', l: 'Sales ₹' },
    { k: 'feed', l: 'Feed cost ₹' }, { k: 'expenses', l: 'Other expenses ₹' },
    { k: 'health', l: 'Health notes', text: true } ] },
  { id: 'shop', name: 'Hardware Shop', icon: '🔧', key: 'sales', fields: [
    { k: 'sales', l: 'Sales ₹' }, { k: 'expenses', l: 'Expenses ₹' },
    { k: 'lowStock', l: 'Low-stock items', text: true } ] },
];
export const MANUAL = BUSINESSES.filter(b => b.manual !== false);
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
