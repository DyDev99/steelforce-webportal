'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { PageHeader, ActionButton } from '@/components/layout/page-header';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import { SummaryCard } from '@/components/shared/summary-card';
import { BulkActionBar, DataTable, type Column, type RowAction } from '@/components/tables/data-table';
import { MetaPill, ProgressBar, StatusPill, type Tone } from '@/components/shared/status-pill';
import { DrawerPanel, DrawerSection, FieldRow } from '@/components/shared/drawer-panel';
import { Modal } from '@/components/feedback/feedback';
import { SelectField, TextField } from '@/components/forms/form';
import { useDemoLoading } from '@/hooks/use-demo-loading';
import {
  STOCK_STATUSES,
  WAREHOUSES,
  categoryName,
  leafCategories,
  movementsFor,
  productById,
  stock,
  stockStatus,
  type StockRow,
} from '@/features/materials';
import { formatCurrency, formatDate } from '@/lib/formatting';
import {
  ArrowLeftRight,
  Boxes,
  CircleSlash,
  Eye,
  History,
  Layers,
  Lock,
  Package,
  PackageX,
  RotateCcw,
  Send,
  SlidersHorizontal,
  TrendingDown,
  Truck,
  Warehouse,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const STOCK_TONE: Record<string, Tone> = {
  'In Stock': 'positive',
  'Low Stock': 'warning',
  'Out of Stock': 'critical',
  'On Order': 'info',
};

const MOVEMENT_TONE: Record<string, Tone> = {
  Received: 'positive',
  Returned: 'positive',
  Reserved: 'info',
  Sold: 'accent',
  Transferred: 'warning',
  Adjusted: 'neutral',
};

const opts = (v: readonly string[]) => v.map((x) => ({ value: x, label: x }));

export default function InventoryPage() {
  const loading = useDemoLoading();
  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState('All');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<StockRow | null>(null);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [adjustment, setAdjustment] = useState({ quantity: '', reason: 'Cycle count correction' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stock.filter((row) => {
      const product = productById[row.productId];
      if (!product) return false;
      if (warehouse !== 'All' && row.warehouseId !== warehouse) return false;
      if (category !== 'All' && product.categoryId !== category) return false;
      if (status !== 'All' && stockStatus(row) !== status) return false;
      if (q && !`${product.name} ${product.code} ${product.brand}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, warehouse, category, status]);

  const metrics = useMemo(() => {
    const value = stock.reduce((sum, row) => {
      const p = productById[row.productId];
      return sum + (p ? p.cost * row.available : 0);
    }, 0);
    return {
      value,
      available: stock.reduce((sum, r) => sum + r.available, 0),
      reserved: stock.reduce((sum, r) => sum + r.reserved, 0),
      low: stock.filter((r) => stockStatus(r) === 'Low Stock').length,
      out: stock.filter((r) => stockStatus(r) === 'Out of Stock').length,
      incoming: stock.reduce((sum, r) => sum + r.onOrder, 0),
    };
  }, []);

  const activeFilters =
    [warehouse, category, status].filter((v) => v !== 'All').length + (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setWarehouse('All');
    setCategory('All');
    setStatus('All');
  };

  const columns: Column<StockRow>[] = [
    {
      key: 'product',
      header: 'Product',
      width: 'w-[240px]',
      sortValue: (r) => productById[r.productId]?.name ?? '',
      cell: (r) => {
        const p = productById[r.productId];
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `hsl(${p?.hue ?? 210}, 55%, 92%)` }}
            >
              <Package size={13} className="text-slate-600" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-main truncate">{p?.name}</span>
              <span className="block text-[10.5px] text-muted-foreground">{p?.code}</span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      secondary: true,
      sortValue: (r) => categoryName(productById[r.productId]?.categoryId ?? ''),
      cell: (r) => (
        <span className="truncate block text-muted-foreground">
          {categoryName(productById[r.productId]?.categoryId ?? '')}
        </span>
      ),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      sortValue: (r) => r.warehouseId,
      cell: (r) => (
        <span className="flex items-center gap-1.5 min-w-0">
          <Warehouse size={12} className="text-muted-foreground flex-shrink-0" />
          <span className="truncate">{WAREHOUSES.find((w) => w.id === r.warehouseId)?.name}</span>
        </span>
      ),
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      sortValue: (r) => r.available,
      cell: (r) => {
        const pct = r.reorderLevel ? Math.min(100, (r.available / (r.reorderLevel * 3)) * 100) : 0;
        const st = stockStatus(r);
        return (
          <span className="inline-flex flex-col items-end gap-1 w-full">
            <span className="font-semibold">{r.available.toLocaleString()}</span>
            <ProgressBar
              value={pct}
              className="w-16"
              tone={st === 'Out of Stock' ? 'critical' : st === 'Low Stock' ? 'warning' : 'positive'}
            />
          </span>
        );
      },
    },
    { key: 'reserved', header: 'Reserved', align: 'right', secondary: true, sortValue: (r) => r.reserved, cell: (r) => r.reserved.toLocaleString() },
    { key: 'onOrder', header: 'On order', align: 'right', secondary: true, sortValue: (r) => r.onOrder, cell: (r) => (r.onOrder ? r.onOrder.toLocaleString() : '—') },
    { key: 'reorder', header: 'Reorder level', align: 'right', secondary: true, sortValue: (r) => r.reorderLevel, cell: (r) => r.reorderLevel.toLocaleString() },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => stockStatus(r),
      cell: (r) => <StatusPill label={stockStatus(r)} tone={STOCK_TONE[stockStatus(r)]} />,
    },
    {
      key: 'updated',
      header: 'Last updated',
      secondary: true,
      sortValue: (r) => r.updatedAt,
      cell: (r) => <span className="text-muted-foreground">{formatDate(r.updatedAt)}</span>,
    },
  ];

  const actions: RowAction<StockRow>[] = [
    { label: 'View movement', icon: History, onSelect: setDetail },
    { label: 'Stock adjustment', icon: SlidersHorizontal, onSelect: (r) => { setAdjustment({ quantity: '', reason: 'Cycle count correction' }); setAdjusting(r); } },
    { label: 'Transfer stock', icon: ArrowLeftRight, divider: true, onSelect: (r) => toast.success('Transfer requested', { description: productById[r.productId]?.name }) },
    { label: 'Reserve stock', icon: Lock, onSelect: (r) => toast.success('Stock reserved', { description: productById[r.productId]?.name }) },
  ];

  const detailProduct = detail ? productById[detail.productId] : null;
  const movements = useMemo(() => (detail ? movementsFor(detail.id) : []), [detail]);

  return (
    <PageBody>
      <PageHeader
        title="Inventory"
        subtitle="Stock position across the depot network. Availability drives what sales can promise."
        actions={
          <>
            <ActionButton icon={ArrowLeftRight} onClick={() => toast.info('Transfer', { description: 'Move stock between depots.' })}>
              Transfer
            </ActionButton>
            <ActionButton icon={Send} tone="primary" onClick={() => toast.success('Export queued', { description: `${filtered.length} rows will be written to CSV.` })}>
              Export
            </ActionButton>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard index={0} label="Total stock value" value={Math.round(metrics.value / 1000)} prefix="$" suffix="k" icon={Boxes} color="#004A98" hint="At cost" />
        <SummaryCard index={1} label="Available" value={metrics.available} icon={Package} color="#238036" />
        <SummaryCard index={2} label="Reserved" value={metrics.reserved} icon={Lock} color="#4A4092" hint="Allocated to orders" />
        <SummaryCard index={3} label="Low stock" value={metrics.low} icon={TrendingDown} color="#B36211" />
        <SummaryCard index={4} label="Out of stock" value={metrics.out} icon={PackageX} color="#C33A50" />
        <SummaryCard index={5} label="Incoming" value={metrics.incoming} icon={Truck} color="#2571C2" hint="On purchase order" />
      </div>

      <PageToolbar>
        <ToolbarRow>
          <SearchBar value={search} onChange={setSearch} placeholder="Search product or code…" className="w-full sm:w-[270px]" />
          <FilterChip label="Warehouse" icon={Warehouse} value={warehouse} options={WAREHOUSES.map((w) => ({ value: w.id, label: w.name, hint: w.province }))} onChange={setWarehouse} allLabel="All warehouses" />
          <FilterChip label="Category" icon={Layers} value={category} options={leafCategories.map((c) => ({ value: c.id, label: c.name }))} onChange={setCategory} allLabel="All categories" searchable />
          <FilterChip label="Stock status" icon={CircleSlash} value={status} options={opts(STOCK_STATUSES)} onChange={setStatus} allLabel="Any status" />
          <ActionButton icon={TrendingDown} onClick={() => setStatus('Low Stock')}>
            Low stock only
          </ActionButton>
          {activeFilters > 0 && (
            <ActionButton icon={RotateCcw} onClick={clearFilters}>
              Clear ({activeFilters})
            </ActionButton>
          )}
        </ToolbarRow>
      </PageToolbar>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-main tabular-nums">{filtered.length}</span> stock records
        </p>
        <MetaPill label="Available excludes reserved quantities" />
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        actions={actions}
        loading={loading}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={setDetail}
        pageSize={14}
        caption="Inventory by product and warehouse"
        emptyTitle="No stock records match"
        emptyHint="Try another warehouse or clear the filters."
        emptyAction={<ActionButton icon={RotateCcw} onClick={clearFilters}>Clear filters</ActionButton>}
      />

      <BulkActionBar count={selected.length} onClear={() => setSelected([])}>
        <ActionButton icon={ArrowLeftRight} onClick={() => { toast.success(`Transfer requested for ${selected.length} items`); setSelected([]); }}>
          Transfer
        </ActionButton>
        <ActionButton icon={Lock} onClick={() => { toast.success(`${selected.length} items reserved`); setSelected([]); }}>
          Reserve
        </ActionButton>
      </BulkActionBar>

      {/* Movement history */}
      <DrawerPanel
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detailProduct?.name ?? ''}
        subtitle={`${detailProduct?.code ?? ''} · ${WAREHOUSES.find((w) => w.id === detail?.warehouseId)?.name ?? ''}`}
        icon={History}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <ActionButton icon={SlidersHorizontal} onClick={() => { if (detail) { setAdjusting(detail); setDetail(null); } }}>
              Adjust stock
            </ActionButton>
            <ActionButton icon={Eye} tone="primary" onClick={() => toast.info('Product record', { description: detailProduct?.name })}>
              View product
            </ActionButton>
          </div>
        }
      >
        {detail && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Available" value={detail.available.toLocaleString()} />
              <Tile label="Reserved" value={detail.reserved.toLocaleString()} />
              <Tile label="On order" value={detail.onOrder.toLocaleString()} />
            </div>

            <DrawerSection title="Position">
              <div className="rounded-card border border-surface px-3">
                <FieldRow label="Status" value={<StatusPill label={stockStatus(detail)} tone={STOCK_TONE[stockStatus(detail)]} />} />
                <FieldRow label="Reorder level" value={detail.reorderLevel.toLocaleString()} />
                <FieldRow label="Unit cost" value={formatCurrency(detailProduct?.cost ?? 0)} />
                <FieldRow label="Value at cost" value={formatCurrency((detailProduct?.cost ?? 0) * detail.available)} />
                <FieldRow label="Last updated" value={formatDate(detail.updatedAt)} />
              </div>
            </DrawerSection>

            <DrawerSection title="Movement history">
              <ol className="relative">
                {movements.map((m, i) => (
                  <li key={m.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-7 h-7 rounded-xl bg-muted/70 flex items-center justify-center">
                        <History size={11} className="text-muted-foreground" />
                      </div>
                      {i < movements.length - 1 && <div className="w-px flex-1 min-h-[14px] bg-border" />}
                    </div>
                    <div className="pb-4 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <StatusPill size="sm" label={m.type} tone={MOVEMENT_TONE[m.type]} />
                        <span
                          className={`text-[12px] font-bold tabular-nums ${
                            m.quantity > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {m.quantity > 0 ? '+' : ''}
                          {m.quantity.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-main mt-1">{m.note}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(m.date)} · {m.reference} · {m.user}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </DrawerSection>
          </>
        )}
      </DrawerPanel>

      <Modal
        open={adjusting !== null}
        onClose={() => setAdjusting(null)}
        title="Stock adjustment"
        subtitle={productById[adjusting?.productId ?? '']?.name}
        icon={SlidersHorizontal}
        footer={
          <div className="flex justify-end gap-2">
            <ActionButton onClick={() => setAdjusting(null)}>Cancel</ActionButton>
            <ActionButton
              tone="primary"
              onClick={() => {
                if (!adjustment.quantity || Number.isNaN(Number(adjustment.quantity))) {
                  toast.error('Enter a quantity');
                  return;
                }
                toast.success('Adjustment posted', {
                  description: `${adjustment.quantity} units · ${adjustment.reason}`,
                });
                setAdjusting(null);
              }}
            >
              Post adjustment
            </ActionButton>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Quantity change"
            required
            value={adjustment.quantity}
            onChange={(v) => setAdjustment((p) => ({ ...p, quantity: v }))}
            placeholder="-25 or 120"
            hint="Negative reduces stock"
          />
          <SelectField
            label="Reason"
            value={adjustment.reason}
            onChange={(v) => setAdjustment((p) => ({ ...p, reason: v }))}
            options={['Cycle count correction', 'Damaged stock', 'Goods received', 'Customer return', 'Write-off']}
          />
        </div>
      </Modal>
    </PageBody>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-surface p-2.5">
      <p className="text-[9.5px] text-muted-foreground mb-1">{label}</p>
      <p className="text-[13px] font-bold text-main tabular-nums truncate">{value}</p>
    </div>
  );
}
