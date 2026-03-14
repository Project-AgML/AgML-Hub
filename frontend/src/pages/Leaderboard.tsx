import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import type { LeaderboardRow } from '../data/types';
import { publicUrl } from '../lib/publicUrl';
import { LeaderboardChart } from '../components/LeaderboardChart';

const columnHelper = createColumnHelper<LeaderboardRow>();

const columns = [
  columnHelper.accessor('dataset', {
    header: 'Dataset',
    cell: (c) => (
      <Link
        to={`/datasets/${encodeURIComponent(c.getValue())}`}
        className="rounded bg-border px-1.5 py-0.5 font-mono text-sm font-medium text-accent no-underline hover:underline"
      >
        {c.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('task', {
    header: 'Task',
  }),
  columnHelper.accessor('metricName', {
    header: 'Metric',
  }),
  columnHelper.accessor('metricValue', {
    header: 'Value',
    cell: (c) => <span className="tabular-nums">{Number(c.getValue()).toFixed(2)}</span>,
  }),
  columnHelper.accessor('model', {
    header: 'Model',
    cell: (c) => c.getValue() ?? '—',
  }),
  columnHelper.accessor('mAP50', {
    header: 'mAP50',
    cell: (c) => {
      const v = c.getValue();
      return v != null ? <span className="tabular-nums">{Number(v).toFixed(2)}</span> : '—';
    },
  }),
  columnHelper.accessor('epochs', {
    header: 'Epochs',
    cell: (c) => (c.getValue() != null ? String(c.getValue()) : '—'),
  }),
];

export function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const taskFilter = searchParams.get('task') ?? '';
  const datasetQuery = searchParams.get('dataset') ?? '';
  const [data, setData] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'metricValue', desc: true }]);
  const [view, setView] = useState<'table' | 'chart'>('table');

  useEffect(() => {
    fetch(publicUrl('leaderboard.json'))
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load leaderboard');
        return r.json();
      })
      .then((json) => setData(Array.isArray(json) ? json : []))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const filteredData = useMemo(() => {
    let out = data;
    if (taskFilter) out = out.filter((r) => r.task === taskFilter);
    if (datasetQuery.trim()) {
      const q = datasetQuery.trim().toLowerCase();
      out = out.filter((r) => r.dataset.toLowerCase().includes(q));
    }
    return out;
  }, [data, taskFilter, datasetQuery]);

  const setTask = (task: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (task) next.set('task', task);
        else next.delete('task');
        return next;
      },
      { replace: true }
    );
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tasks = useMemo(() => [...new Set(data.map((r) => r.task))].sort(), [data]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-muted">Loading leaderboard…</p>
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
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Benchmark leaderboard</h1>
      <p className="mt-2 text-sm text-muted">
        {filteredData.length} of {data.length} entries
        {(taskFilter || datasetQuery) && ' (filtered)'}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Task</span>
        <button
          type="button"
          onClick={() => setTask('')}
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition ${
            !taskFilter ? 'bg-accent text-white' : 'border border-border bg-paper text-ink hover:bg-border'
          }`}
        >
          All
        </button>
        {tasks.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTask(t)}
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition ${
              taskFilter === t ? 'bg-accent text-white' : 'border border-border bg-paper text-ink hover:bg-border'
            }`}
          >
            {t}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 text-sm text-muted">
          <span>Dataset</span>
          <input
            type="search"
            placeholder="Filter by name…"
            value={datasetQuery}
            onChange={(e) =>
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (e.target.value) next.set('dataset', e.target.value);
                  else next.delete('dataset');
                  return next;
                },
                { replace: true }
              )
            }
            className="w-40 rounded-button border border-border bg-white px-2 py-1 text-ink shadow-card placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`min-h-[44px] min-w-[44px] rounded-button px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              view === 'table' ? 'bg-ink text-white' : 'border border-border bg-paper text-ink hover:bg-border'
            }`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setView('chart')}
            className={`min-h-[44px] min-w-[44px] rounded-button px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              view === 'chart' ? 'bg-ink text-white' : 'border border-border bg-paper text-ink hover:bg-border'
            }`}
          >
            Chart
          </button>
        </div>
      </div>

      {view === 'chart' && (
        <div className="mt-6 rounded-card border border-border bg-white p-4 shadow-card">
          <LeaderboardChart rows={filteredData} />
        </div>
      )}

      {view === 'table' && filteredData.length === 0 && (
        <div className="mt-6 rounded-card border border-border bg-white p-8 text-center shadow-card">
          <p className="text-muted">
            {data.length === 0
              ? 'No leaderboard data loaded. If you run the app from file or a subpath, ensure leaderboard.json is available.'
              : 'No entries match the current filters.'}
          </p>
          {(taskFilter || datasetQuery.trim()) && (
            <button
              type="button"
              onClick={() => setSearchParams({}, { replace: true })}
              className="mt-3 text-sm font-medium text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      {view === 'table' && filteredData.length > 0 && (
      <div className="mt-6 overflow-x-auto rounded-card border border-border bg-white shadow-card" role="region" aria-label="Benchmark table">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <caption className="sr-only">
            Benchmark results; sortable by column. {filteredData.length} entries.
          </caption>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-paper">
                {hg.headers.map((h) => {
                  const sortDir = h.column.getIsSorted();
                  const ariaSort =
                    sortDir === 'asc'
                      ? 'ascending'
                      : sortDir === 'desc'
                        ? 'descending'
                        : undefined;
                  return (
                  <th
                    key={h.id}
                    scope="col"
                    {...(ariaSort ? { 'aria-sort': ariaSort as 'ascending' | 'descending' } : {})}
                    className="px-4 py-3 text-left font-semibold text-ink"
                    style={
                      ['metricValue', 'mAP50', 'epochs'].includes(h.column.id)
                        ? { textAlign: 'right' as const }
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={h.column.getToggleSortingHandler()}
                      className="flex w-full items-center gap-1 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                      style={
                        ['metricValue', 'mAP50', 'epochs'].includes(h.column.id)
                          ? { justifyContent: 'flex-end' }
                          : undefined
                      }
                      aria-label={`Sort by ${String(h.column.columnDef.header)}${sortDir ? ` (${sortDir})` : ''}`}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {sortDir === 'asc' ? ' ↑' : sortDir === 'desc' ? ' ↓' : ''}
                    </button>
                  </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const r = row.original;
              const detail =
                r.precision != null && r.recall != null
                  ? `Precision: ${(r.precision * 100).toFixed(1)}%, Recall: ${(r.recall * 100).toFixed(1)}%`
                  : undefined;
              return (
              <tr
                key={row.id}
                className="border-b border-border hover:bg-border/50"
                title={detail}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2.5 text-muted"
                    style={
                      ['metricValue', 'mAP50', 'epochs'].includes(cell.column.id)
                        ? { textAlign: 'right' as const }
                        : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
