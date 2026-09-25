'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal,
  MapPin,
  Clock,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

const MOCK_DEPOTS = [
  {
    id: 'REQ-D-8821',
    name: 'Sokha Building Materials',
    type: 'Depot (BP)',
    rep: 'Chandy Neat',
    location: 'Siem Reap',
    phone: '+855 12 345 678',
    date: new Date(2026, 8, 17, 11, 20),
    status: 'pending'
  },
  {
    id: 'REQ-D-8820',
    name: 'Chea Sambath Iron Works',
    type: 'Non-BP Depot',
    rep: 'Vannak Ouk',
    location: 'Battambang',
    phone: '+855 93 456 789',
    date: new Date(2026, 8, 17, 9, 0),
    status: 'pending'
  },
  {
    id: 'REQ-D-8819',
    name: 'Phnom Penh Central Steel',
    type: 'Depot (BP)',
    rep: 'Chandy Neat',
    location: 'Phnom Penh',
    phone: '+855 11 222 333',
    date: new Date(2026, 8, 16, 15, 45),
    status: 'pending'
  },
  {
    id: 'REQ-D-8818',
    name: 'Kampot Coastal Supply',
    type: 'Non-BP Depot',
    rep: 'Sokha Rith',
    location: 'Kampot',
    phone: '+855 77 888 999',
    date: new Date(2026, 8, 16, 14, 10),
    status: 'approved'
  }
];

export default function DepotsApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState(MOCK_DEPOTS);

  const pendingBpCount = requests.filter(r => r.status === 'pending' && r.type.includes('BP') && !r.type.includes('Non')).length;
  const pendingNonBpCount = requests.filter(r => r.status === 'pending' && r.type.includes('Non-BP')).length;
  const approvedToday = requests.filter(r => r.status === 'approved' && r.date.getDate() === new Date().getDate()).length;

  const handleAction = (id: string, newStatus: 'approved' | 'rejected') => {
    // Optimistic update without confirmation dialog for speed
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const filteredRequests = requests.filter(r => 
    (r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     r.rep.toLowerCase().includes(searchTerm.toLowerCase())) &&
    r.status === 'pending' // Only show pending by default in approval queue
  );

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Depots Approval</h1>
          <p className="text-sm text-gray-500 mt-1">Review requests to create new Depots and Non-BP Depots</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Store size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Pending Depot (BP)</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{pendingBpCount}</p>
            <p className="text-sm text-gray-500 font-medium mb-1 line-clamp-1">Requests</p>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '75ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Clock size={18} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Pending Non-BP</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{pendingNonBpCount}</p>
            <p className="text-sm text-gray-500 font-medium mb-1 line-clamp-1">Requests</p>
          </div>
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
                placeholder="Search name, rep, or ID..." 
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
                <th className="px-6 py-4 font-medium text-gray-500">Depot Name</th>
                <th className="px-6 py-4 font-medium text-gray-500">Type</th>
                <th className="px-6 py-4 font-medium text-gray-500">Sales Rep</th>
                <th className="px-6 py-4 font-medium text-gray-500">Location</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredRequests.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle2 className="text-green-500" size={24} />
                        </div>
                        <p className="text-gray-900 font-medium">All caught up!</p>
                        <p className="text-gray-500 text-sm mt-1">No pending depot requests require your approval.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredRequests.map((r) => {
                    const isNonBp = r.type.includes('Non-BP');
                    return (
                      <motion.tr 
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        className="group hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/approval/depots/${r.id}`} className="font-medium text-primary cursor-pointer hover:underline">
                            {r.id}
                          </Link>
                          <div className="text-xs text-gray-500 mt-1">{format(r.date, 'MMM d, HH:mm')}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Link 
                            href={`/approval/depots/${r.id}`}
                            className="font-medium text-gray-900 hover:text-primary transition-colors block"
                          >
                            {r.name}
                          </Link>
                          <div className="text-xs text-gray-500 mt-1">{r.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${isNonBp ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'}`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {r.rep.split(' ').map(n => n[0]).join('')}
                            </div>
                            {r.rep}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-gray-400" />
                            {r.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/approval/depots/${r.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
                              title="Review all depot details"
                            >
                              <Eye size={14} />
                              <span>Review</span>
                            </Link>
                            <button 
                              onClick={() => handleAction(r.id, 'rejected')}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleAction(r.id, 'approved')}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle2 size={18} />
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
