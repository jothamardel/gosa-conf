import { NextRequest, NextResponse } from 'next/server';

// Simple PIN-based authentication for officials
// In production, this should be more secure with proper user management
const OFFICIAL_PINS = {
  '56781': { id: 'staff1', name: 'Staff Member', role: 'Staff', pin: '56781' },
  '07010': { id: 'staff1', name: 'Christabel', role: 'Staff', pin: '07010' },
  '11291': { id: 'staff1', name: 'Retmun', role: 'Staff', pin: '11291' },
  '20022': { id: 'staff1', name: 'Nankus', role: 'Staff', pin: '20022' },
  '82005': { id: 'staff1', name: 'Nankusum', role: 'Staff', pin: '82005' },
  '72799': { id: 'staff1', name: "God's son", role: 'Staff', pin: '72799' },
  '72915': { id: 'staff1', name: "Bamnan", role: 'Staff', pin: '72915' },
  '09640': { id: 'staff1', name: "Fatihal", role: 'Staff', pin: '09640' },
  '53205': { id: 'staff1', name: "Ritshinen", role: 'Staff', pin: '53205' },
  '25802': { id: 'staff1', name: "Jirit", role: 'Staff', pin: '25802' },
  '20542': { id: 'staff1', name: "Nanbal", role: 'Staff', pin: '20542' },
  '23232': { id: 'staff1', name: "Mercy", role: 'Staff', pin: '23232' },
  '17200': { id: 'staff1', name: "Chelsea", role: 'Staff', pin: '17200' },
  // '1234': { id: 'admin1', name: 'Admin User', role: 'Administrator' },
  // '5678': { id: 'staff1', name: 'Staff Member', role: 'Staff' },
  // '9999': { id: 'security1', name: 'Security Officer', role: 'Security' },
  // '4253': { id: 'security1', name: 'Mbiplang Ardel', role: 'Staff' },
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