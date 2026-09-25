'use client';

/**
 * Promotions & Discounts — the depot agreement pipeline.
 *
 * ## Why this screen was rebuilt rather than wired up
 *
 * It previously offered four tabs — Line Discounts, Free Goods Ladders, Depot Campaigns,
 * Invoice Schemes — with a "Create Configuration" button. **None of those exist in the
 * platform.** There is no campaign entity, no free-goods ladder and no invoice scheme;
 * there is no endpoint to create any of them, and nothing to store them in. The screen
 * could not be connected to a backend because it described a different product.
 *
 * What the backend has is a four-signature agreement pipeline, and the tabs now follow
 * its four real stages, in the order work actually moves through them:
 *
 *   Approvals  →  Terms  →  SAP queue  →  Settings
 *
 * ## The distinction the layout exists to protect
 *
 * **Approval does not make a rate chargeable.** The fourth signature creates terms in
 * state `Approved` and queues SAP condition work; the term becomes `Effective` — and is
 * only then deducted from quotations — when somebody closes that task with the condition
 * record SAP actually holds. Those are separate events, often days apart. A single
 * "approved" badge covering both is how a depot ends up not receiving a discount four
 * people signed, so `Approved` is deliberately styled as in-flight, not as done.
 */

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Info,
  Loader2,
  Percent,
  Server,
  Settings2,
  ShieldCheck,
  Plus,
  Send,
  Undo2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { NewRequestDialog } from './new-request-dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  OUTCOMES_NEEDING_COMMENT,
  useSubmitAgreement,
  useWithdrawAgreement,
  STEP_LABELS,
  STEP_OUTCOMES,
  useActOnStep,
  useAgreementRequest,
  useAgreementRequests,
  useAgreementTerms,
  useCategoryMappings,
  useCompleteSapTask,
  usePickupRules,
  useSapTasks,
  type AgreementOutcome,
} from '@/features/promotions';

type TabKey = 'approvals' | 'terms' | 'sap' | 'settings';

const TABS: { key: TabKey; label: string; icon: typeof Percent }[] = [
  { key: 'approvals', label: 'Approvals', icon: ClipboardCheck },
  { key: 'terms', label: 'Terms', icon: Percent },
  { key: 'sap', label: 'SAP queue', icon: Server },
  { key: 'settings', label: 'Settings', icon: Settings2 },
];

/**
 * Status tones.
 *
 * `Approved` on a **request** is terminal and green — the chain is finished. `Approved`
 * on a **term** is amber, because the rate is signed but not yet chargeable. Same word,
 * two meanings, and the colour is what stops them being read as one.
 */
const REQUEST_TONE: Record<string, string> = {
  Draft: 'bg-gray-50 text-gray-500 border-gray-100',
  AwaitingPrepare: 'bg-blue-50 text-blue-600 border-blue-100',
  AwaitingVerify: 'bg-blue-50 text-blue-600 border-blue-100',
  AwaitingConsultant: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  AwaitingFinal: 'bg-violet-50 text-violet-600 border-violet-100',
  Approved: 'bg-green-50 text-green-600 border-green-100',
  Returned: 'bg-amber-50 text-amber-600 border-amber-100',
  Rejected: 'bg-red-50 text-red-600 border-red-100',
  Withdrawn: 'bg-gray-50 text-gray-400 border-gray-100',
};

const TERM_TONE: Record<string, string> = {
  Approved: 'bg-amber-50 text-amber-700 border-amber-100',
  Effective: 'bg-green-50 text-green-600 border-green-100',
  SapMismatch: 'bg-red-50 text-red-600 border-red-100',
  Superseded: 'bg-gray-50 text-gray-500 border-gray-100',
  Expired: 'bg-gray-50 text-gray-400 border-gray-100',
  Terminated: 'bg-gray-50 text-gray-400 border-gray-100',
};

/** Splits a PascalCase status into words, so `AwaitingVerify` reads as a phrase. */
const humanise = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2');

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-600 border whitespace-nowrap ${tone}`}
      style={{ fontWeight: 600 }}
    >
      {label}
    </span>
  );
}

function Panel({
  title,
  hint,
  icon: Icon,
  children,
}: {
  title: string;
  hint?: string;
  icon: typeof Percent;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-gray-100 card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
      <div className="flex items-start gap-2.5 px-5 py-4 border-b border-gray-100">
        <Icon size={16} className="text-gray-400 mt-0.5" />
        <div>
          <h2 className="text-[13.5px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
            {title}
          </h2>
          {hint && <p className="text-[11.5px] text-gray-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function StateBlock({
  loading,
  error,
  empty,
  emptyTitle,
  emptyHint,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyTitle: string;
  emptyHint?: string;
}) {
  if (loading) {
    return (
      <div className="py-14 flex flex-col items-center text-gray-400">
        <Loader2 className="animate-spin mb-2" size={20} />
        <span className="text-[12px]">Loading…</span>
      </div>
    );
  }

  if (error) {
    return <div className="py-14 text-center text-[13px] text-red-500">Failed to load. Please try again.</div>;
  }

  if (empty) {
    return (
      <div className="py-14 text-center">
        <p className="text-[13px] text-gray-500">{emptyTitle}</p>
        {emptyHint && <p className="text-[11.5px] text-gray-400 mt-1 max-w-md mx-auto">{emptyHint}</p>}
      </div>
    );
  }

  return null;
}

export default function PromotionsPage() {
  const [tab, setTab] = useState<TabKey>('approvals');
  const [creating, setCreating] = useState(false);

  const requests = useAgreementRequests({ pageSize: 50 });
  const terms = useAgreementTerms({ pageSize: 50 });
  const sapTasks = useSapTasks();
  const mappings = useCategoryMappings();

  // The programme's precondition. A rate is agreed per category and SAP files it against
  // a material price group; without that join nothing can be filed, so an empty mapping
  // table is the single most useful thing this screen can tell somebody.
  const mappingsMissing = !mappings.isLoading && !mappings.error && (mappings.data?.length ?? 0) === 0;

  const counts = useMemo(
    () => ({
      approvals: requests.data?.totalCount,
      terms: terms.data?.totalCount,
      sap: sapTasks.data?.length,
      settings: mappings.data?.length,
    }),
    [requests.data, terms.data, sapTasks.data, mappings.data]
  );

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Promotions &amp; Discounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Depot agreements: four signatures, the terms they produce, and the SAP work that makes them chargeable.
          </p>
        </div>
        <Button size="sm" className="rounded-xl text-[12.5px] h-10 px-4" onClick={() => setCreating(true)}>
          <Plus size={15} className="mr-1.5" /> New request
        </Button>
      </div>

      {creating && (
        <NewRequestDialog
          onClose={() => setCreating(false)}
          onCreated={() => setTab('approvals')}
        />
      )}

      {mappingsMissing && (
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
          <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-gray-700 leading-relaxed">
            <span className="font-600" style={{ fontWeight: 600 }}>
              No category mappings are configured.
            </span>{' '}
            A rate is agreed per category, and SAP files it against a material price group — that table is the
            join, and it ships empty because only the business can say which price group is which category.
            Until it is filled, an approved agreement cannot be turned into a condition record.
          </p>
        </div>
      )}

      {/* Tabs, in the order work moves through the pipeline. */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-50 w-fit">
        {TABS.map((t) => {
          const count = counts[t.key];
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-600 transition-colors ${
                active ? 'bg-white text-gray-900 card-shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontWeight: 600 }}
            >
              <t.icon size={14} />
              {t.label}
              {count != null && <span className="text-[11px] text-gray-400">{count}</span>}
            </button>
          );
        })}
      </div>

      {tab === 'approvals' && <ApprovalsTab />}
      {tab === 'terms' && <TermsTab />}
      {tab === 'sap' && <SapQueueTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// --- Approvals ---------------------------------------------------------------

function ApprovalsTab() {
  const [step, setStep] = useState<number | undefined>(undefined);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, error } = useAgreementRequests({ step, pageSize: 50 });
  const rows = data?.items ?? [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
      <div className="xl:col-span-3 space-y-3">
        {/* "What is waiting for me" — the step filter is the inbox's whole purpose. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStep(undefined)}
            className={`px-3 py-1.5 rounded-xl text-[11.5px] transition-colors ${
              step === undefined ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            All steps
          </button>
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`px-3 py-1.5 rounded-xl text-[11.5px] transition-colors ${
                step === s ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {s}. {STEP_LABELS[s]}
            </button>
          ))}
        </div>

        <Panel
          title="Approvals inbox"
          hint="Four signatures in order. The requester never signs, and nobody signs twice."
          icon={ClipboardCheck}
        >
          <StateBlock
            loading={isLoading}
            error={error}
            empty={rows.length === 0}
            emptyTitle="No agreement requests"
            emptyHint="Requests are raised against a depot from the field application; none have been submitted yet."
          />

          {!isLoading && !error && rows.length > 0 && (
            <div className="divide-y divide-gray-50">
              {rows.map((row) => (
                <button
                  key={row.id}
                  onClick={() => setOpenId(row.id === openId ? null : row.id)}
                  className={`w-full text-left px-5 py-3 hover:bg-gray-50/70 transition-colors ${
                    openId === row.id ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>
                        {row.requestNumber}
                        {row.revision > 1 && (
                          <span className="ml-1.5 text-[10px] text-gray-400">rev {row.revision}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {row.customerName || row.customerId} · {row.linesCount} line
                        {row.linesCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {row.currentStep != null && (
                        <span className="text-[10.5px] text-gray-400">
                          step {row.currentStep} · {STEP_LABELS[row.currentStep] ?? '—'}
                        </span>
                      )}
                      <Pill label={humanise(row.status)} tone={REQUEST_TONE[row.status] ?? REQUEST_TONE.Draft} />
                    </div>
                  </div>
                  {row.slaDueAt && (
                    <p className="text-[10.5px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={10} /> due {format(new Date(row.slaDueAt), 'd MMM HH:mm')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="xl:col-span-2">
        {openId ? (
          <RequestDetail requestId={openId} />
        ) : (
          <Panel title="Request detail" icon={FileText}>
            <div className="py-14 text-center text-[12px] text-gray-400">
              Select a request to see its lines and signature trail.
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function RequestDetail({ requestId }: { requestId: string }) {
  const { data, isLoading, error } = useAgreementRequest(requestId);
  const act = useActOnStep();
  const [comment, setComment] = useState('');

  const submitDraft = useSubmitAgreement();
  const withdraw = useWithdrawAgreement();

  const step = data?.currentStep ?? null;
  const allowed = step ? (STEP_OUTCOMES[step] ?? []) : [];

  // The author's own controls, distinct from an approver's. A draft has collected no
  // signatures, so submitting and retracting are not decisions about somebody else's
  // proposal — which is why they sit apart from the outcome buttons.
  const isDraft = data?.status === 'Draft' || data?.status === 'Returned';

  const submit = (outcome: AgreementOutcome) => {
    if (!data || step == null) return;

    // Mirrors the server rule so the refusal is immediate and explains itself, rather
    // than arriving as a 400 after a round trip.
    if (OUTCOMES_NEEDING_COMMENT.includes(outcome) && !comment.trim()) {
      toast.error('A comment is required', {
        description: `Say why before you ${outcome} — the next person only sees what you write here.`,
      });
      return;
    }

    act
      .mutateAsync({ requestId, stepOrder: step, outcome, comment: comment.trim() || undefined })
      .then(() => {
        setComment('');
        toast.success(`Recorded: ${outcome}`);
      })
      .catch((err: unknown) =>
        toast.error('The decision was not recorded', {
          description: err instanceof Error ? err.message : 'The server refused it.',
        })
      );
  };

  return (
    <Panel title="Request detail" icon={FileText}>
      <StateBlock loading={isLoading} error={error} empty={false} emptyTitle="" />

      {data && (
        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
                {data.requestNumber}
              </p>
              <Pill label={humanise(data.status)} tone={REQUEST_TONE[data.status] ?? REQUEST_TONE.Draft} />
            </div>
            <p className="text-[11.5px] text-gray-500 mt-0.5">{data.customerName || data.customerId}</p>
            {data.remarks && <p className="text-[11.5px] text-gray-600 mt-2 italic">“{data.remarks}”</p>}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">Lines</p>
            {data.lines.length === 0 ? (
              <p className="text-[11.5px] text-gray-300">No lines on this request</p>
            ) : (
              <div className="space-y-1.5">
                {data.lines.map((line) => (
                  <div key={line.id} className="flex items-start justify-between gap-2 text-[11.5px]">
                    <span className="text-gray-700 min-w-0 truncate">
                      {line.categoryName}
                      <span className="text-gray-400"> · {humanise(line.nature)}</span>
                    </span>
                    <span className="text-gray-900 font-600 flex-shrink-0" style={{ fontWeight: 600 }}>
                      {/* Tiered lines have no single percent; showing 0% would state a
                          rate nobody agreed. */}
                      {line.percent != null
                        ? `${line.percent}%`
                        : line.tiers.length > 0
                          ? `${line.tiers.length} tiers`
                          : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">Signature trail</p>
            <div className="space-y-2">
              {data.timeline.map((entry) => (
                <div key={`${entry.stepOrder}-${entry.status}-${entry.actedAt ?? 'open'}`} className="flex gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">
                    {entry.status === 'Completed' ? (
                      <CheckCircle2 size={13} className="text-green-500" />
                    ) : entry.status === 'Rejected' ? (
                      <XCircle size={13} className="text-red-500" />
                    ) : entry.status === 'Returned' ? (
                      <AlertTriangle size={13} className="text-amber-500" />
                    ) : entry.status === 'Pending' ? (
                      <Clock size={13} className="text-blue-500" />
                    ) : (
                      <Clock size={13} className="text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] text-gray-700">
                      {entry.stepOrder}. {entry.label}
                      <span className="text-gray-400"> · {humanise(entry.status)}</span>
                    </p>
                    {entry.actorName && <p className="text-[10.5px] text-gray-400">{entry.actorName}</p>}
                    {entry.comment && <p className="text-[11px] text-gray-600 mt-0.5">“{entry.comment}”</p>}
                    {entry.actedAt && (
                      <p className="text-[10px] text-gray-400">
                        {format(new Date(entry.actedAt), 'd MMM yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isDraft && (
            <div className="pt-3 border-t border-gray-50 space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">
                {data.status === 'Returned' ? 'Returned to you' : 'Draft'} · not yet signed by anyone
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-xl text-[12px]"
                  disabled={submitDraft.isPending || data.lines.length === 0}
                  onClick={() =>
                    submitDraft
                      .mutateAsync(requestId)
                      .then(() => toast.success('Submitted for approval'))
                      .catch((err: unknown) =>
                        toast.error('Could not submit', {
                          description: err instanceof Error ? err.message : 'The server refused it.',
                        })
                      )
                  }
                >
                  {submitDraft.isPending ? <Loader2 size={13} className="animate-spin" /> : (<><Send size={13} className="mr-1" /> Submit for approval</>)}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-[12px]"
                  disabled={withdraw.isPending}
                  onClick={() =>
                    withdraw
                      .mutateAsync(requestId)
                      .then(() => toast.success('Request withdrawn'))
                      .catch((err: unknown) =>
                        toast.error('Could not withdraw', {
                          description: err instanceof Error ? err.message : 'The server refused it.',
                        })
                      )
                  }
                >
                  <Undo2 size={13} className="mr-1" /> Withdraw
                </Button>
              </div>
              {data.lines.length === 0 && (
                <p className="text-[10.5px] text-gray-400">Add at least one line before submitting.</p>
              )}
              <p className="text-[10.5px] text-gray-400">
                Submitting is refused if the depot already holds an effective rate for a category over these
                dates, or another request for the same scope is already in the chain.
              </p>
            </div>
          )}

          {allowed.length > 0 && (
            <div className="pt-3 border-t border-gray-50 space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">
                Your decision · step {step} · {STEP_LABELS[step!] ?? ''}
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Comment (required to return or reject)"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex flex-wrap gap-2">
                {allowed.map((outcome) => (
                  <Button
                    key={outcome}
                    size="sm"
                    variant={outcome === 'reject' ? 'destructive' : outcome === 'return' ? 'outline' : 'default'}
                    className="rounded-xl text-[12px] capitalize"
                    disabled={act.isPending}
                    onClick={() => submit(outcome)}
                  >
                    {act.isPending ? <Loader2 size={13} className="animate-spin" /> : outcome}
                  </Button>
                ))}
              </div>
              {/* The server also enforces four-eyes, which the browser cannot see. */}
              <p className="text-[10.5px] text-gray-400">
                The server checks your permission for this step and that you have not already signed this
                revision, so an enabled button is not a guarantee.
              </p>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

// --- Terms -------------------------------------------------------------------

function TermsTab() {
  const { data, isLoading, error } = useAgreementTerms({ pageSize: 50 });
  const rows = data?.items ?? [];

  return (
    <Panel
      title="Terms matrix"
      hint="Every approved rate and its state. A term sitting in Approved is signed but not yet chargeable."
      icon={Percent}
    >
      <StateBlock
        loading={isLoading}
        error={error}
        empty={rows.length === 0}
        emptyTitle="No terms yet"
        emptyHint="Terms are created by the fourth approval on an agreement request."
      />

      {!isLoading && !error && rows.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Term', 'Depot', 'Category', 'Rate', 'Valid', 'State', 'SAP record'].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-[11px] font-600 text-gray-400"
                  style={{ fontWeight: 600 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-5 py-3 text-[12px] font-mono text-gray-600">{t.termNumber}</td>
                <td className="px-5 py-3 text-[12px] text-gray-900">{t.customerName || t.customerId}</td>
                <td className="px-5 py-3 text-[12px] text-gray-600">{t.categoryCode}</td>
                <td className="px-5 py-3 text-[12px] text-gray-900">
                  {t.percent != null ? `${t.percent}%` : t.tiers.length > 0 ? `${t.tiers.length} tiers` : '—'}
                </td>
                <td className="px-5 py-3 text-[11.5px] text-gray-500">
                  {format(new Date(t.validFrom), 'd MMM yy')}
                  {t.validTo ? ` – ${format(new Date(t.validTo), 'd MMM yy')}` : ' – open'}
                </td>
                <td className="px-5 py-3">
                  <Pill label={humanise(t.state)} tone={TERM_TONE[t.state] ?? TERM_TONE.Approved} />
                </td>
                <td className="px-5 py-3 text-[11.5px] text-gray-500 font-mono">
                  {t.sapConditionRecord || <span className="text-gray-300 font-sans">not filed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

// --- SAP queue ---------------------------------------------------------------

function SapQueueTab() {
  const { data, isLoading, error } = useSapTasks();
  const complete = useCompleteSapTask();
  const [openId, setOpenId] = useState<string | null>(null);
  const [record, setRecord] = useState('');
  const [notes, setNotes] = useState('');

  const rows = data ?? [];

  const submit = (taskId: string) => {
    if (!record.trim()) {
      toast.error('The condition record number is required', {
        description: 'It is the evidence that SAP holds the rate — a confirmation without one asserts nothing.',
      });
      return;
    }

    complete
      .mutateAsync({ taskId, conditionRecord: record.trim(), notes: notes.trim() || undefined })
      .then(() => {
        setRecord('');
        setNotes('');
        setOpenId(null);
        toast.success('Task closed — the term is now effective');
      })
      .catch((err: unknown) =>
        toast.error('Could not close the task', {
          description: err instanceof Error ? err.message : 'The server refused it.',
        })
      );
  };

  return (
    <Panel
      title="SAP condition queue"
      hint="Closing a task is what makes a term chargeable. This queue answers “why is this depot not getting its discount?”"
      icon={Server}
    >
      <StateBlock
        loading={isLoading}
        error={error}
        empty={rows.length === 0}
        emptyTitle="Nothing outstanding"
        emptyHint="Condition work is queued by the fourth approval on an agreement request."
      />

      {!isLoading && !error && rows.length > 0 && (
        <div className="divide-y divide-gray-50">
          {rows.map((task) => (
            <div key={task.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>
                    {task.termNumber}
                    <span className="ml-1.5 text-[11px] text-gray-400">{humanise(task.taskType)}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {task.customerName} · {task.categoryCode}
                    {task.percent != null ? ` · ${task.percent}%` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10.5px] text-gray-400 flex items-center gap-1">
                    <Clock size={10} /> due {format(new Date(task.dueAt), 'd MMM')}
                  </span>
                  <Pill label={humanise(task.status)} tone="bg-blue-50 text-blue-600 border-blue-100" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-[11.5px]"
                    onClick={() => setOpenId(openId === task.id ? null : task.id)}
                  >
                    {openId === task.id ? 'Cancel' : 'Mark done'}
                  </Button>
                </div>
              </div>

              {openId === task.id && (
                <div className="mt-3 p-3 rounded-xl bg-gray-50 space-y-2">
                  <input
                    value={record}
                    onChange={(e) => setRecord(e.target.value)}
                    placeholder="SAP condition record number (required)"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10.5px] text-gray-400">
                      An attestation standing in for a machine check — record what SAP actually holds.
                    </p>
                    <Button
                      size="sm"
                      className="rounded-xl text-[12px]"
                      disabled={complete.isPending}
                      onClick={() => submit(task.id)}
                    >
                      {complete.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Confirm'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// --- Settings ----------------------------------------------------------------

function SettingsTab() {
  const mappings = useCategoryMappings();
  const rules = usePickupRules();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Panel
        title="Category mappings"
        hint="Joins a discount category to the SAP material price group it is filed against."
        icon={ShieldCheck}
      >
        <StateBlock
          loading={mappings.isLoading}
          error={mappings.error}
          empty={(mappings.data?.length ?? 0) === 0}
          emptyTitle="No mappings configured"
          emptyHint="This table ships empty on purpose — only the business can say which price group is which category."
        />

        {(mappings.data?.length ?? 0) > 0 && (
          <div className="divide-y divide-gray-50">
            {mappings.data!.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-gray-900">
                    {m.categoryCode} <span className="text-gray-400">→</span>{' '}
                    <span className="font-mono">{m.sapMaterialPriceGroup}</span>
                  </p>
                  {m.description && <p className="text-[11px] text-gray-400 truncate">{m.description}</p>}
                </div>
                <Pill
                  label={m.isActive ? 'Active' : 'Inactive'}
                  tone={m.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Pickup rules" hint="Standing rates applied without an agreement request." icon={Info}>
        <StateBlock
          loading={rules.isLoading}
          error={rules.error}
          empty={(rules.data?.length ?? 0) === 0}
          emptyTitle="No pickup rules"
          emptyHint="None have been configured."
        />

        {(rules.data?.length ?? 0) > 0 && (
          <div className="divide-y divide-gray-50">
            {rules.data!.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-gray-900 truncate">{r.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {[r.regionCode, r.categoryCode].filter(Boolean).join(' · ') || 'All regions and categories'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.percent != null && (
                    <span className="text-[12px] font-600 text-gray-900" style={{ fontWeight: 600 }}>
                      {r.percent}%
                    </span>
                  )}
                  <Pill
                    label={r.isActive ? 'Active' : 'Inactive'}
                    tone={r.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
