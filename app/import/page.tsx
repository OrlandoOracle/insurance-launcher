'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import Papa from 'papaparse'

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFile(file)
      Papa.parse(file, {
        header: true,
        preview: 5,
        complete: (results) => {
          setPreview(results.data)
          autoDetectMapping(results.meta.fields || [])
        }
      })
    }
  }

  const autoDetectMapping = (fields: string[]) => {
    const newMapping: Record<string, string> = {}
    
    fields.forEach(field => {
      const lower = field.toLowerCase()
      if (lower.includes('first') && lower.includes('name')) {
        newMapping.firstName = field
      } else if (lower.includes('last') && lower.includes('name')) {
        newMapping.lastName = field
      } else if (lower.includes('email')) {
        newMapping.email = field
      } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell')) {
        newMapping.phone = field
      } else if (lower.includes('source') || lower.includes('heard') || lower.includes('lead')) {
        newMapping.howHeard = field
      }
    })
    
    setMapping(newMapping)
  }

  const handleImport = async () => {
    if (!file) return
    
    setImporting(true)
    
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const contacts = results.data.map((row: any) => ({
          firstName: row[mapping.firstName] || '',
          lastName: row[mapping.lastName] || '',
          email: row[mapping.email] || '',
          phone: row[mapping.phone] || '',
          howHeard: row[mapping.howHeard] || ''
        })).filter(c => c.firstName && c.lastName)
        
        try {
          const response = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contacts)
          })
          
          const importResults = await response.json()
          setResults(importResults)
        } catch (error) {
          setResults({
            success: false,
            error: 'Failed to import contacts',
            details: String(error)
          })
        }
        
        setImporting(false)
      }
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'text/csv') {
      handleFileChange({ target: { files: [file] } } as any)
    }
  }

  const resetImport = () => {
    setFile(null)
    setPreview([])
    setMapping({})
    setResults(null)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Import Contacts</h1>
      
      {!results ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop CSV file here or click to browse</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Expected columns: firstName, lastName, email, phone, howHeard
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button as="span" variant="outline">Choose File</Button>
                </label>
                {file && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    <FileText className="inline h-4 w-4 mr-1" />
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Field Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {['firstName', 'lastName', 'email', 'phone', 'howHeard'].map((field) => (
                      <div key={field}>
                        <label className="text-sm font-medium capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                          {field === 'firstName' || field === 'lastName' ? ' *' : ''}
                        </label>
                        <select
                          className="w-full p-2 border rounded mt-1"
                          value={mapping[field] || ''}
                          onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                        >
                          <option value="">Not mapped</option>
                          {Object.keys(preview[0] || {}).map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Preview (First 5 rows)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">First Name</th>
                            <th className="text-left p-2">Last Name</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Phone</th>
                            <th className="text-left p-2">How Heard</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{row[mapping.firstName] || '-'}</td>
                              <td className="p-2">{row[mapping.lastName] || '-'}</td>
                              <td className="p-2">{row[mapping.email] || '-'}</td>
                              <td className="p-2">{row[mapping.phone] || '-'}</td>
                              <td className="p-2">{row[mapping.howHeard] || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleImport}
                      disabled={!mapping.firstName || !mapping.lastName || importing}
                    >
                      {importing ? 'Importing...' : 'Import Contacts'}
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/leads')}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.success ? (
                <>
                  {results.createdCount > 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{results.createdCount} contacts imported successfully</span>
                    </div>
                  )}
                  
                  {results.skippedCount > 0 && (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertCircle className="h-5 w-5" />
                      <span>{results.skippedCount} duplicates skipped</span>
                    </div>
                  )}
                  
                  {results.errorCount > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-600">
                        <X className="h-5 w-5" />
                        <span>{results.errorCount} errors occurred</span>
                      </div>
                      {results.errors?.length > 0 && (
                        <div className="bg-red-50 p-4 rounded text-sm">
                          {results.errors.map((error: string, i: number) => (
                            <p key={i} className="text-red-800">{error}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-4">
                      Total processed: {results.totalProcessed} contacts
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      ✓ Follow-up tasks created for all new leads
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-red-50 p-4 rounded">
                  <p className="text-red-800 font-medium">Import failed</p>
                  <p className="text-red-600 text-sm mt-1">{results.error}</p>
                  {results.details && (
                    <p className="text-red-600 text-xs mt-2">{results.details}</p>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Link href="/leads">
                  <Button>View Leads</Button>
                </Link>
                <Button variant="outline" onClick={resetImport}>
                  Import More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}