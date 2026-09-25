'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BadgePercent, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal,
  Tags,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const MOCK_PROMOTIONS = [
  {
    id: 'PR-2026-1402',
    client: 'Urban Development Co.',
    rep: 'Sokha Rith',
    product: 'Deformed Bar 12mm',
    originalPrice: 15200.00,
    requestedDiscountPct: 15.0,
    reason: 'Volume matching competitor offer',
    date: new Date(2026, 8, 17, 10, 45),
    status: 'pending'
  },
  {
    id: 'PR-2026-1401',
    client: 'Phnom Penh Construction JSC',
    rep: 'Chandy Neat',
    product: 'Roofing Sheet 0.40mm',
    originalPrice: 4500.00,
    requestedDiscountPct: 5.0,
    reason: 'Loyalty discount renewal',
    date: new Date(2026, 8, 17, 9, 15),
    status: 'pending'
  },
  {
    id: 'PR-2026-1400',
    client: 'Borey Vimean Engineering',
    rep: 'Vannak Ouk',
    product: 'C Purlin 100x50',
    originalPrice: 8900.00,
    requestedDiscountPct: 22.0,
    reason: 'Special project bid pricing',
    date: new Date(2026, 8, 16, 16, 30),
    status: 'pending'
  }
];

export default function PromotionsApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [promotions, setPromotions] = useState(MOCK_PROMOTIONS);

  const pendingCount = promotions.filter(p => p.status === 'pending').length;
  
  const highDiscountCount = promotions.filter(p => p.status === 'pending' && p.requestedDiscountPct >= 20).length;

  const totalDiscountValue = promotions
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.originalPrice * (p.requestedDiscountPct / 100)), 0);

  const handleAction = (id: string, newStatus: 'approved' | 'rejected') => {
    // Optimistic update
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const filteredPromos = promotions.filter(p => 
    (p.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.rep.toLowerCase().includes(searchTerm.toLowerCase())) &&
    p.status === 'pending'
  );

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Promotions & Discounts</h1>
          <p className="text-sm text-gray-500 mt-1">Review special discount requests from the field</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
              <BadgePercent size={18} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Pending Requests</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '75ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Tags size={18} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Value of Requested Discounts</p>
          <p className="text-3xl font-bold text-gray-900">
            ${totalDiscountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">High Discount Alerts (&ge; 20%)</p>
          <p className="text-3xl font-bold text-red-600">{highDiscountCount}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '150ms' }}>
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search requests..." 
                className="w-full pl-9 bg-gray-50/50 border border-gray-200 rounded-xl h-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <button className="h-10 border border-gray-200 rounded-xl px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-500">Request ID</th>
                <th className="px-6 py-4 font-medium text-gray-500">Client</th>
                <th className="px-6 py-4 font-medium text-gray-500">Product / Reason</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Original Price</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Requested Discount</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredPromos.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle2 className="text-green-500" size={24} />
                        </div>
                        <p className="text-gray-900 font-medium">All caught up!</p>
                        <p className="text-gray-500 text-sm mt-1">No pending discount requests.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredPromos.map((p) => {
                    const finalPrice = p.originalPrice * (1 - p.requestedDiscountPct / 100);
                    const isHighDiscount = p.requestedDiscountPct >= 20;

                    return (
                      <motion.tr 
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        className={`group transition-colors ${isHighDiscount ? 'hover:bg-red-50/30' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-primary cursor-pointer hover:underline">{p.id}</div>
                          <div className="text-xs text-gray-500 mt-1">{format(p.date, 'MMM d, HH:mm')}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{p.client}</div>
                          <div className="text-xs text-gray-500 mt-1">Req by: {p.rep}</div>
                        </td>
                        <td className="px-6 py-4 max-w-[250px]">
                          <div className="font-medium text-gray-900 truncate" title={p.product}>{p.product}</div>
                          <div className="text-xs text-gray-500 mt-1 truncate" title={p.reason}>&ldquo;{p.reason}&rdquo;</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500 tabular-nums">
                          ${p.originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium tabular-nums">
                          <div className="flex items-center justify-end gap-2">
                            {isHighDiscount && <AlertTriangle size={14} className="text-red-500" />}
                            <span className={isHighDiscount ? 'text-red-600' : 'text-orange-600'}>
                              {p.requestedDiscountPct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 line-through opacity-70">
                            → ${finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleAction(p.id, 'rejected')}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleAction(p.id, 'approved')}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                              <MoreHorizontal size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
