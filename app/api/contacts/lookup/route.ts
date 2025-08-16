import { NextRequest, NextResponse } from 'next/server';
import { findByEmailOrPhone } from '@/lib/dup';

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();
    
    if (!email && !phone) {
      return NextResponse.json({ 
        found: false, 
        contact: null 
      });
    }
    
    const contact = await findByEmailOrPhone(email, phone);
    
    if (contact) {
      return NextResponse.json({
        found: true,
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          stage: contact.stage
        }
      });
    }
    
    return NextResponse.json({
      found: false,
      contact: null
    });
  } catch (error: any) {
    console.error('[contacts/lookup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup contact' },
      { status: 500 }
    );
  }
}