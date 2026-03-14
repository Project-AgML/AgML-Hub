/**
 * Build-time script: merges agml _assets model_benchmarks + detector_benchmarks → public/leaderboard.json
 * Run from frontend directory. AGML_SOURCE defaults to ../agml-source
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const agmlSource = process.env.AGML_SOURCE || path.resolve(frontendDir, '../agml-source');
const modelPath = path.join(agmlSource, 'agml', '_assets', 'model_benchmarks.json');
const detectorPath = path.join(agmlSource, 'agml', '_assets', 'detector_benchmarks.json');
const outPath = path.join(frontendDir, 'public', 'leaderboard.json');

/** @typedef {{ dataset: string, task: string, metricName: string, metricValue: number, model?: string, epochs?: number }} LeaderboardRow */

/**
 * @returns {LeaderboardRow[]}
 */
function buildLeaderboard() {
  const rows = [];

  if (fs.existsSync(modelPath)) {
    const data = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    for (const [dataset, entry] of Object.entries(data)) {
      const metric = entry.metric || {};
      const epochs = entry.hyperparameters?.epochs;
      if (metric.mIOU != null) {
        rows.push({
          dataset,
          task: 'segmentation',
          metricName: 'mIOU',
          metricValue: Number(metric.mIOU),
          epochs,
        });
      }
      if (metric.mAP != null) {
        rows.push({
          dataset,
          task: 'detection',
          metricName: 'mAP',
          metricValue: Number(metric.mAP),
          epochs,
        });
      }
    }
  }

  if (fs.existsSync(detectorPath)) {
    const data = JSON.parse(fs.readFileSync(detectorPath, 'utf8'));
    for (const [key, entry] of Object.entries(data)) {
      const plus = key.indexOf('+');
      const dataset = plus > 0 ? key.slice(0, plus) : key;
      const model = plus > 0 ? key.slice(plus + 1) : undefined;
      const mAp5095 = entry['metrics/mAP50-95(B)'];
      const mAp50 = entry['metrics/mAP50(B)'];
      const precision = entry['metrics/precision(B)'];
      const recall = entry['metrics/recall(B)'];
      if (mAp5095 != null) {
        rows.push({
          dataset,
          task: 'detection',
          metricName: 'mAP50-95',
          metricValue: Number(mAp5095),
          model,
          mAP50: mAp50 != null ? Number(mAp50) : undefined,
          precision: precision != null ? Number(precision) : undefined,
          recall: recall != null ? Number(recall) : undefined,
        });
      }
    }
  }

  return rows;
}

function main() {
  const rows = buildLeaderboard();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');
  console.log('Wrote', outPath, '—', rows.length, 'rows');
}

main();
