import { Link } from 'react-router-dom';
import { useDatasets } from '../lib/useDatasets';

function DatasetStats() {
  const { data: datasets, loading, error } = useDatasets();

  if (loading) return <p className="text-sm text-muted">Loading stats…</p>;
  if (error) return null;

  const totalImages = datasets.reduce((sum, d) => sum + (d.num_images ?? 0), 0);
  const byTask: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  for (const d of datasets) {
    const task = d.machine_learning_task ?? 'other';
    byTask[task] = (byTask[task] ?? 0) + 1;
    const platform = d.platform ?? 'unspecified';
    byPlatform[platform] = (byPlatform[platform] ?? 0) + 1;
  }
  const taskRows = Object.entries(byTask).sort((a, b) => b[1] - a[1]);
  const platformRows = Object.entries(byPlatform).sort((a, b) => b[1] - a[1]);

  const formatNum = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : n.toLocaleString();

  return (
    <div className="grid gap-6">
      <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-ink sm:text-3xl">{datasets.length}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">Datasets</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-accent sm:text-3xl">{formatNum(totalImages)}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">Images</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-ink sm:text-3xl">{Object.keys(byTask).length}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">ML tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-ink sm:text-3xl">{Object.keys(byPlatform).length}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">Platforms</p>
          </div>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
      <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
        <div className="border-b border-border bg-paper/50 px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">By ML task</h3>
        </div>
        <table className="w-full">
          <tbody className="text-sm">
            {taskRows.map(([task, count]) => (
              <tr key={task} className="group border-b border-border last:border-0">
                <td className="px-4 py-3 text-ink capitalize group-hover:bg-accent/5">
                  {task.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-accent">
                  {count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
        <div className="border-b border-border bg-paper/50 px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">By platform</h3>
        </div>
        <table className="w-full">
          <tbody className="text-sm">
            {platformRows.map(([platform, count]) => (
              <tr key={platform} className="group border-b border-border last:border-0">
                <td className="px-4 py-3 text-ink capitalize group-hover:bg-accent/5">
                  {platform.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-accent">
                  {count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold text-ink sm:text-5xl">AgML</h1>
      <p className="mt-2 text-lg font-medium text-muted">
        Agricultural Machine Learning
      </p>
      <p className="mt-6 text-ink">
        AgML is a comprehensive library for agricultural machine learning. It provides access to
        public agricultural datasets for common deep learning tasks—classification, detection, and
        segmentation—and supports both TensorFlow and PyTorch.
      </p>
      <p className="mt-4 text-ink">
        This hub lets you browse{' '}
        <Link to="/datasets" className="font-medium text-accent hover:underline">
          datasets
        </Link>
        . To use the data in your own pipelines, install the AgML Python package and follow the
        official documentation.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          to="/datasets"
          className="rounded-button bg-ink px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-card transition hover:bg-ink/90 hover:shadow-card-hover"
        >
          Browse datasets
        </Link>
        <a
          href="https://github.com/Project-AgML/AgML"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-button border border-border bg-white px-5 py-2.5 text-sm font-medium text-ink no-underline shadow-card transition hover:border-muted/40 hover:bg-paper"
        >
          AgML on GitHub
        </a>
      </div>

      <section className="mt-16" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-4 text-xl font-bold text-ink">
          Dataset stats
        </h2>
        <DatasetStats />
      </section>

      <section className="mt-16 rounded-card border border-border bg-white p-6 shadow-card" aria-labelledby="contribute-heading">
        <h2 id="contribute-heading" className="text-lg font-bold text-ink">
          Contribute a dataset
        </h2>
        <p className="mt-2 text-sm text-ink">
          Have an agricultural dataset that fits AgML? We welcome contributions for classification,
          object detection, and semantic segmentation. Format your data to the AgML standard, update
          the source metadata, and open a pull request on the AgML repository.
        </p>
        <a
          href="https://github.com/Project-AgML/AgML/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-button border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent no-underline transition hover:bg-accent/20"
        >
          Contribution guide
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </section>

      <footer className="mt-16 border-t border-border pt-8 text-sm text-muted">
        <p>
          AgML is developed by the{' '}
          <a
            href="https://aifs.ucdavis.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            AI Institute for Food Systems
          </a>
          . Install with <code className="rounded bg-border px-1 py-0.5">pip install agml</code>.
        </p>
      </footer>
    </div>
  );
}
