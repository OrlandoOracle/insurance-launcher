import { v4 as uuidv4 } from 'uuid';
import { fs } from './fs';
import { indexService } from './index';
import { FOLDER_STRUCTURE, getLeadFolderByStage, getLeadFilename } from './paths';
import type { Lead, IndexEntry } from './schema';
import { LeadSchema } from './schema';

export class DataStore {
  async createLead(data: Partial<Lead>): Promise<Lead> {
    const lead: Lead = {
      id: data.id || uuidv4(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phones: data.phones || [],
      emails: data.emails || [],
      stage: data.stage || 'Data Lead',
      tags: data.tags || [],
      appointments: data.appointments || [],
      meta: data.meta || {},
      ...data
    };

    // Validate
    const validated = LeadSchema.parse(lead);
    
    // Determine folder and filename
    const folder = getLeadFolderByStage(validated.stage);
    const filename = getLeadFilename(validated.firstName, validated.lastName);
    const filePath = `${folder}/${filename}`;

    // Write to disk
    await fs.writeFile(filePath, JSON.stringify(validated, null, 2));

    // Update index
    const indexEntry: IndexEntry = {
      id: validated.id,
      filePath,
      firstName: validated.firstName,
      lastName: validated.lastName,
      emails: validated.emails,
      phones: validated.phones,
      stage: validated.stage,
      updatedAt: validated.updatedAt
    };
    
    await indexService.add(indexEntry);

    return validated;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const entry = indexService.findById(id);
    if (!entry) {
      throw new Error(`Lead ${id} not found`);
    }

    // Read current lead
    const content = await fs.readFile(entry.filePath);
    const current = JSON.parse(content) as Lead;

    // Merge updates
    const updated: Lead = {
      ...current,
      ...updates,
      id: current.id, // Preserve ID
      createdAt: current.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    // Validate
    const validated = LeadSchema.parse(updated);

    // Check if we need to move the file (stage changed)
    const newFolder = getLeadFolderByStage(validated.stage);
    const currentFolder = entry.filePath.substring(0, entry.filePath.lastIndexOf('/'));
    
    let newFilePath = entry.filePath;
    
    if (newFolder !== currentFolder) {
      // Move to new folder
      const filename = entry.filePath.substring(entry.filePath.lastIndexOf('/') + 1);
      newFilePath = `${newFolder}/${filename}`;
      
      await fs.writeFile(newFilePath, JSON.stringify(validated, null, 2));
      await fs.deleteFile(entry.filePath);
    } else {
      // Update in place
      await fs.writeFile(entry.filePath, JSON.stringify(validated, null, 2));
    }

    // Update index
    await indexService.update(id, {
      filePath: newFilePath,
      firstName: validated.firstName,
      lastName: validated.lastName,
      emails: validated.emails,
      phones: validated.phones,
      stage: validated.stage,
      updatedAt: validated.updatedAt
    });

    return validated;
  }

  async getLead(id: string): Promise<Lead | null> {
    const entry = indexService.findById(id);
    if (!entry) return null;

    try {
      const content = await fs.readFile(entry.filePath);
      return JSON.parse(content) as Lead;
    } catch {
      return null;
    }
  }

  async deleteLead(id: string): Promise<void> {
    const entry = indexService.findById(id);
    if (!entry) return;

    // Create backup
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const backupPath = `${FOLDER_STRUCTURE.backups}/Deleted_${timestamp}/${entry.filePath.split('/').pop()}`;
    
    const content = await fs.readFile(entry.filePath);
    await fs.writeFile(backupPath, content);
    
    // Delete original
    await fs.deleteFile(entry.filePath);
    
    // Update index
    await indexService.remove(id);
  }

  async duplicateLead(id: string): Promise<Lead> {
    const lead = await this.getLead(id);
    if (!lead) throw new Error(`Lead ${id} not found`);

    const duplicate = {
      ...lead,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to duplicates folder
    const filename = getLeadFilename(duplicate.firstName, duplicate.lastName);
    const filePath = `${FOLDER_STRUCTURE.duplicates}/${filename}`;
    
    await fs.writeFile(filePath, JSON.stringify(duplicate, null, 2));

    // Update index
    const indexEntry: IndexEntry = {
      id: duplicate.id,
      filePath,
      firstName: duplicate.firstName,
      lastName: duplicate.lastName,
      emails: duplicate.emails,
      phones: duplicate.phones,
      stage: duplicate.stage,
      updatedAt: duplicate.updatedAt
    };
    
    await indexService.add(indexEntry);

    return duplicate;
  }

  async createCompanionFile(
    leadId: string,
    type: 'Medications' | 'Doctors' | 'Notes',
    content?: string
  ): Promise<void> {
    const entry = indexService.findById(leadId);
    if (!entry) throw new Error(`Lead ${leadId} not found`);

    const dir = entry.filePath.substring(0, entry.filePath.lastIndexOf('/'));
    const baseName = entry.filePath.substring(
      entry.filePath.lastIndexOf('/') + 1,
      entry.filePath.lastIndexOf('.')
    );
    const companionPath = `${dir}/${baseName}_${type}.md`;

    const defaultContent = {
      Medications: '# Medications\n\n## Current Medications\n- \n\n## Allergies\n- \n\n## Notes\n',
      Doctors: '# Doctors\n\n## Primary Care Physician\nName: \nPhone: \nAddress: \n\n## Specialists\n- \n\n## Notes\n',
      Notes: `# Notes\n\nCreated: ${new Date().toISOString()}\n\n---\n\n`
    };

    await fs.writeFile(companionPath, content || defaultContent[type]);
  }

  async getCompanionFile(leadId: string, type: 'Medications' | 'Doctors' | 'Notes'): Promise<string | null> {
    const entry = indexService.findById(leadId);
    if (!entry) return null;

    const dir = entry.filePath.substring(0, entry.filePath.lastIndexOf('/'));
    const baseName = entry.filePath.substring(
      entry.filePath.lastIndexOf('/') + 1,
      entry.filePath.lastIndexOf('.')
    );
    const companionPath = `${dir}/${baseName}_${type}.md`;

    try {
      return await fs.readFile(companionPath);
    } catch {
      return null;
    }
  }

  getLeads(): IndexEntry[] {
    return indexService.get();
  }

  searchLeads(query: string): IndexEntry[] {
    return indexService.search(query);
  }

  filterLeadsByStage(stage: string): IndexEntry[] {
    return indexService.get().filter(e => e.stage === stage);
  }
}

export const dataStore = new DataStore();