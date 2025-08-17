import { fs } from './fs';
import { FOLDER_STRUCTURE, getStageFolder, leadFolderName } from './paths';
import type { IndexEntry, Lead } from './schema';

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
      console.error('Failed to load index, rebuilding:', error);
      await this.rebuild();
    }
    
    // Run migration once per session
    if (!this.migrated) {
      await this.migrateLegacyFlatFiles();
      this.migrated = true;
    }
    
    return this.cache;
  }

  async rebuild(): Promise<IndexEntry[]> {
    const entries: IndexEntry[] = [];
    
    const folders = [
      FOLDER_STRUCTURE.active,
      FOLDER_STRUCTURE.sold,
      FOLDER_STRUCTURE.lost
    ];

    for (const folder of folders) {
      try {
        const files = await fs.listFiles(folder);
        
        for (const file of files) {
          if (file.endsWith('.json') && !file.includes('_')) {
            try {
              const content = await fs.readFile(`${folder}/${file}`);
              const lead: Lead = JSON.parse(content);
              
              entries.push({
                id: lead.id,
                filePath: `${folder}/${file}`,
                folderPath: '',  // Will be set by migration
                jsonPath: '',    // Will be set by migration
                firstName: lead.firstName,
                lastName: lead.lastName,
                emails: lead.emails,
                phones: lead.phones,
                stage: lead.stage,
                updatedAt: lead.updatedAt
              });
            } catch (error: unknown) {
              console.error(`Failed to parse ${folder}/${file}:`, error);
            }
          }
        }
      } catch (error: unknown) {
        console.error(`Failed to list files in ${folder}:`, error);
      }
    }

    this.cache = entries;
    await this.save();
    return entries;
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

  async save(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSaved < 500) return; // Debounce
    
    try {
      const sorted = [...this.cache].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      await fs.writeFile(
        FOLDER_STRUCTURE.indexFile,
        JSON.stringify(sorted, null, 2)
      );
      
      this.lastSaved = now;
    } catch (error: unknown) {
      console.error('Failed to save index:', error);
      throw error;
    }
  }
}

export const indexService = new IndexService();