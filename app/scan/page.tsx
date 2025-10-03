'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Phone
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
  collected?: boolean;
  collectedAt?: string;
  checkInHistory: Array<{
    action: 'check-in' | 'check-out' | 'collected';
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

export default function ScanPage() {
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('id');

  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [official, setOfficial] = useState<Official | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check for existing official session
  useEffect(() => {
    const storedOfficial = localStorage.getItem('scan_official');
    if (storedOfficial) {
      setOfficial(JSON.parse(storedOfficial));
    }
  }, []);

  // Fetch ticket data
  useEffect(() => {
    if (ticketId) {
      fetchTicketData();
    } else {
      setError('No ticket ID provided');
      setLoading(false);
    }
  }, [ticketId]);

  const fetchTicketData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/scan/ticket/${ticketId}`);
      const data = await response.json();

      if (response.ok) {
        setTicket(data.ticket);
      } else {
        setError(data.error || 'Failed to fetch ticket data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!official) return;

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
          ticketId,
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
    if (!official) return;

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
          ticketId,
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

  const handleCollected = async () => {
    if (!official || !ticket) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/v1/scan/collected`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket._id,
          ticketType: ticket.type,
          officialId: official.id,
          officialName: official.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTicket(data.ticket);
        setSuccess('Item marked as collected successfully!');
      } else {
        setError(data.error || 'Failed to mark as collected');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionButtons = () => {
    if (!ticket) return null;

    // Always show buttons for confirmed/paid tickets
    const isValidTicket = ticket.status === 'confirmed' || ticket.status === 'paid' || ticket.amount > 0;

    if (!isValidTicket) {
      return (
        <div className="pt-4">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              This ticket is not valid for entry. Please contact support.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="flex gap-3 pt-4">
        {ticket.type === 'convention' && (
          <>
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
          </>
        )}

        {ticket.type === 'dinner' && (
          <>
            {!ticket.checkedIn ? (
              <Button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Admit to Dinner'}
              </Button>
            ) : (
              <Button
                onClick={handleCheckOut}
                disabled={actionLoading}
                variant="outline"
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Exit Dinner'}
              </Button>
            )}
          </>
        )}

        {ticket.type === 'brochure' && (
          <Button
            onClick={handleCollected}
            disabled={actionLoading || ticket.collected}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {actionLoading ? 'Processing...' : ticket.collected ? 'Already Collected' : 'Mark as Collected'}
          </Button>
        )}

        {ticket.type === 'accommodation' && (
          <>
            {!ticket.checkedIn ? (
              <Button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Check Into Room'}
              </Button>
            ) : (
              <Button
                onClick={handleCheckOut}
                disabled={actionLoading}
                variant="outline"
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Check Out of Room'}
              </Button>
            )}
          </>
        )}
      </div>
    );
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

  const getStatusColor = (status: string, checkedIn: boolean, collected?: boolean) => {
    if (status !== 'confirmed' && status !== 'paid') return 'destructive';
    if (collected) return 'default';
    return checkedIn ? 'default' : 'secondary';
  };

  const getStatusText = (ticket: TicketRecord) => {
    if (ticket.status !== 'confirmed' && ticket.status !== 'paid' && ticket.amount <= 0) {
      return 'Invalid Ticket';
    }

    if (ticket.type === 'brochure' && ticket.collected) {
      return 'Collected';
    }

    if (ticket.checkedIn) {
      return 'Checked In';
    }

    return 'Valid Ticket';
  };

  console.log({ ticket })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket information...</p>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!official) {
    return <OfficialAuth onAuth={setOfficial} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">GOSA 2025 Convention</h1>
          <p className="text-gray-600">Ticket Verification & Check-in System</p>
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

        {/* Ticket Information */}
        {ticket && (
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
                <Badge variant={getStatusColor(ticket.status, ticket.checkedIn, ticket.collected)}>
                  {getStatusText(ticket)}
                </Badge>
                {ticket.checkedIn && ticket.checkedInAt && (
                  <span className="text-sm text-gray-500">
                    Since {new Date(ticket.checkedInAt).toLocaleString()}
                  </span>
                )}
                {ticket.collected && ticket.collectedAt && (
                  <span className="text-sm text-gray-500">
                    Collected {new Date(ticket.collectedAt).toLocaleString()}
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
              {renderActionButtons()}
            </CardContent>
          </Card>
        )}

        {/* Activity History */}
        {ticket && ticket.checkInHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ticket.checkInHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      {entry.action === 'check-in' ? (
                        <LogIn className="h-4 w-4 text-green-600" />
                      ) : entry.action === 'check-out' ? (
                        <LogOut className="h-4 w-4 text-orange-600" />
                      ) : entry.action === 'collected' ? (
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="capitalize font-medium">
                        {entry.action === 'check-in' ? 'Checked In' :
                          entry.action === 'check-out' ? 'Checked Out' :
                            entry.action === 'collected' ? 'Collected' : entry.action}
                      </span>
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