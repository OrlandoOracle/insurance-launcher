'use client';
import localforage from 'localforage';

localforage.config({ name: 'insurance-launcher', storeName: 'kv' });

export async function initStorage() { 
  // no-op for IndexedDB 
}

export async function load<T = any>(key: string): Promise<T | null> {
  const v = await localforage.getItem<T>(key);
  return (v as T) ?? null;
}

export async function save<T = any>(key: string, value: T): Promise<void> {
  await localforage.setItem(key, value as any);
}

export async function remove(key: string): Promise<void> {
  await localforage.removeItem(key);
}

export async function exportAll(): Promise<Record<string, any>> {
  const keys = ['leads', 'activities', 'tasks', 'settings', 'contacts', 'discovery'];
  const out: Record<string, any> = {};
  for (const k of keys) {
    out[k] = (await load(k)) ?? [];
  }
  return out;
}

export async function importAll(payload: Record<string, any>) {
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
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
    a.href = url;
    a.download = `insurance-launcher_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return {
      success: true,
      path: a.download
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getDataDir(): Promise<string> {
  return 'browser-storage';
}

export function getDataDirSync(): string {
  return 'browser-storage';
}

export const isBrowserAdapter = true;