import { z } from 'zod';

export const StageEnum = z.enum([
  "Data Lead",
  "Data Lead - Positive Contact",
  "Positive Contact Responded",
  "30 Day Aged Leads",
  "1st Call (Discovery)",
  "1st Call (Discovery) - No Show",
  "2nd Call (Pitch)",
  "2nd Call (Pitch) - No Show",
  "3rd Call (Close)",
  "3rd Call (Close) - No Show",
  "3rd Call (Close) - Follow Up",
  "SOLD - Not Submitted",
  "Lead (FB Form)",
  "Sold",
  "Lost",
  "Potential Duplicate"
]);

export const LeadSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phones: z.array(z.string()).default([]),
  emails: z.array(z.string()).default([]),
  stage: StageEnum,
  tags: z.array(z.string()).default([]),
  dob: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
  rapport: z.string().optional(),
  notes: z.string().optional(),
  appointments: z.array(z.object({
    when: z.string(),
    type: z.string().optional(),
    notes: z.string().optional()
  })).default([]),
  insuredWith: z.string().optional(),
  income: z.number().optional(),
  meta: z.record(z.unknown()).default({})
});
export type Lead = z.infer<typeof LeadSchema>;
export type Stage = z.infer<typeof StageEnum>;

export const IndexEntrySchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  emails: z.array(z.string()).default([]),
  phones: z.array(z.string()).default([]),
  stage: StageEnum,
  updatedAt: z.string(),
  filePath: z.string(),   // legacy: keep for backward read if present
  folderPath: z.string(),
  jsonPath: z.string()
});
export type IndexEntry = z.infer<typeof IndexEntrySchema>;

export interface ImportReport {
  timestamp: string;
  totalRows: number;
  imported: number;
  duplicates: number;
  errors: number;
  details: {
    originalRow: Record<string, string | number | null | undefined>;
    result: 'imported' | 'duplicate' | 'error';
    leadId?: string;
    filePath?: string;
    duplicateOf?: string[];
    error?: string;
  }[];
}

export const CSVMappingSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phones: z.array(z.string()).optional(),
  emails: z.array(z.string()).optional(),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  source: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional()
});

export type CSVMapping = z.infer<typeof CSVMappingSchema>;