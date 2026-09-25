'use client';

/**
 * Creates a promotion.
 *
 * Deliberately the *shape* of a promotion and nothing more — code, type, name, validity,
 * reward, and one condition row per rule. The seven business types differ only in which
 * dimensions they condition on, so the form stays generic and the dimension list is what
 * changes; inventing a bespoke form per type would be seven things to keep in step with
 * one server contract.
 *
 * It creates a **Draft**. Nothing here can make a discount live: submit, the two
 * signatures and activation are separate acts with separate permissions, and each is
 * taken on the promotion's own page.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  BUSINESS_TYPE_LABELS,
  PROMOTION_BUSINESS_TYPES,
  useCreatePromotion,
} from '@/features/promotions';

/** The attributes a condition can test. Mirrors the engine's dimensions. */
const DIMENSIONS = [
  'PaymentMethod',
  'PickupType',
  'PickupLocation',
  'Product',
  'ProductGroup',
  'Customer',
  'CustomerGroup',
  'Province',
  'Region',
  'SalesOrganization',
  'DistributionChannel',
] as const;

const OPERATORS = ['In', 'NotIn'] as const;

interface ConditionRow {
  dimension: string;
  operator: string;
  values: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yearEnd(): string {
  return `${new Date().getFullYear()}-12-31`;
}

export function CreatePromotionDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const create = useCreatePromotion();

  const [code, setCode] = useState('');
  const [businessType, setBusinessType] = useState<string>(PROMOTION_BUSINESS_TYPES[2]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validFrom, setValidFrom] = useState(today());
  const [validTo, setValidTo] = useState(yearEnd());
  const [rewardType, setRewardType] = useState('Percentage');
  const [rewardValue, setRewardValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [priority, setPriority] = useState('10');
  const [requiresSapSync, setRequiresSapSync] = useState(true);
  const [conditions, setConditions] = useState<ConditionRow[]>([
    { dimension: 'PaymentMethod', operator: 'In', values: '' },
  ]);

  const valid =
    code.trim().length > 0 &&
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    validFrom.length === 10 &&
    validTo.length === 10;

  const submit = () => {
    create.mutate(
      {
        code: code.trim().toUpperCase(),
        businessType,
        name: name.trim(),
        description: description.trim(),
        validFrom,
        validTo,
        priority: Number(priority) || 0,
        rewardType,
        rewardValue: rewardValue === '' ? null : Number(rewardValue),
        // Only meaningful for a per-unit amount; a percentage has no currency.
        currency: rewardType === 'FixedAmount' ? currency : null,
        requiresSapSync,
        conditions: conditions
          .filter((row) => row.values.trim().length > 0)
          .map((row) => ({
            dimension: row.dimension,
            operator: row.operator,
            // Comma-separated on screen because a condition is usually two or three
            // codes; splitting here keeps the server contract a list.
            values: row.values
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
          })),
      },
      {
        onSuccess: (created) => {
          onClose();
          router.push(`/promotions/${created.id}`);
        },
      }
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New promotion"
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl rounded-card bg-background border border-surface shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface">
          <div>
            <p className="text-[13.5px] font-semibold text-main">New promotion</p>
            <p className="text-[11.5px] text-muted-foreground">
              Saved as a draft. Approval and activation happen afterwards.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-main">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Code">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="COD-001"
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent uppercase"
              />
            </Field>
            <Field label="Type">
              <select
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              >
                {PROMOTION_BUSINESS_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {BUSINESS_TYPE_LABELS[value] ?? value}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Cash on delivery 1%"
              className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Who gets this and why. An approver reads it."
              className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
            />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Valid from">
              <input
                type="date"
                value={validFrom}
                onChange={(event) => setValidFrom(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              />
            </Field>
            <Field label="Valid to">
              <input
                type="date"
                value={validTo}
                onChange={(event) => setValidTo(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              />
            </Field>
            <Field label="Priority">
              <input
                type="number"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              />
            </Field>
            <Field label="Reward">
              <select
                value={rewardType}
                onChange={(event) => setRewardType(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              >
                <option value="Percentage">Percentage</option>
                <option value="FixedAmount">Fixed amount</option>
                <option value="FreeItem">Free item</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={rewardType === 'Percentage' ? 'Percent' : 'Amount per unit'}>
              <input
                type="number"
                step="0.01"
                value={rewardValue}
                onChange={(event) => setRewardValue(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              />
            </Field>
            {rewardType === 'FixedAmount' && (
              <Field label="Currency">
                <input
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
                />
              </Field>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Conditions</span>
              <button
                onClick={() =>
                  setConditions((rows) => [...rows, { dimension: 'Product', operator: 'In', values: '' }])
                }
                className="inline-flex items-center gap-1 text-[11.5px] text-primary"
              >
                <Plus size={11} /> Add
              </button>
            </div>

            <div className="space-y-2">
              {conditions.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={row.dimension}
                    onChange={(event) =>
                      setConditions((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, dimension: event.target.value } : r))
                      )
                    }
                    className="text-[12px] rounded-xl border border-surface px-2 py-2 bg-transparent"
                  >
                    {DIMENSIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.operator}
                    onChange={(event) =>
                      setConditions((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, operator: event.target.value } : r))
                      )
                    }
                    className="text-[12px] rounded-xl border border-surface px-2 py-2 bg-transparent"
                  >
                    {OPERATORS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <input
                    value={row.values}
                    onChange={(event) =>
                      setConditions((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, values: event.target.value } : r))
                      )
                    }
                    placeholder="TCOD, TC30 — comma separated"
                    className="flex-1 min-w-0 text-[12px] rounded-xl border border-surface px-3 py-2 bg-transparent"
                  />
                  <button
                    onClick={() => setConditions((rows) => rows.filter((_, i) => i !== index))}
                    aria-label="Remove condition"
                    className="text-muted-foreground hover:text-rose-600 px-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={requiresSapSync}
              onChange={(event) => setRequiresSapSync(event.target.checked)}
            />
            Needs a SAP condition record before it can go live
          </label>

          {create.isError && (
            <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 break-words">
              {create.error instanceof Error ? create.error.message : 'The promotion could not be created.'}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-surface">
          <button onClick={onClose} className="px-3 py-2 rounded-xl border border-surface text-[12.5px] text-main">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid || create.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-[12.5px] font-medium disabled:opacity-50"
          >
            {create.isPending && <Loader2 size={13} className="animate-spin" />}
            Create draft
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
