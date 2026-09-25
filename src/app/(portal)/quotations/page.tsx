'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  MoreHorizontal,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  DollarSign,
  User,
  Calendar,
  Percent,
} from 'lucide-react';

const columns = [
  { id: 'draft', title: 'Draft', color: 'bg-gray-100', icon: FileText, count: 4 },
  { id: 'pending', title: 'Pending Approval', color: 'bg-amber-100', icon: Clock, count: 6 },
  { id: 'approved', title: 'Approved', color: 'bg-green-100', icon: CheckCircle2, count: 5 },
  { id: 'rejected', title: 'Rejected', color: 'bg-red-100', icon: XCircle, count: 2 },
  { id: 'converted', title: 'Converted', color: 'bg-blue-100', icon: Send, count: 8 },
];

const quotationsByColumn: Record<string, any[]> = {
  draft: [
    { id: 'QUO-145', customer: 'Pars Steel Co.', items: 5, discount: 5, amount: 24500, createdBy: 'Ahmad Reza', closing: 'Aug 10' },
    { id: 'QUO-146', customer: 'Bahman Steel', items: 3, discount: 0, amount: 12800, createdBy: 'Sara Karimi', closing: 'Aug 12' },
    { id: 'QUO-147', customer: 'Mapna Steel', items: 8, discount: 10, amount: 62000, createdBy: 'Niloofar S.', closing: 'Aug 15' },
    { id: 'QUO-148', customer: 'Niru Steel', items: 2, discount: 0, amount: 8400, createdBy: 'Omid Farahi', closing: 'Aug 14' },
  ],
  pending: [
    { id: 'QUO-140', customer: 'Mobarakeh Steel', items: 12, discount: 8, amount: 89000, createdBy: 'Sara Karimi', closing: 'Aug 8' },
    { id: 'QUO-141', customer: 'Hormozgan Steel', items: 6, discount: 5, amount: 45000, createdBy: 'Mehdi Ahmadi', closing: 'Aug 9' },
    { id: 'QUO-142', customer: 'Khouzestan Steel', items: 4, discount: 0, amount: 22000, createdBy: 'Reza Mohammadi', closing: 'Aug 11' },
    { id: 'QUO-143', customer: 'Esfahan Steel', items: 9, discount: 12, amount: 78000, createdBy: 'Niloofar S.', closing: 'Aug 13' },
    { id: 'QUO-144', customer: 'Ghadir Steel', items: 3, discount: 3, amount: 18500, createdBy: 'Leila H.', closing: 'Aug 10' },
    { id: 'QUO-149', customer: 'Pasargad Steel', items: 5, discount: 0, amount: 31000, createdBy: 'Kian M.', closing: 'Aug 16' },
  ],
  approved: [
    { id: 'QUO-135', customer: 'Pars Steel Co.', items: 7, discount: 5, amount: 52000, createdBy: 'Ahmad Reza', closing: 'Aug 7' },
    { id: 'QUO-136', customer: 'Mobarakeh Steel', items: 4, discount: 0, amount: 28000, createdBy: 'Sara Karimi', closing: 'Aug 8' },
    { id: 'QUO-137', customer: 'Hormozgan Steel', items: 10, discount: 8, amount: 95000, createdBy: 'Mehdi Ahmadi', closing: 'Aug 9' },
    { id: 'QUO-138', customer: 'Mapna Steel', items: 6, discount: 5, amount: 48000, createdBy: 'Niloofar S.', closing: 'Aug 10' },
    { id: 'QUO-139', customer: 'Niru Steel', items: 3, discount: 0, amount: 16500, createdBy: 'Leila H.', closing: 'Aug 11' },
  ],
  rejected: [
    { id: 'QUO-130', customer: 'Bahman Steel', items: 2, discount: 0, amount: 9800, createdBy: 'Kian M.', closing: 'Aug 5' },
    { id: 'QUO-131', customer: 'Pasargad Steel', items: 5, discount: 15, amount: 42000, createdBy: 'Omid F.', closing: 'Aug 6' },
  ],
  converted: [
    { id: 'QUO-125', customer: 'Pars Steel Co.', items: 8, discount: 5, amount: 68000, createdBy: 'Ahmad Reza', closing: 'Aug 4' },
    { id: 'QUO-126', customer: 'Mobarakeh Steel', items: 6, discount: 3, amount: 45000, createdBy: 'Sara Karimi', closing: 'Aug 3' },
    { id: 'QUO-127', customer: 'Hormozgan Steel', items: 12, discount: 10, amount: 120000, createdBy: 'Mehdi Ahmadi', closing: 'Aug 2' },
    { id: 'QUO-128', customer: 'Esfahan Steel', items: 4, discount: 0, amount: 24000, createdBy: 'Niloofar S.', closing: 'Aug 1' },
    { id: 'QUO-129', customer: 'Ghadir Steel', items: 7, discount: 5, amount: 38000, createdBy: 'Leila H.', closing: 'Jul 31' },
    { id: 'QUO-132', customer: 'Mapna Steel', items: 9, discount: 8, amount: 82000, createdBy: 'Ahmad Reza', closing: 'Jul 30' },
    { id: 'QUO-133', customer: 'Khouzestan Steel', items: 5, discount: 0, amount: 29000, createdBy: 'Reza M.', closing: 'Jul 29' },
    { id: 'QUO-134', customer: 'Niru Steel', items: 3, discount: 0, amount: 14500, createdBy: 'Kian M.', closing: 'Jul 28' },
  ],
};

const approvalLevels: Record<string, { level: string; color: string }> = {
  draft: { level: 'Level 0', color: 'text-gray-500 bg-gray-50' },
  pending: { level: 'Level 1', color: 'text-amber-600 bg-amber-50' },
  approved: { level: 'Level 2', color: 'text-green-600 bg-green-50' },
  rejected: { level: 'Declined', color: 'text-red-600 bg-red-50' },
  converted: { level: 'Level 3', color: 'text-blue-600 bg-blue-50' },
};

export default function QuotationsPage() {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map((col, i) => (
          <Card key={col.id} className="p-4 border-gray-100 card-shadow animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl ${col.color} flex items-center justify-center`}>
                <col.icon size={15} className="text-gray-600" />
              </div>
              <span className="text-[11px] text-gray-400 font-500" style={{ fontWeight: 500 }}>{col.title}</span>
            </div>
            <p className="text-[22px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{col.count}</p>
          </Card>
        ))}
      </div>

      {/* Pipeline */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-700 text-gray-900" style={{ fontWeight: 700 }}>Quotation Pipeline</h2>
        <Button size="sm" className="rounded-xl gradient-primary text-white border-0">
          <Plus size={15} className="mr-1.5" /> New Quotation
        </Button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {columns.map((col, colIdx) => (
          <div key={col.id} className="space-y-3 animate-fade-in-up opacity-0" style={{ animationDelay: `${colIdx * 80}ms`, animationFillMode: 'forwards' }}>
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.color.replace('100', '400')}`} />
                <span className="text-[12px] font-700 text-gray-700" style={{ fontWeight: 700 }}>{col.title}</span>
              </div>
              <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">{quotationsByColumn[col.id].length}</span>
            </div>

            {/* Cards */}
            {quotationsByColumn[col.id].map((q, i) => (
              <Card
                key={q.id}
                className="p-4 border-gray-100 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in-up opacity-0"
                style={{ borderRadius: '14px', animationDelay: `${colIdx * 80 + i * 40}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[11px] font-700 text-blue-600" style={{ fontWeight: 700 }}>{q.id}</span>
                  <button className="text-gray-300 hover:text-gray-500">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
                <p className="text-[13px] font-600 text-gray-900 mb-3" style={{ fontWeight: 600 }}>{q.customer}</p>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 flex items-center gap-1"><FileText size={11} /> Items</span>
                    <span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>{q.items}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 flex items-center gap-1"><Percent size={11} /> Discount</span>
                    <span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>{q.discount}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 flex items-center gap-1"><User size={11} /> Created by</span>
                    <span className="font-500 text-gray-600" style={{ fontWeight: 500 }}>{q.createdBy}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 flex items-center gap-1"><Calendar size={11} /> Closing</span>
                    <span className="font-500 text-gray-600" style={{ fontWeight: 500 }}>{q.closing}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className={`text-[9px] font-600 px-2 py-0.5 rounded-md ${approvalLevels[col.id].color}`} style={{ fontWeight: 600 }}>
                    {approvalLevels[col.id].level}
                  </span>
                  <span className="text-[14px] font-700 text-gray-900" style={{ fontWeight: 700 }}>${q.amount.toLocaleString()}</span>
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
