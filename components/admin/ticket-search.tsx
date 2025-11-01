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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  _id: string;
  type: 'convention' | 'dinner' | 'brochure' | 'accommodation';
  paymentReference: string;
  amount: number;
  quantity?: number;
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
  persons?: Array<any>;
}

interface TicketGroup {
  baseReference: string;
  type: 'convention' | 'dinner' | 'brochure' | 'accommodation';
  totalTickets: number;
  totalAmount: number;
  mainTicket: Ticket;
  secondaryTickets: Ticket[];
  status: string;
  createdAt: string;
}

export function TicketSearch() {
  const [searchReference, setSearchReference] = useState('');
  const [ticketGroups, setTicketGroups] = useState<TicketGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPattern, setSearchPattern] = useState('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});

  const handleClearSearch = () => {
    setSearchReference('');
    setTicketGroups([]);
    setSearchPattern('');
    setExpandedGroups({});
  };

  const toggleGroupExpansion = (baseReference: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [baseReference]: !prev[baseReference]
    }));
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
        setTicketGroups(data.ticketGroups);
        setSearchPattern(data.searchPattern);
        if (data.totalGroups === 0) {
          toast.info('No tickets found matching the search criteria');
        } else {
          toast.success(`Found ${data.totalGroups} payment group(s) with ${data.totalTickets} total ticket(s)`);
        }
      } else {
        toast.error(data.error || 'Search failed');
        setTicketGroups([]);
        setSearchPattern('');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
      setTicketGroups([]);
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
      {ticketGroups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Search Results ({ticketGroups.length} payment group{ticketGroups.length !== 1 ? 's' : ''})
          </h2>

          {ticketGroups.map((group) => (
            <Card key={group.baseReference} className="overflow-hidden">
              {/* Group Header */}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(group.type)}</span>
                    <div>
                      <CardTitle className="text-lg">
                        {group.type.charAt(0).toUpperCase() + group.type.slice(1)} Registration
                      </CardTitle>
                      <p className="text-sm text-gray-600 font-mono">
                        {group.baseReference}*
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {group.totalTickets} ticket{group.totalTickets !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            ₦{group.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(group.status, group.mainTicket.checkedIn)}
                    {group.mainTicket.collected && (
                      <Badge className="bg-purple-100 text-purple-800">Collected</Badge>
                    )}
                    {group.secondaryTickets.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroupExpansion(group.baseReference)}
                        className="p-1"
                      >
                        {expandedGroups[group.baseReference] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Main Ticket */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Main Ticket Holder
                  </h4>

                  {/* User Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">{group.mainTicket.user.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{group.mainTicket.user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{group.mainTicket.user.phone}</span>
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        <strong>Amount:</strong> ₦{group.mainTicket.amount?.toLocaleString() || 0}
                      </span>
                    </div>
                    {group.mainTicket.quantity && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          <strong>Quantity:</strong> {group.mainTicket.quantity}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        <strong>Created:</strong> {new Date(group.mainTicket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {group.mainTicket.checkedInAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">
                          <strong>Checked In:</strong> {new Date(group.mainTicket.checkedInAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Guest Details for Dinner Tickets */}
                  {group.mainTicket.type === 'dinner' && group.mainTicket.guestDetails && group.mainTicket.guestDetails.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg mb-4">
                      <h5 className="font-medium text-amber-800 mb-2">Guest Details:</h5>
                      <div className="space-y-1">
                        {group.mainTicket.guestDetails.map((guest, index) => (
                          <p key={index} className="text-sm text-amber-700">
                            {index + 1}. {guest.name} ({guest.dietaryRequirements || 'No dietary requirements'})
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Main Ticket */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {!group.mainTicket.checkedIn ? (
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(group.mainTicket._id)}
                        disabled={actionLoading[`checkin-${group.mainTicket._id}`]}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading[`checkin-${group.mainTicket._id}`] ? (
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
                        onClick={() => handleCheckOut(group.mainTicket._id)}
                        disabled={actionLoading[`checkout-${group.mainTicket._id}`]}
                      >
                        {actionLoading[`checkout-${group.mainTicket._id}`] ? (
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
                      onClick={() => handleRegenerateQR(group.mainTicket)}
                      disabled={actionLoading[`regenerate-${group.mainTicket._id}`]}
                    >
                      {actionLoading[`regenerate-${group.mainTicket._id}`] ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <MessageSquare className="w-4 h-4 mr-2" />
                      )}
                      Regenerate & Send
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(group.mainTicket.paymentReference)}
                      disabled={actionLoading[`download-${group.mainTicket.paymentReference}`]}
                    >
                      {actionLoading[`download-${group.mainTicket.paymentReference}`] ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Download PDF
                    </Button>
                  </div>
                </div>

                {/* Secondary Tickets */}
                {group.secondaryTickets.length > 0 && expandedGroups[group.baseReference] && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Additional Tickets ({group.secondaryTickets.length})
                    </h4>

                    {group.secondaryTickets.map((ticket, index) => (
                      <div key={ticket._id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-700">
                            Ticket #{index + 2} - {ticket.user.fullName}
                          </h5>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(ticket.status, ticket.checkedIn)}
                          </div>
                        </div>

                        {/* Secondary Ticket User Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{ticket.user.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{ticket.user.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">₦{ticket.amount?.toLocaleString() || 0}</span>
                          </div>
                        </div>

                        {/* Secondary Ticket Actions */}
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
                      </div>
                    ))}
                  </div>
                )}

                {/* Check-in History for Main Ticket */}
                {group.mainTicket.checkInHistory && group.mainTicket.checkInHistory.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Recent Check-in History:</h4>
                    <div className="space-y-1">
                      {group.mainTicket.checkInHistory.slice(-3).map((entry, index) => (
                        <p key={index} className="text-sm text-blue-700">
                          <strong>{entry.action}:</strong> {new Date(entry.timestamp).toLocaleString()}
                          by {entry.officialName}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && searchPattern && ticketGroups.length === 0 && (
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