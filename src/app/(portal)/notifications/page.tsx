'use client';

import { Card } from '@/components/ui/card';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Wallet,
  UserPlus,
  Bell,
  Settings,
} from 'lucide-react';

const groups = [
  {
    label: 'Today',
    items: [
      { type: 'order', icon: CheckCircle2, title: 'Order Approved', desc: 'ORD-2845 for Pars Steel Co. has been approved', time: '2 min ago', color: 'text-green-500', bg: 'bg-green-50', unread: true },
      { type: 'quotation', icon: XCircle, title: 'Quotation Rejected', desc: 'QUO-130 for Bahman Steel was rejected by management', time: '1 hour ago', color: 'text-red-500', bg: 'bg-red-50', unread: true },
      { type: 'stock', icon: AlertTriangle, title: 'Low Stock Alert', desc: 'Steel rebar (12mm) is below minimum threshold', time: '2 hours ago', color: 'text-amber-500', bg: 'bg-amber-50', unread: true },
      { type: 'visit', icon: MapPin, title: 'Visit Completed', desc: 'Ahmad Reza completed visit at Pars Steel Co.', time: '3 hours ago', color: 'text-blue-500', bg: 'bg-blue-50', unread: false },
      { type: 'payment', icon: Wallet, title: 'Payment Received', desc: '$24,500 received from Mobarakeh Steel', time: '4 hours ago', color: 'text-green-500', bg: 'bg-green-50', unread: false },
    ],
  },
  {
    label: 'Yesterday',
    items: [
      { type: 'customer', icon: UserPlus, title: 'New Customer Added', desc: 'Mapna Steel has been added as a new customer', time: 'Yesterday 5:30 PM', color: 'text-purple-500', bg: 'bg-purple-50', unread: true },
      { type: 'system', icon: Settings, title: 'System Update', desc: 'SteelForce portal updated to version 2.4.0', time: 'Yesterday 2:00 PM', color: 'text-gray-500', bg: 'bg-gray-50', unread: false },
      { type: 'order', icon: CheckCircle2, title: 'Order Completed', desc: 'ORD-2843 for Hormozgan Steel has been delivered', time: 'Yesterday 11:00 AM', color: 'text-green-500', bg: 'bg-green-50', unread: false },
    ],
  },
  {
    label: 'Earlier',
    items: [
      { type: 'quotation', icon: CheckCircle2, title: 'Quotation Converted', desc: 'QUO-125 was converted to order ORD-2845', time: 'Aug 4, 2026', color: 'text-blue-500', bg: 'bg-blue-50', unread: false },
      { type: 'alert', icon: AlertTriangle, title: 'System Alert', desc: 'Monthly backup completed successfully', time: 'Aug 3, 2026', color: 'text-sky-500', bg: 'bg-sky-50', unread: false },
      { type: 'payment', icon: Wallet, title: 'Payment Received', desc: '$52,100 received from Hormozgan Steel', time: 'Aug 2, 2026', color: 'text-green-500', bg: 'bg-green-50', unread: false },
    ],
  },
];

export default function NotificationsPage() {
  const totalUnread = groups.reduce((sum, g) => sum + g.items.filter((i) => i.unread).length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Bell size={20} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-[16px] font-700 text-gray-900" style={{ fontWeight: 700 }}>Notification Center</h2>
            <p className="text-[12px] text-gray-400">{totalUnread} unread notifications</p>
          </div>
        </div>
        <button className="text-[12px] text-blue-600 font-600 hover:text-blue-700 transition-colors" style={{ fontWeight: 600 }}>
          Mark all as read
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {['All', 'Orders', 'Quotations', 'Payments', 'Visits', 'System', 'Alerts'].map((f, i) => (
          <button
            key={f}
            className={`px-4 py-2 rounded-xl text-[12px] font-500 whitespace-nowrap transition-all duration-200 ${i === 0 ? 'gradient-primary text-white shadow-md shadow-blue-200' : 'text-gray-500 bg-white card-shadow hover:text-blue-600'}`}
            style={{ fontWeight: 500 }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notification Groups */}
      {groups.map((group, gIdx) => (
        <div key={group.label} className="space-y-2">
          <p className="text-[11px] font-600 uppercase tracking-widest text-gray-400 px-1" style={{ fontWeight: 600 }}>{group.label}</p>
          {group.items.map((item, i) => (
            <Card
              key={i}
              className={`p-4 border-gray-100 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in-up opacity-0 ${item.unread ? 'border-l-4 border-l-blue-400' : ''}`}
              style={{ borderRadius: '16px', animationDelay: `${gIdx * 100 + i * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                  <item.icon size={18} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-600 text-gray-900" style={{ fontWeight: 600 }}>{item.title}</p>
                    {item.unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-[12px] text-gray-500 mt-0.5">{item.desc}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">{item.time}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
