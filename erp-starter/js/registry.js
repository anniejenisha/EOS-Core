/* =====================================================================
   A. BRAND & USER (Dynamic from Frappe ERP)
   ===================================================================== */
const BRAND = {
  name: 'Burhani Engineers',
  mono: 'B',
  logo: '/files/bel-logo-256.png'
};

let USER = {
  name: (window.frappe && frappe.session && frappe.session.user_fullname && frappe.session.user_fullname !== 'Guest')
    ? frappe.session.user_fullname
    : (window.frappe_user_name || (window.__EOS_BOOT__ && window.__EOS_BOOT__.user && window.__EOS_BOOT__.user.name) || 'User'),
  initial: ((window.frappe && frappe.session && frappe.session.user_fullname && frappe.session.user_fullname !== 'Guest')
    ? frappe.session.user_fullname
    : (window.frappe_user_name || (window.__EOS_BOOT__ && window.__EOS_BOOT__.user && window.__EOS_BOOT__.user.name) || 'U')).charAt(0).toUpperCase()
};

/* =====================================================================
   B. ICONS
   ===================================================================== */
const ICONS = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  mountain: '<path d="m3 20 6-11 4 7 3-5 5 9z"/>',
  checksq: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  board: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="4" height="15" rx="1"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  thumbup: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  thumbdown: '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
  trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  tri: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>'
};
const icon = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.file}</svg>`;

/* =====================================================================
   C. MODULES & NAVIGATION (100% EOS ONLY)
   ===================================================================== */
const MODULES = [
  {
    id: 'eos',
    name: 'EOS',
    blurb: 'Scorecard, Rocks, To-Dos, Issues and Meetings',
    icon: 'target',
    cards: [],
    nav: [
      ['Overview', 'grid'],
      ['Scorecard', 'chart'],
      ['Rocks', 'mountain'],
      ['To-Dos', 'checksq'],
      ['Issues', 'alert'],
      ['Meetings', 'calendar']
    ]
  }
];

const PAGES = {};
const SETS = {};

const TONE = {
  Yes: 'ok',
  Approved: 'ok',
  Active: 'ok',
  Complete: 'ok',
  'On-track': 'ok',
  Pending: 'olive',
  'At risk': 'warn',
  Draft: 'neutral',
  'Off-track': 'bad',
  Rejected: 'bad',
  Overdue: 'bad'
};
