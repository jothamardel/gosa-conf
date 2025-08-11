"use client"

import React, { useState } from 'react'
import { Utensils, Loader2, Users, Calendar, Clock, MapPin, Plus, Minus, User, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface GuestDetails {
  name: string
  email?: string
  phone?: string
  dietaryRequirements?: string
}

interface FormData {
  dinnerTicket: boolean
  numberOfGuests: number
  guestDetails: GuestDetails[]
  specialRequests: string
  agreeToTerms: boolean
}

interface Errors {
  dinnerTicket?: string
  agreeToTerms?: string
  guestDetails?: string[]
}

const DinnerPayment = () => {
  const [formData, setFormData] = useState<FormData>({
    dinnerTicket: false,
    numberOfGuests: 1,
    guestDetails: [{ name: '', email: '', phone: '' }],
    specialRequests: '',
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const calculateTotal = (): number => {
    return formData.dinnerTicket ? 75 * formData.numberOfGuests : 0
  }

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    const guestErrors: string[] = []

    if (!formData.dinnerTicket) {
      newErrors.dinnerTicket = "Please select dinner ticket to proceed"
    }

    if (formData.dinnerTicket && !formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms"
    }

    // Validate guest details
    if (formData.dinnerTicket) {
      formData.guestDetails.forEach((guest, index) => {
        if (!guest.name.trim()) {
          guestErrors[index] = "Guest name is required"
        }
      })

      if (guestErrors.length > 0) {
        newErrors.guestDetails = guestErrors
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/v1/dinner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.guestDetails[0]?.email || '',
          fullName: formData.guestDetails[0]?.name || '',
          phoneNumber: formData.guestDetails[0]?.phone || '',
          numberOfGuests: formData.numberOfGuests,
          guestDetails: formData.guestDetails,
          specialRequests: formData.specialRequests
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to process dinner reservation')
      }

      // Redirect to Paystack payment page
      if (result.data.paymentLink) {
        window.location.href = result.data.paymentLink
      } else {
        toast.success("Dinner reservation initiated! Redirecting to payment...")
      }
    } catch (error: any) {
      console.error('Dinner reservation error:', error)
      toast.error(error.message || "Payment failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = <K extends keyof FormData>(field: K, value: FormData[K]): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    if (errors[field as keyof Errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const updateNumberOfGuests = (newCount: number): void => {
    const currentGuests = [...formData.guestDetails]

    if (newCount > currentGuests.length) {
      // Add new empty guest entries
      for (let i = currentGuests.length; i < newCount; i++) {
        currentGuests.push({ name: '' })
      }
    } else if (newCount < currentGuests.length) {
      // Remove excess guest entries
      currentGuests.splice(newCount)
    }

    setFormData(prev => ({
      ...prev,
      numberOfGuests: newCount,
      guestDetails: currentGuests
    }))
  }

  const updateGuestDetail = (index: number, field: keyof GuestDetails, value: string): void => {
    const updatedGuests = [...formData.guestDetails]
    updatedGuests[index] = {
      ...updatedGuests[index],
      [field]: value
    }

    setFormData(prev => ({
      ...prev,
      guestDetails: updatedGuests
    }))

    // Clear guest-specific errors
    if (errors.guestDetails && errors.guestDetails[index]) {
      const newGuestErrors = [...(errors.guestDetails || [])]
      newGuestErrors[index] = ''
      setErrors(prev => ({
        ...prev,
        guestDetails: newGuestErrors
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-full mb-4 shadow-lg">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Dinner</h1>
          <p className="text-gray-600 text-lg">An Evening of Culinary Excellence</p>
        </div>

        {/* Event Details Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-100 to-secondary-100 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 text-gray-700">
                <Calendar className="w-5 h-5 text-primary-600" />
                <span>Saturday, August 12th</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-700">
                <Clock className="w-5 h-5 text-primary-600" />
                <span>7:00 PM - 10:00 PM</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-700 md:col-span-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                <span>Grand Ballroom, Metropolitan Hotel</span>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Ticket Selection */}
            <div className="mb-8">
              <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-all duration-300 cursor-pointer"
                onClick={() => updateFormData('dinnerTicket', !formData.dinnerTicket)}>
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={formData.dinnerTicket}
                    onChange={(e) => updateFormData('dinnerTicket', e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Reserve Your Seat</h3>
                    <p className="text-gray-600">Join us for an unforgettable evening</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">₦75</div>
                  <div className="text-gray-600 text-sm">per person</div>
                </div>
              </div>
              {errors.dinnerTicket && (
                <p className="text-red-600 text-sm mt-2 ml-2">{errors.dinnerTicket}</p>
              )}
            </div>

            {formData.dinnerTicket && (
              <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                {/* Guest Count */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-primary-600" />
                      <label className="text-lg font-semibold text-gray-700">Number of Guests</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => updateNumberOfGuests(Math.max(1, formData.numberOfGuests - 1))}
                        disabled={formData.numberOfGuests <= 1}
                        className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xl font-bold text-primary-600 min-w-[3rem] text-center">
                        {formData.numberOfGuests}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateNumberOfGuests(Math.min(10, formData.numberOfGuests + 1))}
                        // disabled={formData.numberOfGuests >= 10}
                        className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    {formData.numberOfGuests === 1 ? '1 guest' : `${formData.numberOfGuests} guests`} • Maximum 10 guests per reservation
                  </div>
                </div>

                {/* Guest Details */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center space-x-3 mb-6">
                    <User className="w-5 h-5 text-primary-600" />
                    <label className="text-lg font-semibold text-gray-700">Guest Details</label>
                  </div>
                  <div className="space-y-6">
                    {formData.guestDetails.map((guest, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-800">
                            {index === 0 ? 'Primary Guest (You)' : `Guest ${index + 1}`}
                          </h4>
                          {index === 0 && (
                            <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded-full">
                              Main Contact
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={guest.name}
                              onChange={(e) => updateGuestDetail(index, 'name', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              placeholder="Enter full name"
                              disabled={index === 0} // Primary guest name is pre-filled and disabled
                            />
                            {errors.guestDetails && errors.guestDetails[index] && (
                              <p className="text-red-600 text-xs mt-1">{errors.guestDetails[index]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Email {index === 0 ? '*' : '(Optional)'}
                            </label>
                            <input
                              type="email"
                              value={guest.email || ''}
                              onChange={(e) => updateGuestDetail(index, 'email', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              placeholder="Enter email address"
                              disabled={index === 0} // Primary guest email is pre-filled and disabled
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Phone {index === 0 ? '*' : '(Optional)'}
                            </label>
                            <input
                              type="tel"
                              value={guest.phone || ''}
                              onChange={(e) => updateGuestDetail(index, 'phone', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              placeholder="Enter phone number"
                              disabled={index === 0} // Primary guest phone is pre-filled and disabled
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Dietary Requirements
                            </label>
                            <select
                              value={guest.dietaryRequirements || ''}
                              onChange={(e) => updateGuestDetail(index, 'dietaryRequirements', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-gray-700 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                              <option value="">No special requirements</option>
                              <option value="vegetarian">Vegetarian</option>
                              <option value="vegan">Vegan</option>
                              <option value="gluten-free">Gluten Free</option>
                              <option value="kosher">Kosher</option>
                              <option value="halal">Halal</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Requests */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <label className="block text-lg font-semibold text-gray-800 mb-4">Special Requests</label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => updateFormData('specialRequests', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                    rows={4}
                    placeholder="Any special requests, allergies, or seating preferences..."
                  />
                </div>

                {/* Total */}
                <div className="bg-gradient-to-r from-primary-100 to-secondary-100 rounded-2xl p-6 border border-primary-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-700">Total Amount</div>
                      <div className="text-sm text-gray-500">{formData.numberOfGuests} {formData.numberOfGuests === 1 ? 'guest' : 'guests'} × ₦75</div>
                    </div>
                    <div className="text-4xl font-bold text-primary-600">₦{calculateTotal()}</div>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={(e) => updateFormData('agreeToTerms', e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 mt-0.5"
                  />
                  <label htmlFor="agreeToTerms" className="text-gray-700 leading-relaxed">
                    I agree to the dinner reservation terms and cancellation policy. Cancellations must be made 48 hours in advance for a full refund.
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-red-600 text-sm ml-8">{errors.agreeToTerms}</p>
                )}

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-[1.02] hover:shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        Confirm Reservation - ₦{calculateTotal()}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>Questions? Contact us at events@company.com or (555) 123-4567</p>
        </div>
      </div>
    </div>
  )
}

export default DinnerPayment