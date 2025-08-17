'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getSettings, updateSettings } from '@/app/actions/settings'
import { 
  updateDataDirectory, 
  testDataDirectory, 
  createDatabaseBackup,
  getStorageInfo 
} from '@/app/actions/storage'
import { 
  Save, ExternalLink, FolderOpen, Chrome, User, 
  Database, HardDrive, AlertCircle, CheckCircle, 
  Download, RefreshCw, Folder, Upload, FileJson
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    kixieUrl: '',
    icsCalendarUrl: '',
    dataDir: '',
    ghlOppsUrl: '',
    chromeProfileDir: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [availableProfiles, setAvailableProfiles] = useState<string[]>([])
  const [testResult, setTestResult] = useState<string>('')
  
  // Storage specific state
  const [currentDataDir, setCurrentDataDir] = useState('')
  const [newDataDir, setNewDataDir] = useState('')
  const [testingDir, setTestingDir] = useState(false)
  const [dirTestResult, setDirTestResult] = useState<any>(null)
  const [movingData, setMovingData] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [importBatches, setImportBatches] = useState<any[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [importingData, setImportingData] = useState(false)

  useEffect(() => {
    loadSettings()
    loadStorageInfo()
  }, [])

  const loadSettings = async () => {
    const data = await getSettings()
    setSettings({
      kixieUrl: data.kixieUrl,
      icsCalendarUrl: data.icsCalendarUrl || '',
      dataDir: data.dataDir,
      ghlOppsUrl: data.ghlOppsUrl || '',
      chromeProfileDir: data.chromeProfileDir || ''
    })
    setCurrentDataDir(data.dataDir)
    setNewDataDir(data.dataDir)
  }

  const loadStorageInfo = async () => {
    const info = await getStorageInfo()
    if (info.success) {
      setBackups(info.backups || [])
      setImportBatches(info.importBatches || [])
      if (info.dataDir) {
        setCurrentDataDir(info.dataDir)
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await updateSettings({
      kixieUrl: settings.kixieUrl,
      icsCalendarUrl: settings.icsCalendarUrl || null,
      dataDir: settings.dataDir,
      ghlOppsUrl: settings.ghlOppsUrl || null,
      chromeProfileDir: settings.chromeProfileDir || null
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTestDataDir = async () => {
    if (!newDataDir) {
      toast.error('Please enter a directory path')
      return
    }
    
    setTestingDir(true)
    setDirTestResult(null)
    
    const result = await testDataDirectory(newDataDir)
    setDirTestResult(result)
    setTestingDir(false)
    
    if (result.success) {
      toast.success('Directory is accessible')
    } else {
      toast.error(result.error || 'Directory test failed')
    }
  }

  const handleMoveDataDir = async () => {
    if (!newDataDir || newDataDir === currentDataDir) {
      toast.error('Please enter a different directory path')
      return
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to move your data from:\n${currentDataDir}\n\nTo:\n${newDataDir}\n\nThis will copy all data to the new location and create a backup.`
    )
    
    if (!confirmed) return
    
    setMovingData(true)
    const result = await updateDataDirectory(newDataDir)
    
    if (result.success) {
      toast.success(result.message || 'Data moved successfully')
      setCurrentDataDir(newDataDir)
      setSettings({ ...settings, dataDir: newDataDir })
      await loadStorageInfo()
    } else {
      toast.error(result.error || 'Failed to move data')
    }
    
    setMovingData(false)
  }

  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    const result = await createDatabaseBackup()
    
    if (result.success) {
      toast.success('Backup created successfully')
      await loadStorageInfo()
    } else {
      toast.error(result.error || 'Failed to create backup')
    }
    
    setCreatingBackup(false)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const openDataFolder = () => {
    // In a real app, this would open the folder in the file explorer
    // For now, we'll just show an alert
    alert(`Data is stored at: ${currentDataDir}`)
  }

  const testOpenGHL = async () => {
    setTestResult('Testing Chrome launch...')
    
    // First open the URL immediately
    const fallbackUrl = settings.ghlOppsUrl || 
      process.env.NEXT_PUBLIC_GHL_OPPS_URL ||
      "https://app.gohighlevel.com/v2/location/NNo96bNDoBnBlHRQwsf4/opportunities/list";
    
    const win = window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
    if (!win) {
      alert('Popup blocked - please allow popups for this site')
    }
    
    try {
      const response = await fetch('/api/open-ghl/launch', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.profiles?.length) {
        setAvailableProfiles(data.profiles)
      }
      
      // Format result for display
      const result = {
        '✅ Success': data.ok ? 'Yes' : 'No',
        '🔧 Strategy Used': data.via || 'None',
        '👤 Profile Requested': data.profile,
        '📋 Profiles Detected': data.profiles || [],
        '💬 Message': data.message || 'None',
        '⚠️ Fallback': data.fallback || 'None',
        '❓ Failure Reason': data.reason || 'None',
        '🔗 URL': data.url || fallbackUrl
      }
      
      setTestResult(JSON.stringify(result, null, 2))
      console.log('[Settings] Chrome launch test result:', data)
      
      if (data.ok) {
        alert(`✅ Chrome launched successfully!\n\nStrategy: ${data.via}\nProfile: ${data.profile}`)
      } else if (data.message) {
        alert(`⚠️ Chrome launch failed\n\n${data.message}\n\nA tab was opened in your browser as fallback.`)
      } else {
        alert(`⚠️ Chrome launch failed\n\nA tab was opened in your browser as fallback.\n\nCheck the test result for details.`)
      }
    } catch (error) {
      console.error('[Settings] Test Open GHL error:', error)
      setTestResult(`Error: ${error}\n\nNote: A tab was still opened as fallback.`)
      alert(`Error testing Chrome launch: ${error}\n\nA tab was opened as fallback.`)
    }
  }
  
  const applyProfile = (profileName: string) => {
    setSettings({ ...settings, chromeProfileDir: profileName })
    setTestResult('')
  }

  const handleExportData = async () => {
    setExportingData(true)
    try {
      const res = await fetch('/api/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `insurance-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch (error: any) {
      toast.error(error.message || 'Export failed')
    } finally {
      setExportingData(false)
    }
  }

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImportingData(true)
    try {
      const text = await file.text()
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text
      })
      
      if (!res.ok) throw new Error(await res.text())
      
      toast.success('Data imported successfully')
      // Reload the page to refresh all data
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Import failed')
    } finally {
      setImportingData(false)
      // Reset the input
      if (e.target) e.target.value = ''
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Enhanced Data Storage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Storage
          </CardTitle>
          <CardDescription>
            Configure where your data is stored. Use an absolute path for external drives.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Directory Info */}
          <Alert>
            <HardDrive className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Current Data Directory:</p>
                <code className="block bg-gray-100 p-2 rounded text-sm">{currentDataDir}</code>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Database: {currentDataDir}/insurance-launcher.db</span>
                  <span>Imports: {currentDataDir}/imports/</span>
                  <span>Backups: {currentDataDir}/backups/</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* New Directory Input */}
          <div>
            <label className="text-sm font-medium">New Data Directory</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newDataDir}
                onChange={(e) => setNewDataDir(e.target.value)}
                placeholder="/Volumes/ExternalDrive/InsuranceData"
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={handleTestDataDir}
                disabled={testingDir}
              >
                {testingDir ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Test Path'}
              </Button>
              <Button 
                variant="outline" 
                onClick={openDataFolder}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            {process.env.DATA_DIR && (
              <p className="text-xs text-muted-foreground mt-1">
                Environment default: {process.env.DATA_DIR}
              </p>
            )}
          </div>

          {/* Directory Test Result */}
          {dirTestResult && (
            <Alert variant={dirTestResult.success ? "default" : "destructive"}>
              {dirTestResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <p>Readable: {dirTestResult.readable ? '✓' : '✗'}</p>
                  <p>Writable: {dirTestResult.writable ? '✓' : '✗'}</p>
                  {dirTestResult.error && <p className="text-sm">Error: {dirTestResult.error}</p>}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Move Data Button */}
          {newDataDir && newDataDir !== currentDataDir && (
            <Button 
              onClick={handleMoveDataDir}
              disabled={movingData || !dirTestResult?.success}
              className="w-full"
            >
              {movingData ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Moving Data...
                </>
              ) : (
                <>
                  <Folder className="mr-2 h-4 w-4" />
                  Move Data to New Directory
                </>
              )}
            </Button>
          )}

          {/* Backup Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium">Database Backups</h4>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
              >
                {creatingBackup ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Create Backup
                  </>
                )}
              </Button>
            </div>
            
            {backups.length > 0 ? (
              <div className="space-y-1">
                {backups.slice(0, 3).map((backup, i) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    {backup.name} - {formatBytes(backup.size)} - {format(new Date(backup.created), 'MMM d, yyyy h:mm a')}
                  </div>
                ))}
                {backups.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {backups.length - 3} more backups
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No backups yet</p>
            )}
          </div>

          {/* Import History */}
          {importBatches.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Recent Imports</h4>
              <div className="space-y-1">
                {importBatches.slice(0, 3).map((batch) => (
                  <div key={batch.id} className="text-xs text-muted-foreground">
                    {batch.filename} - {batch.imported}/{batch.total} imported - {format(new Date(batch.createdAt), 'MMM d, yyyy')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export/Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Data Export & Import
          </CardTitle>
          <CardDescription>
            Export all your data to a JSON file or import from a backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleExportData}
              disabled={exportingData}
              variant="outline"
              className="flex-1"
            >
              {exportingData ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data
                </>
              )}
            </Button>
            
            <div className="flex-1">
              <input
                type="file"
                accept="application/json"
                onChange={handleImportData}
                disabled={importingData}
                className="hidden"
                id="import-file-input"
              />
              <label htmlFor="import-file-input">
                <Button
                  variant="outline"
                  disabled={importingData}
                  className="w-full"
                  asChild
                >
                  <span>
                    {importingData ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import from File
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Importing will replace all existing data. Make sure to export a backup first if you want to preserve current data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>External Services</CardTitle>
          <CardDescription>
            Configure URLs for external services and integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Kixie URL</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={settings.kixieUrl}
                onChange={(e) => setSettings({ ...settings, kixieUrl: e.target.value })}
                placeholder="https://app.kixie.com"
              />
              <a href={settings.kixieUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">ICS Calendar URL (Optional)</label>
            <Input
              value={settings.icsCalendarUrl}
              onChange={(e) => setSettings({ ...settings, icsCalendarUrl: e.target.value })}
              placeholder="https://calendar.google.com/calendar/ical/..."
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter an ICS URL to display external calendar events in the Tasks view.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GoHighLevel Integration</CardTitle>
          <CardDescription>
            Configure GoHighLevel integration for opening opportunities and Chrome profile settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              <Chrome className="h-4 w-4" />
              GHL Opportunities URL
            </label>
            <Input
              value={settings.ghlOppsUrl}
              onChange={(e) => setSettings({ ...settings, ghlOppsUrl: e.target.value })}
              placeholder="https://app.gohighlevel.com/v2/location/.../opportunities/list"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              The URL to your GHL opportunities page. This will open when clicking "Open GHL" in the lead intake form.
              {settings.ghlOppsUrl && (
                <span className="block mt-1">
                  Currently: <a href={settings.ghlOppsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View in browser</a>
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Chrome Profile Directory
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                value={settings.chromeProfileDir}
                onChange={(e) => setSettings({ ...settings, chromeProfileDir: e.target.value })}
                placeholder="Default"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={testOpenGHL}
                size="sm"
              >
                Test Open
              </Button>
            </div>
            <div className="text-sm text-muted-foreground mt-1 space-y-1">
              <p>The Chrome profile to use when opening GHL (macOS only).</p>
              {availableProfiles.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                  <p className="font-medium text-blue-900">Available Chrome profiles detected:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableProfiles.map(prof => (
                      <Button
                        key={prof}
                        type="button"
                        size="sm"
                        variant={settings.chromeProfileDir === prof ? "default" : "outline"}
                        onClick={() => applyProfile(prof)}
                        className="text-xs"
                      >
                        {prof} {settings.chromeProfileDir === prof && "✓"}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700">Click a profile to apply it</p>
                </div>
              )}
              <p>Common values: "Default", "Profile 1", "Profile 2", etc.</p>
              <p className="font-medium">To find your profile:</p>
              <ol className="list-decimal list-inside ml-2 space-y-0.5">
                <li>Open Chrome and go to chrome://version/</li>
                <li>Look for "Profile Path"</li>
                <li>The last folder name is your profile (e.g., "Default" or "Profile 1")</li>
              </ol>
            </div>
          </div>

          {testResult && (
            <div className="mt-4">
              <label className="text-sm font-medium">Test Result:</label>
              <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                {testResult}
              </pre>
            </div>
          )}

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Manual Contact Linking:</p>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>Find the contact in GoHighLevel</li>
              <li>Copy the contact's URL</li>
              <li>Paste it in the contact's GHL URL field in this app</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          {!saving && !saved && <Save className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}