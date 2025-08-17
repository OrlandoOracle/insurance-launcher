'use client'

import { useState, useMemo, useCallback } from 'react'
import Papa from 'papaparse'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  Upload, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  Settings,
  FileDown
} from 'lucide-react'
import { resolveHeaderMap, type CanonicalField, CANONICAL_HEADERS } from '@/lib/csv-helpers'
import { useRouter } from 'next/navigation'

type Step = 'upload' | 'preview' | 'importing' | 'complete'

const FIELD_OPTIONS = [
  { value: 'ignore', label: 'Ignore' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'source', label: 'Source' },
  { value: 'stage', label: 'Stage' },
  { value: 'contactId', label: 'Contact ID' },
  { value: 'profileUrl', label: 'Profile URL' },
  { value: 'tags', label: 'Tags' },
]

interface ImportLeadsDialogProps {
  variant?: 'default' | 'empty'
}

export default function ImportLeadsDialog({ variant = 'default' }: ImportLeadsDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [mapping, setMapping] = useState<Record<string, CanonicalField | 'ignore'>>({})
  const [parseError, setParseError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  
  // Remember last mapping during session
  const [sessionMapping, setSessionMapping] = useState<Record<string, CanonicalField | 'ignore'>>({})

  const resetState = useCallback(() => {
    setStep('upload')
    setFile(null)
    setHeaders([])
    setRows([])
    setMapping({})
    setParseError(null)
    setImportResult(null)
  }, [])

  const handleFileUpload = useCallback((f: File) => {
    setFile(f)
    setParseError(null)
    
    // Read file and parse
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      
      // Parse with very relaxed settings
      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false,
        complete: (result) => {
          // Ignore field mismatch errors
          const data = result.data as any[]
          if (data.length === 0) {
            setParseError('No data found in CSV file')
            return
          }
          
          // Get headers from first row
          const fileHeaders = Object.keys(data[0])
          setHeaders(fileHeaders)
          setRows(data)
          
          // Auto-detect mapping
          const autoMapping = resolveHeaderMap(fileHeaders)
          const mappingWithSession: Record<string, CanonicalField | 'ignore'> = {}
          
          for (const header of fileHeaders) {
            // Use session mapping if available, otherwise use auto-detected
            if (sessionMapping[header]) {
              mappingWithSession[header] = sessionMapping[header]
            } else {
              mappingWithSession[header] = autoMapping[header] || 'ignore'
            }
          }
          
          setMapping(mappingWithSession)
          
          // Move to preview step
          setStep('preview')
        },
        error: (err: any) => {
          setParseError(`Failed to parse CSV: ${err.message}`)
        }
      })
    }
    
    reader.onerror = () => {
      setParseError('Failed to read file')
    }
    
    reader.readAsText(f)
  }, [sessionMapping])

  const handleMappingChange = useCallback((header: string, value: CanonicalField | 'ignore') => {
    setMapping(prev => ({
      ...prev,
      [header]: value
    }))
    // Update session mapping
    setSessionMapping(prev => ({
      ...prev,
      [header]: value
    }))
  }, [])

  const validRowsCount = useMemo(() => {
    if (rows.length === 0) return 0
    
    let count = 0
    for (const row of rows) {
      // Check if row has at least firstName or lastName
      let hasName = false
      for (const [header, field] of Object.entries(mapping)) {
        if ((field === 'firstName' || field === 'lastName') && row[header]?.trim()) {
          hasName = true
          break
        }
      }
      if (hasName) count++
    }
    
    return count
  }, [rows, mapping])

  const handleImport = async () => {
    if (!file || rows.length === 0) return
    
    setStep('importing')
    
    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      
      // Send to API
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      setImportResult(result)
      setStep('complete')
      
      if (result.success) {
        // Refresh the page to show new leads
        router.refresh()
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message || 'Network error'}`)
      setStep('preview')
    }
  }

  const downloadErrorReport = () => {
    if (!importResult?.errorReportPath) return
    
    // Create a download link
    const link = document.createElement('a')
    link.href = importResult.errorReportPath
    link.download = 'import-errors.csv'
    link.click()
  }

  // Get preview rows
  const previewRows = rows.slice(0, 20)
  const hasMoreRows = rows.length > 20

  // Render button based on variant
  const renderButton = () => {
    if (variant === 'empty') {
      return (
        <Button 
          variant="outline" 
          onClick={() => setOpen(true)}
          size="sm"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      )
    }
    
    return (
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Import
      </Button>
    )
  }

  return (
    <>
      {renderButton()}
      
      <Dialog open={open} onOpenChange={(o) => {
        setOpen(o)
        if (!o && step === 'complete') {
          resetState()
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
            <DialogDescription>
              {step === 'upload' && 'Upload a CSV file to import leads'}
              {step === 'preview' && 'Review the mapping and preview your data'}
              {step === 'importing' && 'Importing your leads...'}
              {step === 'complete' && 'Import complete'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto py-4">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="csv-file" className="text-sm font-medium">
                    CSV File
                  </label>
                  <Input 
                    id="csv-file"
                    type="file" 
                    accept=".csv,text/csv,application/csv" 
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileUpload(f)
                    }}
                    className="cursor-pointer"
                  />
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Supports supervisor CSVs with any headers, order, or delimiters.
                      The system will auto-detect columns and handle extra fields gracefully.
                    </AlertDescription>
                  </Alert>
                </div>
                
                {parseError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{parseError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {/* Step 2: Preview with Mapping */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Column Mapping</h3>
                  <div className="border rounded-lg max-h-[200px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CSV Column</TableHead>
                          <TableHead>Maps To</TableHead>
                          <TableHead>Sample Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {headers.map((header) => {
                          const sampleValue = rows[0]?.[header] || ''
                          const currentMapping = mapping[header] || 'ignore'
                          
                          return (
                            <TableRow key={header}>
                              <TableCell className="font-medium text-sm">
                                {header}
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={currentMapping} 
                                  onValueChange={(value) => handleMappingChange(header, value as CanonicalField | 'ignore')}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_OPTIONS.map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {sampleValue}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Data Preview</h3>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {rows.length} total rows
                      </Badge>
                      <Badge variant="default" className="bg-green-600">
                        {validRowsCount} valid
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-x-auto max-h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.entries(mapping)
                            .filter(([_, field]) => field !== 'ignore')
                            .map(([header, field]) => (
                              <TableHead key={header} className="min-w-[100px]">
                                {FIELD_OPTIONS.find(o => o.value === field)?.label || header}
                              </TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, idx) => (
                          <TableRow key={idx}>
                            {Object.entries(mapping)
                              .filter(([_, field]) => field !== 'ignore')
                              .map(([header]) => (
                                <TableCell key={header} className="text-sm">
                                  {row[header] || '-'}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {hasMoreRows && (
                    <p className="text-xs text-muted-foreground text-center">
                      Showing first 20 of {rows.length} rows
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 3: Importing */}
            {step === 'importing' && (
              <div className="space-y-4 py-8">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                  <div>
                    <p className="text-lg font-medium">Importing leads...</p>
                    <p className="text-sm text-muted-foreground">This may take a few moments</p>
                  </div>
                  <Progress value={50} className="w-full max-w-xs mx-auto" />
                </div>
              </div>
            )}
            
            {/* Step 4: Complete */}
            {step === 'complete' && importResult && (
              <div className="space-y-4">
                {importResult.success ? (
                  <>
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Import completed successfully!
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{importResult.processed}</div>
                        <div className="text-sm text-muted-foreground">Processed</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{importResult.inserted}</div>
                        <div className="text-sm text-muted-foreground">Inserted</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                        <div className="text-sm text-muted-foreground">Updated</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                        <div className="text-sm text-muted-foreground">Skipped</div>
                      </div>
                    </div>
                    
                    {importResult.errorReportPath && (
                      <Alert>
                        <FileDown className="h-4 w-4" />
                        <AlertDescription>
                          Some rows were skipped during import.
                          <Button
                            variant="link"
                            size="sm"
                            onClick={downloadErrorReport}
                            className="ml-2"
                          >
                            Download error report
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Import failed: {importResult.error || 'Unknown error'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            {step === 'upload' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setOpen(false)
                  resetState()
                }}
              >
                Cancel
              </Button>
            )}
            
            {step === 'preview' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setStep('upload')}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={validRowsCount === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import {validRowsCount} Leads
                </Button>
              </>
            )}
            
            {step === 'complete' && (
              <Button 
                onClick={() => {
                  setOpen(false)
                  resetState()
                }}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}