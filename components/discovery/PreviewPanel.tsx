'use client'

import { useState } from 'react'
import { useDiscoveryStore } from '@/lib/discovery/store'
import { formatToJSON, formatToYAML, formatForGHL, generateExportFilename } from '@/lib/discovery/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  Copy, 
  Download, 
  Save,
  Send,
  FileJson,
  FileText,
  FileCode
} from 'lucide-react'

export function PreviewPanel() {
  const { data, sessionId } = useDiscoveryStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const jsonContent = formatToJSON(data)
  const yamlContent = formatToYAML(data)
  const ghlContent = formatForGHL(data)

  const handleCopy = (content: string, format: string) => {
    navigator.clipboard.writeText(content)
    toast.success(`${format} copied to clipboard`)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/discovery/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          data,
          yamlPayload: yamlContent
        })
      })

      if (!response.ok) throw new Error('Save failed')
      
      toast.success('Discovery session saved to database')
      useDiscoveryStore.getState().markSaved()
    } catch (error) {
      toast.error('Failed to save session')
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/discovery/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          data,
          yamlPayload: yamlContent
        })
      })

      if (!response.ok) throw new Error('Export failed')
      
      const result = await response.json()
      
      // Trigger browser downloads
      const jsonBlob = new Blob([jsonContent], { type: 'application/json' })
      const yamlBlob = new Blob([yamlContent], { type: 'text/yaml' })
      
      const jsonUrl = URL.createObjectURL(jsonBlob)
      const yamlUrl = URL.createObjectURL(yamlBlob)
      
      const jsonFilename = generateExportFilename(data, 'json')
      const yamlFilename = generateExportFilename(data, 'yaml')
      
      // Download JSON
      const jsonLink = document.createElement('a')
      jsonLink.href = jsonUrl
      jsonLink.download = jsonFilename
      jsonLink.click()
      
      // Download YAML
      setTimeout(() => {
        const yamlLink = document.createElement('a')
        yamlLink.href = yamlUrl
        yamlLink.download = yamlFilename
        yamlLink.click()
      }, 500)
      
      toast.success(`Files exported to ${result.exportPath}`)
    } catch (error) {
      toast.error('Failed to export files')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePushToGHL = async () => {
    // Copy to clipboard
    await navigator.clipboard.writeText(ghlContent)
    toast.success('Discovery summary copied to clipboard')
    
    // Open GHL in new tab
    const ghlUrl = process.env.NEXT_PUBLIC_GHL_LEAD_URL || 'https://app.gohighlevel.com'
    window.open(ghlUrl, '_blank')
    
    toast.info('Paste the copied content into GHL')
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Discovery Preview</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="outline"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save to DB'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Files'}
          </Button>
          <Button
            onClick={handlePushToGHL}
            variant="default"
          >
            <Send className="h-4 w-4 mr-2" />
            Push to GHL
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
          <TabsTrigger value="ghl">GHL Format</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Discovery Summary</CardTitle>
              <CardDescription>
                Overview of collected information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Client Info */}
                <div>
                  <h3 className="font-semibold mb-2">Client Information</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd>{data.client.firstName} {data.client.lastName}</dd>
                    <dt className="text-muted-foreground">DOB:</dt>
                    <dd>{data.client.dob || 'Not provided'}</dd>
                    <dt className="text-muted-foreground">Location:</dt>
                    <dd>{data.client.zip} - {data.client.county}, {data.client.state}</dd>
                    <dt className="text-muted-foreground">Email:</dt>
                    <dd>{data.client.contact.email || 'Not provided'}</dd>
                    <dt className="text-muted-foreground">Phone:</dt>
                    <dd>{data.client.contact.phone || 'Not provided'}</dd>
                  </dl>
                </div>

                {/* Household */}
                {data.client.household.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Household Members</h3>
                    <ul className="text-sm space-y-1">
                      {data.client.household.map((member, i) => (
                        <li key={i}>
                          {member.firstName} {member.lastName} ({member.relationship}) - DOB: {member.dob}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Coverage Status */}
                <div>
                  <h3 className="font-semibold mb-2">Coverage Status</h3>
                  <div className="flex gap-2">
                    {data.discovery.status.losingCoverage && (
                      <Badge>Losing Coverage</Badge>
                    )}
                    {data.discovery.status.payingTooMuch && (
                      <Badge>Paying Too Much</Badge>
                    )}
                    {data.discovery.status.uninsured && (
                      <Badge>Currently Uninsured</Badge>
                    )}
                  </div>
                  {data.discovery.situationSummary && (
                    <p className="text-sm mt-2">{data.discovery.situationSummary}</p>
                  )}
                </div>

                {/* Next Call */}
                <div>
                  <h3 className="font-semibold mb-2">Next Call</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Email:</dt>
                    <dd>{data.nextCall.inviteEmail || 'Not provided'}</dd>
                    <dt className="text-muted-foreground">Spouse Joining:</dt>
                    <dd>{data.nextCall.spouseJoining ? 'Yes' : 'No'}</dd>
                    <dt className="text-muted-foreground">Screen Share Ready:</dt>
                    <dd>{data.nextCall.screenShareOk ? 'Yes' : 'No'}</dd>
                  </dl>
                </div>

                {/* Rapport Notes */}
                {data.rapport.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Rapport Notes ({data.rapport.length})</h3>
                    <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
                      {data.rapport.map((item, i) => (
                        <div key={i} className="text-gray-600">
                          [{new Date(item.ts).toLocaleTimeString()}] {item.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle>JSON Output</CardTitle>
              <CardDescription>
                Structured data in JSON format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button
                  onClick={() => handleCopy(jsonContent, 'JSON')}
                  className="absolute top-2 right-2"
                  size="sm"
                  variant="ghost"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                  {jsonContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yaml">
          <Card>
            <CardHeader>
              <CardTitle>YAML Output</CardTitle>
              <CardDescription>
                Structured data in YAML format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button
                  onClick={() => handleCopy(yamlContent, 'YAML')}
                  className="absolute top-2 right-2"
                  size="sm"
                  variant="ghost"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                  {yamlContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ghl">
          <Card>
            <CardHeader>
              <CardTitle>GHL Format</CardTitle>
              <CardDescription>
                Formatted text for GoHighLevel entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button
                  onClick={() => handleCopy(ghlContent, 'GHL format')}
                  className="absolute top-2 right-2"
                  size="sm"
                  variant="ghost"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs whitespace-pre-wrap">
                  {ghlContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Simple Badge component
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
      {children}
    </span>
  )
}