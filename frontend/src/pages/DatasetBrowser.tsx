import { useMemo, useDeferredValue, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDatasets, filterDatasets } from '../lib/useDatasets';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown';
import type { Dataset } from '../data/types';

const CHIP_CLASSES =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

function DatasetCard({ d }: { d: Dataset }) {
  return (
    <Link to={`/datasets/${encodeURIComponent(d.name)}`} className="block no-underline">
      <article className="rounded-card border border-border bg-white p-5 shadow-card transition hover:border-accent/30 hover:shadow-card-hover">
        <h2 className="text-lg font-bold text-ink">
          <code className="rounded bg-border/80 px-1.5 py-0.5 text-sm font-medium">{d.name}</code>
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {d.machine_learning_task && (
            <span className={`${CHIP_CLASSES} bg-accent/10 text-accent`}>
              {d.machine_learning_task.replace(/_/g, ' ')}
            </span>
          )}
          {d.agricultural_task && (
            <span className={`${CHIP_CLASSES} bg-ink/5 text-ink`}>
              {d.agricultural_task.replace(/_/g, ' ')}
            </span>
          )}
          {d.platform && (
            <span className={`${CHIP_CLASSES} border border-border bg-paper text-muted`}>
              {d.platform}
            </span>
          )}
          {d.num_images != null && (
            <span className={`${CHIP_CLASSES} tabular-nums text-muted`}>
              {d.num_images >= 1000
                ? `${(d.num_images / 1000).toFixed(1)}k`
                : d.num_images.toLocaleString()}{' '}
              images
            </span>
          )}
        </div>
        {d.location && (
          <p className="mt-2 text-sm text-muted">{d.location}</p>
        )}
        {d.documentation && (
          <a
            href={d.documentation}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center text-sm font-medium text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Documentation →
          </a>
        )}
      </article>
    </Link>
  );
}

function unique<T>(arr: (T | null | undefined)[], sort = true): T[] {
  const set = new Set(arr.filter((x): x is T => x != null && x !== ''));
  const out = Array.from(set);
  if (sort) out.sort((a, b) => String(a).localeCompare(String(b)));
  return out;
}

export function DatasetBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error } = useDatasets();

  const qParam = searchParams.get('q') ?? '';
  const [qLocal, setQLocal] = useState(qParam);
  const qDeferred = useDeferredValue(qLocal);
  useEffect(() => setQLocal(qParam), [qParam]);
  const mlTasksSelected = searchParams.getAll('ml_task');
  const agTasksSelected = searchParams.getAll('ag_task');
  const platformsSelected = searchParams.getAll('platform');
  const realSelected = searchParams.getAll('real');

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (qLocal) next.set('q', qLocal);
          else next.delete('q');
          return next;
        },
        { replace: true }
      );
    }, 250);
    return () => clearTimeout(t);
  }, [qLocal]);

  const toggleMultiFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const current = prev.getAll(key);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const nextParams = new URLSearchParams(prev);
      nextParams.delete(key);
      next.forEach((v) => nextParams.append(key, v));
      return nextParams;
    }, { replace: true });
  };

  const removeFilterValue = (key: string, value: string) => {
    setSearchParams((prev) => {
      const current = prev.getAll(key);
      const rest = current.filter((v) => v !== value);
      const nextParams = new URLSearchParams(prev);
      nextParams.delete(key);
      rest.forEach((v) => nextParams.append(key, v));
      return nextParams;
    }, { replace: true });
  };

  const hasActiveFilters = Boolean(
    qDeferred || mlTasksSelected.length || agTasksSelected.length || platformsSelected.length || realSelected.length
  );
  const clearFilters = () => {
    setQLocal('');
    setSearchParams({}, { replace: true });
  };

  const safeData = Array.isArray(data) ? data : [];
  const filtered = useMemo(
    () =>
      filterDatasets(safeData, {
        q: qDeferred || undefined,
        mlTasks: mlTasksSelected.length ? mlTasksSelected : undefined,
        agTasks: agTasksSelected.length ? agTasksSelected : undefined,
        platforms: platformsSelected.length ? platformsSelected : undefined,
        realOrSynthetic: realSelected.length ? realSelected : undefined,
      }),
    [data, qDeferred, mlTasksSelected, agTasksSelected, platformsSelected, realSelected]
  );

  const mlTasks = useMemo(
    () => unique(safeData.map((d) => d.machine_learning_task)),
    [data]
  );
  const agTasks = useMemo(
    () => unique(safeData.map((d) => d.agricultural_task)),
    [data]
  );
  const platforms = useMemo(
    () => unique(safeData.map((d) => d.platform)),
    [data]
  );
  const realOptions = useMemo(
    () => unique(safeData.map((d) => d.real_or_synthetic)),
    [data]
  );

  const INITIAL_SHOW = 60;
  const [showCount, setShowCount] = useState(INITIAL_SHOW);
  const displayed = useMemo(() => filtered.slice(0, showCount), [filtered, showCount]);
  const hasMore = filtered.length > showCount;
  useEffect(() => setShowCount(INITIAL_SHOW), [qDeferred, mlTasksSelected.length, agTasksSelected.length, platformsSelected.length, realSelected.length]);

  const activeFilterChips = useMemo(() => {
    const list: { key: string; value: string; label: string }[] = [];
    mlTasksSelected.forEach((v) => list.push({ key: 'ml_task', value: v, label: v.replace(/_/g, ' ') }));
    agTasksSelected.forEach((v) => list.push({ key: 'ag_task', value: v, label: v.replace(/_/g, ' ') }));
    platformsSelected.forEach((v) => list.push({ key: 'platform', value: v, label: v }));
    realSelected.forEach((v) => list.push({ key: 'real', value: v, label: v }));
    return list;
  }, [mlTasksSelected, agTasksSelected, platformsSelected, realSelected]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-muted">Loading datasets…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Dataset browser</h1>
      <p className="mt-2 text-sm text-muted">
        {safeData.length} datasets
        {filtered.length !== safeData.length && (
          <span> · {filtered.length} match filters</span>
        )}
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:min-w-[200px] sm:max-w-md">
          <label htmlFor="dataset-search" className="mb-1 block text-xs font-medium text-muted">
            Search
          </label>
          <input
            id="dataset-search"
            type="search"
            placeholder="Name, task, location…"
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            className="w-full rounded-button border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-card placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <MultiSelectDropdown
          label="Ag task"
          options={agTasks}
          selected={agTasksSelected}
          onToggle={(value) => toggleMultiFilter('ag_task', value)}
        />
        <MultiSelectDropdown
          label="Platform"
          options={platforms}
          selected={platformsSelected}
          onToggle={(value) => toggleMultiFilter('platform', value)}
          formatOption={(v) => v}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="w-full text-xs font-medium uppercase tracking-wide text-muted sm:w-auto">
          Task
        </span>
        {mlTasks.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleMultiFilter('ml_task', t)}
            className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${CHIP_CLASSES} cursor-pointer transition ${
              mlTasksSelected.includes(t)
                ? 'bg-accent text-white'
                : 'border border-border bg-paper text-ink hover:border-accent/50 hover:bg-accent/5'
            }`}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Data
        </span>
        {realOptions.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleMultiFilter('real', t)}
            className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${CHIP_CLASSES} cursor-pointer transition ${
              realSelected.includes(t)
                ? 'bg-accent text-white'
                : 'border border-border bg-paper text-ink hover:border-accent/50 hover:bg-accent/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Active
          </span>
          {qDeferred && (
            <span className={`${CHIP_CLASSES} bg-ink/10 text-ink`}>
              “{qDeferred.length > 20 ? `${qDeferred.slice(0, 20)}…` : qDeferred}”
            </span>
          )}
          {activeFilterChips.map(({ key, value, label }) => (
            <button
              key={`${key}-${value}`}
              type="button"
              onClick={() => removeFilterValue(key, value)}
              className={`${CHIP_CLASSES} flex items-center gap-1 bg-accent/15 text-accent hover:bg-accent/25`}
            >
              {label}
              <span className="ml-0.5 text-sm leading-none" aria-hidden>×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className={`${CHIP_CLASSES} border border-border text-muted hover:bg-border hover:text-ink`}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map((d) => (
          <DatasetCard key={d.name} d={d} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowCount((n) => Math.min(n + 60, filtered.length))}
            className="rounded-button border border-border bg-white px-5 py-2.5 text-sm font-medium text-ink shadow-card transition hover:bg-border"
          >
            Show more ({filtered.length - showCount} remaining)
          </button>
        </div>
      )}
      {filtered.length === 0 && safeData.length > 0 && (
        <p className="mt-8 text-muted">No datasets match the current filters.</p>
      )}
      {safeData.length === 0 && !loading && !error && (
        <p className="mt-8 text-muted">
          No datasets loaded. Run <code className="rounded bg-border px-1 py-0.5">npm run prebuild</code> in the
          frontend directory to generate <code className="rounded bg-border px-1 py-0.5">datasets.json</code>.
        </p>
      )}
    </div>
  );
}
