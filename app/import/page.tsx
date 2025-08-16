'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, FileText, AlertCircle, CheckCircle, X, 
  Download, Eye, EyeOff, Users, UserX, Copy
} from 'lucide-react'
import Papa from 'papaparse'
import { buildFieldMap, describeMappings } from '@/lib/import/autoMap'
import { splitName, digitsOnly, formatPhone10, collapseSpaces } from '@/lib/import/normalize'
import { toast } from 'sonner'

interface PreviewRow {
  firstName: string
  lastName: string
  email: string
  phone: string
  source: string
}

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [fieldMap, setFieldMap] = useState<any>(null)
  const [mappingDesc, setMappingDesc] = useState('')
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [showMapping, setShowMapping] = useState(false)
  const [allowNoContact, setAllowNoContact] = useState(false)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFile(file)
      setResults(null)
      
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const data = results.data as any[]
          setCsvData(data)
          
          // Auto-map fields
          const headers = results.meta.fields || []
          const map = buildFieldMap(headers)
          setFieldMap(map)
          setMappingDesc(describeMappings(map))
          
          // Generate preview
          generatePreview(data.slice(0, 10), map)
        }
      })
    }
  }

  const generatePreview = (rows: any[], map: any) => {
    const previewRows: PreviewRow[] = []
    
    for (const row of rows) {
      let firstName = ''
      let lastName = ''
      
      if (map.fullName && row[map.fullName]) {
        const { first, last } = splitName(row[map.fullName])
        firstName = first
        lastName = last
      } else {
        if (map.firstName) {
          firstName = collapseSpaces(row[map.firstName] || '')
        }
        if (map.lastName) {
          lastName = collapseSpaces(row[map.lastName] || '')
        }
      }
      
      const emailRaw = map.email ? row[map.email] || '' : ''
      const email = emailRaw.toLowerCase().trim()
      
      const phoneRaw = map.phone ? row[map.phone] || '' : ''
      const phoneDigits = digitsOnly(phoneRaw)
      const phoneFormatted = formatPhone10(phoneDigits) || phoneDigits
      
      previewRows.push({
        firstName,
        lastName,
        email,
        phone: phoneFormatted,
        source: 'CSV Import'
      })
    }
    
    setPreview(previewRows)
  }

  const handleImport = async () => {
    if (!file) return
    
    setImporting(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('allowNoContact', String(allowNoContact))
      formData.append('source', 'CSV Import')
      
      const response = await fetch('/api/import/auto', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      setResults(result)
      
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} contacts`)
        
        // Refresh the page data after a short delay
        setTimeout(() => {
          router.refresh()
        }, 1000)
      } else {
        toast.error(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import contacts')
      setResults({
        success: false,
        error: 'Network error during import'
      })
    }
    
    setImporting(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'text/csv') {
      handleFileChange({ target: { files: [file] } } as any)
    }
  }

  const downloadSkipped = () => {
    if (!results) return
    
    const skipped = [
      ...results.examples.duplicates.map((r: any) => ({ ...r, status: 'Duplicate' })),
      ...results.examples.invalid.map((r: any) => ({ ...r, status: 'Invalid' }))
    ]
    
    const csv = Papa.unparse(skipped)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'skipped-contacts.csv'
    a.click()
  }

  const resetImport = () => {
    setFile(null)
    setCsvData([])
    setFieldMap(null)
    setMappingDesc('')
    setPreview([])
    setResults(null)
    setShowMapping(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Import Contacts</h1>
        {results && results.success && (
          <Link href="/leads">
            <Button>
              <Users className="mr-2 h-4 w-4" />
              View Leads
            </Button>
          </Link>
        )}
      </div>
      
      {!results ? (
        <>
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Carrier exports are automatically mapped. Agent fields are ignored.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drop CSV file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Files are automatically mapped and cleaned
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button as="span" className="cursor-pointer">
                    Choose File
                  </Button>
                </label>
                {file && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        resetImport()
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Auto-Mapping Info */}
          {fieldMap && (
            <Card>
              <CardHeader>
                <CardTitle>Field Mapping</CardTitle>
                <CardDescription>{mappingDesc}</CardDescription>
              </CardHeader>
              {showMapping && (
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {fieldMap.fullName && (
                      <div>
                        <Badge variant="outline">Name</Badge>
                        <span className="ml-2">{fieldMap.fullName} → First/Last (split)</span>
                      </div>
                    )}
                    {fieldMap.firstName && (
                      <div>
                        <Badge variant="outline">First</Badge>
                        <span className="ml-2">{fieldMap.firstName}</span>
                      </div>
                    )}
                    {fieldMap.lastName && (
                      <div>
                        <Badge variant="outline">Last</Badge>
                        <span className="ml-2">{fieldMap.lastName}</span>
                      </div>
                    )}
                    {fieldMap.email && (
                      <div>
                        <Badge variant="outline">Email</Badge>
                        <span className="ml-2">{fieldMap.email}</span>
                      </div>
                    )}
                    {fieldMap.phone && (
                      <div>
                        <Badge variant="outline">Phone</Badge>
                        <span className="ml-2">{fieldMap.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
              <CardContent className="pt-0">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowMapping(!showMapping)}
                >
                  {showMapping ? (
                    <>
                      <EyeOff className="mr-1 h-3 w-3" />
                      Hide mapping
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-3 w-3" />
                      Review mapping
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview (First 10 Rows After Cleaning)</CardTitle>
                <CardDescription>
                  Names split, emails lowercased, phones formatted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>First Name</TableHead>
                        <TableHead>Last Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Valid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, i) => {
                        const hasContact = row.email || row.phone
                        const isValid = (row.firstName || row.lastName) && (hasContact || allowNoContact)
                        
                        return (
                          <TableRow key={i}>
                            <TableCell>{row.firstName}</TableCell>
                            <TableCell>{row.lastName}</TableCell>
                            <TableCell className="text-sm">{row.email}</TableCell>
                            <TableCell className="text-sm">{row.phone}</TableCell>
                            <TableCell>
                              {isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-red-600" />
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Options */}
          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Import Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow-no-contact"
                    checked={allowNoContact}
                    onCheckedChange={setAllowNoContact}
                  />
                  <Label htmlFor="allow-no-contact">
                    Allow leads without contact info
                    <span className="text-sm text-muted-foreground ml-2">
                      (Import with name only)
                    </span>
                  </Label>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {csvData.length} rows found in CSV.
                    Duplicates will be automatically detected and skipped.
                    A batch tag will be added for tracking.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleImport} 
                  disabled={importing}
                  className="w-full"
                >
                  {importing ? 'Importing...' : `Import ${csvData.length} Rows`}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Results */
        <Card>
          <CardHeader>
            <CardTitle>
              {results.success ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Import Complete
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Import Failed
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.success ? (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{results.total}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{results.imported}</div>
                    <div className="text-sm text-muted-foreground">Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{results.duplicates}</div>
                    <div className="text-sm text-muted-foreground">Duplicates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{results.invalid}</div>
                    <div className="text-sm text-muted-foreground">Invalid</div>
                  </div>
                </div>
                
                {results.mapping && (
                  <Alert>
                    <AlertDescription>{results.mapping}</AlertDescription>
                  </Alert>
                )}
                
                {results.batchTag && (
                  <div className="flex items-center gap-2">
                    <Badge>{results.batchTag}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Added to all imported contacts
                    </span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Link href="/leads" className="flex-1">
                    <Button className="w-full">
                      <Users className="mr-2 h-4 w-4" />
                      View Leads
                    </Button>
                  </Link>
                  {(results.duplicates > 0 || results.invalid > 0) && (
                    <Button 
                      variant="outline"
                      onClick={downloadSkipped}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Skipped
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={resetImport}
                  >
                    Import Another
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {results.error || 'An error occurred during import'}
                  </AlertDescription>
                </Alert>
                <Button onClick={resetImport} className="w-full">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}