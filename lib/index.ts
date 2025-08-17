import { fs } from './fs';
import { FOLDER_STRUCTURE, getStageFolder, leadFolderName } from './paths';
import type { IndexEntry, Lead } from './schema';
import { LeadSchema } from './schema';

// Event emitter for index updates
const emitIndexUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('index:updated'));
  }
};

const STAGE_DIRS = [
  FOLDER_STRUCTURE.ACTIVE,
  FOLDER_STRUCTURE.SOLD,
  FOLDER_STRUCTURE.LOST,
  FOLDER_STRUCTURE.DUPS,
];

export class IndexService {
  private cache: IndexEntry[] = [];
  private lastSaved: number = 0;
  private saveTimeout: NodeJS.Timeout | null = null;
  private migrated = false;

  async load(): Promise<IndexEntry[]> {
    if (this.cache.length) return this.cache;
    try {
      const content = await fs.readFile(FOLDER_STRUCTURE.indexFile);
      this.cache = JSON.parse(content);
    } catch (error: unknown) {
      console.error('Failed to load index, rebuilding from disk:', error);
      // If no index on disk, build it now
      await this.fullScan();
    }
    
    return this.cache;
  }

  async save(): Promise<void> {
    await fs.writeJSONAt('leads.index.json', this.cache);
    emitIndexUpdated(); // Notify listeners of index change
  }

  async upsert(entry: IndexEntry): Promise<void> {
    await this.load(); // Ensure cache is loaded
    const existing = this.cache.findIndex(e => e.id === entry.id);
    if (existing >= 0) {
      this.cache[existing] = entry;
    } else {
      this.cache.push(entry);
    }
    this.scheduleSave();
  }

  async add(entry: IndexEntry): Promise<void> {
    return this.upsert(entry);
  }

  async update(id: string, updates: Partial<IndexEntry>): Promise<void> {
    const entry = await this.findById(id);
    if (entry) {
      await this.upsert({ ...entry, ...updates });
    }
  }

  async remove(id: string): Promise<void> {
    await this.load(); // Ensure cache is loaded
    this.cache = this.cache.filter(e => e.id !== id);
    this.scheduleSave();
  }

  async findById(id: string): Promise<IndexEntry | undefined> {
    if (!this.cache.length) await this.load();
    return this.cache.find(e => e.id === id);
  }

  /** NEW: Full filesystem scan to rebuild cache from disk */
  async fullScan(): Promise<IndexEntry[]> {
    console.log('[index.fullScan] Starting full filesystem scan...');
    const next: IndexEntry[] = [];

    for (const stageDir of STAGE_DIRS) {
      let children: Array<{ name: string; kind: 'file' | 'directory' }> = [];
      try {
        children = await fs.listDir(stageDir);
      } catch (e: unknown) {
        // Folder may not exist yet; skip
        console.log(`[index.fullScan] Stage dir ${stageDir} not found, skipping`);
        continue;
      }

      console.log(`[index.fullScan] Scanning ${stageDir}: found ${children.length} entries`);

      for (const child of children) {
        if (child.kind !== 'directory') continue;
        const folderPath = `${stageDir}/${child.name}`;
        const jsonPath = `${folderPath}/lead.json`;
        
        try {
          const exists = await fs.fileExists(jsonPath);
          if (!exists) {
            console.log(`[index.fullScan] No lead.json in ${folderPath}, skipping`);
            continue;
          }

          const lead = await fs.readJSON<Lead>(jsonPath);
          const parsed = LeadSchema.parse(lead);
          next.push({
            id: parsed.id,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            emails: parsed.emails || [],
            phones: parsed.phones || [],
            stage: parsed.stage,
            updatedAt: parsed.updatedAt,
            filePath: jsonPath, // legacy field kept for compatibility
            folderPath,
            jsonPath
          });
          console.log(`[index.fullScan] Added lead: ${parsed.firstName} ${parsed.lastName} (${parsed.id})`);
        } catch (e: unknown) {
          console.error('[index.fullScan] Failed to read', jsonPath, e);
          continue;
        }
      }
    }

    // Replace cache and persist index
    this.cache = next.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
    await this.save();
    console.log(`[index.fullScan] Complete. Found ${this.cache.length} leads total`);
    return this.cache;
  }

  async rebuild(): Promise<IndexEntry[]> {
    return this.fullScan();
  }

  // Legacy sync methods for backward compat
  get(): IndexEntry[] {
    return [...this.cache];
  }

  findById_sync(id: string): IndexEntry | undefined {
    return this.cache.find(e => e.id === id);
  }

  findByEmail(email: string): IndexEntry[] {
    return this.cache.filter(e => 
      e.emails.some(e => e.toLowerCase() === email.toLowerCase())
    );
  }

  findByPhone(phone: string): IndexEntry[] {
    const normalized = phone.replace(/\D/g, '');
    return this.cache.filter(e => 
      e.phones.some(p => p.replace(/\D/g, '').includes(normalized))
    );
  }

  findByName(firstName: string, lastName: string): IndexEntry[] {
    return this.cache.filter(e => 
      e.firstName.toLowerCase() === firstName.toLowerCase() &&
      e.lastName.toLowerCase() === lastName.toLowerCase()
    );
  }

  search(query: string): IndexEntry[] {
    const q = query.toLowerCase();
    return this.cache.filter(e => 
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.emails.some(email => email.toLowerCase().includes(q)) ||
      e.phones.some(phone => phone.includes(q))
    );
  }

  // MIGRATION: Move flat files /Leads/.../First_Last.json => /Leads/.../First_Last__<shortId>/lead.json
  private async migrateLegacyFlatFiles(): Promise<void> {
    // Quick scan: read index for entries that have filePath but no folderPath/jsonPath
    const needs = this.cache.filter(e => (!e.folderPath || !e.jsonPath) && e.filePath && e.filePath.endsWith('.json'));
    
    for (const e of needs) {
      try {
        const legacyPath = e.filePath;
        const lead = await fs.readJSON<Lead>(legacyPath);
        const folder = `${getStageFolder(e.stage)}/${leadFolderName(lead.firstName, lead.lastName, lead.id)}`;
        const jsonPath = `${folder}/lead.json`;
        
        // Check if new path already exists
        const exists = await fs.exists(jsonPath);
        if (!exists) {
          await fs.ensureFolder(folder);
          await fs.writeJSONAt(jsonPath, lead);
          // Optionally delete old file after successful migration
          // await fs.deleteFile(legacyPath);
        }
        
        e.folderPath = folder;
        e.jsonPath = jsonPath;
        // Keep filePath for backward compat
      } catch (err: unknown) {
        console.error('[migrateLegacyFlatFiles] failed for', e.id, err);
      }
    }
    
    if (needs.length > 0) {
      await this.save();
      console.log(`[migrateLegacyFlatFiles] Migrated ${needs.length} leads to folder structure`);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.save();
    }, 1000);
  }
}

export const indexService = new IndexService();