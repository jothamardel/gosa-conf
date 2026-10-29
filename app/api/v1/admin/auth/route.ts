import { NextRequest, NextResponse } from 'next/server';
import {
  findAuthorizedAdminByPhone,
  normalizeAdminPhone,
} from '@/lib/constants/admin-access';

/**
 * Admin authentication endpoint.
 * Supports:
 *  1. Whitelisted Desk Admins (logging in by their phone number).
 *     Assigned role: 'desk_admin', canBroadcast: false.
 *  2. Super Administrators (logging in with master ADMIN_PASSWORD).
 *     Assigned role: 'super_admin', canBroadcast: true.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, phone, pin } = body;

    const identifier = String(phone || password || '').trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Phone number or password is required' },
        { status: 400 },
      );
    }

    // 1. Check if identifier is an authorized Desk Admin phone number
    const deskAdmin = findAuthorizedAdminByPhone(identifier);
    if (deskAdmin) {
      if (pin && deskAdmin.pin && pin !== deskAdmin.pin) {
        return NextResponse.json(
          { success: false, error: 'Invalid PIN for this admin phone number' },
          { status: 401 },
        );
      }

      console.log(`[Admin Auth] Desk admin logged in: ${deskAdmin.name} (${deskAdmin.phone}) at ${new Date().toISOString()}`);

      return NextResponse.json({
        success: true,
        message: `Welcome, ${deskAdmin.name}!`,
        admin: {
          id: deskAdmin.id,
          name: deskAdmin.name,
          phone: deskAdmin.phone,
          displayPhone: deskAdmin.displayPhone,
          role: 'desk_admin',
          canBroadcast: false,
        },
        timestamp: Date.now(),
      });
    }

    // 2. Check if identifier matches Master Admin Password
    const adminPassword = process.env.ADMIN_PASSWORD || 'GOSA@2025!';

    if (identifier === adminPassword || password === adminPassword) {
      console.log(`[Admin Auth] Super admin logged in with master password at ${new Date().toISOString()}`);

      return NextResponse.json({
        success: true,
        message: 'Super Admin authentication successful',
        admin: {
          id: 'super_admin',
          name: 'Super Administrator',
          role: 'super_admin',
          canBroadcast: true,
        },
        timestamp: Date.now(),
      });
    }

    // If identifier looks like a phone number but is not authorized
    const cleanPhone = normalizeAdminPhone(identifier);
    if (cleanPhone && cleanPhone.length >= 10) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This phone number is not authorized to access the Admin Dashboard. Please contact the lead convention administrator.',
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Invalid phone number or admin password' },
      { status: 401 },
    );
  } catch (error: any) {
    console.error('Admin auth API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Authentication failed' },
      { status: 500 },
    );
  }
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}