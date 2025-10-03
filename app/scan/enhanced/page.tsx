'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QRScanner from '@/components/scan/qr-scanner';
import ManualEntry from '@/components/scan/manual-entry';
import {
  User,
  Clock,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Shield,
  Ticket,
  Mail,
  Phone,
  QrCode,
  Keyboard,
  ArrowLeft
} from 'lucide-react';

interface TicketRecord {
  _id: string;
  type: 'convention' | 'dinner' | 'accommodation' | 'brochure';
  user: {
    fullName: string;
    email: string;
    phone: string;
  };
  amount: number;
  paymentReference: string;
  status: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedOutAt?: string;
  checkInHistory: Array<{
    action: 'check-in' | 'check-out';
    timestamp: string;
    officialId: string;
    officialName: string;
  }>;
  createdAt: string;
}

interface Official {
  id: string;
  name: string;
  role: string;
}

export default function EnhancedScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketId = searchParams.get('id');

  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [official, setOfficial] = useState<Official | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'qr' | 'manual' | 'result'>('qr');
  const [manualLoading, setManualLoading] = useState(false);

  // Check for existing official session
  useEffect(() => {
    const storedOfficial = localStorage.getItem('scan_official');
    if (storedOfficial) {
      setOfficial(JSON.parse(storedOfficial));
    }
  }, []);

  // If ticket ID is provided in URL, fetch it directly
  useEffect(() => {
    if (ticketId && official) {
      fetchTicketData(ticketId);
      setScanMode('result');
    }
  }, [ticketId, official]);

  const fetchTicketData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/scan/ticket/${id}`);
      const data = await response.json();

      if (response.ok) {
        setTicket(data.ticket);
        setScanMode('result');
      } else {
        setError(data.error || 'Failed to fetch ticket data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (data: string) => {
    try {
      // Extract ticket ID from QR code URL
      const url = new URL(data);
      if (url.hostname === 'gosa.events' && url.pathname === '/scan') {
        const id = url.searchParams.get('id');
        if (id) {
          fetchTicketData(id);
        } else {
          setError('Invalid QR code format');
        }
      } else {
        setError('QR code is not from GOSA events system');
      }
    } catch (err) {
      // If not a URL, treat as direct ticket ID
      if (data.length === 24) {
        fetchTicketData(data);
      } else {
        setError('Invalid QR code format');
      }
    }
  };

  const handleManualSearch = async (identifier: string, type: 'id' | 'reference' | 'email') => {
    try {
      setManualLoading(true);
      setError(null);

      let endpoint = '';
      switch (type) {
        case 'id':
          endpoint = `/api/v1/scan/ticket/${identifier}`;
          break;
        case 'reference':
          endpoint = `/api/v1/scan/search?reference=${encodeURIComponent(identifier)}`;
          break;
        case 'email':
          endpoint = `/api/v1/scan/search?email=${encodeURIComponent(identifier)}`;
          break;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (response.ok) {
        setTicket(data.ticket);
        setScanMode('result');
      } else {
        setError(data.error || 'Ticket not found');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setManualLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!official || !ticket) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/v1/scan/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket._id,
          officialId: official.id,
          officialName: official.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTicket(data.ticket);
        setSuccess('User checked in successfully!');
      } else {
        setError(data.error || 'Check-in failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!official || !ticket) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/v1/scan/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket._id,
          officialId: official.id,
          officialName: official.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTicket(data.ticket);
        setSuccess('User checked out successfully!');
      } else {
        setError(data.error || 'Check-out failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const getServiceTitle = (type: string) => {
    const titles: { [key: string]: string } = {
      convention: 'Convention Registration',
      dinner: 'Dinner Reservation',
      accommodation: 'Accommodation Booking',
      brochure: 'Brochure Order',
    };
    return titles[type] || type;
  };

  const getStatusColor = (status: string, checkedIn: boolean) => {
    if (status !== 'confirmed') return 'destructive';
    return checkedIn ? 'default' : 'secondary';
  };

  const resetScan = () => {
    setTicket(null);
    setError(null);
    setSuccess(null);
    setScanMode('qr');
    router.push('/scan/enhanced');
  };

  if (!official) {
    return <OfficialAuth onAuth={setOfficial} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">GOSA 2025 Convention</h1>
          <p className="text-gray-600">Enhanced Check-in System</p>
        </div>

        {/* Official Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="font-medium">Official: {official.name}</span>
                <Badge variant="outline">{official.role}</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('scan_official');
                  setOfficial(null);
                }}
              >
                Switch User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mode Selection */}
        {scanMode !== 'result' && (
          <Card>
            <CardHeader>
              <CardTitle>Select Scan Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={scanMode === 'qr' ? 'default' : 'outline'}
                  onClick={() => setScanMode('qr')}
                  className="h-20 flex-col"
                >
                  <QrCode className="h-6 w-6 mb-2" />
                  QR Scanner
                </Button>
                <Button
                  variant={scanMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setScanMode('manual')}
                  className="h-20 flex-col"
                >
                  <Keyboard className="h-6 w-6 mb-2" />
                  Manual Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading ticket information...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Scanner */}
        {scanMode === 'qr' && !loading && (
          <QRScanner
            onScan={handleQRScan}
            onError={setError}
          />
        )}

        {/* Manual Entry */}
        {scanMode === 'manual' && !loading && (
          <ManualEntry
            onSubmit={handleManualSearch}
            loading={manualLoading}
          />
        )}

        {/* Ticket Information */}
        {scanMode === 'result' && ticket && !loading && (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetScan}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                New Scan
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Ticket Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(ticket.status, ticket.checkedIn)}>
                    {ticket.checkedIn ? 'Checked In' : ticket.status === 'confirmed' ? 'Valid Ticket' : 'Invalid'}
                  </Badge>
                  {ticket.checkedIn && (
                    <span className="text-sm text-gray-500">
                      Since {new Date(ticket.checkedInAt!).toLocaleString()}
                    </span>
                  )}
                </div>

                <Separator />

                {/* User Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{ticket.user.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{ticket.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{ticket.user.phone}</span>
                  </div>
                </div>

                <Separator />

                {/* Ticket Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <p className="font-medium">{getServiceTitle(ticket.type)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <p className="font-medium">₦{ticket.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Reference:</span>
                    <p className="font-medium text-xs">{ticket.paymentReference}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Purchase Date:</span>
                    <p className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                {ticket.status === 'confirmed' && (
                  <div className="flex gap-3 pt-4">
                    {!ticket.checkedIn ? (
                      <Button
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        {actionLoading ? 'Processing...' : 'Check In'}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCheckOut}
                        disabled={actionLoading}
                        variant="outline"
                        className="flex-1"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {actionLoading ? 'Processing...' : 'Temporary Check Out'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check-in History */}
            {ticket.checkInHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Check-in History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ticket.checkInHistory.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          {entry.action === 'check-in' ? (
                            <LogIn className="h-4 w-4 text-green-600" />
                          ) : (
                            <LogOut className="h-4 w-4 text-orange-600" />
                          )}
                          <span className="capitalize font-medium">{entry.action}</span>
                          <span className="text-sm text-gray-500">by {entry.officialName}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Simple authentication component for officials
function OfficialAuth({ onAuth }: { onAuth: (official: Official) => void }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/scan/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (response.ok) {
        const official = data.official;
        localStorage.setItem('scan_official', JSON.stringify(official));
        onAuth(official);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-green-600" />
            Official Access
          </CardTitle>
          <p className="text-sm text-gray-600">Enter your PIN to access the check-in system</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg tracking-widest"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading || pin.length < 4} className="w-full">
              {loading ? 'Authenticating...' : 'Access System'}
            </Button>
          </form>

          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>For official use only. Contact admin if you need access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}