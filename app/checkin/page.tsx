import { CheckInScanner } from '@/components/checkin/check-in-scanner';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';

export default function CheckInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Navigation />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              QR Code
              <span className="gradient-text"> Check-In</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Scan attendee QR codes for quick and secure event check-in. Each code can only be used once.
            </p>
          </div>
          
          <CheckInScanner />
        </div>
      </div>
      <Footer />
    </div>
  );
}