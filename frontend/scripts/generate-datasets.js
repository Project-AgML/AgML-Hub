/**
 * Build-time script: parses agml-source/docs/datasets/*.md → public/datasets.json
 * Run from frontend directory. Set AGML_SOURCE or defaults to ../agml-source
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const agmlSource = process.env.AGML_SOURCE || path.resolve(frontendDir, '../agml-source');
const datasetsDir = path.join(agmlSource, 'docs', 'datasets');
const sourceCitationsPath = path.join(agmlSource, 'agml', '_assets', 'source_citations.json');
const outPath = path.join(frontendDir, 'public', 'datasets.json');

const SKIP_NAMES = new Set(['iNatAg', 'iNatAg-mini']);

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

function generateDatasets() {
  let list = [];
  if (fs.existsSync(datasetsDir)) {
    const files = fs.readdirSync(datasetsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const entry = parseDatasetFile(path.join(datasetsDir, file));
      if (entry) list.push(entry);
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const citationsByKey = loadSourceCitations();
  for (const entry of list) {
    const key = entry.name in citationsByKey ? entry.name : entry.name.replace(/-/g, '_');
    const info = citationsByKey[key];
    entry.license = info?.license ?? null;
    entry.citation = info?.citation ?? null;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), 'utf8');
  console.log('Wrote', outPath, '—', list.length, 'datasets');
}

generateDatasets();
