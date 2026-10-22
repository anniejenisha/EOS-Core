/* =====================================================================
   A. BRAND & USER (Dynamic from Frappe ERP)
   ===================================================================== */
const BRAND = {
  name: 'Burhani Engineers',
  mono: 'B',
  logo: '/assets/eos_core/img/bel-logo-256.png?v=2.0.6'
};

function getLoggedInUserEmail() {
  try {
    if (window.parent && window.parent !== window && window.parent.frappe && window.parent.frappe.session && window.parent.frappe.session.user && window.parent.frappe.session.user !== 'Guest') {
      return String(window.parent.frappe.session.user).trim().toLowerCase();
    }
  } catch (e) {}

  try {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('user') || params.get('user_email');
    if (u && u !== 'Guest') return String(u).trim().toLowerCase();
  } catch (e) {}

  if (window.frappe_user && window.frappe_user !== 'Guest') {
    return String(window.frappe_user).trim().toLowerCase();
  }

  if (window.__EOS_BOOT__ && window.__EOS_BOOT__.user && window.__EOS_BOOT__.user.email && window.__EOS_BOOT__.user.email !== 'Guest') {
    return String(window.__EOS_BOOT__.user.email).trim().toLowerCase();
  }

  if (typeof EOS_USER_ID !== 'undefined' && EOS_USER_ID && EOS_USER_ID !== 'Guest') {
    return String(EOS_USER_ID).trim().toLowerCase();
  }

  return '';
}

function getLoggedInUserName() {
  try {
    if (window.parent && window.parent !== window && window.parent.frappe && window.parent.frappe.session && window.parent.frappe.session.user_fullname && window.parent.frappe.session.user_fullname !== 'Guest') {
      return String(window.parent.frappe.session.user_fullname).trim();
    }
  } catch (e) {}

  if (window.frappe_user_name && window.frappe_user_name !== 'Guest') {
    return String(window.frappe_user_name).trim();
  }

  if (window.__EOS_BOOT__ && window.__EOS_BOOT__.user && window.__EOS_BOOT__.user.name && window.__EOS_BOOT__.user.name !== 'Guest') {
    return String(window.__EOS_BOOT__.user.name).trim();
  }

  if (typeof EOS_ME !== 'undefined' && EOS_ME && EOS_ME !== 'Guest') {
    return String(EOS_ME).trim();
  }

  return '';
}

const _initialEmail = getLoggedInUserEmail();
const _initialName = getLoggedInUserName() || 'User';

let USER = {
  name: _initialName,
  email: _initialEmail,
  initial: (_initialName.charAt(0) || 'U').toUpperCase()
};

function hasModulePermission(modId) {
  if (modId === 'talent') {
    if (window.__EOS_BOOT__ && window.__EOS_BOOT__.permissions && typeof window.__EOS_BOOT__.permissions.talent !== 'undefined') {
      return Boolean(window.__EOS_BOOT__.permissions.talent);
    }
    if (window.parent && window.parent !== window && window.parent.frappe && window.parent.frappe.user && window.parent.frappe.user.has_role) {
      return window.parent.frappe.user.has_role('Talent Manager') || (window.parent.frappe.session && window.parent.frappe.session.user === 'Administrator');
    }
    if (window.frappe && window.frappe.user && window.frappe.user.has_role) {
      return window.frappe.user.has_role('Talent Manager') || (window.frappe.session && window.frappe.session.user === 'Administrator');
    }
    return false;
  }
  return true;
}

/* =====================================================================
   B. ICONS
   ===================================================================== */
const ICONS = {
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  board: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="4" height="15" rx="1"/>',
  back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  mountain: '<path d="m3 20 6-11 4 7 3-5 5 9z"/>',
  checksq: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  thumbup: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  thumbdown: '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
  trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  tri: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  tool: '<path d="m14.7 6.3-2.1-2.1a1 1 0 0 0-1.4 0L2 13.4a1 1 0 0 0 0 1.4l2.1 2.1a1 1 0 0 0 1.4 0l9.2-9.2a1 1 0 0 0 0-1.4Z"/><path d="M16.5 4.5 19.5 7.5"/>',
  filetext: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  checkcircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  refresh: '<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'
};
const icon = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.file}</svg>`;

/* =====================================================================
   C. MODULES & NAVIGATION (EOS & TALENT MANAGEMENT)
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
  },
  {
    id: 'talent',
    name: 'Talent Management',
    blurb: 'HR, shifts, leave and payroll',
    icon: 'users',
    cards: [
      ['Employees', '0', 'active in organization'],
      ['Checked in today', '0', 'recorded check-ins'],
      ['Pending requests', '0', 'awaiting approval', 'warn'],
      ['Late arrivals', '0', 'this week']
    ],
    nav: [
      ['Overview', 'grid'],
      ['Employee', 'users'],
      ['Shift & Attendance', 'clock', ['Shift Assignment', 'Shift Request', 'Employee Checkin', 'Attendance Request', 'Shift Type', 'Shift Location', 'Shift Schedule']],
      ['HRPRO Applications', 'users', ['Attendance Regularize', 'Permission Request', 'On Duty Application', 'Miss Punch Application']],
      ['Leaves', 'calendar', ['Leave Application', 'Leave Allocation', 'Holiday List']],
      ['Lifecycle', 'users', ['Employee Onboarding', 'Employee Promotion', 'Employee Transfer', 'Employee Separation']],
      ['Performance', 'chart', ['Goal', 'Appraisal Cycle', 'Appraisal']],
      ['Payroll', 'wallet', ['Salary Slip', 'Payroll Entry']],
      ['Expenses & Travel', 'receipt', ['Expense Claim', 'Employee Advance', 'Vehicle Log']],
      ['Recruitment', 'briefcase', ['Job Opening', 'Job Applicant', 'Job Offer']],
      ['Training', 'file', ['Training Program', 'Training Event']],
      ['HR Setup', 'sliders', ['Department', 'Designation', 'Branch']]
    ]
  }
];

const PAGES = {
        'talent:employee': { set: 'employee', dt: 'Employee' },
        'talent:shift-assignment': { set: 'shiftAssign', dt: 'Shift Assignment' },
        'talent:shift-request': { set: 'shiftReq', dt: 'Shift Request' },
        'talent:shift-type': { set: 'shiftType', dt: 'Shift Type' },
        'talent:shift-location': { set: 'shiftLoc', dt: 'Shift Location' },
        'talent:shift-schedule': { set: 'shiftSched', dt: 'Shift Schedule' },
        'talent:employee-checkin': { set: 'empCheckin', dt: 'Employee Checkin' },
        'talent:attendance-request': { set: 'attReq', dt: 'Attendance Request' },
        'talent:attendance-regularize': { set: 'attReg', dt: 'Attendance Regularize' },
        'talent:permission-request': { set: 'permReq', dt: 'Permission Request' },
        'talent:on-duty-application': { set: 'onDuty', dt: 'On Duty Application' },
        'talent:miss-punch-application': { set: 'missPunch', dt: 'Miss Punch Application' },
        'talent:leave-application': { set: 'leaveApp', dt: 'Leave Application' },
        'talent:leave-allocation': { set: 'leaveAlloc', dt: 'Leave Allocation' },
        'talent:holiday-list': { set: 'holidayList', dt: 'Holiday List' },
        'talent:employee-onboarding': { set: 'empOnboarding', dt: 'Employee Onboarding' },
        'talent:employee-promotion': { set: 'empPromotion', dt: 'Employee Promotion' },
        'talent:employee-transfer': { set: 'empTransfer', dt: 'Employee Transfer' },
        'talent:employee-separation': { set: 'empSeparation', dt: 'Employee Separation' },
        'talent:goal': { set: 'goal', dt: 'Goal' },
        'talent:appraisal-cycle': { set: 'appraisalCycle', dt: 'Appraisal Cycle' },
        'talent:appraisal': { set: 'appraisal', dt: 'Appraisal' },
        'talent:salary-slip': { set: 'salarySlip', dt: 'Salary Slip' },
        'talent:payroll-entry': { set: 'payrollEntry', dt: 'Payroll Entry' },
        'talent:expense-claim': { set: 'expenseClaim', dt: 'Expense Claim' },
        'talent:employee-advance': { set: 'empAdvance', dt: 'Employee Advance' },
        'talent:vehicle-log': { set: 'vehicleLog', dt: 'Vehicle Log' },
        'talent:job-opening': { set: 'jobOpening', dt: 'Job Opening' },
        'talent:job-applicant': { set: 'jobApplicant', dt: 'Job Applicant' },
        'talent:job-offer': { set: 'jobOffer', dt: 'Job Offer' },
        'talent:training-program': { set: 'trainingProgram', dt: 'Training Program' },
        'talent:training-event': { set: 'trainingEvent', dt: 'Training Event' },
        'talent:department': { set: 'dept', dt: 'Department' },
        'talent:designation': { set: 'desig', dt: 'Designation' },
        'talent:branch': { set: 'branch', dt: 'Branch' }
};

const SETS = {
        shiftAssign: {
            noun: 'shift assignment', doctype: 'Shift Assignment', titleKey: 'employee_name', prefix: 'SHA-', newStatus: 'Active',
            statuses: ['Active', 'Inactive', 'Cancelled'], attention: [],
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'shift_type', l: 'Shift Type' },
                { k: 'company', l: 'Company' },
                { k: 'start_date', l: 'Start Date', t: 'muted' },
                { k: 'end_date', l: 'End Date', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'shift_type', l: 'Shift Type', t: 'select', req: true, source: 'shift_types' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'start_date', l: 'Start Date', t: 'date', req: true },
                { k: 'end_date', l: 'End Date', t: 'date', opt: true }
            ],
            rows: [], loaded: false
        },
        shiftReq: {
            noun: 'shift request', doctype: 'Shift Request', titleKey: 'employee_name', prefix: 'SR-', newStatus: 'Draft',
            statuses: ['Draft', 'Approved', 'Rejected'], attention: ['Draft'],
            approve: { from: 'Draft', ok: 'Approved', no: 'Rejected', okLabel: 'Approve', noLabel: 'Reject' },
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'shift_type', l: 'Shift Type' },
                { k: 'company', l: 'Company' },
                { k: 'from_date', l: 'From', t: 'muted' },
                { k: 'to_date', l: 'To', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'shift_type', l: 'Shift Type', t: 'select', req: true, source: 'shift_types' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'from_date', l: 'From Date', t: 'date', req: true },
                { k: 'to_date', l: 'To Date', t: 'date', req: true }
            ],
            rows: [], loaded: false
        },
        shiftType: {
            noun: 'shift type', doctype: 'Shift Type', titleKey: 'id',
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'start_time', l: 'Start Time', t: 'muted' },
                { k: 'end_time', l: 'End Time', t: 'muted' },
                { k: 'holiday_list', l: 'Holiday List' },
                { k: 'enable_auto_attendance', l: 'Auto Attendance', t: 'pill' }
            ],
            form: [
                { k: 'id', l: 'Shift Name', t: 'text', req: true, ph: 'e.g. Morning Shift' },
                { k: 'start_time', l: 'Start Time', t: 'time', req: true },
                { k: 'end_time', l: 'End Time', t: 'time', req: true },
                { k: 'holiday_list', l: 'Holiday List', t: 'select', opt: true, source: 'holiday_lists' }
            ],
            rows: [], loaded: false
        },
        shiftLoc: {
            noun: 'shift location', doctype: 'Shift Location', titleKey: 'id',
            cols: [
                { k: 'id', l: 'Location Name', t: 'strong' },
                { k: 'checkin_radius', l: 'Check-in Radius (m)', t: 'num' },
                { k: 'latitude', l: 'Latitude', t: 'muted' },
                { k: 'longitude', l: 'Longitude', t: 'muted' }
            ],
            form: [
                { k: 'location_name', l: 'Location Name', t: 'text', req: true, ph: 'e.g. Headquarters Office' },
                { k: 'checkin_radius', l: 'Check-in Radius (meters)', t: 'number', opt: true, ph: '50' },
                { k: 'latitude', l: 'Latitude', t: 'text', opt: true, ph: '-1.286389' },
                { k: 'longitude', l: 'Longitude', t: 'text', opt: true, ph: '36.817223' }
            ],
            rows: [], loaded: false
        },
        shiftSched: {
            noun: 'shift schedule', doctype: 'Shift Schedule', titleKey: 'shift_type',
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'shift_type', l: 'Shift Type' },
                { k: 'frequency', l: 'Frequency', t: 'pill' }
            ],
            form: [
                { k: 'shift_type', l: 'Shift Type', t: 'select', req: true, source: 'shift_types' },
                { k: 'frequency', l: 'Frequency', t: 'select', req: true, o: ['Every Week', 'Every 2 Weeks', 'Every 3 Weeks', 'Every 4 Weeks'], def: 'Every Week' }
            ],
            rows: [], loaded: false
        },
        employee: {
            noun: 'employee', doctype: 'Employee', titleKey: 'employee_name', prefix: 'HR-EMP-', newStatus: 'Active',
            statuses: ['Active', 'Inactive', 'Suspended', 'Left'], attention: [],
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee Name' },
                { k: 'attendance_device_id', l: 'Device ID (Biometric)' },
                { k: 'gender', l: 'Gender' },
                { k: 'department', l: 'Department' },
                { k: 'designation', l: 'Designation' },
                { k: 'company', l: 'Company' },
                { k: 'branch', l: 'Branch' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                // Basic Details (Image 1)
                { k: 'naming_series', l: 'Series', t: 'select', req: true, o: ['HR-EMP-'], def: 'HR-EMP-' },
                { k: 'first_name', l: 'First Name', t: 'text', req: true, ph: 'First Name' },
                { k: 'middle_name', l: 'Middle Name', t: 'text', opt: true, ph: 'Middle Name' },
                { k: 'last_name', l: 'Last Name', t: 'text', opt: true, ph: 'Last Name' },
                { k: 'gender', l: 'Gender', t: 'select', opt: true, source: 'genders' },
                { k: 'date_of_birth', l: 'Date of Birth', t: 'date', opt: true },
                { k: 'salutation', l: 'Salutation', t: 'select', opt: true, source: 'salutations' },
                { k: 'date_of_joining', l: 'Date of Joining', t: 'date', req: true },
                { k: 'status', l: 'Status', t: 'select', req: true, o: ['Active', 'Inactive', 'Suspended', 'Left'], def: 'Active' },

                // User Details (Image 1)
                { section: 'User Details', k: 'user_id', l: 'User ID', t: 'select', opt: true, source: 'users', desc: 'System User (login) ID. If set, it will become default for all HR forms.' },

                // Contact & Identification Details
                { section: 'Contact & Identification Details', k: 'cell_number', l: 'Personal Mobile Number', t: 'text', opt: true, ph: 'e.g. +254 700 000000' },
                { k: 'personal_email', l: 'Personal Email Address', t: 'text', opt: true, ph: 'e.g. name@example.com' },
                { k: 'passport_number', l: 'National ID/Passport Number', t: 'text', opt: true, ph: 'e.g. National ID or Passport Number' },

                // Company Details (Image 1)
                { section: 'Company Details', k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'designation', l: 'Designation', t: 'select', opt: true, source: 'designations' },
                { k: 'branch', l: 'Branch', t: 'select', opt: true, source: 'branches' },
                { k: 'department', l: 'Department', t: 'select', opt: true, source: 'departments' },
                { k: 'reports_to', l: 'Reports to', t: 'select', opt: true, source: 'employees' },
                { k: 'grade', l: 'Grade', t: 'select', opt: true, source: 'grades' },
                { k: 'employment_type', l: 'Employment Type', t: 'select', opt: true, source: 'employment_types' },

                // Attendance Device ID (Requested in prompt text!)
                { section: 'Attendance & Biometric Details', k: 'attendance_device_id', l: 'Attendance Device ID (Biometric/RF tag ID)', t: 'text', opt: true, ph: 'Biometric / RFID Device ID', desc: 'Unique Attendance Device ID for biometric machine integration and attendance sync.' },

                // Approvers (Image 2)
                { section: 'Approvers', k: 'expense_approver', l: 'Expense Approver', t: 'select', opt: true, source: 'users' },
                { k: 'shift_request_approver', l: 'Shift Request Approver', t: 'select', opt: true, source: 'users' },
                { k: 'leave_approver', l: 'Leave Approver', t: 'select', opt: true, source: 'users' },

                // Joining, Probation & Contract Details
                { section: 'Probation & Contract Details', k: 'probation_start_date', l: 'Probation Start Date', t: 'date', opt: true },
                { k: 'probation_end_date', l: 'Probation End Date', t: 'date', opt: true },
                { k: 'final_confirmation_date', l: 'Confirmation Date', t: 'date', opt: true },
                { k: 'contract_end_date', l: 'Contract End Date', t: 'date', opt: true },

                // Exit & Leaving (Image 4) - only shown when status is Except Active
                { section: 'Exit & Leaving', k: 'relieving_date', l: 'Relieving Date', t: 'date', opt: true, desc: 'Mandatory if Status is Left', exitOnly: true },
                { k: 'reason_for_leaving', l: 'Reason for Leaving', t: 'textarea', opt: true, ph: 'Reason for leaving', exitOnly: true },
                { k: 'feedback', l: 'Feedback', t: 'textarea', opt: true, ph: 'Employee exit feedback', exitOnly: true }
            ],
            rows: [], loaded: false
        },
        empCheckin: {
            noun: 'checkin log', doctype: 'Employee Checkin', titleKey: 'employee_name', prefix: 'CHK-',
            cols: [
                { k: 'id', l: 'Log ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'time', l: 'Timestamp', t: 'muted' },
                { k: 'log_type', l: 'Log Type', t: 'pill' },
                { k: 'device_id', l: 'Device' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'time', l: 'Timestamp', t: 'datetime-local', req: true },
                { k: 'log_type', l: 'Log Type', t: 'select', req: true, o: ['IN', 'OUT'], def: 'IN' },
                { k: 'device_id', l: 'Device / Location', t: 'text', opt: true, ph: 'e.g. Main Entrance' }
            ],
            rows: [], loaded: false
        },
        attReq: {
            noun: 'attendance request', doctype: 'Attendance Request', titleKey: 'employee_name', prefix: 'AR-', newStatus: 'Pending',
            statuses: ['Pending', 'Approved', 'Rejected'], attention: ['Pending'],
            approve: { from: 'Pending', ok: 'Approved', no: 'Rejected', okLabel: 'Approve', noLabel: 'Reject' },
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'company', l: 'Company' },
                { k: 'reason', l: 'Reason' },
                { k: 'from_date', l: 'From', t: 'muted' },
                { k: 'to_date', l: 'To', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'reason', l: 'Reason', t: 'select', req: true, o: ['Work From Home', 'On Duty'], def: 'Work From Home' },
                { k: 'from_date', l: 'From Date', t: 'date', req: true },
                { k: 'to_date', l: 'To Date', t: 'date', req: true },
                { k: 'explanation', l: 'Explanation', t: 'textarea', opt: true, ph: 'Optional details' }
            ],
            rows: [], loaded: false
        },
        attReg: {
            noun: 'attendance regularization', doctype: 'Attendance Regularize', titleKey: 'employee_name', prefix: 'AREG-', newStatus: 'Pending',
            statuses: ['Pending', 'Approved', 'Rejected'], attention: ['Pending'],
            approve: { from: 'Pending', ok: 'Approved', no: 'Rejected', okLabel: 'Approve', noLabel: 'Reject' },
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'attendance_date', l: 'Date', t: 'muted' },
                { k: 'corrected_in', l: 'Corrected In', t: 'muted' },
                { k: 'corrected_out', l: 'Corrected Out', t: 'muted' },
                { k: 'reason', l: 'Reason' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'attendance_date', l: 'Attendance Date', t: 'date', req: true },
                { k: 'reason', l: 'Reason', t: 'text', req: true, ph: 'e.g. Biometric sync failure' },
                { k: 'corrected_in', l: 'Corrected In Time', t: 'text', opt: true, ph: '08:00:00' },
                { k: 'corrected_out', l: 'Corrected Out Time', t: 'text', opt: true, ph: '17:00:00' }
            ],
            rows: [], loaded: false
        },
        permReq: {
            noun: 'permission request', doctype: 'Permission Request', titleKey: 'employee_name', prefix: 'PR-', newStatus: 'Pending',
            statuses: ['Pending', 'Approved', 'Rejected'], attention: ['Pending'],
            approve: { from: 'Pending', ok: 'Approved', no: 'Rejected', okLabel: 'Approve', noLabel: 'Reject' },
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'attendance_date', l: 'Date', t: 'muted' },
                { k: 'hours', l: 'Hours', t: 'num' },
                { k: 'shift', l: 'Shift' },
                { k: 'reason', l: 'Reason' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'attendance_date', l: 'Permission Date', t: 'date', req: true },
                { k: 'shift', l: 'Shift Type', t: 'select', req: true, source: 'shift_types' },
                { k: 'hours', l: 'Hours', t: 'number', req: true, ph: '2' },
                { k: 'reason', l: 'Reason', t: 'textarea', req: true, ph: 'State reasons for permission' }
            ],
            rows: [], loaded: false
        },
        onDuty: {
            noun: 'on duty application', doctype: 'On Duty Application', titleKey: 'employee_name', prefix: 'ODA-', newStatus: 'Pending',
            statuses: ['Pending', 'Approved', 'Rejected'], attention: ['Pending'],
            approve: { from: 'Pending', ok: 'Approved', no: 'Rejected', okLabel: 'Approve', noLabel: 'Reject' },
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'location', l: 'Location' },
                { k: 'from_date', l: 'From', t: 'muted' },
                { k: 'to_date', l: 'To', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'location', l: 'Project / Client Location', t: 'text', req: true, ph: 'e.g. Nakuru Site' },
                { k: 'from_date', l: 'From Date', t: 'date', req: true },
                { k: 'to_date', l: 'To Date', t: 'date', req: true },
                { k: 'reason', l: 'Reason', t: 'textarea', opt: true, ph: 'Duty description' }
            ],
            rows: [], loaded: false
        },
        missPunch: {
            noun: 'miss punch application', doctype: 'Miss Punch Application', titleKey: 'employee_name', prefix: 'MPA-', newStatus: 'Pending',
            statuses: ['Pending', 'Approved', 'Rejected'], attention: ['Pending'],
            approve: { from: 'Pending', ok: 'Approved', no: 'Rejected', okLabel: 'Approve', noLabel: 'Reject' },
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'company', l: 'Company' },
                { k: 'attendance_date', l: 'Date', t: 'muted' },
                { k: 'in_time', l: 'In Time' },
                { k: 'out_time', l: 'Out Time' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'attendance_date', l: 'Attendance Date', t: 'date', req: true },
                { k: 'in_time', l: 'Check-In Time', t: 'text', req: true, ph: '08:00:00' },
                { k: 'out_time', l: 'Check-Out Time', t: 'text', req: true, ph: '17:00:00' }
            ],
            rows: [], loaded: false
        },
        leaveApp: {
            noun: 'leave application', doctype: 'Leave Application', titleKey: 'employee_name', prefix: 'LA-', newStatus: 'Open',
            statuses: ['Open', 'Approved', 'Rejected', 'Cancelled'], attention: ['Open'],
            approve: { from: 'Open', ok: 'Approved', no: 'Rejected', okLabel: 'Approve', noLabel: 'Reject' },
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'leave_type', l: 'Leave Type' },
                { k: 'company', l: 'Company' },
                { k: 'from_date', l: 'From', t: 'muted' },
                { k: 'to_date', l: 'To', t: 'muted' },
                { k: 'total_leave_days', l: 'Days', t: 'num' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'leave_type', l: 'Leave Type', t: 'select', req: true, source: 'leave_types' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'from_date', l: 'From Date', t: 'date', req: true },
                { k: 'to_date', l: 'To Date', t: 'date', req: true },
                { k: 'description', l: 'Reason / Description', t: 'textarea', opt: true, ph: 'Enter reason for leave' }
            ],
            rows: [], loaded: false
        },
        leaveAlloc: {
            noun: 'leave allocation', doctype: 'Leave Allocation', titleKey: 'employee_name', prefix: 'LAL-',
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'leave_type', l: 'Leave Type' },
                { k: 'company', l: 'Company' },
                { k: 'from_date', l: 'From', t: 'muted' },
                { k: 'to_date', l: 'To', t: 'muted' },
                { k: 'total_leaves_allocated', l: 'Allocated Days', t: 'num' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'leave_type', l: 'Leave Type', t: 'select', req: true, source: 'leave_types' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'from_date', l: 'From Date', t: 'date', req: true },
                { k: 'to_date', l: 'To Date', t: 'date', req: true },
                { k: 'total_leaves_allocated', l: 'Leaves to Allocate', t: 'number', req: true, ph: '21' }
            ],
            rows: [], loaded: false
        },
        holidayList: {
            noun: 'holiday list', doctype: 'Holiday List', titleKey: 'id',
            cols: [
                { k: 'id', l: 'Holiday List Name', t: 'strong' },
                { k: 'from_date', l: 'From', t: 'muted' },
                { k: 'to_date', l: 'To', t: 'muted' },
                { k: 'country', l: 'Country' }
            ],
            form: [
                { k: 'holiday_list_name', l: 'Holiday List Name', t: 'text', req: true, ph: 'e.g. Kenya Holidays 2026' },
                { k: 'from_date', l: 'From Date', t: 'date', req: true },
                { k: 'to_date', l: 'To Date', t: 'date', req: true },
                { k: 'country', l: 'Country', t: 'text', opt: true, ph: 'Kenya' }
            ],
            rows: [], loaded: false
        },
        salarySlip: {
            noun: 'salary slip', doctype: 'Salary Slip', titleKey: 'employee_name', prefix: 'SAL-',
            statuses: ['Draft', 'Submitted'], attention: ['Draft'],
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'company', l: 'Company' },
                { k: 'start_date', l: 'Start Date', t: 'muted' },
                { k: 'end_date', l: 'End Date', t: 'muted' },
                { k: 'gross_pay', l: 'Gross Pay', t: 'num' },
                { k: 'net_pay', l: 'Net Pay', t: 'num' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'salary_structure', l: 'Salary Structure', t: 'select', opt: true, source: 'salary_structures' },
                { k: 'posting_date', l: 'Posting Date', t: 'date', req: true },
                { k: 'start_date', l: 'Start Date', t: 'date', req: true },
                { k: 'end_date', l: 'End Date', t: 'date', req: true },
                { k: 'payment_days', l: 'Payment Days', t: 'number', req: true, ph: '30' }
            ],
            rows: [], loaded: false
        },
        payrollEntry: {
            noun: 'payroll entry', doctype: 'Payroll Entry', titleKey: 'posting_date', prefix: 'PAY-',
            statuses: ['Draft', 'Submitted'], attention: ['Draft'],
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'posting_date', l: 'Posting Date', t: 'muted' },
                { k: 'payroll_frequency', l: 'Frequency' },
                { k: 'company', l: 'Company' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'posting_date', l: 'Posting Date', t: 'date', req: true },
                { k: 'start_date', l: 'Start Date', t: 'date', req: true },
                { k: 'end_date', l: 'End Date', t: 'date', req: true },
                { k: 'payroll_frequency', l: 'Frequency', t: 'select', req: true, o: ['Monthly', 'Bi-Weekly', 'Weekly'], def: 'Monthly' }
            ],
            rows: [], loaded: false
        },
        expenseClaim: {
            noun: 'expense claim', doctype: 'Expense Claim', titleKey: 'employee_name', prefix: 'EXP-', newStatus: 'Draft',
            statuses: ['Draft', 'Submitted', 'Approved', 'Rejected'], attention: ['Draft', 'Submitted'],
            approve: { from: 'Submitted', ok: 'Approved', no: 'Rejected', okLabel: 'Approve', noLabel: 'Reject' },
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'company', l: 'Company' },
                { k: 'posting_date', l: 'Posting Date', t: 'muted' },
                { k: 'total_claimed_amount', l: 'Amount', t: 'num' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'expense_type', l: 'Expense Type', t: 'select', opt: true, source: 'expense_claim_types' },
                { k: 'posting_date', l: 'Posting Date', t: 'date', req: true },
                { k: 'total_claimed_amount', l: 'Claim Amount', t: 'number', req: true, ph: '5000' },
                { k: 'remark', l: 'Remark', t: 'textarea', opt: true, ph: 'Expense details / receipts' }
            ],
            rows: [], loaded: false
        },
        jobOpening: {
            noun: 'job opening', doctype: 'Job Opening', titleKey: 'job_title', prefix: 'JOB-',
            statuses: ['Open', 'Closed'], attention: ['Open'],
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'job_title', l: 'Job Title' },
                { k: 'designation', l: 'Designation' },
                { k: 'company', l: 'Company' },
                { k: 'vacancies', l: 'Vacancies', t: 'num' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'job_title', l: 'Job Title', t: 'text', req: true, ph: 'e.g. Electrical Engineer' },
                { k: 'designation', l: 'Designation', t: 'select', req: true, source: 'designations' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'department', l: 'Department', t: 'select', opt: true, source: 'departments' },
                { k: 'vacancies', l: 'Vacancies', t: 'number', opt: true, ph: '1' }
            ],
            rows: [], loaded: false
        },
        jobApplicant: {
            noun: 'job applicant', doctype: 'Job Applicant', titleKey: 'applicant_name', prefix: 'APP-',
            statuses: ['Open', 'Replied', 'Shortlisted', 'Rejected', 'Hold', 'Accepted'], attention: ['Open'],
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'applicant_name', l: 'Applicant Name' },
                { k: 'job_title', l: 'Applied For' },
                { k: 'email_id', l: 'Email', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'applicant_name', l: 'Applicant Name', t: 'text', req: true, ph: 'e.g. Candidate Name' },
                { k: 'email_id', l: 'Email ID', t: 'text', req: true, ph: 'e.g. candidate@example.com' },
                { k: 'job_title', l: 'Job Title', t: 'text', opt: true, ph: 'e.g. Field Engineer' },
                { k: 'status', l: 'Status', t: 'select', req: true, o: ['Open', 'Replied', 'Shortlisted', 'Rejected', 'Hold', 'Accepted'], def: 'Open' }
            ],
            rows: [], loaded: false
        },
        jobOffer: {
            noun: 'job offer', doctype: 'Job Offer', titleKey: 'applicant_name', prefix: 'OFF-',
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'applicant_name', l: 'Applicant' },
                { k: 'designation', l: 'Designation' },
                { k: 'company', l: 'Company' },
                { k: 'offer_date', l: 'Offer Date', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'job_applicant', l: 'Job Applicant', t: 'select', opt: true, source: 'job_applicants' },
                { k: 'applicant_name', l: 'Applicant Name', t: 'text', req: true, ph: 'Candidate Full Name' },
                { k: 'designation', l: 'Designation', t: 'select', req: true, source: 'designations' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'offer_date', l: 'Offer Date', t: 'date', req: true }
            ],
            rows: [], loaded: false
        },
        trainingProgram: {
            noun: 'training program', doctype: 'Training Program', titleKey: 'id',
            cols: [
                { k: 'id', l: 'Program Name', t: 'strong' },
                { k: 'company', l: 'Company' },
                { k: 'trainer_name', l: 'Trainer' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'training_program', l: 'Program Name', t: 'text', req: true, ph: 'e.g. Industrial Safety Level 1' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'description', l: 'Description', t: 'textarea', req: true, ph: 'Outline program topics and goals' },
                { k: 'trainer_name', l: 'Trainer Name', t: 'text', opt: true, ph: 'Trainer Name' }
            ],
            rows: [], loaded: false
        },
        trainingEvent: {
            noun: 'training event', doctype: 'Training Event', titleKey: 'event_name', prefix: 'TRN-',
            cols: [
                { k: 'id', l: 'ID', t: 'strong' },
                { k: 'event_name', l: 'Event Name' },
                { k: 'type', l: 'Type' },
                { k: 'location', l: 'Location' },
                { k: 'start_time', l: 'Start Time', t: 'muted' },
                { k: 'end_time', l: 'End Time', t: 'muted' },
                { k: 'event_status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'event_name', l: 'Event Name', t: 'text', req: true, ph: 'e.g. Q4 Electrical Safety Workshop' },
                { k: 'type', l: 'Type', t: 'select', req: true, o: ['Workshop', 'Seminar', 'Theory', 'Conference', 'Exam', 'Self-Study'], def: 'Workshop' },
                { k: 'location', l: 'Location', t: 'text', req: true, ph: 'e.g. Training Center Hall A' },
                { k: 'start_time', l: 'Start Time', t: 'datetime-local', req: true },
                { k: 'end_time', l: 'End Time', t: 'datetime-local', req: true },
                { k: 'introduction', l: 'Introduction', t: 'textarea', req: true, ph: 'Summary of the training event' }
            ],
            rows: [], loaded: false
        },
        dept: {
            noun: 'department', doctype: 'Department', titleKey: 'id',
            cols: [
                { k: 'id', l: 'Department Name', t: 'strong' },
                { k: 'company', l: 'Company' }
            ],
            form: [
                { k: 'department_name', l: 'Department Name', t: 'text', req: true, ph: 'e.g. Maintenance & Operations' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' }
            ],
            rows: [], loaded: false
        },
        desig: {
            noun: 'designation', doctype: 'Designation', titleKey: 'id',
            cols: [
                { k: 'id', l: 'Designation Name', t: 'strong' },
                { k: 'description', l: 'Description' }
            ],
            form: [
                { k: 'designation_name', l: 'Designation Name', t: 'text', req: true, ph: 'e.g. Automation Engineer' },
                { k: 'description', l: 'Description', t: 'textarea', opt: true, ph: 'Role responsibilities' }
            ],
            rows: [], loaded: false
        },
        branch: {
            noun: 'branch', doctype: 'Branch', titleKey: 'id',
            cols: [
                { k: 'id', l: 'Branch Name', t: 'strong' }
            ],
            form: [
                { k: 'branch', l: 'Branch Name', t: 'text', req: true, ph: 'e.g. Nairobi Branch' }
            ],
            rows: [], loaded: false
        },
        goal: {
            noun: 'goal', doctype: 'Goal', titleKey: 'goal_name', prefix: 'HR-GOAL-', newStatus: 'Pending',
            statuses: ['Pending', 'In Progress', 'Completed', 'Archived', 'Closed'],
            attention: ['Pending', 'In Progress'],
            cols: [
                { k: 'id', l: 'Goal ID', t: 'strong' },
                { k: 'goal_name', l: 'Goal' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'progress', l: 'Progress %', t: 'num' },
                { k: 'start_date', l: 'Start Date', t: 'muted' },
                { k: 'end_date', l: 'End Date', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'goal_name', l: 'Goal Name / Objective', t: 'text', req: true, ph: 'e.g. Complete Q3 Infrastructure Upgrade' },
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'start_date', l: 'Start Date', t: 'date', req: true },
                { k: 'end_date', l: 'End Date', t: 'date', opt: true },
                { k: 'progress', l: 'Progress %', t: 'number', opt: true, ph: '0' },
                { k: 'appraisal_cycle', l: 'Appraisal Cycle', t: 'select', opt: true, source: 'appraisal_cycles' },
                { k: 'status', l: 'Status', t: 'select', req: true, o: ['Pending', 'In Progress', 'Completed', 'Archived', 'Closed'], def: 'Pending' },
                { k: 'description', l: 'Description / Success Metrics', t: 'textarea', opt: true, ph: 'Key measurable deliverables...' }
            ],
            rows: [], loaded: false
        },
        appraisalCycle: {
            noun: 'appraisal cycle', doctype: 'Appraisal Cycle', titleKey: 'cycle_name', prefix: '',
            statuses: ['Not Started', 'In Progress', 'Completed'],
            attention: ['In Progress'],
            cols: [
                { k: 'id', l: 'Cycle Name', t: 'strong' },
                { k: 'company', l: 'Company' },
                { k: 'start_date', l: 'Start Date', t: 'muted' },
                { k: 'end_date', l: 'End Date', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'cycle_name', l: 'Cycle Name', t: 'text', req: true, ph: 'e.g. FY 2026 Annual Appraisal' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'start_date', l: 'Start Date', t: 'date', req: true },
                { k: 'end_date', l: 'End Date', t: 'date', req: true },
                { k: 'status', l: 'Status', t: 'select', req: true, o: ['Not Started', 'In Progress', 'Completed'], def: 'In Progress' },
                { k: 'description', l: 'Evaluation Guidelines', t: 'textarea', opt: true, ph: 'Instructions for employees and managers' }
            ],
            rows: [], loaded: false
        },
        appraisal: {
            noun: 'appraisal', doctype: 'Appraisal', titleKey: 'employee_name', prefix: 'HR-APR-', newStatus: 'Draft',
            statuses: ['Draft', 'Submitted', 'Cancelled'], attention: ['Draft'],
            cols: [
                { k: 'id', l: 'Appraisal ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'appraisal_cycle', l: 'Cycle' },
                { k: 'final_score', l: 'Final Score', t: 'num' },
                { k: 'total_score', l: 'Total Score', t: 'num' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'appraisal_cycle', l: 'Appraisal Cycle', t: 'select', req: true, source: 'appraisal_cycles' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'start_date', l: 'Start Date', t: 'date', opt: true },
                { k: 'end_date', l: 'End Date', t: 'date', opt: true },
                { k: 'final_score', l: 'Score (out of 5)', t: 'number', opt: true, ph: '4.5' },
                { k: 'remarks', l: 'Manager Remarks / Summary', t: 'textarea', opt: true, ph: 'Performance summary and feedback...' }
            ],
            rows: [], loaded: false
        },
        empOnboarding: {
            noun: 'employee onboarding', doctype: 'Employee Onboarding', titleKey: 'employee_name', prefix: 'ONB-', newStatus: 'Pending',
            statuses: ['Pending', 'In Process', 'Completed'], attention: ['Pending', 'In Process'],
            cols: [
                { k: 'id', l: 'Onboarding ID', t: 'strong' },
                { k: 'employee_name', l: 'Candidate / Employee' },
                { k: 'job_applicant', l: 'Job Applicant' },
                { k: 'company', l: 'Company' },
                { k: 'date_of_joining', l: 'Joining Date', t: 'muted' },
                { k: 'boarding_begins_on', l: 'Begins On', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee_name', l: 'Employee Full Name', t: 'text', req: true, ph: 'e.g. John Doe' },
                { k: 'job_applicant', l: 'Job Applicant', t: 'select', opt: true, source: 'job_applicants' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'department', l: 'Department', t: 'select', opt: true, source: 'departments' },
                { k: 'designation', l: 'Designation', t: 'select', opt: true, source: 'designations' },
                { k: 'date_of_joining', l: 'Date of Joining', t: 'date', req: true },
                { k: 'boarding_begins_on', l: 'Onboarding Begins On', t: 'date', req: true }
            ],
            rows: [], loaded: false
        },
        empPromotion: {
            noun: 'employee promotion', doctype: 'Employee Promotion', titleKey: 'employee_name', prefix: 'PRO-', newStatus: 'Draft',
            statuses: ['Draft', 'Submitted', 'Cancelled'], attention: ['Draft'],
            cols: [
                { k: 'id', l: 'Promotion ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'promotion_date', l: 'Promotion Date', t: 'muted' },
                { k: 'current_ctc', l: 'Current CTC', t: 'num' },
                { k: 'revised_ctc', l: 'Revised CTC', t: 'num' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'promotion_date', l: 'Promotion Date', t: 'date', req: true },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'designation', l: 'New Designation', t: 'select', opt: true, source: 'designations' },
                { k: 'current_ctc', l: 'Current Salary / CTC', t: 'number', opt: true, ph: '80000' },
                { k: 'revised_ctc', l: 'Revised Salary / CTC', t: 'number', opt: true, ph: '100000' }
            ],
            rows: [], loaded: false
        },
        empTransfer: {
            noun: 'employee transfer', doctype: 'Employee Transfer', titleKey: 'employee_name', prefix: 'TRN-', newStatus: 'Draft',
            statuses: ['Draft', 'Submitted', 'Cancelled'], attention: ['Draft'],
            cols: [
                { k: 'id', l: 'Transfer ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'company', l: 'From Company' },
                { k: 'new_company', l: 'To Company' },
                { k: 'transfer_date', l: 'Transfer Date', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'transfer_date', l: 'Transfer Date', t: 'date', req: true },
                { k: 'company', l: 'Current Company', t: 'select', req: true, source: 'companies' },
                { k: 'new_company', l: 'New Company', t: 'select', opt: true, source: 'companies' },
                { k: 'department', l: 'New Department', t: 'select', opt: true, source: 'departments' }
            ],
            rows: [], loaded: false
        },
        empSeparation: {
            noun: 'employee separation', doctype: 'Employee Separation', titleKey: 'employee_name', prefix: 'SEP-', newStatus: 'Pending',
            statuses: ['Pending', 'In Process', 'Completed'], attention: ['Pending', 'In Process'],
            cols: [
                { k: 'id', l: 'Separation ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'company', l: 'Company' },
                { k: 'resignation_letter_date', l: 'Resignation Date', t: 'muted' },
                { k: 'boarding_begins_on', l: 'Separation Date', t: 'muted' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' },
                { k: 'resignation_letter_date', l: 'Resignation Letter Date', t: 'date', opt: true },
                { k: 'boarding_begins_on', l: 'Separation Begins On', t: 'date', req: true },
                { k: 'exit_interview', l: 'Exit Interview / Reason', t: 'textarea', opt: true, ph: 'Reason for departure, hand-over notes...' }
            ],
            rows: [], loaded: false
        },
        empAdvance: {
            noun: 'employee advance', doctype: 'Employee Advance', titleKey: 'employee_name', prefix: 'HR-EAD-', newStatus: 'Draft',
            statuses: ['Draft', 'Paid', 'Partially Paid', 'Unpaid', 'Claimed', 'Returned', 'Partly Claimed and Returned', 'Cancelled'],
            attention: ['Draft', 'Unpaid'],
            cols: [
                { k: 'id', l: 'Advance ID', t: 'strong' },
                { k: 'employee_name', l: 'Employee' },
                { k: 'advance_amount', l: 'Amount', t: 'num' },
                { k: 'paid_amount', l: 'Paid Amount', t: 'num' },
                { k: 'posting_date', l: 'Posting Date', t: 'muted' },
                { k: 'purpose', l: 'Purpose' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'employee', l: 'Employee', t: 'select', req: true, source: 'employees' },
                { k: 'advance_amount', l: 'Advance Amount', t: 'number', req: true, ph: '10000' },
                { k: 'purpose', l: 'Purpose of Advance', t: 'textarea', req: true, ph: 'e.g. Travel and field accommodation advance' },
                { k: 'posting_date', l: 'Posting Date', t: 'date', req: true },
                { k: 'company', l: 'Company', t: 'select', req: true, source: 'companies' }
            ],
            rows: [], loaded: false
        },
        vehicleLog: {
            noun: 'vehicle log', doctype: 'Vehicle Log', titleKey: 'license_plate', prefix: 'HR-VLOG-', newStatus: 'Draft',
            statuses: ['Draft', 'Submitted', 'Cancelled'], attention: ['Draft'],
            cols: [
                { k: 'id', l: 'Log ID', t: 'strong' },
                { k: 'license_plate', l: 'License Plate', t: 'strong' },
                { k: 'employee_name', l: 'Driver / Employee' },
                { k: 'date', l: 'Date', t: 'muted' },
                { k: 'odometer', l: 'Odometer (km)', t: 'num' },
                { k: 'fuel_qty', l: 'Fuel (L)', t: 'num' },
                { k: 'price', l: 'Cost', t: 'num' },
                { k: 'status', l: 'Status', t: 'pill' }
            ],
            form: [
                { k: 'license_plate', l: 'License Plate / Vehicle', t: 'select', req: true, source: 'vehicles' },
                { k: 'employee', l: 'Driver / Employee', t: 'select', req: true, source: 'employees' },
                { k: 'date', l: 'Log Date', t: 'date', req: true },
                { k: 'odometer', l: 'Current Odometer Reading', t: 'number', req: true, ph: '125400' },
                { k: 'fuel_qty', l: 'Fuel Litres Added', t: 'number', opt: true, ph: '45' },
                { k: 'price', l: 'Total Fuel Price / Cost', t: 'number', opt: true, ph: '7500' },
                { k: 'supplier', l: 'Fuel Station / Supplier', t: 'text', opt: true, ph: 'TotalEnergies / Shell' }
            ],
            rows: [], loaded: false
        }
};

const TONE = {
  Yes: 'ok',
  Approved: 'ok',
  Active: 'ok',
  Paid: 'ok',
  Received: 'ok',
  Complete: 'ok',
  Completed: 'ok',
  'On-track': 'ok',
  Submitted: 'olive',
  IN: 'ok',
  OUT: 'neutral',
  Open: 'olive',
  Accepted: 'ok',
  Pending: 'olive',
  'In Progress': 'olive',
  'In Process': 'olive',
  'At risk': 'warn',
  'Partially Paid': 'warn',
  'Partly Claimed and Returned': 'warn',
  Unpaid: 'warn',
  Claimed: 'ok',
  Returned: 'neutral',
  'Not Started': 'neutral',
  Archived: 'neutral',
  Closed: 'neutral',
  Draft: 'neutral',
  Inactive: 'neutral',
  No: 'neutral',
  'Off-track': 'bad',
  Rejected: 'bad',
  Cancelled: 'bad',
  Overdue: 'bad'
};
