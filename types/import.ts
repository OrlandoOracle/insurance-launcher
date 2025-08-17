export interface ImportResult {
  success: boolean
  processed: number
  inserted: number
  updated: number
  skipped: number
  errorReportPath?: string
  errors?: Array<{ reason: string; row: any }>
}