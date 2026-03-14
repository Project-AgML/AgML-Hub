import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Dataset } from '../data/types';
import { publicUrl } from '../lib/publicUrl';

/** AgML hosts many public datasets as zips on S3; same URL the Python package uses. */
const AGML_S3_DATASET_BASE = 'https://agdata-data.s3.us-west-1.amazonaws.com/datasets';

/** Extract a short readable line from BibTeX (author, year, title) when possible. */
function formatCitationPreview(citation: string): string | null {
  const authorMatch = citation.match(/(?:author|Author)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/i);
  const yearMatch = citation.match(/(?:year|Year)\s*=\s*\{([^{}]*)\}/i);
  const titleMatch = citation.match(/(?:title|Title)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/i);
  const author = authorMatch ? authorMatch[1].replace(/\s+/g, ' ').trim() : null;
  const year = yearMatch ? yearMatch[1].trim() : null;
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : null;
  if (author || year || title) {
    const parts = [];
    if (author) parts.push(author);
    if (year) parts.push(`(${year})`);
    if (title) parts.push(title);
    return parts.join(' ');
  }
  return null;
}

function downloadBibFile(datasetName: string, citation: string) {
  const key = datasetName.replace(/-/g, '_').replace(/\s+/g, '_');
  const bib = citation.trim().startsWith('@')
    ? citation
    : `@misc{${key},\n  author = {},\n  title = {${datasetName}},\n  note = {${citation.replace(/\n/g, ' ')}}\n}`;
  const blob = new Blob([bib], { type: 'application/x-bibtex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${datasetName.replace(/\s+/g, '-')}.bib`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DatasetDetail() {
  const { name } = useParams<{ name: string }>();
  const [data, setData] = useState<Dataset[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [citationCopied, setCitationCopied] = useState(false);

  useEffect(() => {
    fetch(publicUrl('datasets.json'))
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load datasets');
        return r.json();
      })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const dataset = data != null && name != null ? data.find((d) => d.name === name) ?? null : null;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-red-600">Error: {error.message}</p>
        <Link to="/datasets" className="mt-4 inline-block text-accent hover:underline">
          ← Back to datasets
        </Link>
      </div>
    );
  }
  if (dataset == null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-muted">Dataset not found: {name}</p>
        <Link to="/datasets" className="mt-4 inline-block text-accent hover:underline">
          ← Back to datasets
        </Link>
      </div>
    );
  }

  const hasExampleImage =
    dataset.examples_image_url != null &&
    dataset.examples_image_url.startsWith('http');

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/datasets" className="text-sm font-medium text-accent hover:underline">
        ← Back to datasets
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-ink">
        <code className="rounded bg-border px-2 py-1 text-2xl">{dataset.name}</code>
      </h1>

      <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted">Machine learning task</dt>
        <dd className="text-ink">{dataset.machine_learning_task ?? '—'}</dd>
        <dt className="text-muted">Agricultural task</dt>
        <dd className="text-ink">{dataset.agricultural_task ?? '—'}</dd>
        <dt className="text-muted">Location</dt>
        <dd className="text-ink">{dataset.location ?? '—'}</dd>
        <dt className="text-muted">Sensor modality</dt>
        <dd className="text-ink">{dataset.sensor_modality ?? '—'}</dd>
        <dt className="text-muted">Real or synthetic</dt>
        <dd className="text-ink">{dataset.real_or_synthetic ?? '—'}</dd>
        <dt className="text-muted">Platform</dt>
        <dd className="text-ink">{dataset.platform ?? '—'}</dd>
        <dt className="text-muted">Input format</dt>
        <dd className="text-ink">{dataset.input_data_format ?? '—'}</dd>
        <dt className="text-muted">Annotation format</dt>
        <dd className="text-ink">{dataset.annotation_format ?? '—'}</dd>
        <dt className="text-muted">Number of images</dt>
        <dd className="text-ink tabular-nums">
          {dataset.num_images != null ? dataset.num_images.toLocaleString() : '—'}
        </dd>
        <dt className="text-muted">Documentation</dt>
        <dd className="text-ink">
          {dataset.documentation ? (
            <a
              href={dataset.documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {dataset.documentation}
            </a>
          ) : (
            '—'
          )}
        </dd>
      </dl>

      <section className="mt-8 rounded border border-border bg-paper p-4">
        <h2 className="text-lg font-bold text-ink">Download dataset</h2>
        <p className="mt-2 text-sm text-muted">
          Many AgML datasets are available as zip files from AgML’s S3 bucket. You can download
          directly or use the Python package: <code className="rounded bg-border px-1 py-0.5">pip install agml</code> then{' '}
          <code className="rounded bg-border px-1 py-0.5">agml.data.AgMLDataLoader(&#39;{dataset.name}&#39;)</code>.
        </p>
        <a
          href={`${AGML_S3_DATASET_BASE}/${encodeURIComponent(dataset.name)}.zip`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-button bg-ink px-4 py-2 text-sm font-semibold text-white no-underline shadow-card transition hover:bg-ink/90"
        >
          Download {dataset.name}.zip
        </a>
      </section>

      {dataset.classes != null && dataset.classes !== '' && (
        <>
          <h2 className="mt-8 text-lg font-bold text-ink">Classes</h2>
          <p className="mt-2 text-sm text-ink break-words">
            {dataset.classes}
          </p>
        </>
      )}

      {(dataset.stats_mean != null || dataset.stats_std != null) && (
        <>
          <h2 className="mt-8 text-lg font-bold text-ink">Stats</h2>
          <div className="mt-2 text-sm text-ink">
            {dataset.stats_mean != null && (
              <p>
                <span className="text-muted">Mean:</span>{' '}
                <span className="tabular-nums">
                  [{dataset.stats_mean.map((n) => n.toFixed(3)).join(', ')}]
                </span>
              </p>
            )}
            {dataset.stats_std != null && (
              <p className="mt-1">
                <span className="text-muted">Std:</span>{' '}
                <span className="tabular-nums">
                  [{dataset.stats_std.map((n) => n.toFixed(3)).join(', ')}]
                </span>
              </p>
            )}
          </div>
        </>
      )}

      <section className="mt-8 rounded-card border border-border bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-ink">Source and citation</h2>
        {dataset.license != null && dataset.license !== '' && (
          <p className="mt-3 text-sm text-ink">
            <span className="font-medium text-muted">License:</span>{' '}
            <span className="text-ink">{dataset.license}</span>
          </p>
        )}
        {dataset.citation != null && dataset.citation.trim() !== '' ? (
          <>
            {formatCitationPreview(dataset.citation) && (
              <p className="mt-3 text-sm leading-snug text-ink">
                {formatCitationPreview(dataset.citation)}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(dataset.citation!);
                  setCitationCopied(true);
                  setTimeout(() => setCitationCopied(false), 2000);
                }}
                className="rounded-button border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-card transition hover:bg-border"
              >
                {citationCopied ? 'Copied' : 'Copy BibTeX'}
              </button>
              <button
                type="button"
                onClick={() => downloadBibFile(dataset.name, dataset.citation!)}
                className="rounded-button border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-card transition hover:bg-border"
              >
                Download .bib
              </button>
            </div>
            <pre className="mt-3 max-h-48 overflow-auto rounded border border-border bg-paper/50 p-3 font-mono text-xs leading-relaxed text-ink whitespace-pre-wrap break-words">
              {dataset.citation}
            </pre>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No citation is available for this dataset.
          </p>
        )}
      </section>

      {hasExampleImage && (
        <>
          <h2 className="mt-8 text-lg font-bold text-ink">Example images</h2>
          <figure className="mt-2">
            <img
              src={dataset.examples_image_url!}
              alt={`Examples for ${dataset.name}`}
              className="max-w-full rounded border border-border"
              loading="lazy"
            />
          </figure>
        </>
      )}
    </div>
  );
}
