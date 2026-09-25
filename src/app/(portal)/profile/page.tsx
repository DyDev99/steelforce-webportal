'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Activity,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle2,
  Lock,
  Key,
  Camera,
} from 'lucide-react';
import { useState } from 'react';

const tabs = [
  { id: 'personal', label: 'Personal', icon: CheckCircle2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'devices', label: 'Devices', icon: Smartphone },
];

import { useAuth } from '@/lib/auth/auth-context';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal');
  const { user, permissions: userPermissions, updateUser } = useAuth();

  if (!user) return null;

  // Split name for First Name / Last Name fields
  const safeName = user.name || 'Unknown User';
  const nameParts = safeName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <Card className="p-6 border-gray-100 card-shadow animate-fade-in-up opacity-0 text-center" style={{ borderRadius: '18px', animationFillMode: 'forwards' }}>
          <div className="relative inline-block mb-4 group">
            <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-200 mx-auto overflow-hidden bg-cover bg-center relative">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <span className="text-white text-3xl font-700 z-10" style={{ fontWeight: 700 }}>{user.initials ?? '—'}</span>
              )}
              {/* Hover overlay for camera */}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20">
                <Camera size={24} className="text-white" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/jpeg, image/png, image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      import('sonner').then(({ toast }) => toast.error('File too large', { description: 'Please choose an image under 2 MB.' }));
                      return;
                    }
                    try {
                      const { usersRepository } = await import('@/features/users/repositories');
                      const updatedProfile = await usersRepository.updateMyProfile({ avatar: file });
                      updateUser({ avatarUrl: updatedProfile.avatar_url });
                      import('sonner').then(({ toast }) => toast.success('Profile picture updated'));
                    } catch (err) {
                      import('sonner').then(({ toast }) => toast.error('Failed to update picture'));
                    }
                  }}
                />
              </label>
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-500 border-3 border-white z-30" style={{ borderWidth: '3px' }} />
          </div>
          <h2 className="text-[18px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{user.name}</h2>
          <p className="text-[12px] text-blue-500 font-600 mb-1" style={{ fontWeight: 600 }}>{user.jobTitle || user.role}</p>
          {user.department && <p className="text-[12px] text-gray-400 mb-5">{user.department} Department</p>}

          <div className="space-y-2.5 text-left mt-5">
            <div className="flex items-center gap-2.5 text-[12px] text-gray-500">
              <Mail size={14} className="text-blue-500" /> {user.email}
            </div>
            {/* Phone, MapPin, Calendar left static as they are not on User entity yet */}
            <div className="flex items-center gap-2.5 text-[12px] text-gray-500">
              <Phone size={14} className="text-blue-500" /> +855 12 345 678
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-gray-500">
              <MapPin size={14} className="text-blue-500" /> Phnom Penh, Cambodia
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-gray-500">
              <Calendar size={14} className="text-blue-500" /> Joined recently
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-50">
            <p className="text-[11px] font-600 text-gray-400 uppercase tracking-wider mb-3 text-left" style={{ fontWeight: 600 }}>Permissions</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {userPermissions.map((p) => (
                <span key={p} className="text-[10px] font-500 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600" style={{ fontWeight: 500 }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Tabbed Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tabs */}
          <Card className="border-gray-100 card-shadow animate-fade-in-up opacity-0 overflow-hidden" style={{ borderRadius: '18px', animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-1 px-4 pt-4 border-b border-gray-50 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-[12px] font-600 whitespace-nowrap transition-all duration-200 relative ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  style={{ fontWeight: 600 }}
                >
                  <tab.icon size={14} /> {tab.label}
                  {activeTab === tab.id && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary" />}
                </button>
              ))}
            </div>
            <div className="p-6">
              {activeTab === 'personal' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'First Name', value: firstName },
                      { label: 'Last Name', value: lastName },
                      { label: 'Email', value: user.email },
                      { label: 'Phone', value: '+855 12 345 678' },
                      { label: 'Department', value: user.department || 'N/A' },
                      { label: 'Role', value: user.role },
                      { label: 'Location', value: 'Phnom Penh, Cambodia' },
                      { label: 'Employee ID', value: user.id },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="text-[11px] text-gray-400 font-500 mb-1.5 block" style={{ fontWeight: 500 }}>{field.label}</label>
                        <input
                          type="text"
                          defaultValue={field.value}
                          readOnly
                          className="w-full h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-100 text-[13px] text-gray-700 focus:outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  <Button className="rounded-xl gradient-primary text-white border-0 mt-2">Save Changes</Button>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-4 animate-fade-in">
                  {[
                    { icon: Lock, title: 'Change Password', desc: 'Update your account password', action: 'Update' },
                    { icon: Key, title: 'Two-Factor Authentication', desc: 'Add an extra layer of security', action: 'Enable' },
                    { icon: Shield, title: 'Login Alerts', desc: 'Get notified on new device logins', action: 'On' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                          <item.icon size={18} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[13px] font-600 text-gray-900" style={{ fontWeight: 600 }}>{item.title}</p>
                          <p className="text-[11px] text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl text-[12px]">{item.action}</Button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-3 animate-fade-in">
                  {['Order Updates', 'Quotation Approvals', 'Payment Alerts', 'Visit Reminders', 'System Notifications', 'Weekly Reports'].map((n, i) => (
                    <div key={n} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50">
                      <span className="text-[13px] font-500 text-gray-700" style={{ fontWeight: 500 }}>{n}</span>
                      <button className={`w-11 h-6 rounded-full transition-all duration-200 ${i < 4 ? 'gradient-primary' : 'bg-gray-200'}`}>
                        <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${i < 4 ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3 animate-fade-in">
                  {[
                    { action: 'Logged in from Tehran', time: '2 hours ago', icon: Monitor },
                    { action: 'Approved order ORD-2845', time: '3 hours ago', icon: CheckCircle2 },
                    { action: 'Created quotation QUO-145', time: '5 hours ago', icon: Activity },
                    { action: 'Updated customer profile for Pars Steel Co.', time: 'Yesterday', icon: Smartphone },
                    { action: 'Changed password', time: 'Aug 3, 2026', icon: Lock },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <a.icon size={15} className="text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-500 text-gray-700" style={{ fontWeight: 500 }}>{a.action}</p>
                        <p className="text-[10px] text-gray-400">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'devices' && (
                <div className="space-y-3 animate-fade-in">
                  {[
                    { name: 'MacBook Pro 16"', location: 'Tehran, Iran', lastActive: 'Active now', icon: Monitor, current: true },
                    { name: 'iPhone 15 Pro', location: 'Tehran, Iran', lastActive: '2 hours ago', icon: Smartphone, current: false },
                    { name: 'iPad Air', location: 'Isfahan, Iran', lastActive: 'Yesterday', icon: Tablet, current: false },
                  ].map((d) => (
                    <div key={d.name} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${d.current ? 'bg-green-50' : 'bg-gray-100'}`}>
                          <d.icon size={18} className={d.current ? 'text-green-500' : 'text-gray-400'} />
                        </div>
                        <div>
                          <p className="text-[13px] font-600 text-gray-900" style={{ fontWeight: 600 }}>{d.name}</p>
                          <p className="text-[11px] text-gray-400">{d.location} · {d.lastActive}</p>
                        </div>
                      </div>
                      {d.current ? (
                        <span className="text-[10px] font-600 px-2.5 py-1 rounded-lg bg-green-50 text-green-600" style={{ fontWeight: 600 }}>Current</span>
                      ) : (
                        <button className="text-[11px] text-red-500 font-600 hover:text-red-600" style={{ fontWeight: 600 }}>Sign out</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
