import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PIPELINE_DIR = path.join(ROOT, 'pipeline');
export const CONFIG_DIR = path.join(PIPELINE_DIR, 'config');
export const SEED_DIR = path.join(PIPELINE_DIR, 'seed');
export const CACHE_DIR = process.env.PIPELINE_CACHE_DIR || path.join(PIPELINE_DIR, 'cache');
export const DATA_DIR = path.join(ROOT, 'data');
export const OVERRIDES_FILE = path.join(PIPELINE_DIR, 'overrides.json');
export const DATASET_FILE = path.join(DATA_DIR, 'companies.json');
export const REPORT_FILE = path.join(DATA_DIR, 'laporan-pipeline.md');
