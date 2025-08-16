import { NextRequest, NextResponse } from 'next/server'
import { getDataDir } from '@/lib/storage'
import { generateExportFilename } from '@/lib/discovery/utils'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, data, yamlPayload } = body

    if (!sessionId || !data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get data directory
    const dataDir = await getDataDir()
    const exportDir = path.join(dataDir, 'exports', 'discovery')

    // Ensure export directory exists
    await mkdir(exportDir, { recursive: true })

    // Generate filenames
    const jsonFilename = generateExportFilename(data, 'json')
    const yamlFilename = generateExportFilename(data, 'yaml')

    const jsonPath = path.join(exportDir, jsonFilename)
    const yamlPath = path.join(exportDir, yamlFilename)

    // Write JSON file
    await writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8')

    // Write YAML file
    await writeFile(yamlPath, yamlPayload, 'utf-8')

    console.log('[Discovery Export] Files saved to:', exportDir)

    return NextResponse.json({
      success: true,
      exportPath: exportDir,
      files: {
        json: jsonFilename,
        yaml: yamlFilename
      }
    })

  } catch (error) {
    console.error('[Discovery Export] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export discovery files' },
      { status: 500 }
    )
  }
}