import { RegistrationForm } from '@/components/forms/registration-form';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Navigation />
      <div className="py-6 sm:py-12">
        <div className="max-w-4xl mx-auto mobile-container">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="heading-responsive-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Register for
              <span className="gradient-text block sm:inline"> GOSA Convention 2025</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Secure your spot at the premier alumni convention. Complete your registration and receive your QR code for seamless check-in.
            </p>
          </div>

          <RegistrationForm />
        </div>
      </div>
      <Footer />
    </div>
  );
}