/**
 * Build-time script: parses agml-source/docs/datasets/*.md and iNat JSON assets → public/datasets.json
 * Run from frontend directory. Set AGML_SOURCE or defaults to ../agml-source
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const agmlSource = process.env.AGML_SOURCE || path.resolve(frontendDir, '../agml-source');
const assetsDir = path.join(agmlSource, 'agml', '_assets');
const datasetsDir = path.join(agmlSource, 'docs', 'datasets');
const sourceCitationsPath = path.join(assetsDir, 'source_citations.json');
const outPath = path.join(frontendDir, 'public', 'datasets.json');

const AGML_S3_DATASET_BASE = 'https://agdata-data.s3.us-west-1.amazonaws.com/datasets';
const SKIP_NAMES = new Set(['iNatAg', 'iNatAg-mini']);
const ZIP_SIZE_CONCURRENCY = 10;

const KEY_MAP = {
  'Machine Learning Task': 'machine_learning_task',
  'Agricultural Task': 'agricultural_task',
  'Location': 'location',
  'Sensor Modality': 'sensor_modality',
  'Real or Synthetic': 'real_or_synthetic',
  'Platform': 'platform',
  'Input Data Format': 'input_data_format',
  'Annotation Format': 'annotation_format',
  'Number of Images': 'num_images',
  'Documentation': 'documentation',
  'Classes': 'classes',
  'Stats/Mean': 'stats_mean',
  'Stats/Standard Deviation': 'stats_std',
};

function stripBackticks(s) {
  return String(s).trim().replace(/^`|`$/g, '');
}

function parseTableValue(rawKey, value) {
  const v = String(value).trim();
  if (rawKey === 'Documentation' && (v === '' || v.toLowerCase() === 'none')) return null;
  if (rawKey === 'Number of Images') {
    const n = parseInt(v.replace(/,/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  }
  if (rawKey === 'Stats/Mean' || rawKey === 'Stats/Standard Deviation') {
    const match = v.match(/\[([^\]]+)\]/);
    if (!match) return null;
    const nums = match[1].split(',').map((x) => parseFloat(x.trim()));
    return nums.every(Number.isFinite) ? nums : null;
  }
  return v || null;
}

function extractMetadataTable(content) {
  const meta = {};
  const lines = content.split(/\r?\n/);
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## Dataset Metadata')) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith('## ')) break;
    if (!inTable || !line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    let key = cells[0].replace(/\*\*/g, '').trim();
    const val = cells[1];
    const mapped = KEY_MAP[key];
    if (mapped) {
      meta[mapped] = parseTableValue(key, val);
    }
  }
  return meta;
}

function extractNameFromContent(content, fallback) {
  const m = content.match(/^#\s*`([^`]+)`/m) || content.match(/^#\s+(.+)$/m);
  return m ? stripBackticks(m[1]) : fallback;
}

function extractExamplesImageUrl(content) {
  const m = content.match(/!\[[^\]]*\]\s*\(\s*([^)\s]+)\s*\)/);
  return m ? m[1].trim() : null;
}

/**
 * Convert GitHub blob or relative URLs to raw image URLs so they load in <img>.
 * - github.com/ORG/REPO/blob/BRANCH/path -> raw.githubusercontent.com/ORG/REPO/BRANCH/path
 * - ../sample_images/foo.png -> https://raw.githubusercontent.com/Project-AgML/AgML/main/docs/sample_images/foo.png
 */
function toRawImageUrl(url, datasetName) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  const blobMatch = u.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (blobMatch) {
    const [, org, repo, branch, path] = blobMatch;
    return `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${path}`;
  }
  if (u.startsWith('../') || u.startsWith('./')) {
    const path = u.replace(/^\.\.?\//, '');
    return `https://raw.githubusercontent.com/Project-AgML/AgML/main/docs/${path}`;
  }
  return u.startsWith('http') ? u : null;
}

function parseDatasetFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const base = path.basename(filePath, '.md');
  if (SKIP_NAMES.has(base)) return null;
  const name = extractNameFromContent(raw, base);
  const meta = extractMetadataTable(raw);
  const rawExamplesUrl = extractExamplesImageUrl(raw);
  const examples_image_url = toRawImageUrl(rawExamplesUrl, name);
  return {
    name,
    machine_learning_task: meta.machine_learning_task ?? null,
    agricultural_task: meta.agricultural_task ?? null,
    location: meta.location ?? null,
    sensor_modality: meta.sensor_modality ?? null,
    real_or_synthetic: meta.real_or_synthetic ?? null,
    platform: meta.platform ?? null,
    input_data_format: meta.input_data_format ?? null,
    annotation_format: meta.annotation_format ?? null,
    num_images: meta.num_images ?? null,
    documentation: meta.documentation ?? null,
    classes: meta.classes ?? null,
    stats_mean: meta.stats_mean ?? null,
    stats_std: meta.stats_std ?? null,
    examples_image_url: examples_image_url ?? null,
  };
}

function loadSourceCitations() {
  if (!fs.existsSync(sourceCitationsPath)) return {};
  return JSON.parse(fs.readFileSync(sourceCitationsPath, 'utf8'));
}

function loadInatSourceCitations() {
  const merged = {};
  for (const file of ['iNatAg_source_citations.json', 'iNatAg-mini_source_citations.json']) {
    const p = path.join(assetsDir, file);
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      Object.assign(merged, data);
    }
  }
  return merged;
}

/** Convert public_datasources entry to our Dataset format */
function inatEntryToDataset(name, raw, parentName) {
  const loc = raw.location;
  const locationStr = loc && typeof loc === 'object'
    ? [loc.continent, loc.country].filter(Boolean).join(', ')
    : null;
  const inputFmt = raw.input_data_format;
  const inputDataFormat = Array.isArray(inputFmt) ? (inputFmt[0] ?? null) : inputFmt;
  const classesObj = raw.classes;
  const classesStr = classesObj && typeof classesObj === 'object'
    ? Object.entries(classesObj).map(([k, v]) => `${k}: ${v}`).join('; ')
    : null;
  const n = raw.n_images;
  const numImages = typeof n === 'number' ? n : (typeof n === 'string' ? parseInt(n, 10) : null);
  return {
    name,
    machine_learning_task: raw.ml_task ?? null,
    agricultural_task: raw.ag_task ?? null,
    location: locationStr || null,
    sensor_modality: raw.sensor_modality ?? null,
    real_or_synthetic: raw.real_synthetic ?? null,
    platform: raw.platform ?? null,
    input_data_format: inputDataFormat ?? null,
    annotation_format: raw.annotation_format ?? null,
    num_images: Number.isFinite(numImages) ? numImages : null,
    documentation: raw.docs_url ?? null,
    classes: classesStr ?? null,
    stats_mean: raw.stats?.mean ?? null,
    stats_std: raw.stats?.std ?? null,
    examples_image_url: null,
    parent_dataset: parentName,
  };
}

/** Parent-level iNatAg + iNatAg-mini (for summary count) + all sub-datasets (for search) */
function loadInatDatasets() {
  const list = [];
  const inatCitations = loadInatSourceCitations();
  const sampleCitation = inatCitations['iNatAg/ailanthus_altissima'] ?? null;

  for (const [file, parentName] of [
    ['iNatAg_public_datasources.json', 'iNatAg'],
    ['iNatAg-mini_public_datasources.json', 'iNatAg-mini'],
  ]) {
    const p = path.join(assetsDir, file);
    if (!fs.existsSync(p)) continue;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (typeof data !== 'object') continue;

    let totalImages = 0;
    const platforms = new Set();
    let sampleEntry = null;

    for (const [name, raw] of Object.entries(data)) {
      list.push(inatEntryToDataset(name, raw, parentName));
      const n = raw.n_images;
      totalImages += typeof n === 'number' ? n : (typeof n === 'string' ? parseInt(n, 10) || 0 : 0);
      if (raw.platform) platforms.add(raw.platform);
      if (!sampleEntry) sampleEntry = raw;
    }

    const mdPath = path.join(datasetsDir, `${parentName}.md`);
    let examplesImageUrl = null;
    if (fs.existsSync(mdPath)) {
      const raw = fs.readFileSync(mdPath, 'utf8');
      const m = raw.match(/!\[[^\]]*\]\s*\(\s*([^)\s]+)\s*\)/);
      if (m) examplesImageUrl = toRawImageUrl(m[1], parentName);
    }

    list.unshift({
      name: parentName,
      machine_learning_task: sampleEntry?.ml_task ?? 'image_classification',
      agricultural_task: sampleEntry?.ag_task ?? 'image_classification',
      location: 'worldwide',
      sensor_modality: sampleEntry?.sensor_modality ?? 'rgb',
      real_or_synthetic: sampleEntry?.real_synthetic ?? 'real',
      platform: Array.from(platforms).join(', ') || (sampleEntry?.platform ?? null),
      input_data_format: null,
      annotation_format: sampleEntry?.annotation_format ?? 'directory_names',
      num_images: totalImages || null,
      documentation: sampleEntry?.docs_url ?? 'https://www.inaturalist.org/',
      classes: null,
      stats_mean: null,
      stats_std: null,
      examples_image_url: examplesImageUrl,
      license: sampleCitation?.license ?? null,
      citation: sampleCitation?.citation ?? null,
      parent_dataset: null,
    });
  }
  return list;
}

/** HEAD request to S3 zip URL; returns Content-Length or null. Node has no CORS. */
async function fetchZipSizeBytes(name) {
  const url = `${AGML_S3_DATASET_BASE}/${encodeURIComponent(name)}.zip`;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    if (!r.ok) return null;
    const len = r.headers.get('Content-Length');
    if (len == null) return null;
    const n = parseInt(len, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Fetch zip sizes in chunks to avoid hammering S3. */
async function enrichZipSizes(list) {
  for (let i = 0; i < list.length; i += ZIP_SIZE_CONCURRENCY) {
    const chunk = list.slice(i, i + ZIP_SIZE_CONCURRENCY);
    await Promise.all(
      chunk.map(async (entry) => {
        entry.zip_size_bytes = await fetchZipSizeBytes(entry.name);
      })
    );
    if (chunk.length > 0) process.stdout.write('.');
  }
  if (list.length > 0) console.log(' zip sizes');
}

async function generateDatasets() {
  let list = [];
  if (fs.existsSync(datasetsDir)) {
    const files = fs.readdirSync(datasetsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const entry = parseDatasetFile(path.join(datasetsDir, file));
      if (entry) list.push(entry);
    }
  }
  list = list.concat(loadInatDatasets());
  list.sort((a, b) => a.name.localeCompare(b.name));

  const citationsByKey = loadSourceCitations();
  Object.assign(citationsByKey, loadInatSourceCitations());
  for (const entry of list) {
    const key = entry.name in citationsByKey ? entry.name : entry.name.replace(/-/g, '_');
    const info = citationsByKey[key];
    if (info) {
      entry.license = info.license ?? null;
      entry.citation = info.citation ?? null;
    } else if (!entry.license && !entry.citation) {
      entry.license = null;
      entry.citation = null;
    }
  }

  console.log('Fetching zip sizes for', list.length, 'datasets…');
  await enrichZipSizes(list);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), 'utf8');
  console.log('Wrote', outPath, '—', list.length, 'datasets');
}

generateDatasets().catch((err) => {
  console.error(err);
  process.exit(1);
});
