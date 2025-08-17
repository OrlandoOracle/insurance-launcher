import { v4 as uuidv4 } from 'uuid';
import { fs } from './fs';
import { indexService } from './index';
import { getStageFolder, leadFolderName, companionPath, getCompanionFilePath } from './paths';
import type { Lead, IndexEntry } from './schema';
import { LeadSchema } from './schema';
import { set, get } from 'idb-keyval';

const LAST_OPEN_LEAD_KEY = 'last-open-lead-json-path';

export class DataStore {
  async createLead(data: Partial<Lead>): Promise<Lead> {
    const now = new Date().toISOString();
    const lead: Lead = {
      id: data.id ?? uuidv4(),
      createdAt: data.createdAt ?? now,
      updatedAt: now,
      firstName: data.firstName?.trim() || 'Unknown',
      lastName: data.lastName?.trim() || 'Unknown',
      phones: data.phones ?? [],
      emails: data.emails ?? [],
      stage: data.stage ?? 'Data Lead',
      tags: data.tags ?? [],
      dob: data.dob,
      address: data.address,
      source: data.source,
      rapport: data.rapport ?? '',
      notes: data.notes ?? '',
      appointments: data.appointments ?? [],
      insuredWith: data.insuredWith,
      income: data.income,
      meta: data.meta ?? {}
    };
    const folder = `${getStageFolder(lead.stage)}/${leadFolderName(lead.firstName, lead.lastName, lead.id)}`;
    const jsonPath = `${folder}/lead.json`;

    LeadSchema.parse(lead);
    await fs.writeJSONAt(jsonPath, lead);

    // Update index
    await indexService.upsert({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      emails: lead.emails,
      phones: lead.phones,
      stage: lead.stage as any,
      updatedAt: lead.updatedAt,
      filePath: jsonPath,      // legacy compat
      folderPath: folder,
      jsonPath
    });

    return lead;
  }

  async getLead(id: string): Promise<Lead | null> {
    try {
      const entry = await indexService.findById(id);
      if (!entry) return null;
      
      // Try new path first
      if (entry.jsonPath) {
        try {
          return await fs.readJSON<Lead>(entry.jsonPath);
        } catch (e: unknown) {
          console.warn('[getLead] Failed to read from jsonPath, trying legacy', e);
        }
      }
      
      // Fallback to legacy path
      if (entry.filePath) {
        return await fs.readJSON<Lead>(entry.filePath);
      }
      
      return null;
    } catch (error: unknown) {
      console.error('[getLead] Failed to get lead:', error);
      return null;
    }
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const lead = await this.getLead(id);
    if (!lead) throw new Error('Lead not found');
    
    const updated = { ...lead, ...updates, updatedAt: new Date().toISOString() };
    
    // find index entry to get jsonPath
    const entry = await indexService.findById(lead.id);
    const jsonPath = entry?.jsonPath ?? `${getStageFolder(updated.stage)}/${leadFolderName(updated.firstName, updated.lastName, updated.id)}/lead.json`;
    
    await fs.writeJSONAt(jsonPath, updated);
    await indexService.upsert({
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      emails: updated.emails,
      phones: updated.phones,
      stage: updated.stage as any,
      updatedAt: updated.updatedAt,
      filePath: jsonPath,
      folderPath: jsonPath.split('/').slice(0, -1).join('/'),
      jsonPath
    });

    return updated;
  }

  async duplicateLead(id: string): Promise<void> {
    const entry = await indexService.findById(id);
    if (!entry) throw new Error('Lead not found');
    const lead = await fs.readJSON<Lead>(entry.jsonPath || entry.filePath);
    lead.id = uuidv4();
    await this.createLead({ ...lead, tags: [...(lead.tags||[]), 'duplicate'] });
  }

  async deleteLead(id: string): Promise<void> {
    const entry = await indexService.findById(id);
    if (!entry) return;
    const backupFolder = `Backups/Deleted_${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
    await fs.ensureFolder(backupFolder);
    // naive move: read/write then remove - File System Access lacks atomic rename
    const lead = await fs.readJSON<Lead>(entry.jsonPath || entry.filePath);
    await fs.writeJSONAt(`${backupFolder}/${entry.folderPath?.split('/').pop() || entry.id}.json`, lead);
    // Optionally: mark deleted in index or remove
    await indexService.remove(id);
  }

  async createCompanionFile(leadId: string, type: 'Medications' | 'Doctors' | 'Notes'): Promise<void> {
    const entry = await indexService.findById(leadId);
    if (!entry) throw new Error('Lead not found');
    
    const lead = await this.getLead(leadId);
    if (!lead) throw new Error('Lead data not found');
    
    // Use new folder structure if available
    let filePath: string;
    if (entry.folderPath) {
      filePath = companionPath(entry.folderPath, `${type}.md` as any);
    } else {
      // Legacy path
      filePath = getCompanionFilePath(entry.filePath, type);
    }
    
    const content = `# ${type} for ${lead.firstName} ${lead.lastName}\n\n_Created: ${new Date().toLocaleDateString()}_\n\n`;
    await fs.writeFile(filePath, content);
  }

  async getCompanionFile(leadId: string, type: 'Medications' | 'Doctors' | 'Notes'): Promise<string | null> {
    try {
      const entry = await indexService.findById(leadId);
      if (!entry) return null;
      
      // Try new folder structure first
      if (entry.folderPath) {
        const filePath = companionPath(entry.folderPath, `${type}.md` as any);
        try {
          return await fs.readFile(filePath);
        } catch (e: unknown) {
          // File doesn't exist in new location, try legacy
        }
      }
      
      // Try legacy path
      const legacyPath = getCompanionFilePath(entry.filePath, type);
      return await fs.readFile(legacyPath);
    } catch (error: unknown) {
      return null;
    }
  }

  async markLastOpen(jsonPath: string): Promise<void> {
    await set(LAST_OPEN_LEAD_KEY, jsonPath);
  }

  async getLastOpen(): Promise<string | null> {
    const v = await get(LAST_OPEN_LEAD_KEY);
    return (typeof v === 'string') ? v : null;
  }

  async getLeads(): Promise<IndexEntry[]> {
    return indexService.load();
  }

  searchLeads(query: string): IndexEntry[] {
    return indexService.search(query);
  }

  filterLeadsByStage(stage: string): IndexEntry[] {
    return indexService.get().filter(e => e.stage === stage);
  }
}

export const dataStore = new DataStore();