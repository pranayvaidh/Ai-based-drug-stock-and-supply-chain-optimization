import {
  AlertTriangle, BarChart3, Boxes, Building2, ClipboardList, FileSpreadsheet, Grid3x3, LayoutDashboard,
  LineChart, Pill, Receipt, Settings, ShoppingCart, Truck, UserRound,
} from 'lucide-react';

/** Role-based navigation (§8). `live` drives the small LIVE / sample dot next to each item. */
export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'pharmacist'], live: false },
      { to: '/forecast', label: 'Forecast', icon: LineChart, roles: ['admin', 'pharmacist'], live: false },
      { to: '/heatmap', label: 'Stock Heatmap', icon: Grid3x3, roles: ['admin', 'pharmacist'], live: false },
      { to: '/alerts', label: 'Alerts & Expiry', icon: AlertTriangle, roles: ['admin', 'pharmacist'], live: false },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/drugs', label: 'Drugs', icon: Pill, roles: ['admin', 'pharmacist'], live: true },
      { to: '/stock', label: 'Stock', icon: Boxes, roles: ['admin', 'pharmacist'], live: true },
      { to: '/sales', label: 'Sales', icon: Receipt, roles: ['admin', 'pharmacist'], live: true },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, roles: ['admin', 'pharmacist'], live: true },
    ],
  },
  {
    title: 'Supply network',
    items: [
      { to: '/supplier-portal', label: 'Supplier Portal', icon: ClipboardList, roles: ['supplier'], live: true },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['admin'], live: true },
      { to: '/branches', label: 'Branches', icon: Building2, roles: ['admin'], live: true },
      { to: '/supplier-performance', label: 'Supplier Performance', icon: BarChart3, roles: ['admin'], live: false },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: '/reports', label: 'Reports', icon: FileSpreadsheet, roles: ['admin', 'pharmacist'], live: false },
      { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['admin'], live: false },
    ],
  },
  {
    title: 'Account',
    items: [{ to: '/profile', label: 'Profile', icon: UserRound, roles: ['admin', 'pharmacist', 'supplier'], live: true }],
  },
];

export function navFor(role) {
  return NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) }))
    .filter((s) => s.items.length > 0);
}

export function titleFor(pathname) {
  for (const s of NAV_SECTIONS) for (const i of s.items) if (pathname.startsWith(i.to)) return i.label;
  return '';
}
