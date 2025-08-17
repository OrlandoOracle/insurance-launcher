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
  "Lost"
]);

export const LeadSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),         // ISO
  updatedAt: z.string(),         // ISO
  firstName: z.string(),
  lastName: z.string(),
  phones: z.array(z.string()).default([]),   // E.164 if possible; accept raw and flag
  emails: z.array(z.string().email().or(z.string())).default([]), // allow raw if not valid
  stage: StageEnum,
  tags: z.array(z.string()).default([]),
  dob: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
  rapport: z.string().optional(),
  notes: z.string().optional(),
  appointments: z.array(z.object({
    when: z.string(),            // ISO
    type: z.string().optional(),
    notes: z.string().optional()
  })).default([]),
  insuredWith: z.string().optional(),
  income: z.number().optional(),
  meta: z.record(z.string(), z.unknown()).default({})
});

export type Lead = z.infer<typeof LeadSchema>;
export type Stage = z.infer<typeof StageEnum>;

export interface IndexEntry {
  id: string;
  filePath: string;
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  stage: Stage;
  updatedAt: string;
}

export interface ImportReport {
  timestamp: string;
  totalRows: number;
  imported: number;
  duplicates: number;
  errors: number;
  details: {
    originalRow: Record<string, string>;
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