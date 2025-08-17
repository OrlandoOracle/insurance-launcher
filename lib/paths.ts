export const FOLDER_STRUCTURE = {
  ROOT: 'InsuranceData',
  LEADS: 'Leads',
  ACTIVE: 'Leads/Active',
  SOLD: 'Leads/Sold',
  LOST: 'Leads/Lost',
  DUPS: 'Leads/Potential Duplicates',
  IMPORTS: 'Imports',
  BACKUPS: 'Backups',
  KPI: 'KPI',
  
  // Legacy structure names - keep for backward compat
  root: 'InsuranceData',
  leads: 'Leads',
  active: 'Leads/Active',
  sold: 'Leads/Sold',
  lost: 'Leads/Lost',
  duplicates: 'Leads/Potential Duplicates',
  imports: 'Imports',
  backups: 'Backups',
  kpi: 'KPI',
  indexFile: 'leads.index.json'
} as const;

export function getStageFolder(stage: string): string {
  if (stage.includes('Sold')) return FOLDER_STRUCTURE.SOLD;
  if (stage.includes('Lost')) return FOLDER_STRUCTURE.LOST;
  if (stage.includes('Potential')) return FOLDER_STRUCTURE.DUPS;
  return FOLDER_STRUCTURE.ACTIVE;
}

export function toTitleSafe(s: string): string {
  return (s || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export function shortId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 8);
}

export function leadFolderName(firstName: string, lastName: string, id: string): string {
  const left = `${toTitleSafe(firstName)}_${toTitleSafe(lastName)}`.replace(/^_+|_+$/g, '');
  return `${left}__${shortId(id)}`;
}

export function leadJsonRelativePath(folderName: string): string {
  return `${folderName}/lead.json`;
}

export function companionPath(folderName: string, file: 'Medications.md'|'Doctors.md'|'Notes.md'): string {
  return `${folderName}/${file}`;
}

// Legacy helpers - keep for backward compat
export function getLeadFolderByStage(stage: string): string {
  return getStageFolder(stage);
}

export function sanitizeFilename(firstName: string, lastName: string): string {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '').trim();
  return `${clean(firstName)}_${clean(lastName)}`;
}

export function getLeadFilename(firstName: string, lastName: string): string {
  return `${sanitizeFilename(firstName, lastName)}.json`;
}

export function getCompanionFilePath(leadPath: string, type: 'Medications' | 'Doctors' | 'Notes'): string {
  const dir = leadPath.substring(0, leadPath.lastIndexOf('/'));
  const baseName = leadPath.substring(leadPath.lastIndexOf('/') + 1, leadPath.lastIndexOf('.'));
  return `${dir}/${baseName}_${type}.md`;
}