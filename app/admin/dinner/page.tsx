'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  // Fetch dinner reservations
  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/dinner?limit=500');
      const result = await response.json();

      if (result.success) {
        setReservations(result.data || []);
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

      <div className="grid gap-6">
        {reservations.map((reservation) => (
          <Card key={reservation._id} className="border border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {reservation.userId?.fullName || reservation.guestDetails[0]?.name || 'Unknown'}
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
                    <p><span className="font-medium">Reference:</span> {reservation.paymentReference}</p>
                    <p><span className="font-medium">Amount:</span> ₦{reservation.totalAmount.toLocaleString()}</p>
                    <p><span className="font-medium">Date:</span> {new Date(reservation.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Guests ({reservation.guestDetails.length})</h4>
                  <div className="space-y-1 text-sm text-gray-600 max-h-32 overflow-y-auto">
                    {reservation.guestDetails.map((guest, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{guest.name}</span>
                        <span className="text-xs text-gray-500">{guest.phone}</span>
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

      {reservations.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reservations found</h3>
          <p className="text-gray-600">There are no dinner reservations to display.</p>
        </div>
      )}
    </div>
  );
}