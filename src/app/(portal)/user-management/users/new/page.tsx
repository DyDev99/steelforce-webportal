'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Building2,
  Shield,
  Camera,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { isApiError } from '@/domain/errors/api-error';
import {
  departmentsRepository,
  rolesRepository,
  usersRepository,
} from '@/features/users';
import type { Department, Role } from '@/domain/entities/user';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { TEAMS } from '@/features/planning';

const steps = [
  { key: 'general', labelKey: 'um.create.step.general', icon: User },
  { key: 'company', labelKey: 'um.create.step.company', icon: Building2 },
  { key: 'security', labelKey: 'um.create.step.security', icon: Shield },
  { key: 'review', labelKey: 'common.review' || 'Review', icon: Check },
];

export default function CreateUserPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    employeeCode: '',
    jobTitle: '',
    department: '',
    territoryCode: '',
    depotCode: '',
    preferredLanguage: 'km-KH',
    timeZoneId: 'Asia/Phnom_Penh',
    roles: [] as string[],
    isActive: true,
    forcePasswordReset: true,
    sendWelcomeEmail: true,
    avatarUrl: '',
  });

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [depts, rls] = await Promise.all([
          departmentsRepository.list(),
          rolesRepository.list(),
        ]);
        setDepartments(depts.items);
        setRoles(rls.items);
        if (rls.items.length > 0) {
          setForm((prev) => (prev.roles.length === 0 ? { ...prev, roles: [rls.items[0].name] } : prev));
        }
      } catch {
        // Options loading fallback
      }
    };
    loadOptions();
  }, []);

  const updateForm = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const generatePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const special = '!@#$%^&*';
    const all = upper + lower + nums + special;
    let pwd = '';
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += nums[Math.floor(Math.random() * nums.length)];
    pwd += special[Math.floor(Math.random() * special.length)];
    for (let i = 0; i < 6; i++) pwd += all[Math.floor(Math.random() * all.length)];
    const generated = pwd.split('').sort(() => Math.random() - 0.5).join('');
    updateForm('password', generated);
  };

  const generateEmployeeId = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    updateForm('employeeCode', `EMP${random}`);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateForm('avatarUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const passwordStrength = (pwd: string): { score: number; label: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = [
      t('um.create.passwordWeak') || 'Weak',
      t('um.create.passwordWeak') || 'Weak',
      t('um.create.passwordFair') || 'Fair',
      t('um.create.passwordGood') || 'Good',
      t('um.create.passwordStrong') || 'Strong',
      t('um.create.passwordStrong') || 'Strong',
    ];
    return { score, label: labels[score] };
  };

  const strength = passwordStrength(form.password);
  const strengthColors = ['bg-muted', 'bg-red-400', 'bg-amber-400', 'bg-sky-400', 'bg-green-400', 'bg-green-500'];

  const canProceed = () => {
    if (step === 0) return form.fullName.trim() && form.email.trim();
    if (step === 1) return form.roles.length > 0;
    if (step === 2) return form.password.length >= 8;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await usersRepository.create({
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber || null,
        password: form.password,
        employeeCode: form.employeeCode || null,
        jobTitle: form.jobTitle || null,
        department: form.department || null,
        territoryCode: form.territoryCode || null,
        depotCode: form.depotCode || null,
        preferredLanguage: form.preferredLanguage,
        timeZoneId: form.timeZoneId,
        roles: form.roles,
        isActive: form.isActive,
        avatarUrl: form.avatarUrl || null,
      });

      toast.success(t('validation.saved') || 'User created successfully.');
      router.push('/user-management/users');
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full h-11 px-4 rounded-xl bg-background/50 border border-surface text-[13px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all';
  const labelClass = 'text-[12px] font-medium text-muted-foreground mb-1.5 block';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button
        onClick={() => router.push('/user-management/users')}
        className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} /> {t('um.detail.back')}
      </button>

      <Card className="p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
        <h2 className="text-[18px] font-bold text-main mb-1">{t('um.create.title')}</h2>
        <p className="text-[12px] text-muted-foreground mb-6">{t('um.subtitle')}</p>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    i === step
                      ? 'gradient-primary text-white shadow-md shadow-blue-200/50 scale-105'
                      : i < step
                      ? 'bg-green-500 text-white'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check size={18} /> : <s.icon size={18} />}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    i === step ? 'text-primary font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {t(s.labelKey) || s.key}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-300 ${
                    i < step ? 'bg-green-500' : 'bg-muted/50'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="relative w-16 h-16 rounded-full bg-accent flex items-center justify-center overflow-hidden border border-surface">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={24} className="text-muted-foreground" />
                    )}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    <p className="font-semibold text-main">Profile picture</p>
                    <p>Click to upload an image</p>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    {t('um.create.fullName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.fullName}
                    onChange={(e) => updateForm('fullName', e.target.value)}
                    placeholder="Chan Dara"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t('um.create.email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="dara.chan@isigroup.com.kh"
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('um.create.phone')}</label>
                  <div className="phone-input-wrapper">
                    <style jsx global>{`
                      .phone-input-wrapper .PhoneInputInput {
                        border: none;
                        background: transparent;
                        outline: none;
                        font-size: 13px;
                        width: 100%;
                      }
                      .phone-input-wrapper .PhoneInput {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                      }
                      .phone-input-wrapper .PhoneInputCountry {
                        position: relative;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                      }
                      .phone-input-wrapper .PhoneInputCountryIcon {
                        width: 24px;
                        height: 16px;
                        overflow: hidden;
                        border-radius: 2px;
                        box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
                      }
                      .phone-input-wrapper .PhoneInputCountryIconImg {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                      }
                      .phone-input-wrapper .PhoneInputCountrySelect {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        opacity: 0;
                        cursor: pointer;
                        z-index: 10;
                      }
                      .phone-input-wrapper .PhoneInputCountrySelectArrow {
                        width: 5px;
                        height: 5px;
                        border-right: 1.5px solid #888;
                        border-bottom: 1.5px solid #888;
                        transform: rotate(45deg);
                        margin-left: 2px;
                      }
                    `}</style>
                    <PhoneInput
                      international
                      defaultCountry="KH"
                      className={inputClass}
                      value={form.phoneNumber}
                      onChange={(val) => updateForm('phoneNumber', val || '')}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t('um.col.employeeId')}</label>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={form.employeeCode}
                      onChange={(e) => updateForm('employeeCode', e.target.value)}
                      placeholder="EMP-0001"
                    />
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" type="button" className="rounded-xl px-4 h-11" onClick={generateEmployeeId}>
                        <RefreshCw size={15} />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    {t('um.create.role')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={inputClass}
                    value={form.roles[0] || ''}
                    onChange={(e) => updateForm('roles', [e.target.value])}
                  >
                    <option value="">— Select Role —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('um.create.department')}</label>
                  <select
                    className={inputClass}
                    value={form.department}
                    onChange={(e) => updateForm('department', e.target.value)}
                  >
                    <option value="">— Select Department —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('um.create.position')}</label>
                  <select
                    className={inputClass}
                    value={form.jobTitle}
                    onChange={(e) => updateForm('jobTitle', e.target.value)}
                  >
                    <option value="">— Select Position —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Territory Code</label>
                    <select
                      className={inputClass}
                      value={form.territoryCode}
                      onChange={(e) => updateForm('territoryCode', e.target.value)}
                    >
                      <option value="">— Select Territory —</option>
                      {TEAMS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Depot Code</label>
                    <input
                      className={inputClass}
                      value={form.depotCode}
                      onChange={(e) => updateForm('depotCode', e.target.value)}
                      placeholder="DEPOT-PP01"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    {t('um.create.tempPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={inputClass}
                      value={form.password}
                      onChange={(e) => updateForm('password', e.target.value)}
                      placeholder="••••••••••••"
                    />
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" type="button" className="rounded-xl px-4 h-11" onClick={generatePassword}>
                        <RefreshCw size={15} className="mr-1.5" /> {t('um.create.generate')}
                      </Button>
                    </motion.div>
                  </div>
                </div>
                {form.password && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-muted-foreground">{t('um.create.passwordStrength')}</span>
                      <span
                        className={`text-[11px] font-semibold ${
                          strength.score >= 4
                            ? 'text-green-600'
                            : strength.score >= 3
                            ? 'text-sky-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                            i < strength.score ? strengthColors[strength.score] : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground bg-accent/30 rounded-xl p-3">
                  {t('um.create.passwordPolicy')}
                </p>
                <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={form.forcePasswordReset}
                    onChange={(e) => updateForm('forcePasswordReset', e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-[12px] text-main">{t('um.create.requirePasswordChange')}</span>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-accent/30 border border-surface rounded-2xl p-5 space-y-3">
                  <h4 className="text-[13px] font-bold text-main flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" /> Summary & Review
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">{t('um.create.fullName')}</span>
                      <span className="font-semibold text-main">{form.fullName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">{t('um.create.email')}</span>
                      <span className="font-semibold text-main">{form.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">{t('um.create.role')}</span>
                      <span className="font-semibold text-main">{form.roles.join(', ') || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">{t('um.create.department')}</span>
                      <span className="font-semibold text-main">{form.department || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Employee Code</span>
                      <span className="font-semibold text-main font-mono">{form.employeeCode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Territory</span>
                      <span className="font-semibold text-main">{form.territoryCode || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-surface">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft size={16} className="mr-1.5" /> {t('um.create.previous')}
          </Button>
          {step < steps.length - 1 ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="rounded-xl gradient-primary text-white border-0 shadow-sm"
                disabled={!canProceed()}
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              >
                {t('um.create.next')} <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="rounded-xl gradient-primary text-white border-0 shadow-sm"
                disabled={saving || !canProceed()}
                onClick={handleCreate}
              >
                {saving ? '...' : t('um.create.create')}
              </Button>
            </motion.div>
          )}
        </div>
      </Card>
    </div>
  );
}
