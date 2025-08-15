'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getSettings, updateSettings } from '@/app/actions/settings'
import { Save, ExternalLink, FolderOpen } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    kixieUrl: '',
    icsCalendarUrl: '',
    dataDir: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const data = await getSettings()
    setSettings({
      kixieUrl: data.kixieUrl,
      icsCalendarUrl: data.icsCalendarUrl || '',
      dataDir: data.dataDir
    })
  }

  const handleSave = async () => {
    setSaving(true)
    await updateSettings({
      kixieUrl: settings.kixieUrl,
      icsCalendarUrl: settings.icsCalendarUrl || null,
      dataDir: settings.dataDir
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
            Configure how to construct GoHighLevel contact URLs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                To link contacts to GoHighLevel:
              </p>
              <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                <li>Find the contact in GoHighLevel</li>
                <li>Copy the contact's URL</li>
                <li>Paste it in the contact's GHL URL field in this app</li>
              </ol>
            </div>
            <p className="text-sm text-muted-foreground">
              Future versions will support automatic URL generation based on contact IDs.
            </p>
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