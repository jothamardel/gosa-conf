'use client';

import { QrCode, User, Ticket, Calendar, MapPin, Mail, Utensils, Building, BookOpen } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';

export default function ProfilePage() {
  const { data: session } = useSession();

  // Sample data - replace with actual API calls
  const userData = {
    name: session?.user?.name || 'John Doe',
    email: session?.user?.email || 'john@example.com',
    registrationId: 'CONF-2024-00789',
    eventDate: 'October 15-17, 2024',
    venue: 'Grand Convention Center, Lagos',
    ticketType: 'VIP Access',
    qrCodeData: `user:${session?.user?.email || 'demo'}|id:CONF-2024-00789`,
    reservations: {
      dinner: {
        booked: true,
        date: 'October 15, 2024',
        time: '7:00 PM',
        guests: 2,
        amount: 150 // $75 per person
      },
      accommodation: {
        booked: true,
        type: 'Premium Room',
        checkIn: 'October 14, 2024',
        checkOut: 'October 18, 2024',
        amount: 800 // $200/night x 4 nights
      },
      brochure: {
        purchased: true,
        amount: 25
      }
    },
    donations: [
      {
        id: 'DON-001',
        amount: 50,
        date: '2024-09-10',
        anonymous: false
      }
    ]
  };

  const handleDownloadQR = () => {
    // In a real app, generate and download QR code image
    toast.success('QR code downloaded successfully');
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Convention QR Code',
          text: `Here's my QR code for ${userData.eventDate}`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.info('Link copied to clipboard');
      }
    } catch (error) {
      toast.error('Sharing failed');
    }
  };

  const handleViewReceipt = (type: string) => {
    toast.info(`Generating ${type} receipt...`);
    // API call to generate/download receipt
  };

  const handleCancelReservation = (type: string) => {
    toast.warning(`Are you sure you want to cancel your ${type} reservation?`, {
      action: {
        label: 'Confirm',
        onClick: () => {
          // API call to cancel reservation would go here
          toast.success(`${type} reservation canceled`);
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {} // Empty function for the cancel button
      }
    });
  };

  return (
    <div>
          <Navigation/>
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-12">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-500 p-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-full">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{userData.name}</h1>
                <p className="text-white/90">{userData.email}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 md:p-8 space-y-8">
            {/* QR Code and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <QrCode className="w-5 h-5 mr-2 text-primary-600" />
                  Your Check-In QR Code
                </h2>
                
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center">
                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <div className="w-48 h-48 bg-white p-2 flex items-center justify-center">
                      {/* Replace with actual QR component */}
                      <div className="text-center text-xs text-gray-500">
                        [QR Code for: {userData.qrCodeData}]
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 mt-4">
                    <Button 
                      onClick={handleDownloadQR}
                      variant="outline"
                      className="border-primary-600 text-primary-600 hover:bg-primary-50"
                    >
                      Download
                    </Button>
                    <Button 
                      onClick={handleShare}
                      className="bg-primary-600 hover:bg-primary-700"
                    >
                      Share
                    </Button>
                  </div>
                </div>
              </div>

              {/* Registration Details */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Ticket className="w-5 h-5 mr-2 text-primary-600" />
                  Registration Details
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-primary-100 p-2 rounded-lg mr-4">
                      <Ticket className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Registration ID</h3>
                      <p className="text-gray-600">{userData.registrationId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-100 p-2 rounded-lg mr-4">
                      <Calendar className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Event Date</h3>
                      <p className="text-gray-600">{userData.eventDate}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-100 p-2 rounded-lg mr-4">
                      <MapPin className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Venue</h3>
                      <p className="text-gray-600">{userData.venue}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-100 p-2 rounded-lg mr-4">
                      <Mail className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Ticket Type</h3>
                      <p className="text-gray-600">{userData.ticketType}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reservations Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Reservations</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dinner Reservation */}
                {userData.reservations.dinner.booked && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Utensils className="w-5 h-5 text-secondary-600 mr-2" />
                      <h3 className="font-medium">Dinner Reservation</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {userData.reservations.dinner.date} at {userData.reservations.dinner.time}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Guests: {userData.reservations.dinner.guests}
                    </p>
                    <p className="text-sm font-medium mb-4">
                      Amount: ${userData.reservations.dinner.amount}
                    </p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewReceipt('dinner')}
                      >
                        Receipt
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancelReservation('dinner')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Accommodation */}
                {userData.reservations.accommodation.booked && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Building className="w-5 h-5 text-blue-600 mr-2" />
                      <h3 className="font-medium">Accommodation</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {userData.reservations.accommodation.type}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      {userData.reservations.accommodation.checkIn} - {userData.reservations.accommodation.checkOut}
                    </p>
                    <p className="text-sm font-medium mb-4">
                      Amount: ${userData.reservations.accommodation.amount}
                    </p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewReceipt('accommodation')}
                      >
                        Receipt
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancelReservation('accommodation')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Brochure */}
                {userData.reservations.brochure.purchased && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <BookOpen className="w-5 h-5 text-purple-600 mr-2" />
                      <h3 className="font-medium">Convention Brochure</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Digital + Printed Copy
                    </p>
                    <p className="text-sm font-medium mb-4">
                      Amount: ${userData.reservations.brochure.amount}
                    </p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewReceipt('brochure')}
                      >
                        Receipt
                      </Button>
                      <Link href="/brochure" passHref>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Donations Section */}
            {userData.donations.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Donations</h2>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {userData.donations.map((donation) => (
                          <tr key={donation.id}>
                            <td className="px-4 py-2 text-sm text-gray-600">{donation.id}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">${donation.amount}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{donation.date}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {donation.anonymous ? 'Anonymous' : 'Public'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewReceipt(`donation-${donation.id}`)}
                              >
                                Receipt
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Actions */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between">
            <Link href="/" passHref>
              <Button variant="outline">Back to Home</Button>
            </Link>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => handleViewReceipt('full')}
              >
                View Full Receipt
              </Button>
              <Link href="/profile/edit" passHref>
                <Button className="bg-gradient-to-r from-primary-600 to-secondary-500">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
      <Footer/>
    </div>
  );
}