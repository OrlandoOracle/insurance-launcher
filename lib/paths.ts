export const FOLDER_STRUCTURE = {
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

export function getLeadFolderByStage(stage: string): string {
  if (stage === 'Sold' || stage === 'SOLD - Not Submitted') {
    return FOLDER_STRUCTURE.sold;
  }
  if (stage === 'Lost') {
    return FOLDER_STRUCTURE.lost;
  }
  return FOLDER_STRUCTURE.active;
}

export function sanitizeFilename(firstName: string, lastName: string): string {
  const name = `${firstName}_${lastName}`;
  // Title case and replace spaces with underscores
  return name
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

export function getLeadFilename(firstName: string, lastName: string): string {
  return `${sanitizeFilename(firstName, lastName)}.json`;
}

export function getCompanionFilePath(leadPath: string, type: 'Medications' | 'Doctors' | 'Notes'): string {
  const dir = leadPath.substring(0, leadPath.lastIndexOf('/'));
  const baseName = leadPath.substring(leadPath.lastIndexOf('/') + 1, leadPath.lastIndexOf('.'));
  return `${dir}/${baseName}_${type}.md`;
}