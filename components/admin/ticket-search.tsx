'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Download,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  _id: string;
  type: 'convention' | 'dinner' | 'brochure' | 'accommodation';
  paymentReference: string;
  amount: number;
  status: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedOutAt?: string;
  collected: boolean;
  collectedAt?: string;
  user: {
    fullName: string;
    email: string;
    phone: string;
  };
  createdAt: string;
  checkInHistory: Array<{
    action: string;
    timestamp: string;
    officialId: string;
    officialName: string;
  }>;
  guestDetails?: Array<any>;
}

export function TicketSearch() {
  const [searchReference, setSearchReference] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPattern, setSearchPattern] = useState('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const handleClearSearch = () => {
    setSearchReference('');
    setTickets([]);
    setSearchPattern('');
  };

  const handleSearch = async () => {
    if (!searchReference.trim()) {
      toast.error('Please enter a payment reference');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/tickets/search?reference=${encodeURIComponent(searchReference.trim())}`);
      const data = await response.json();

      if (data.success) {
        setTickets(data.tickets);
        setSearchPattern(data.searchPattern);
        if (data.totalFound === 0) {
          toast.info('No tickets found matching the search criteria');
        } else {
          toast.success(`Found ${data.totalFound} ticket(s)`);
        }
      } else {
        toast.error(data.error || 'Search failed');
        setTickets([]);
        setSearchPattern('');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
      setTickets([]);
      setSearchPattern('');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (ticketId: string) => {
    setActionLoading(prev => ({ ...prev, [`checkin-${ticketId}`]: true }));
    try {
      const response = await fetch('/api/v1/scan/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          officialId: 'admin',
          officialName: 'Admin User'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Ticket checked in successfully');
        // Refresh the search results
        handleSearch();
      } else {
        toast.error(data.error || 'Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Check-in failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`checkin-${ticketId}`]: false }));
    }
  };

  const handleCheckOut = async (ticketId: string) => {
    setActionLoading(prev => ({ ...prev, [`checkout-${ticketId}`]: true }));
    try {
      const response = await fetch('/api/v1/scan/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          officialId: 'admin',
          officialName: 'Admin User'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Ticket checked out successfully');
        // Refresh the search results
        handleSearch();
      } else {
        toast.error(data.error || 'Check-out failed');
      }
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error('Check-out failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`checkout-${ticketId}`]: false }));
    }
  };

  const handleRegenerateQR = async (ticket: Ticket) => {
    setActionLoading(prev => ({ ...prev, [`regenerate-${ticket._id}`]: true }));
    try {
      const response = await fetch('/api/v1/admin/qr/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: ticket.type,
          serviceId: ticket.paymentReference,
          adminId: 'admin',
          reason: 'Manual regeneration from admin panel'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('QR code regenerated and sent via WhatsApp');
      } else {
        toast.error(data.error || 'QR regeneration failed');
      }
    } catch (error) {
      console.error('QR regeneration error:', error);
      toast.error('QR regeneration failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`regenerate-${ticket._id}`]: false }));
    }
  };

  const handleDownloadPDF = async (paymentReference: string) => {
    setActionLoading(prev => ({ ...prev, [`download-${paymentReference}`]: true }));
    try {
      const response = await fetch(`/api/v1/pdf/download?ref=${encodeURIComponent(paymentReference)}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${paymentReference}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF downloaded successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`download-${paymentReference}`]: false }));
    }
  };

  const getStatusBadge = (status: string, checkedIn: boolean) => {
    if (checkedIn) {
      return <Badge className="bg-green-100 text-green-800">Checked In</Badge>;
    }

    switch (status.toLowerCase()) {
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'convention':
        return '🎪';
      case 'dinner':
        return '🍽️';
      case 'brochure':
        return '📖';
      case 'accommodation':
        return '🏨';
      default:
        return '🎫';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter payment reference (e.g., ul8te9lmyj_23480xxxxxxxx)"
                value={searchReference}
                onChange={(e) => setSearchReference(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <p className="text-sm text-gray-500 mt-1">
                The search will find all tickets matching the part before the underscore
              </p>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
            {(searchReference || tickets.length > 0) && (
              <Button
                variant="outline"
                onClick={handleClearSearch}
                disabled={loading}
              >
                Clear
              </Button>
            )}
          </div>

          {searchPattern && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Search Pattern:</strong> {searchPattern}*
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {tickets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Search Results ({tickets.length} ticket{tickets.length !== 1 ? 's' : ''})
          </h2>

          {tickets.map((ticket) => (
            <Card key={ticket._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(ticket.type)}</span>
                    <div>
                      <CardTitle className="text-lg">
                        {ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)} Ticket
                      </CardTitle>
                      <p className="text-sm text-gray-600 font-mono">
                        {ticket.paymentReference}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(ticket.status, ticket.checkedIn)}
                    {ticket.collected && (
                      <Badge className="bg-purple-100 text-purple-800">Collected</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* User Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{ticket.user.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{ticket.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{ticket.user.phone}</span>
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <strong>Amount:</strong> ₦{ticket.amount?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <strong>Created:</strong> {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {ticket.checkedInAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">
                        <strong>Checked In:</strong> {new Date(ticket.checkedInAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {ticket.checkedOutAt && (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm">
                        <strong>Checked Out:</strong> {new Date(ticket.checkedOutAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Guest Details for Dinner Tickets */}
                {ticket.type === 'dinner' && ticket.guestDetails && ticket.guestDetails.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <h4 className="font-medium text-amber-800 mb-2">Guest Details:</h4>
                    <div className="space-y-1">
                      {ticket.guestDetails.map((guest, index) => (
                        <p key={index} className="text-sm text-amber-700">
                          {index + 1}. {guest.name} ({guest.dietaryRequirements || 'No dietary requirements'})
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Check-in History */}
                {ticket.checkInHistory && ticket.checkInHistory.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Check-in History:</h4>
                    <div className="space-y-1">
                      {ticket.checkInHistory.slice(-3).map((entry, index) => (
                        <p key={index} className="text-sm text-blue-700">
                          <strong>{entry.action}:</strong> {new Date(entry.timestamp).toLocaleString()}
                          by {entry.officialName}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {!ticket.checkedIn ? (
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(ticket._id)}
                      disabled={actionLoading[`checkin-${ticket._id}`]}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading[`checkin-${ticket._id}`] ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Check In
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckOut(ticket._id)}
                      disabled={actionLoading[`checkout-${ticket._id}`]}
                    >
                      {actionLoading[`checkout-${ticket._id}`] ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Check Out
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRegenerateQR(ticket)}
                    disabled={actionLoading[`regenerate-${ticket._id}`]}
                  >
                    {actionLoading[`regenerate-${ticket._id}`] ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <MessageSquare className="w-4 h-4 mr-2" />
                    )}
                    Regenerate & Send
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPDF(ticket.paymentReference)}
                    disabled={actionLoading[`download-${ticket.paymentReference}`]}
                  >
                    {actionLoading[`download-${ticket.paymentReference}`] ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && searchPattern && tickets.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-600">
              No tickets found matching the reference pattern: <strong>{searchPattern}*</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}