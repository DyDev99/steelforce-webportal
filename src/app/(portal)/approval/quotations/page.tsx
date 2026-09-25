'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreHorizontal,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

const MOCK_QUOTATIONS = [
  {
    id: 'QT-2026-0891',
    client: 'Phnom Penh Construction JSC',
    rep: 'Chandy Neat',
    value: 45000.00,
    date: new Date(2026, 8, 17, 9, 30),
    status: 'pending'
  },
  {
    id: 'QT-2026-0890',
    client: 'Borey Vimean Engineering',
    rep: 'Sokha Rith',
    value: 12500.50,
    date: new Date(2026, 8, 17, 8, 15),
    status: 'pending'
  },
  {
    id: 'QT-2026-0889',
    client: 'Global Steel Trading',
    rep: 'Chandy Neat',
    value: 8200.00,
    date: new Date(2026, 8, 16, 14, 20),
    status: 'approved'
  },
  {
    id: 'QT-2026-0888',
    client: 'Mekong Builders Group',
    rep: 'Vannak Ouk',
    value: 110500.00,
    date: new Date(2026, 8, 16, 11, 45),
    status: 'rejected'
  },
  {
    id: 'QT-2026-0887',
    client: 'Angkor Wat Logistics',
    rep: 'Sokha Rith',
    value: 3400.00,
    date: new Date(2026, 8, 16, 10, 10),
    status: 'pending'
  }
];

export default function QuotationsApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [quotations, setQuotations] = useState(MOCK_QUOTATIONS);

  const pendingCount = quotations.filter(q => q.status === 'pending').length;
  const approvedToday = quotations.filter(q => q.status === 'approved' && q.date.getDate() === new Date().getDate()).length;
  
  const totalPendingValue = quotations
    .filter(q => q.status === 'pending')
    .reduce((sum, q) => sum + q.value, 0);

  const handleAction = (id: string, newStatus: 'approved' | 'rejected') => {
    // Optimistic update without confirmation dialog for speed
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
  };

  const filteredQuotas = quotations.filter(q => 
    (q.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
     q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     q.rep.toLowerCase().includes(searchTerm.toLowerCase())) &&
    q.status === 'pending' // Only show pending by default in approval queue
  );

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quotations Approval</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve pending sales quotations</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0 relative overflow-hidden" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Clock size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Pending Approval</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-sm text-gray-500 font-medium mb-1 line-clamp-1">Quotations</p>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '75ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <FileText size={18} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Pending Value</p>
          <p className="text-3xl font-bold text-gray-900">
            ${totalPendingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Approved Today</p>
          <p className="text-3xl font-bold text-gray-900">{approvedToday}</p>
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
                placeholder="Search ID, Client or Rep..." 
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
                <th className="px-6 py-4 font-medium text-gray-500">Quotation ID</th>
                <th className="px-6 py-4 font-medium text-gray-500">Client</th>
                <th className="px-6 py-4 font-medium text-gray-500">Sales Rep</th>
                <th className="px-6 py-4 font-medium text-gray-500">Date Submitted</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Total Value</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredQuotas.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle2 className="text-green-500" size={24} />
                        </div>
                        <p className="text-gray-900 font-medium">All caught up!</p>
                        <p className="text-gray-500 text-sm mt-1">No pending quotations require your approval.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredQuotas.map((q) => (
                    <motion.tr 
                      key={q.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/approval/quotations/${q.id}`} className="font-medium text-primary cursor-pointer hover:underline">
                          {q.id}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{q.client}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-600 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                            {q.rep.split(' ').map(n => n[0]).join('')}
                          </div>
                          {q.rep}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {format(q.date, 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 tabular-nums">
                        ${q.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleAction(q.id, 'rejected')}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleAction(q.id, 'approved')}
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
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
