'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  CheckCircle2, 
  XCircle, 
  FileText,
  User,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

const MOCK_LINE_ITEMS = [
  { id: '1', product: 'Deformed Bar 12mm', sku: 'DB-12', quantity: 1500, unitPrice: 10.50 },
  { id: '2', product: 'Deformed Bar 16mm', sku: 'DB-16', quantity: 2000, unitPrice: 14.00 },
  { id: '3', product: 'C Purlin 100x50x20', sku: 'CP-100', quantity: 50, unitPrice: 25.00 },
];

export default function QuotationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Derive totals
  const subtotal = MOCK_LINE_ITEMS.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * 0.10; // 10% VAT
  const grandTotal = subtotal + tax;

  const handleApprove = () => {
    setIsApproving(true);
    setTimeout(() => {
      router.push('/approval/quotations');
    }, 600); // Fake network delay before redirect
  };

  const handleReject = () => {
    setIsRejecting(true);
    setTimeout(() => {
      router.push('/approval/quotations');
    }, 600);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto min-h-screen pb-24">
      {/* Breadcrumb & Header */}
      <div className="mb-6 animate-fade-in-up">
        <Link 
          href="/approval/quotations" 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Quotations
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              Quotation {quotationId}
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                Pending Approval
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Submitted on {format(new Date(2026, 8, 17, 9, 30), 'MMMM do, yyyy HH:mm')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Document (Left Column) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-100 shadow-sm rounded-[18px] overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <FileText size={18} className="text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Line Items</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500">Product</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Quantity</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Unit Price</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MOCK_LINE_ITEMS.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.product}</div>
                        <div className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-900">
                        {item.quantity.toLocaleString()} pcs
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-600">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums text-gray-900">
                        ${(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50/50">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-gray-500 font-medium">Subtotal</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900 tabular-nums">
                      ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-gray-500 font-medium">VAT (10%)</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900 tabular-nums">
                      ${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right text-gray-900 font-bold text-base">Grand Total</td>
                    <td className="px-6 py-4 text-right font-bold text-lg text-primary tabular-nums">
                      ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Context & Actions (Right Column) */}
        <div className="space-y-6">
          
          {/* Approval Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-6 border border-gray-100 shadow-sm rounded-[18px]"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Manager Decision</h3>
            <div className="space-y-3">
              <button 
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-green-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isApproving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><CheckCircle2 size={18} /> Approve Quotation</>
                )}
              </button>
              <button 
                onClick={handleReject}
                disabled={isApproving || isRejecting}
                className="w-full h-12 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRejecting ? (
                  <div className="w-5 h-5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                ) : (
                  <><XCircle size={18} /> Reject</>
                )}
              </button>
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Approving this quotation will lock the prices and allow the customer to proceed with order generation.
              </p>
            </div>
          </motion.div>

          {/* Client Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 border border-gray-100 shadow-sm rounded-[18px]"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Client Context</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Company</p>
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs">PP</div>
                  Phnom Penh Construction JSC
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Prepared By</p>
                <div className="flex items-center gap-2 text-gray-900 text-sm">
                  <User size={16} className="text-gray-400" />
                  Chandy Neat (Sales Rep)
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Delivery Location</p>
                <div className="flex items-center gap-2 text-gray-900 text-sm">
                  <MapPin size={16} className="text-gray-400" />
                  BKK1, Phnom Penh
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Validity</p>
                <div className="flex items-center gap-2 text-gray-900 text-sm">
                  <Calendar size={16} className="text-gray-400" />
                  Valid until {format(new Date(2026, 8, 24), 'MMM d, yyyy')} (7 Days)
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
