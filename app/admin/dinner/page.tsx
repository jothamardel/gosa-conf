'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, CheckCircle, AlertCircle, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface DinnerReservation {
  _id: string;
  paymentReference: string;
  numberOfGuests: number;
  guestDetails: Array<{
    name: string;
    email: string;
    phone: string;
    dietaryRequirements?: string;
  }>;
  totalAmount: number;
  confirmed: boolean;
  createdAt: string;
  userId?: {
    fullName: string;
    email: string;
    phoneNumber: string;
  };
}

interface RegenerateResult {
  totalGuests: number;
  newReservations: number;
  existingReservations: number;
  ticketsSent: number;
  errors: string[];
}

export default function AdminDinnerPage() {
  const [reservations, setReservations] = useState<DinnerReservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<DinnerReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Search functionality
  const filterReservations = (query: string) => {
    if (!query.trim()) {
      setFilteredReservations(reservations);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = reservations.filter((reservation) => {
      // Search in payment reference
      if (reservation.paymentReference?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in main user details
      if (reservation.userId) {
        if (
          reservation.userId.fullName?.toLowerCase().includes(searchTerm) ||
          reservation.userId.email?.toLowerCase().includes(searchTerm) ||
          reservation.userId.phoneNumber?.toLowerCase().includes(searchTerm)
        ) {
          return true;
        }
      }

      // Search in guest details
      return reservation.guestDetails?.some((guest) =>
        guest.name?.toLowerCase().includes(searchTerm) ||
        guest.email?.toLowerCase().includes(searchTerm) ||
        guest.phone?.toLowerCase().includes(searchTerm)
      );
    });

    setFilteredReservations(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterReservations(query);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setFilteredReservations(reservations);
  };

  // Highlight search terms in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim() || !text) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-medium">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Fetch dinner reservations
  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/dinner?limit=500');
      const result = await response.json();

      if (result.success) {
        const data = result.data || [];
        setReservations(data);
        setFilteredReservations(data);
      } else {
        toast.error('Failed to fetch reservations');
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Error fetching reservations');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate tickets for a reservation
  const regenerateTickets = async (reservationId: string) => {
    try {
      setRegenerating(reservationId);

      const response = await fetch('/api/v1/admin/dinner/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId }),
      });

      const result = await response.json();

      if (result.success) {
        const data: RegenerateResult = result.data;

        toast.success(
          `Tickets regenerated successfully! 
          ${data.ticketsSent}/${data.totalGuests} tickets sent. 
          ${data.newReservations} new reservations created.`,
          { duration: 5000 }
        );

        if (data.errors.length > 0) {
          toast.warning(`Some errors occurred: ${data.errors.join(', ')}`, { duration: 8000 });
        }
      } else {
        toast.error(result.message || 'Failed to regenerate tickets');
      }
    } catch (error) {
      console.error('Error regenerating tickets:', error);
      toast.error('Error regenerating tickets');
    } finally {
      setRegenerating(null);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // Update filtered results when reservations change
  useEffect(() => {
    filterReservations(searchQuery);
  }, [reservations]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-lg">Loading reservations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dinner Reservations Admin</h1>
          <p className="text-gray-600 mt-2">Manage dinner reservations and regenerate tickets</p>
        </div>
        <Button onClick={fetchReservations} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Reservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search by name, email, phone, or payment reference... (Press Esc to clear)"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  className="pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <strong>Search includes:</strong> Guest names, emails, phone numbers, payment references, and main reservation holder details
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <div>
              {searchQuery ? (
                <>
                  Showing {filteredReservations.length} of {reservations.length} reservations
                  <span className="ml-2 text-blue-600 font-medium">
                    (filtered by "{searchQuery}")
                  </span>
                </>
              ) : (
                `Total: ${reservations.length} reservations`
              )}
            </div>
            {searchQuery && (
              <div className="text-xs text-gray-500">
                Press Esc to clear search
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {filteredReservations.map((reservation) => (
          <Card key={reservation._id} className="border border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {highlightSearchTerm(
                    reservation.userId?.fullName || reservation.guestDetails[0]?.name || 'Unknown',
                    searchQuery
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={reservation.confirmed ? "default" : "secondary"}>
                    {reservation.confirmed ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Confirmed
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pending
                      </>
                    )}
                  </Badge>
                  <Badge variant="outline">
                    <Users className="w-3 h-3 mr-1" />
                    {reservation.numberOfGuests} guests
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Reservation Details</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Reference:</span>{' '}
                      {highlightSearchTerm(reservation.paymentReference, searchQuery)}
                    </p>
                    <p><span className="font-medium">Amount:</span> ₦{reservation.totalAmount.toLocaleString()}</p>
                    <p><span className="font-medium">Date:</span> {new Date(reservation.createdAt).toLocaleDateString()}</p>
                    {reservation.userId && (
                      <>
                        <p>
                          <span className="font-medium">Email:</span>{' '}
                          {highlightSearchTerm(reservation.userId.email, searchQuery)}
                        </p>
                        <p>
                          <span className="font-medium">Phone:</span>{' '}
                          {highlightSearchTerm(reservation.userId.phoneNumber, searchQuery)}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Guests ({reservation.guestDetails.length})</h4>
                  <div className="space-y-1 text-sm text-gray-600 max-h-32 overflow-y-auto">
                    {reservation.guestDetails.map((guest, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between">
                          <span>{highlightSearchTerm(guest.name, searchQuery)}</span>
                          <span className="text-xs text-gray-500">
                            {highlightSearchTerm(guest.phone, searchQuery)}
                          </span>
                        </div>
                        {guest.email && (
                          <div className="text-xs text-gray-500">
                            {highlightSearchTerm(guest.email, searchQuery)}
                          </div>
                        )}
                        {guest.dietaryRequirements && (
                          <div className="text-xs text-blue-600">
                            Dietary: {guest.dietaryRequirements}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => regenerateTickets(reservation._id)}
                  disabled={regenerating === reservation._id}
                  className="w-full sm:w-auto"
                >
                  {regenerating === reservation._id ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating Tickets...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate and Send Tickets
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  This will create individual reservations for each guest and send them their tickets via WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReservations.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No matching reservations found' : 'No reservations found'}
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? `No reservations match your search for "${searchQuery}". Try a different search term.`
              : 'There are no dinner reservations to display.'
            }
          </p>
          {searchQuery && (
            <Button onClick={clearSearch} variant="outline" className="mt-4">
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}