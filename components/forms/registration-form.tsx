"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { User, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectGroup,
  SelectValue,
  SelectLabel,
  SelectSeparator,
} from "../ui/select";

const registrationSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Phone number is required"),
  year: z.string().optional(),
  house: z.string().optional(),

  // Registration Options
  quantity: z.number().min(1, "Quantity must be at least 1").default(1),
  persons: z
    .array(
      z.object({
        phoneNumber: z.string().min(10, "Phone number is required"),
        email: z
          .string()
          .email("Valid email is required")
          .optional()
          .or(z.literal("")),
      }),
    )
    .default([]),

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
    control,
  } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
  });

  const watchedValues = watch();

  // Calculate total cost
  const calculateTotal = () => {
    const basePrice = 50; // Base registration fee per person in Naira
    const quantity = watchedValues.quantity || 1;
    const total = basePrice * quantity;

    setCalculatedTotal(total);
  };

  React.useEffect(() => {
    calculateTotal();
  }, [watchedValues]);

  const onSubmit = async (data: RegistrationData) => {
    setIsSubmitting(true);

    try {
      // Transform form data to match API expectations
      const apiData = {
        email: data.email,
        fullName: `${data.firstName} ${data.lastName}`,
        phoneNumber: data.phone,
        amount: calculatedTotal,
        quantity: data.quantity,
        persons: data.persons,
        year: data.year,
        house: data.house,
      };

      const response = await fetch("/api/v1/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Registration failed");
      }

      // Redirect to Paystack payment page
      if (result.paymentLink?.data?.authorization_url) {
        window.location.href = result.paymentLink.data.authorization_url;
      } else {
        toast.success(
          "Registration successful! Check your email for your QR code.",
        );
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mobile-Optimized Progress Indicator */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center space-x-2 sm:space-x-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${
                  i <= step
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {i < step ? (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  i
                )}
              </div>
              {i < 3 && (
                <div
                  className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 ${
                    i < step ? "bg-primary-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-3 sm:mt-4">
          <span className="text-xs sm:text-sm text-gray-600 text-center px-4">
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
        {/* Step 1: Personal Information - Mobile Optimized */}
        {step === 1 && (
          <Card className="glass-card card-mobile">
            <CardHeader className="mobile-card-spacing">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <User className="w-5 h-5 text-primary-600" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Please provide your contact details for registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="mobile-card-spacing space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="form-group">
                  <Label htmlFor="firstName" className="mobile-form-label">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    className="mobile-form-input"
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <Label htmlFor="lastName" className="mobile-form-label">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    className="mobile-form-input"
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>

                <div className="form-group sm:col-span-2">
                  <Label htmlFor="phone" className="mobile-form-label">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    className="mobile-form-input"
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="form-group sm:col-span-2">
                  <Label htmlFor="email" className="mobile-form-label">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="mobile-form-input"
                    placeholder="Enter your email address"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-secondary-500 mobile-button-responsive touch-target"
                >
                  Continue to Event Options
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Event Options - Mobile Optimized */}
        {step === 2 && (
          <Card className="glass-card card-mobile">
            <CardHeader className="mobile-card-spacing">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <User className="w-5 h-5 text-primary-600" />
                <span>Registration Options</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Specify registration details and additional attendees.
              </CardDescription>
            </CardHeader>
            <CardContent className="mobile-card-spacing space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="form-group">
                  <Label htmlFor="year" className="mobile-form-label">
                    Year
                  </Label>
                  <Input
                    id="year"
                    {...register("year")}
                    className="mobile-form-input"
                    placeholder="Enter graduation year"
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="house" className="mobile-form-label">
                    House
                  </Label>
                  <Controller
                    name="house"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select house" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>GHS</SelectLabel>
                            <SelectItem value="curie">Curie</SelectItem>
                            <SelectItem value="keller">Keller</SelectItem>
                            <SelectItem value="nightangle">
                              Nightangle
                            </SelectItem>
                            <SelectItem value="slessor">Slessor</SelectItem>
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel>BSS</SelectLabel>
                            <SelectItem value="aggrey">Aggrey</SelectItem>
                            <SelectItem value="carver">Carver</SelectItem>
                            <SelectItem value="crowther">Crowther</SelectItem>
                            <SelectItem value="livingstone">
                              Livingstone
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {/*<Select {...register("house")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select house" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>GHS</SelectLabel>
                        <SelectItem value="curie">Curie</SelectItem>
                        <SelectItem value="keller">Keller</SelectItem>
                        <SelectItem value="nightangle">Nightangle</SelectItem>
                        <SelectItem value="slessor">Slessor</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>BSS</SelectLabel>
                        <SelectItem value="aggrey">Aggrey</SelectItem>
                        <SelectItem value="carver">Carver</SelectItem>
                        <SelectItem value="crowther">Crowther</SelectItem>
                        <SelectItem value="livingstone">Livingstone</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>*/}
                </div>

                <div className="form-group sm:col-span-2">
                  <Label htmlFor="quantity" className="mobile-form-label">
                    Number of Tickets
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={1}
                    {...register("quantity", { valueAsNumber: true })}
                    className="mobile-form-input"
                    placeholder=""
                    onChange={(e) => {
                      const quantity = parseInt(e.target.value) || 1;
                      setValue("quantity", quantity);

                      // Update persons array based on quantity
                      const currentPersons = watchedValues.persons || [];
                      const newPersons = [];

                      for (let i = 1; i < quantity; i++) {
                        newPersons.push(
                          currentPersons[i - 1] || {
                            phoneNumber: "",
                            email: "",
                          },
                        );
                      }

                      setValue("persons", newPersons);
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum 10 tickets per registration
                  </p>
                </div>
              </div>

              {/* Additional Attendees - Mobile Optimized */}
              {watchedValues.quantity > 1 && (
                <div className="space-y-4">
                  <Separator />
                  <h4 className="font-semibold text-gray-900 text-base sm:text-lg">
                    Additional Attendees ({watchedValues.quantity - 1})
                  </h4>
                  <p className="text-sm text-gray-600">
                    Please provide details for the additional attendees.
                  </p>

                  {Array.from(
                    { length: (watchedValues.quantity || 1) - 1 },
                    (_, index) => (
                      <Card
                        key={index}
                        className="mobile-card-spacing bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <h5 className="font-medium text-gray-800 mb-3 text-sm sm:text-base">
                          Attendee {index + 2}
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="form-group">
                            <Label
                              htmlFor={`person-${index}-phone`}
                              className="mobile-form-label"
                            >
                              Phone Number *
                            </Label>
                            <Input
                              id={`person-${index}-phone`}
                              type="tel"
                              {...register(`persons.${index}.phoneNumber`)}
                              className="mobile-form-input"
                              placeholder="Enter phone number"
                            />
                          </div>
                          <div className="form-group">
                            <Label
                              htmlFor={`person-${index}-email`}
                              className="mobile-form-label"
                            >
                              Email (Optional)
                            </Label>
                            <Input
                              id={`person-${index}-email`}
                              type="email"
                              {...register(`persons.${index}.email`)}
                              className="mobile-form-input"
                              placeholder="Enter email address (optional)"
                            />
                          </div>
                        </div>
                      </Card>
                    ),
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="w-full sm:w-auto touch-target"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-secondary-500 touch-target"
                >
                  Review & Pay
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Payment - Mobile Optimized */}
        {step === 3 && (
          <div className="space-y-4 sm:space-y-6">
            <Card className="glass-card card-mobile">
              <CardHeader className="mobile-card-spacing">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                  <span>Registration Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="mobile-card-spacing space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-base sm:text-lg">
                      Registration Information
                    </h4>
                    <div className="text-sm sm:text-base text-gray-600 space-y-3 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">
                          Primary Attendee:
                        </p>
                        <p className="mt-1">
                          {watchedValues.firstName} {watchedValues.lastName}
                        </p>
                        <p>{watchedValues.email}</p>
                        <p>{watchedValues.phone}</p>
                        {/*{watchedValues.organization && (
                          <p>{watchedValues.organization}</p>
                        )}*/}
                      </div>

                      {watchedValues.persons &&
                        watchedValues.persons.length > 0 && (
                          <div className="pt-2 border-t border-gray-200">
                            <p className="font-medium text-gray-800">
                              Additional Attendees:
                            </p>
                            {watchedValues.persons.map((person, index) => (
                              <div
                                key={index}
                                className="ml-2 mt-2 p-2 bg-white rounded border"
                              >
                                <p className="font-medium">
                                  Attendee {index + 2}: {person.phoneNumber}
                                </p>
                                {person.email && (
                                  <p className="text-sm">
                                    Email: {person.email}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-base sm:text-lg">
                      Cost Breakdown
                    </h4>
                    <div className="bg-primary-50 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between text-sm sm:text-base">
                        <span>Registration Fee</span>
                        <span>₦50.00 per person</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span>Number of Tickets</span>
                        <span>{watchedValues.quantity || 1}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span>Subtotal</span>
                        <span>
                          ₦{(50 * (watchedValues.quantity || 1)).toFixed(2)}
                        </span>
                      </div>

                      <Separator />
                      <div className="flex justify-between font-semibold text-lg sm:text-xl text-primary-700">
                        <span>Total</span>
                        <span>₦{calculatedTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="agreeToTerms"
                    checked={watchedValues.agreeToTerms}
                    onCheckedChange={(checked) =>
                      setValue("agreeToTerms", Boolean(checked))
                    }
                    className="mt-1 touch-target"
                  />
                  <Label
                    htmlFor="agreeToTerms"
                    className="text-sm sm:text-base leading-relaxed"
                  >
                    I agree to the{" "}
                    <a
                      href="#"
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Terms and Conditions
                    </a>{" "}
                    and{" "}
                    <a
                      href="#"
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Privacy Policy
                    </a>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.agreeToTerms.message}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="w-full sm:w-auto touch-target"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-secondary-500 min-w-[140px] touch-target font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay ₦${calculatedTotal.toFixed(2)}`
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
