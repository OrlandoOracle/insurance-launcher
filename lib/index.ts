import { fs } from './fs';
import { FOLDER_STRUCTURE } from './paths';
import type { IndexEntry, Lead } from './schema';

export class IndexService {
  private cache: IndexEntry[] = [];
  private lastSaved: number = 0;
  private saveTimeout: NodeJS.Timeout | null = null;

  async load(): Promise<IndexEntry[]> {
    try {
      const content = await fs.readFile(FOLDER_STRUCTURE.indexFile);
      this.cache = JSON.parse(content);
      return this.cache;
    } catch (error) {
      console.error('Failed to load index, rebuilding:', error);
      return this.rebuild();
    }
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
                firstName: lead.firstName,
                lastName: lead.lastName,
                emails: lead.emails,
                phones: lead.phones,
                stage: lead.stage,
                updatedAt: lead.updatedAt
              });
            } catch (error) {
              console.error(`Failed to parse ${folder}/${file}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to list files in ${folder}:`, error);
      }
    }

    this.cache = entries;
    await this.save();
    return entries;
  }

  async add(entry: IndexEntry): Promise<void> {
    const existing = this.cache.findIndex(e => e.id === entry.id);
    if (existing >= 0) {
      this.cache[existing] = entry;
    } else {
      this.cache.push(entry);
    }
    this.scheduleSave();
  }

  async update(id: string, updates: Partial<IndexEntry>): Promise<void> {
    const index = this.cache.findIndex(e => e.id === id);
    if (index >= 0) {
      this.cache[index] = { ...this.cache[index], ...updates };
      this.scheduleSave();
    }
  }

  async remove(id: string): Promise<void> {
    this.cache = this.cache.filter(e => e.id !== id);
    this.scheduleSave();
  }

  get(): IndexEntry[] {
    return [...this.cache];
  }

  findById(id: string): IndexEntry | undefined {
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
    } catch (error) {
      console.error('Failed to save index:', error);
      throw error;
    }
  }
}

export const indexService = new IndexService();