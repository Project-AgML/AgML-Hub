import { useState, useEffect } from 'react';
import type { Dataset } from '../data/types';
import { publicUrl } from './publicUrl';

export function useDatasets(): { data: Dataset[]; loading: boolean; error: Error | null } {
  const [data, setData] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(publicUrl('datasets.json'))
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load datasets');
        return r.json();
      })
      .then((json) => setData(Array.isArray(json) ? json : []))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function filterDatasets(
  datasets: Dataset[],
  opts: {
    q?: string;
    mlTasks?: string[];
    agTasks?: string[];
    platforms?: string[];
    realOrSynthetic?: string[];
  }
): Dataset[] {
  let out = datasets;
  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    out = out.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.agricultural_task?.toLowerCase().includes(q)) ||
        (d.machine_learning_task?.toLowerCase().includes(q)) ||
        (d.location?.toLowerCase().includes(q)) ||
        (d.platform?.toLowerCase().includes(q))
    );
  }
  if (opts.mlTasks?.length)
    out = out.filter((d) => d.machine_learning_task != null && opts.mlTasks!.includes(d.machine_learning_task));
  if (opts.agTasks?.length)
    out = out.filter((d) => d.agricultural_task != null && opts.agTasks!.includes(d.agricultural_task));
  if (opts.platforms?.length)
    out = out.filter((d) => d.platform != null && opts.platforms!.includes(d.platform));
  if (opts.realOrSynthetic?.length)
    out = out.filter(
      (d) => d.real_or_synthetic != null && opts.realOrSynthetic!.includes(d.real_or_synthetic)
    );
  return out;
}
