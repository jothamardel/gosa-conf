// "use client";

// import React, { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Checkbox } from "@/components/ui/checkbox";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
// import {
//   User,
//   CreditCard,
//   CheckCircle,
//   Loader2,
// } from "lucide-react";
// import { toast } from "sonner";

// const registrationSchema = z.object({
//   // Personal Information
//   firstName: z.string().min(2, "First name is required"),
//   lastName: z.string().min(2, "Last name is required"),
//   email: z.string().email("Valid email is required"),
//   phone: z.string().min(10, "Phone number is required"),
//   organization: z.string().optional(),
//   jobTitle: z.string().optional(),

//   // Terms
//   agreeToTerms: z
//     .boolean()
//     .refine((val) => val === true, "You must agree to the terms"),
// });

// type RegistrationData = z.infer<typeof registrationSchema>;

// export function RegistrationForm() {
//   const [step, setStep] = useState(1);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [calculatedTotal, setCalculatedTotal] = useState(0);

//   const {
//     register,
//     handleSubmit,
//     watch,
//     setValue,
//     formState: { errors },
//   } = useForm<RegistrationData>({
//     resolver: zodResolver(registrationSchema),
//   });

//   const watchedValues = watch();

//   // Calculate total cost
//   const calculateTotal = () => {
//     let total = 50; // Base registration fee

//     setCalculatedTotal(total);
//   };

//   React.useEffect(() => {
//     calculateTotal();
//   }, [watchedValues]);

//   const onSubmit = async (data: RegistrationData) => {
//     setIsSubmitting(true);

//     try {
//       // Here you would integrate with payment processing
//       await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

//       toast.success(
//         "Registration successful! Check your email for your QR code.",
//       );

//       // Redirect to success page or show success state
//     } catch (error) {
//       toast.error("Registration failed. Please try again.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const nextStep = () => setStep(step + 1);
//   const prevStep = () => setStep(step - 1);

//   return (
//     <div className="max-w-4xl mx-auto">
//       {/* Progress Indicator */}
//       <div className="mb-8">
//         <div className="flex items-center justify-center space-x-4">
//           {[1, 2, 3].map((i) => (
//             <div key={i} className="flex items-center">
//               <div
//                 className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
//                   i <= step
//                     ? "bg-primary-600 text-white"
//                     : "bg-gray-200 text-gray-600"
//                 }`}
//               >
//                 {i < step ? <CheckCircle className="w-5 h-5" /> : i}
//               </div>
//               {i < 3 && (
//                 <div
//                   className={`w-16 h-1 mx-2 ${
//                     i < step ? "bg-primary-600" : "bg-gray-200"
//                   }`}
//                 />
//               )}
//             </div>
//           ))}
//         </div>
//         <div className="flex justify-center mt-4">
//           <span className="text-sm text-gray-600">
//             Step {step} of 3:{" "}
//             {step === 1
//               ? "Personal Information"
//               : step === 2
//                 ? "Event Options"
//                 : "Review & Payment"}
//           </span>
//         </div>
//       </div>

//       <form onSubmit={handleSubmit(onSubmit)}>
//         {/* Step 1: Personal Information */}
//         {step === 1 && (
//           <Card className="glass-card">
//             <CardHeader>
//               <CardTitle className="flex items-center space-x-2">
//                 <User className="w-5 h-5 text-primary-600" />
//                 <span>Personal Information</span>
//               </CardTitle>
//               <CardDescription>
//                 Please provide your contact details for registration.
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                   <Label htmlFor="firstName">First Name *</Label>
//                   <Input
//                     id="firstName"
//                     {...register("firstName")}
//                     className="mt-1"
//                     placeholder="Enter your first name"
//                   />
//                   {errors.firstName && (
//                     <p className="text-sm text-red-600 mt-1">
//                       {errors.firstName.message}
//                     </p>
//                   )}
//                 </div>

//                 <div>
//                   <Label htmlFor="lastName">Last Name *</Label>
//                   <Input
//                     id="lastName"
//                     {...register("lastName")}
//                     className="mt-1"
//                     placeholder="Enter your last name"
//                   />
//                   {errors.lastName && (
//                     <p className="text-sm text-red-600 mt-1">
//                       {errors.lastName.message}
//                     </p>
//                   )}
//                 </div>

//                 <div>
//                   <Label htmlFor="email">Email Address *</Label>
//                   <Input
//                     id="email"
//                     type="email"
//                     {...register("email")}
//                     className="mt-1"
//                     placeholder="Enter your email address"
//                   />
//                   {errors.email && (
//                     <p className="text-sm text-red-600 mt-1">
//                       {errors.email.message}
//                     </p>
//                   )}
//                 </div>

//                 <div>
//                   <Label htmlFor="phone">Phone Number *</Label>
//                   <Input
//                     id="phone"
//                     {...register("phone")}
//                     className="mt-1"
//                     placeholder="Enter your phone number"
//                   />
//                   {errors.phone && (
//                     <p className="text-sm text-red-600 mt-1">
//                       {errors.phone.message}
//                     </p>
//                   )}
//                 </div>

//                            </div>

//               <div className="flex justify-end">
//                 <Button
//                   type="button"
//                   onClick={nextStep}
//                   className="bg-gradient-to-r from-primary-600 to-secondary-500"
//                 >
//                   Continue to Event Options
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Step 2: Event Options */}
//         {step === 2 && (
//           <div className="space-y-6">
//              <div>
//                   <Label htmlFor="organization">Organization</Label>
//                   <Input
//                     id="organization"
//                     {...register("organization")}
//                     className="mt-1"
//                     placeholder="Enter your organization"
//                   />
//                 </div>

//                 <div>
//                   <Label htmlFor="jobTitle">Job Title</Label>
//                   <Input
//                     id="jobTitle"
//                     {...register("jobTitle")}
//                     className="mt-1"
//                     placeholder="Enter your job title"
//                   />
//                 </div>

//             <div className="flex justify-between">
//               <Button type="button" variant="outline" onClick={prevStep}>
//                 Back
//               </Button>
//               <Button
//                 type="button"
//                 onClick={nextStep}
//                 className="bg-gradient-to-r from-primary-600 to-secondary-500"
//               >
//                 Review & Pay
//               </Button>
//             </div>
//           </div>
//         )}

//         {/* Step 3: Review & Payment */}
//         {step === 3 && (
//           <div className="space-y-6">
//             <Card className="glass-card">
//               <CardHeader>
//                 <CardTitle className="flex items-center space-x-2">
//                   <CreditCard className="w-5 h-5 text-primary-600" />
//                   <span>Registration Summary</span>
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div>
//                     <h4 className="font-semibold text-gray-900 mb-2">
//                       Personal Information
//                     </h4>
//                     <div className="text-sm text-gray-600 space-y-1">
//                       <p>
//                         {watchedValues.firstName} {watchedValues.lastName}
//                       </p>
//                       <p>{watchedValues.email}</p>
//                       <p>{watchedValues.phone}</p>
//                       {watchedValues.organization && (
//                         <p>{watchedValues.organization}</p>
//                       )}
//                     </div>
//                   </div>

//                   <div>
//                     <h4 className="font-semibold text-gray-900 mb-2">
//                       Cost Breakdown
//                     </h4>
//                     <div className="text-sm space-y-2">
//                       <div className="flex justify-between">
//                         <span>Base Registration</span>
//                         <span>$50.00</span>
//                       </div>

//                       <Separator />
//                       <div className="flex justify-between font-semibold text-lg">
//                         <span>Total</span>
//                         <span>${calculatedTotal.toFixed(2)}</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <Separator />

//                 <div className="flex items-center space-x-2">
//                   <Checkbox id="agreeToTerms" {...register("agreeToTerms")} />
//                   <Label htmlFor="agreeToTerms" className="text-sm">
//                     I agree to the{" "}
//                     <a href="#" className="text-primary-600 hover:underline">
//                       Terms and Conditions
//                     </a>{" "}
//                     and{" "}
//                     <a href="#" className="text-primary-600 hover:underline">
//                       Privacy Policy
//                     </a>
//                   </Label>
//                 </div>
//                 {errors.agreeToTerms && (
//                   <p className="text-sm text-red-600">
//                     {errors.agreeToTerms.message}
//                   </p>
//                 )}

//                 <div className="flex justify-between">
//                   <Button type="button" variant="outline" onClick={prevStep}>
//                     Back
//                   </Button>
//                   <Button
//                     type="submit"
//                     disabled={isSubmitting}
//                     className="bg-gradient-to-r from-primary-600 to-secondary-500 min-w-[140px]"
//                   >
//                     {isSubmitting ? (
//                       <>
//                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                         Processing...
//                       </>
//                     ) : (
//                       `Pay $${calculatedTotal.toFixed(2)}`
//                     )}
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         )}
//       </form>
//     </div>
//   );
// }


"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User,
  CreditCard,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const registrationSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Phone number is required"),
  organization: z.string().optional(),
  jobTitle: z.string().optional(),

  // Terms
  agreeToTerms: z
    .boolean()
    .refine((val) => val === true, "You must agree to the terms"),
});

type RegistrationData = z.infer<typeof registrationSchema>;

export function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
  });

  const watchedValues = watch();

  // Calculate total cost
  const calculateTotal = () => {
    let total = 50; // Base registration fee

    setCalculatedTotal(total);
  };

  React.useEffect(() => {
    calculateTotal();
  }, [watchedValues]);

  const onSubmit = async (data: RegistrationData) => {
    setIsSubmitting(true);

    try {
      // Here you would integrate with payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

      toast.success(
        "Registration successful! Check your email for your QR code.",
      );

      // Redirect to success page or show success state
    } catch (error) {
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${i <= step
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-600"
                  }`}
              >
                {i < step ? <CheckCircle className="w-5 h-5" /> : i}
              </div>
              {i < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${i < step ? "bg-primary-600" : "bg-gray-200"
                    }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-4">
          <span className="text-sm text-gray-600">
            Step {step} of 3:{" "}
            {step === 1
              ? "Personal Information"
              : step === 2
                ? "Event Options"
                : "Review & Payment"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Personal Information */}
        {step === 1 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary-600" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>
                Please provide your contact details for registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    className="mt-1"
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    className="mt-1"
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="mt-1"
                    placeholder="Enter your email address"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    className="mt-1"
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-gradient-to-r from-primary-600 to-secondary-500"
                >
                  Continue to Event Options
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Event Options */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                {...register("organization")}
                className="mt-1"
                placeholder="Enter your organization"
              />
            </div>

            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                {...register("jobTitle")}
                className="mt-1"
                placeholder="Enter your job title"
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button
                type="button"
                onClick={nextStep}
                className="bg-gradient-to-r from-primary-600 to-secondary-500"
              >
                Review & Pay
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Payment */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                  <span>Registration Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Personal Information
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        {watchedValues.firstName} {watchedValues.lastName}
                      </p>
                      <p>{watchedValues.email}</p>
                      <p>{watchedValues.phone}</p>
                      {watchedValues.organization && (
                        <p>{watchedValues.organization}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Cost Breakdown
                    </h4>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>Base Registration</span>
                        <span>$50.00</span>
                      </div>

                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>${calculatedTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agreeToTerms"
                    checked={watchedValues.agreeToTerms}
                    onCheckedChange={(checked) => setValue("agreeToTerms", Boolean(checked))}
                  />
                  <Label htmlFor="agreeToTerms" className="text-sm">
                    I agree to the{" "}
                    <a href="#" className="text-primary-600 hover:underline">
                      Terms and Conditions
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-primary-600 hover:underline">
                      Privacy Policy
                    </a>
                  </Label>
                </div> {errors.agreeToTerms && (
                  <p className="text-sm text-red-600">
                    {errors.agreeToTerms.message}
                  </p>
                )}

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-primary-600 to-secondary-500 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay $${calculatedTotal.toFixed(2)}`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </form>
    </div>
  );
}
