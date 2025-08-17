const isBrowser = typeof window !== 'undefined';
const MODE = process.env.STORAGE_MODE || (isBrowser ? 'browser' : 'node');

let mod: any;
if (MODE === 'browser' || (isBrowser && MODE !== 'node')) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('./storage-browser');
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('./storage-node');
}

export const initStorage = mod.initStorage as () => Promise<void>;
export const load = mod.load as <T=any>(key: string) => Promise<T | null>;
export const save = mod.save as <T=any>(key: string, value: T) => Promise<void>;
export const remove = mod.remove as (key: string) => Promise<void>;
export const exportAll = mod.exportAll as () => Promise<Record<string, any>>;
export const importAll = mod.importAll as (payload: Record<string, any>) => Promise<void>;
export const createBackup = mod.createBackup as () => Promise<{ success: boolean; path?: string; error?: string }>;
export const getDataDir = mod.getDataDir as () => Promise<string>;
export const getDataDirSync = mod.getDataDirSync as () => string;
export const isBrowserAdapter = mod.isBrowserAdapter as boolean;

// Re-export compatibility functions for existing code
export { 
  ensureDataDirs,
  ensureDatabase,
  testDirectoryAccess,
  moveDataDirectory,
  listBackups,
  clearDataDirCache
} from './storage-old';