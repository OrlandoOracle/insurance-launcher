import fs from 'fs/promises';
import path from 'path';

export type Lead = { id: string; createdAt: string; updatedAt: string; [k: string]: any };
export type Activity = { id: string; createdAt: string; [k: string]: any };
export type Task = { id: string; createdAt: string; [k: string]: any };
export type Setting = { key: string; value: any };

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(DATA_DIR, 'imports'), { recursive: true });
  await fs.mkdir(path.join(DATA_DIR, 'backups'), { recursive: true });
}

export async function initStorage() { 
  await ensureDir(); 
}

export async function load<T = any>(key: string): Promise<T | null> {
  await ensureDir();
  try {
    const p = path.join(DATA_DIR, `${key}.json`);
    const raw = await fs.readFile(p, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function save<T = any>(key: string, value: T): Promise<void> {
  await ensureDir();
  const p = path.join(DATA_DIR, `${key}.json`);
  await fs.writeFile(p, JSON.stringify(value, null, 2), 'utf-8');
}

export async function remove(key: string): Promise<void> {
  await ensureDir();
  try {
    const p = path.join(DATA_DIR, `${key}.json`);
    await fs.unlink(p);
  } catch {
    // File doesn't exist, ignore
  }
}

export async function exportAll(): Promise<Record<string, any>> {
  await ensureDir();
  const keys = ['leads', 'activities', 'tasks', 'settings', 'contacts', 'discovery'];
  const out: Record<string, any> = {};
  for (const k of keys) {
    out[k] = (await load(k)) ?? [];
  }
  return out;
}

export async function importAll(payload: Record<string, any>) {
  await ensureDir();
  for (const [k, v] of Object.entries(payload)) {
    await save(k, v);
  }
}

export async function createBackup(): Promise<{ 
  success: boolean;
  path?: string;
  error?: string;
}> {
  try {
    await ensureDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
    const backupPath = path.join(DATA_DIR, 'backups', `insurance-launcher_${timestamp}.json`);
    const data = await exportAll();
    await fs.writeFile(backupPath, JSON.stringify(data, null, 2), 'utf-8');
    return {
      success: true,
      path: backupPath
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getDataDir(): Promise<string> {
  return DATA_DIR;
}

export function getDataDirSync(): string {
  return DATA_DIR;
}

export const isBrowserAdapter = false;