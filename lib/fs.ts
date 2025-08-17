import { get, set, del } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { FOLDER_STRUCTURE, sanitizeFilename } from './paths';

const STORAGE_KEY = 'insurance-storage-handle';

export class FileSystemService {
  private rootHandle: FileSystemDirectoryHandle | null = null;

  async connect(): Promise<boolean> {
    try {
      console.debug('[fs.connect] Starting connection...');
      
      if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
        console.error('[fs.connect] File System Access API not available');
        return false;
      }
      
      // @ts-expect-error: showDirectoryPicker not in TS lib
      this.rootHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop'
      });
      
      console.debug('[fs.connect] Directory selected, saving handle...');
      await set(STORAGE_KEY, this.rootHandle);
      
      console.debug('[fs.connect] Ensuring folder structure...');
      await this.ensureFolderStructure();
      
      console.debug('[fs.connect] Connection successful');
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('[fs.connect] User cancelled directory picker');
      } else {
        console.error('[fs.connect] Failed to connect storage:', error);
      }
      return false;
    }
  }

  async restore(): Promise<boolean> {
    try {
      console.debug('[fs.restore] Attempting to restore connection...');
      
      const handle = await get(STORAGE_KEY);
      if (!handle) {
        console.debug('[fs.restore] No saved handle found');
        return false;
      }

      console.debug('[fs.restore] Found saved handle, checking permission...');
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      
      if (permission === 'granted') {
        console.debug('[fs.restore] Permission already granted');
        this.rootHandle = handle;
        return true;
      }

      if (permission === 'prompt') {
        console.debug('[fs.restore] Requesting permission...');
        const newPermission = await handle.requestPermission({ mode: 'readwrite' });
        if (newPermission === 'granted') {
          console.debug('[fs.restore] Permission granted after prompt');
          this.rootHandle = handle;
          return true;
        }
      }
      
      console.debug('[fs.restore] Permission denied');
      return false;
    } catch (error: unknown) {
      console.error('[fs.restore] Failed to restore storage:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.rootHandle = null;
    await del(STORAGE_KEY);
  }

  isConnected(): boolean {
    return this.rootHandle !== null;
  }

  private async ensureFolderStructure(): Promise<void> {
    if (!this.rootHandle) throw new Error('Not connected');

    const folders = [
      FOLDER_STRUCTURE.leads,
      FOLDER_STRUCTURE.active,
      FOLDER_STRUCTURE.sold,
      FOLDER_STRUCTURE.lost,
      FOLDER_STRUCTURE.duplicates,
      FOLDER_STRUCTURE.imports,
      FOLDER_STRUCTURE.backups,
      FOLDER_STRUCTURE.kpi
    ];

    for (const folderPath of folders) {
      await this.ensureFolder(folderPath);
    }

    // Create index file if it doesn't exist
    try {
      await this.readFile(FOLDER_STRUCTURE.indexFile);
    } catch (e: unknown) {
      await this.writeFile(FOLDER_STRUCTURE.indexFile, JSON.stringify([], null, 2));
    }
  }

  async ensureFolder(path: string): Promise<void> {
    if (!this.rootHandle) throw new Error('Not connected');
    
    const parts = path.split('/').filter(Boolean);
    let dir: FileSystemDirectoryHandle = this.rootHandle;
    for (const p of parts) {
      // @ts-expect-error: getDirectoryHandle options not in all lib doms
      dir = await dir.getDirectoryHandle(p, { create: true });
    }
  }

  async readFile(path: string): Promise<string> {
    if (!this.rootHandle) throw new Error('Not connected');
    
    const parts = path.split('/');
    const filename = parts.pop()!;
    
    let current: FileSystemDirectoryHandle = this.rootHandle;
    for (const part of parts) {
      if (part) {
        current = await current.getDirectoryHandle(part);
      }
    }
    
    const fileHandle = await current.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.rootHandle) throw new Error('Not connected');
    
    const parts = path.split('/');
    const filename = parts.pop()!;
    
    let current: FileSystemDirectoryHandle = this.rootHandle;
    for (const part of parts) {
      if (part) {
        current = await current.getDirectoryHandle(part, { create: true });
      }
    }
    
    const fileHandle = await current.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.rootHandle) throw new Error('Not connected');
    
    const parts = path.split('/');
    const filename = parts.pop()!;
    
    let current: FileSystemDirectoryHandle = this.rootHandle;
    for (const part of parts) {
      if (part) {
        current = await current.getDirectoryHandle(part);
      }
    }
    
    await current.removeEntry(filename);
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const content = await this.readFile(fromPath);
    await this.writeFile(toPath, content);
    await this.deleteFile(fromPath);
  }

  async listFiles(dirPath: string): Promise<string[]> {
    if (!this.rootHandle) throw new Error('Not connected');
    
    const parts = dirPath.split('/').filter(Boolean);
    let current: FileSystemDirectoryHandle = this.rootHandle;
    
    for (const part of parts) {
      current = await current.getDirectoryHandle(part);
    }
    
    const files: string[] = [];
    // @ts-expect-error: entries() not in TS lib for FileSystemDirectoryHandle
    for await (const [name, handle] of current.entries()) {
      if (handle.kind === 'file' && name.endsWith('.json')) {
        files.push(name);
      }
    }
    
    return files;
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.readFile(path);
      return true;
    } catch (e: unknown) {
      return false;
    }
  }

  getRootHandle(): FileSystemDirectoryHandle | null {
    return this.rootHandle;
  }

  async uniqueLeadPathFor(data: { firstName: string; lastName: string }, folder: string): Promise<string> {
    const baseName = sanitizeFilename(data.firstName, data.lastName);
    let filename = `${baseName}.json`;
    let filePath = `${folder}/${filename}`;
    
    // Check if file exists
    try {
      await this.readFile(filePath);
      // File exists, add UUID suffix
      const uuid = uuidv4().split('-')[0]; // Use first part of UUID for brevity
      filename = `${baseName}__${uuid}.json`;
      filePath = `${folder}/${filename}`;
    } catch (e: unknown) {
      // File doesn't exist, use original path
    }
    
    return filePath;
  }

  async verifyWritePermission(): Promise<boolean> {
    if (!this.rootHandle) return false;
    
    try {
      // @ts-expect-error: queryPermission not in TS lib
      const permission = await this.rootHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') return true;
      
      if (permission === 'prompt') {
        // @ts-expect-error: requestPermission not in TS lib
        const newPermission = await this.rootHandle.requestPermission({ mode: 'readwrite' });
        return newPermission === 'granted';
      }
      
      return false;
    } catch (error: unknown) {
      console.error('[fs.verifyWritePermission] Error:', error);
      return false;
    }
  }

  async ensureFolders(folders: string[]): Promise<void> {
    for (const folder of folders) {
      await this.ensureFolder(folder);
    }
  }

  async readJSON<T>(path: string): Promise<T> {
    const text = await this.readFile(path);
    return JSON.parse(text) as T;
  }

  async writeJSON<T>(path: string, data: T): Promise<void> {
    await this.writeFile(path, JSON.stringify(data, null, 2));
  }

  async getHandleForPath(path: string, opts?: { directory?: boolean }): Promise<FileSystemFileHandle|FileSystemDirectoryHandle> {
    if (!this.rootHandle) throw new Error('No root handle');
    const parts = path.split('/').filter(Boolean);
    let handle: any = this.rootHandle;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast && !opts?.directory) {
        // @ts-expect-error: lib dom typing gap
        handle = await handle.getFileHandle(part, { create: true });
      } else {
        // @ts-expect-error: lib dom typing gap
        handle = await handle.getDirectoryHandle(part, { create: true });
      }
    }
    return handle;
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.getHandleForPath(path);
      return true;
    } catch (e: unknown) {
      return false;
    }
  }

  async writeJSONAt(jsonPath: string, data: unknown): Promise<void> {
    const folderPath = jsonPath.split('/').slice(0, -1).join('/');
    await this.ensureFolder(folderPath);
    await this.writeFile(jsonPath, JSON.stringify(data, null, 2));
  }
}

export const fs = new FileSystemService();