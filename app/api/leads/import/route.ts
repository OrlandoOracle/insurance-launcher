import { NextRequest, NextResponse } from 'next/server'
import { importLeads } from '@/app/actions/import-leads'

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const mappingOverride = formData.get('mapping') as string | null
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Read file content
    const csvContent = await file.text()
    
    // Call import action
    const result = await importLeads(csvContent, file.name)
    
    // Return result
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API] Import error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Import failed',
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0
      },
      { status: 500 }
    )
  }
}