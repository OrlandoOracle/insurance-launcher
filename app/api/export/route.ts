import { NextResponse } from 'next/server';
import { exportAll } from '@/lib/storage';

export async function GET() {
  try {
    const data = await exportAll();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="insurance-backup-${timestamp}.json"`,
      },
    });
  } catch (e: any) {
    console.error('EXPORT_ERROR', e);
    return new NextResponse(e?.message || 'Export failed', { status: 500 });
  }
}