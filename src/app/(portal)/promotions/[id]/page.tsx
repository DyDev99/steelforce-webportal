'use client';

/**
 * One promotion: its versions, and the decisions available on the open one.
 *
 * ## Approval is not activation
 *
 * Finance approving a version prices nothing. `activate` does, and it is a separate call
 * behind a separate permission. They are shown as two distinct buttons, never collapsed
 * into one "approve", because conflating them is how a discount nobody switched on gets
 * reported as being given.
 *
 * ## Four eyes
 *
 * The server refuses a signature from whoever submitted the version, and refuses one
 * person signing both stages. That refusal arrives as `Promotion.SelfApproval`, which is
 * surfaced verbatim rather than hidden — an approver seeing "you cannot approve a
 * promotion you submitted" learns the rule; a greyed-out button teaches nothing.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Layers,
  Send,
  ShieldCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageBody } from '@/components/layout/page-layout';
import { SectionHeader } from '@/components/layout/section-header';
import {
  BUSINESS_TYPE_LABELS,
  StatusChip,
  rewardLabel,
  usePromotion,
  usePromotionTransition,
  useSyncPromotionToSap,
  type PromotionVersionDto,
} from '@/features/promotions';

type Action = 'submit' | 'approve' | 'reject' | 'activate' | 'deactivate' | 'cancel';

/** Which actions make sense at each status, and which need a written reason. */
const ACTIONS: Record<string, { action: Action; label: string; tone: string; needsReason?: boolean }[]> = {
  Draft: [
    { action: 'submit', label: 'Submit for approval', tone: 'primary' },
    { action: 'cancel', label: 'Cancel', tone: 'ghost', needsReason: true },
  ],
  UnderCommercialReview: [
    { action: 'approve', label: 'Approve — commercial', tone: 'go' },
    { action: 'reject', label: 'Reject', tone: 'stop', needsReason: true },
  ],
  UnderFinanceReview: [
    { action: 'approve', label: 'Approve — finance', tone: 'go' },
    { action: 'reject', label: 'Reject', tone: 'stop', needsReason: true },
  ],
  Approved: [
    { action: 'activate', label: 'Activate', tone: 'go' },
    { action: 'cancel', label: 'Cancel', tone: 'ghost', needsReason: true },
  ],
  Live: [{ action: 'deactivate', label: 'Deactivate', tone: 'stop', needsReason: true }],
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const empty = value === null || value === undefined || value === '';

  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</dt>
      <dd className={`text-[13px] break-words ${empty ? 'text-muted-foreground' : 'text-main font-medium'}`}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}

function when(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'd MMM yyyy');
}

export default function PromotionDetailPage() {
  const params = useParams();
  const id = (params.id as string) ?? '';

  const { data: promotion, isLoading, isError, error } = usePromotion(id);
  const transition = usePromotionTransition(id);
  const sapSync = useSyncPromotionToSap(id);

  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState('');

  if (isLoading) {
    return (
      <PageBody>
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-[13px] py-16">
          <Loader2 size={15} className="animate-spin" /> Loading promotion…
        </div>
      </PageBody>
    );
  }

  if (isError || !promotion) {
    return (
      <PageBody>
        <Card className="p-6 rounded-card border-surface card-shadow">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-rose-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-main">This promotion could not be loaded.</p>
              <p className="text-[12px] text-muted-foreground mt-1 break-words">
                {error instanceof Error ? error.message : 'It may have been removed.'}
              </p>
              <Link href="/promotions" className="inline-flex items-center gap-1 text-[12px] text-primary mt-3">
                <ArrowLeft size={12} /> Back to the catalogue
              </Link>
            </div>
          </div>
        </Card>
      </PageBody>
    );
  }

  const versions = [...promotion.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const open: PromotionVersionDto | undefined =
    versions.find((version) => version.versionNumber === promotion.openVersionNumber) ?? versions[0];
  const live = versions.find((version) => version.versionNumber === promotion.liveVersionNumber);

  const available = open ? (ACTIONS[open.status] ?? []) : [];
  const chosen = available.find((entry) => entry.action === pending);
  const busy = transition.isPending || sapSync.isPending;

  const run = (action: Action, needsReason?: boolean) => {
    if (needsReason && reason.trim().length < 3) {
      setPending(action);

      return;
    }

    transition.mutate(
      { action, reason: needsReason ? reason.trim() : undefined },
      {
        onSuccess: () => {
          setPending(null);
          setReason('');
        },
      }
    );
  };

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/promotions"
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-main"
          >
            <ArrowLeft size={13} /> Catalogue
          </Link>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold text-main truncate">{open?.name ?? promotion.code}</h1>
            <p className="text-[12px] text-muted-foreground">
              {promotion.code} · {BUSINESS_TYPE_LABELS[promotion.businessType] ?? promotion.businessType}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {live && (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-emerald-700">
              <Zap size={12} /> v{live.versionNumber} live
            </span>
          )}
          <StatusChip status={open?.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {open && (
            <>
              <Card className="p-5 rounded-card border-surface card-shadow">
                <SectionHeader title={`Version ${open.versionNumber}`} icon={BadgePercent} />
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="Reward" value={rewardLabel(open)} />
                  <Field label="Priority" value={open.priority} />
                  <Field label="Stacking" value={open.stacking} />
                  <Field label="Valid from" value={when(open.validFrom)} />
                  <Field label="Valid to" value={when(open.validTo)} />
                  <Field label="Unit" value={open.unit} />
                </dl>
                {open.description && (
                  <p className="text-[12.5px] text-muted-foreground mt-4 pt-4 border-t border-surface">
                    {open.description}
                  </p>
                )}
              </Card>

              <Card className="p-5 rounded-card border-surface card-shadow">
                <SectionHeader title="Conditions" icon={Filter} count={open.conditions.length} />
                {open.conditions.length === 0 ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    None — this promotion applies to every line it is evaluated against.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {open.conditions.map((condition, index) => (
                      <li key={index} className="text-[12.5px] text-main">
                        <span className="font-medium">{condition.dimension}</span>{' '}
                        <span className="text-muted-foreground">{condition.operator}</span>{' '}
                        <span className="font-mono text-[11.5px]">[{condition.values.join(', ')}]</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {open.tiers.length > 0 && (
                <Card className="p-5 rounded-card border-surface card-shadow">
                  <SectionHeader title="Tiers" icon={Layers} count={open.tiers.length} />
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                        <th className="font-medium py-1">From</th>
                        <th className="font-medium py-1">To</th>
                        <th className="font-medium py-1">Reward</th>
                        <th className="font-medium py-1">Free qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {open.tiers.map((tier, index) => (
                        <tr key={index} className="text-[12.5px] text-main border-t border-surface">
                          <td className="py-1.5">{tier.fromQuantity ?? '—'}</td>
                          <td className="py-1.5">{tier.toQuantity ?? '∞'}</td>
                          <td className="py-1.5">{tier.rewardValue ?? '—'}</td>
                          <td className="py-1.5">{tier.freeQuantity ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}

              <Card className="p-5 rounded-card border-surface card-shadow">
                <SectionHeader title="Signatures" icon={ShieldCheck} count={open.approvals.length} />
                {open.approvals.length === 0 ? (
                  <p className="text-[12.5px] text-muted-foreground">Nobody has signed this version yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {open.approvals.map((approval, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        {approval.outcome === 'Approved' ? (
                          <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-rose-600 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-[12.5px] text-main">
                            {approval.stage} — {approval.outcome}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {when(approval.decidedAt)}
                            {approval.comment ? ` · ${approval.comment}` : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader title="Version history" icon={Clock} count={versions.length} />
            <ul className="space-y-1.5">
              {versions.map((version) => (
                <li key={version.id} className="flex items-center gap-2.5 py-1">
                  <span className="text-[12px] font-medium text-main w-10 flex-shrink-0">
                    v{version.versionNumber}
                  </span>
                  <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground truncate">
                    {version.name} · {rewardLabel(version)}
                  </span>
                  <StatusChip status={version.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4 order-first xl:order-none">
          <div className="xl:sticky xl:top-4 xl:z-10 space-y-4">
            <Card className="p-5 rounded-card border-surface card-shadow">
              <SectionHeader title="Decision" icon={CheckCircle2} />

              {available.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">
                  Nothing to decide — version {open?.versionNumber} is {open?.status}.
                </p>
              ) : (
                <>
                  {open?.status === 'Approved' && (
                    <p className="text-[12px] text-muted-foreground mb-3">
                      Approved is not live. Activating is what makes this discount price on a
                      quotation.
                    </p>
                  )}

                  {transition.isError && (
                    <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3 break-words">
                      {transition.error instanceof Error
                        ? transition.error.message
                        : 'The decision could not be saved.'}
                    </p>
                  )}

                  <div className="space-y-2">
                    {available.map((entry) => (
                      <button
                        key={entry.action}
                        onClick={() => run(entry.action, entry.needsReason)}
                        disabled={busy}
                        className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-medium disabled:opacity-50 ${
                          entry.tone === 'go'
                            ? 'bg-emerald-600 text-white'
                            : entry.tone === 'stop'
                              ? 'bg-rose-600 text-white'
                              : entry.tone === 'primary'
                                ? 'bg-primary text-white'
                                : 'border border-surface text-main'
                        }`}
                      >
                        {busy && pending === entry.action ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : entry.action === 'submit' ? (
                          <Send size={13} />
                        ) : null}
                        {entry.label}
                      </button>
                    ))}
                  </div>

                  {chosen?.needsReason && (
                    <div className="mt-3">
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={3}
                        placeholder="Why? This is stored on the record."
                        className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
                      />
                      <button
                        onClick={() => run(chosen.action, true)}
                        disabled={busy || reason.trim().length < 3}
                        className="mt-2 w-full px-3 py-2 rounded-xl bg-rose-600 text-white text-[12.5px] font-medium disabled:opacity-50"
                      >
                        Confirm {chosen.label.toLowerCase()}
                      </button>
                    </div>
                  )}
                </>
              )}
            </Card>

            <Card className="p-5 rounded-card border-surface card-shadow">
              <SectionHeader title="SAP" icon={Zap} />
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Condition type" value={open?.sapConditionType} />
                <Field label="Status" value={open?.sapStatus} />
                <Field label="Record" value={open?.sapConditionRecord} />
                <Field label="Required" value={open?.requiresSapSync ? 'Yes' : 'No'} />
              </dl>

              {open?.requiresSapSync && open.sapStatus !== 'Synced' && (
                <>
                  <p className="text-[11.5px] text-muted-foreground mt-3">
                    Queues the condition for the SD team. They record the condition record
                    number back against it — the integration is manual until the mechanism is
                    confirmed.
                  </p>
                  <button
                    onClick={() => sapSync.mutate()}
                    disabled={busy}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-surface text-[12.5px] font-medium text-main disabled:opacity-50"
                  >
                    {sapSync.isPending && <Loader2 size={13} className="animate-spin" />}
                    Queue for SAP
                  </button>
                </>
              )}

              {sapSync.isError && (
                <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-2 break-words">
                  {sapSync.error instanceof Error ? sapSync.error.message : 'The queue request failed.'}
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageBody>
  );
}
