import { useMemo, useDeferredValue, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDatasets, filterDatasets, formatDisplayLocation } from '../lib/useDatasets';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown';
import type { Dataset } from '../data/types';

const CHIP_CLASSES =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

type FilterKind = 'dropdown' | 'chips';

type DatasetFilterConfig = {
  key: string;
  label: string;
  field: keyof Dataset;
  kind: FilterKind;
  formatOption?: (value: string) => string;
  chipLabel?: string;
  mode?: 'exact' | 'containsAny';
};

const DATASET_FILTERS: DatasetFilterConfig[] = [
  {
    key: 'ml_task',
    label: 'Task',
    chipLabel: 'Task',
    field: 'machine_learning_task',
    kind: 'chips',
    formatOption: (value) => value.replace(/_/g, ' '),
  },
  {
    key: 'ag_task',
    label: 'Ag task',
    field: 'agricultural_task',
    kind: 'dropdown',
    formatOption: (value) => value.replace(/_/g, ' '),
  },
  {
    key: 'environment',
    label: 'Environment',
    chipLabel: 'Environment',
    field: 'environment',
    kind: 'chips',
    formatOption: (value) => value.charAt(0).toUpperCase() + value.slice(1),
  },
  {
    key: 'augmented_counterpart',
    label: 'Augmented counterpart',
    chipLabel: 'Augmented',
    field: 'augmented_counterpart',
    kind: 'chips',
    formatOption: (value) => (value === 'yes' ? 'Yes' : 'No'),
  },
  {
    key: 'crop_types',
    label: 'Crop type',
    chipLabel: 'Crop type',
    field: 'crop_types',
    kind: 'dropdown',
    mode: 'containsAny',
    formatOption: (value) => value.replace(/_/g, ' '),
  },
  {
    key: 'location',
    label: 'Location',
    chipLabel: 'Location',
    field: 'location',
    kind: 'dropdown',
    mode: 'containsAny',
    formatOption: (value) => value.replace(/_/g, ' '),
  },
  {
    key: 'platform',
    label: 'Platform',
    field: 'platform',
    kind: 'dropdown',
    formatOption: (value) => value,
  },
  {
    key: 'real',
    label: 'Data',
    chipLabel: 'Data',
    field: 'real_or_synthetic',
    kind: 'chips',
    formatOption: (value) => value,
  },
] as const;

type FilterKey = (typeof DATASET_FILTERS)[number]['key'];

type ActiveFilterChip = {
  key: FilterKey;
  value: string;
  label: string;
};

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
          <p className="mt-2 text-sm text-muted">{formatDisplayLocation(d.location)}</p>
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

function getFilterValues(datasets: Dataset[], field: keyof Dataset): string[] {
  return unique(
    datasets.flatMap((dataset) => {
      const value = dataset[field];
      if (typeof value === 'string') return [value];
      if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
      return [];
    })
  );
}

export function DatasetBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error } = useDatasets();

  const qParam = searchParams.get('q') ?? '';
  const [qLocal, setQLocal] = useState(qParam);
  const qDeferred = useDeferredValue(qLocal);
  useEffect(() => {
    const handle = window.requestAnimationFrame(() => setQLocal(qParam));
    return () => window.cancelAnimationFrame(handle);
  }, [qParam]);
  const selections = useMemo(() => {
    const next = {} as Record<FilterKey, string[]>;
    for (const filter of DATASET_FILTERS) {
      next[filter.key] = searchParams.getAll(filter.key);
    }
    return next;
  }, [searchParams]);

  const activeFilterCount = DATASET_FILTERS.reduce((count, filter) => count + selections[filter.key].length, 0);

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
  }, [qLocal, setSearchParams]);

  const toggleMultiFilter = (key: FilterKey, value: string) => {
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

  const removeFilterValue = (key: FilterKey, value: string) => {
    setSearchParams((prev) => {
      const current = prev.getAll(key);
      const rest = current.filter((v) => v !== value);
      const nextParams = new URLSearchParams(prev);
      nextParams.delete(key);
      rest.forEach((v) => nextParams.append(key, v));
      return nextParams;
    }, { replace: true });
  };

  const hasActiveFilters = Boolean(qDeferred || activeFilterCount);
  const clearFilters = () => {
    setQLocal('');
    setSearchParams({}, { replace: true });
  };

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const filtered = useMemo(
    () =>
      filterDatasets(safeData, {
        q: qDeferred || undefined,
        fieldFilters: DATASET_FILTERS.map((filter) => ({
          field: filter.field,
          values: selections[filter.key],
          mode: filter.mode,
        })),
      }),
    [safeData, qDeferred, selections]
  );

  const filterOptions = useMemo(
    () =>
      Object.fromEntries(
        DATASET_FILTERS.map((filter) => [filter.key, getFilterValues(safeData, filter.field)])
      ) as Record<FilterKey, string[]>,
    [safeData]
  );

  const INITIAL_SHOW = 60;
  const [showCount, setShowCount] = useState(INITIAL_SHOW);
  const displayed = useMemo(() => filtered.slice(0, showCount), [filtered, showCount]);
  const hasMore = filtered.length > showCount;
  useEffect(() => {
    const handle = window.requestAnimationFrame(() => setShowCount(INITIAL_SHOW));
    return () => window.cancelAnimationFrame(handle);
  }, [qDeferred, activeFilterCount]);

  const activeFilterChips = useMemo(() => {
    const list: ActiveFilterChip[] = [];
    DATASET_FILTERS.forEach((filter) => {
      selections[filter.key].forEach((value) => {
        list.push({
          key: filter.key,
          value,
          label: filter.formatOption ? filter.formatOption(value) : value,
        });
      });
    });
    return list;
  }, [selections]);

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
        {DATASET_FILTERS.filter((filter) => filter.kind === 'dropdown').map((filter) => (
          <MultiSelectDropdown
            key={filter.key}
            label={filter.label}
            options={filterOptions[filter.key]}
            selected={selections[filter.key]}
            onToggle={(value) => toggleMultiFilter(filter.key, value)}
            formatOption={filter.formatOption}
          />
        ))}
      </div>

      {DATASET_FILTERS.filter((filter) => filter.kind === 'chips').map((filter) => (
        <div key={filter.key} className="mt-4 flex flex-wrap items-center gap-2">
          <span className="w-full text-xs font-medium uppercase tracking-wide text-muted sm:w-auto">
            {filter.chipLabel ?? filter.label}
          </span>
          {filterOptions[filter.key].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleMultiFilter(filter.key, value)}
              className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${CHIP_CLASSES} cursor-pointer transition ${
                selections[filter.key].includes(value)
                  ? 'bg-accent text-white'
                  : 'border border-border bg-paper text-ink hover:border-accent/50 hover:bg-accent/5'
              }`}
            >
              {filter.formatOption ? filter.formatOption(value) : value}
            </button>
          ))}
        </div>
      ))}

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
          frontend directory to generate <code className="rounded bg-border px-1 py-0.5">datasets.json</code> and
          populate <code className="rounded bg-border px-1 py-0.5">hf_datasets.json</code>.
        </p>
      )}
    </div>
  );
}
