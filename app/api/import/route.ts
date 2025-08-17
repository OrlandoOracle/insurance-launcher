import { NextRequest, NextResponse } from 'next/server';
import { importAll } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // Validate the payload has expected structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid import data format');
    }
    
    await importAll(payload);
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Data imported successfully' 
    });
  } catch (e: any) {
    console.error('IMPORT_ERROR', e);
    return new NextResponse(e?.message || 'Import failed', { status: 500 });
  }
}