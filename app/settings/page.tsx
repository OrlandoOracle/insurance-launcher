'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getSettings, updateSettings } from '@/app/actions/settings'
import { Save, ExternalLink, FolderOpen, Chrome, User } from 'lucide-react'

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

  useEffect(() => {
    loadSettings()
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

  const openDataFolder = () => {
    // In a real app, this would open the folder in the file explorer
    // For now, we'll just show an alert
    alert(`Data is stored at: ${settings.dataDir}`)
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Data Storage</CardTitle>
          <CardDescription>
            Configure where your data is stored. Use an absolute path for external drives.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Data Directory</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={settings.dataDir}
                onChange={(e) => setSettings({ ...settings, dataDir: e.target.value })}
                placeholder="/Volumes/ExternalDrive/InsuranceData"
              />
              <Button variant="outline" onClick={openDataFolder}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Current: {settings.dataDir}
            </p>
          </div>
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