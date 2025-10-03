import { NextRequest, NextResponse } from 'next/server';

// Simple PIN-based authentication for officials
// In production, this should be more secure with proper user management
const OFFICIAL_PINS = {
  '1234': { id: 'admin1', name: 'Admin User', role: 'Administrator' },
  '5678': { id: 'staff1', name: 'Staff Member', role: 'Staff' },
  '9999': { id: 'security1', name: 'Security Officer', role: 'Security' },
  '4253': { id: 'security1', name: 'Mbiplang Ardel', role: 'Staff' },
  // Add more PINs as needed
};

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      );
    }

    const official = OFFICIAL_PINS[pin as keyof typeof OFFICIAL_PINS];

    if (!official) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      official,
    });

  } catch (error) {
    console.error('Error authenticating official:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}