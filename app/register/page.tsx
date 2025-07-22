import { RegistrationForm } from '@/components/forms/registration-form';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Navigation />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Register for
              <span className="gradient-text"> Convention 2024</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Secure your spot at the premier annual convention. Complete your registration and receive your QR code for seamless check-in.
            </p>
          </div>
          
          <RegistrationForm />
        </div>
      </div>
      <Footer />
    </div>
  );
}