/**
 * The business overview dataset.
 *
 * One source for every dashboard presentation. The three workspace shells each
 * show this differently — an app-centric summary, a module-oriented operations
 * view, a dense analyst grid — but they all read these same rows, so there is
 * one place to swap demo data for the real endpoint and no shell can drift from
 * another.
 *
 * Moved here verbatim from `app/(portal)/dashboard/page.tsx`, where it was
 * inline and therefore unusable by anything else.
 *
 * Colours are brand values; see `docs/design-system.md`.
 */

export const salesRevenueData = [
  { month: 'Jan', revenue: 420000, target: 450000 },
  { month: 'Feb', revenue: 480000, target: 460000 },
  { month: 'Mar', revenue: 520000, target: 500000 },
  { month: 'Apr', revenue: 490000, target: 520000 },
  { month: 'May', revenue: 580000, target: 540000 },
  { month: 'Jun', revenue: 640000, target: 600000 },
  { month: 'Jul', revenue: 680000, target: 650000 },
  { month: 'Aug', revenue: 720000, target: 700000 },
  { month: 'Sep', revenue: 780000, target: 750000 },
  { month: 'Oct', revenue: 820000, target: 800000 },
  { month: 'Nov', revenue: 880000, target: 850000 },
  { month: 'Dec', revenue: 940000, target: 900000 },
];

export const ordersData = [
  { month: 'Jan', orders: 120, returns: 8 },
  { month: 'Feb', orders: 145, returns: 10 },
  { month: 'Mar', orders: 160, returns: 6 },
  { month: 'Apr', orders: 180, returns: 12 },
  { month: 'May', orders: 210, returns: 9 },
  { month: 'Jun', orders: 240, returns: 14 },
  { month: 'Jul', orders: 265, returns: 11 },
  { month: 'Aug', orders: 290, returns: 8 },
];

export const quotationConversion = [
  { name: 'Converted', value: 145, color: '#004A98' },
  { name: 'Pending', value: 52, color: '#4F92DA' },
  { name: 'Rejected', value: 28, color: '#C0362C' },
  { name: 'Draft', value: 35, color: '#DCE3EB' },
];

export const customerGrowthData = [
  { month: 'Jan', customers: 800, new: 40 },
  { month: 'Feb', customers: 880, new: 80 },
  { month: 'Mar', customers: 950, new: 70 },
  { month: 'Apr', customers: 1020, new: 70 },
  { month: 'May', customers: 1080, new: 60 },
  { month: 'Jun', customers: 1150, new: 70 },
  { month: 'Jul', customers: 1200, new: 50 },
  { month: 'Aug', customers: 1240, new: 40 },
];

export const provinceData = [
  { province: 'Phnom Penh', sales: 420, percentage: 35 },
  { province: 'Siem Reap', sales: 280, percentage: 23 },
  { province: 'Battambang', sales: 195, percentage: 16 },
  { province: 'Preah Sihanouk', sales: 165, percentage: 14 },
  { province: 'Kandal', sales: 130, percentage: 12 },
];

export const recentOrders = [
  { id: 'ORD-2845', customer: 'Angkor Trading Co.', rep: 'Sokha Chan', date: 'Aug 6, 2026', status: 'Confirmed', total: 24500, payment: 'Paid' },
  { id: 'ORD-2844', customer: 'Mekong Steel', rep: 'Sopheak Heng', date: 'Aug 6, 2026', status: 'Processing', total: 38200, payment: 'Pending' },
  { id: 'ORD-2843', customer: 'Kirirom Logistics', rep: 'Vannak Keo', date: 'Aug 5, 2026', status: 'Completed', total: 52100, payment: 'Paid' },
  { id: 'ORD-2842', customer: 'Tonle Sap Commerce', rep: 'Bora Meng', date: 'Aug 5, 2026', status: 'Pending', total: 18900, payment: 'Unpaid' },
  { id: 'ORD-2841', customer: 'Bayon Enterprise', rep: 'Dara Rath', date: 'Aug 4, 2026', status: 'Cancelled', total: 9800, payment: 'Refunded' },
];

export const statusColors: Record<string, string> = {
  Confirmed: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  Processing: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  Completed: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  Pending: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
  Cancelled: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

export const paymentColors: Record<string, string> = {
  Paid: 'text-green-600 dark:text-green-400',
  Pending: 'text-amber-600 dark:text-amber-400',
  Unpaid: 'text-red-600 dark:text-red-400',
  Refunded: 'text-muted-foreground',
};
