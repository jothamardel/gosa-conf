import { RegistrationForm } from "@/components/forms/registration-form";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Sponsors } from "@/components/sections/sponsors";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Navigation />
      <div className="py-6 sm:py-12">
        <div className="max-w-4xl mx-auto mobile-container px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="heading-responsive-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Register for
              <span className="gradient-text block sm:inline">
                {" "}
                GOSA Convention 2026
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Secure your spot at the alumni convention. Complete your
              registration and receive your QR code for seamless check-in.
            </p>
          </div>

          <RegistrationForm />
        </div>
      </div>
      <div className="mb-8">
        <Sponsors bg={"bg-none"} />
      </div>
      <Footer />
    </div>
  );
}

