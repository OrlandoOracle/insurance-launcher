import { promises as fs } from 'fs'
import path from 'path'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ScriptPage() {
  let scriptContent = ''
  
  try {
    const scriptPath = path.join(process.cwd(), 'content', 'first-call.md')
    scriptContent = await fs.readFile(scriptPath, 'utf-8')
  } catch (error) {
    scriptContent = `# First Call Script

## Instructions
Create a file at \`content/first-call.md\` and paste your script there.

## Example Script Structure

### Opening
- Greeting and introduction
- Build rapport

### Discovery
- Current insurance situation
- Pain points
- Budget and timeline

### Presentation
- Match solution to needs
- Handle objections
- Benefits recap

### Close
- Trial close
- Next steps
- Schedule follow-up

### Post-Call
- Send information
- Log notes in CRM
- Set tasks`
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">First Call Script</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Script Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: scriptContent.replace(/\n/g, '<br />') }} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}