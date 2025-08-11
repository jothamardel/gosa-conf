"use client"

import React, { useState } from 'react'
import { Building, Loader2, Bed, Calendar, Star, Wifi, Car, Coffee, Users, User, Mail, Phone, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'

interface GuestDetails {
  name: string
  email?: string
  phone?: string
}

interface FormData {
  needsAccommodation: boolean
  accommodationType: string
  checkInDate: string
  checkOutDate: string
  numberOfGuests: number
  guestDetails: GuestDetails[]
  specialRequests: string
  agreeToTerms: boolean
}

interface Errors {
  needsAccommodation?: string
  accommodationType?: string
  checkInDate?: string
  checkOutDate?: string
  agreeToTerms?: string
  guestDetails?: string[]
}

interface RoomType {
  id: string
  name: string
  rate: number
  description: string
  amenities: string[]
}

const Accommodation = () => {
  const [formData, setFormData] = useState<FormData>({
    needsAccommodation: false,
    accommodationType: '',
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    guestDetails: [{ name: '', email: '', phone: '' }],
    specialRequests: '',
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roomTypes: RoomType[] = [
    {
      id: 'standard',
      name: 'Standard Room',
      rate: 100,
      description: 'Comfortable accommodation with essential amenities',
      amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk']
    },
    {
      id: 'premium',
      name: 'Premium Room',
      rate: 200,
      description: 'Spacious room with upgraded amenities and city view',
      amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk', 'City View', 'Mini Bar']
    },
    {
      id: 'luxury',
      name: 'Luxury Suite',
      rate: 350,
      description: 'Executive suite with premium amenities and concierge service',
      amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk', 'City View', 'Mini Bar', 'Concierge', 'Balcony']
    }
  ]

  const calculateNights = (): number => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0

    const checkIn = new Date(formData.checkInDate)
    const checkOut = new Date(formData.checkOutDate)
    const timeDiff = checkOut.getTime() - checkIn.getTime()
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24))

    return nights > 0 ? nights : 0
  }

  const calculateTotal = (): number => {
    if (!formData.needsAccommodation || !formData.accommodationType) return 0

    const selectedRoom = roomTypes.find(room => room.id === formData.accommodationType)
    const nights = calculateNights()
    return selectedRoom ? selectedRoom.rate * nights : 0
  }

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    const guestErrors: string[] = []

    if (!formData.needsAccommodation) {
      newErrors.needsAccommodation = "Please select accommodation to proceed"
    }

    if (formData.needsAccommodation && !formData.accommodationType) {
      newErrors.accommodationType = "Please select a room type"
    }

    if (formData.needsAccommodation && !formData.checkInDate) {
      newErrors.checkInDate = "Please select check-in date"
    }

    if (formData.needsAccommodation && !formData.checkOutDate) {
      newErrors.checkOutDate = "Please select check-out date"
    }

    if (formData.checkInDate && formData.checkOutDate) {
      const checkIn = new Date(formData.checkInDate)
      const checkOut = new Date(formData.checkOutDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (checkIn < today) {
        newErrors.checkInDate = "Check-in date cannot be in the past"
      }

      if (checkOut <= checkIn) {
        newErrors.checkOutDate = "Check-out date must be after check-in date"
      }
    }

    // Validate guest details
    if (formData.needsAccommodation) {
      formData.guestDetails.forEach((guest, index) => {
        if (!guest.name.trim()) {
          guestErrors[index] = "Guest name is required"
        }
      })

      if (guestErrors.length > 0) {
        newErrors.guestDetails = guestErrors
      }
    }

    if (formData.needsAccommodation && !formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms"
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
      const response = await fetch('/api/v1/accommodation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.guestDetails[0]?.email || '',
          fullName: formData.guestDetails[0]?.name || '',
          phoneNumber: formData.guestDetails[0]?.phone || '',
          accommodationType: formData.accommodationType,
          checkInDate: formData.checkInDate,
          checkOutDate: formData.checkOutDate,
          numberOfGuests: formData.numberOfGuests,
          guestDetails: formData.guestDetails,
          specialRequests: formData.specialRequests
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to process accommodation booking')
      }

      // Redirect to Paystack payment page
      if (result.data.paymentLink) {
        window.location.href = result.data.paymentLink
      } else {
        toast.success("Accommodation booking initiated! Redirecting to payment...")
      }
    } catch (error: any) {
      console.error('Accommodation booking error:', error)
      toast.error(error.message || "Booking failed. Please try again.")
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

  const getTomorrowDate = (): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMinCheckOutDate = (): string => {
    if (!formData.checkInDate) return getTomorrowDate()

    const checkIn = new Date(formData.checkInDate)
    checkIn.setDate(checkIn.getDate() + 1)
    return checkIn.toISOString().split('T')[0]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-full mb-4 shadow-lg">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Accommodation Booking</h1>
          <p className="text-gray-600">Reserve your stay at our partner hotels with special convention rates</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            {/* Accommodation Selection */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 p-4 bg-primary-50 rounded-xl border-2 border-transparent hover:border-primary-200 transition-all duration-200 cursor-pointer"
                onClick={() => updateFormData('needsAccommodation', !formData.needsAccommodation)}>
                <input
                  type="checkbox"
                  checked={formData.needsAccommodation}
                  onChange={(e) => updateFormData('needsAccommodation', e.target.checked)}
                  className="w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">I need accommodation</h3>
                  <p className="text-gray-600 text-sm">Book your stay with our exclusive rates</p>
                </div>
                <Bed className="w-6 h-6 text-primary-600" />
              </div>
              {errors.needsAccommodation && (
                <p className="text-red-600 text-sm mt-2">{errors.needsAccommodation}</p>
              )}
            </div>

            {formData.needsAccommodation && (
              <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                {/* Room Type Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Star className="w-5 h-5 text-yellow-500 mr-2" />
                    Select Room Type
                  </h3>
                  <div className="grid gap-4">
                    {roomTypes.map((room) => (
                      <div
                        key={room.id}
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${formData.accommodationType === room.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                          }`}
                        onClick={() => updateFormData('accommodationType', room.id)}
                      >
                        <div className="flex items-center mb-3">
                          <input
                            type="radio"
                            checked={formData.accommodationType === room.id}
                            onChange={() => updateFormData('accommodationType', room.id)}
                            className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-center">
                              <h4 className="text-lg font-semibold text-gray-900">{room.name}</h4>
                              <span className="text-2xl font-bold text-primary-600">₦{room.rate}</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{room.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {room.amenities.map((amenity, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {amenity === 'Free WiFi' && <Wifi className="w-3 h-3 mr-1" />}
                                  {amenity === 'Coffee Maker' && <Coffee className="w-3 h-3 mr-1" />}
                                  {amenity === 'Parking' && <Car className="w-3 h-3 mr-1" />}
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.accommodationType && (
                    <p className="text-red-600 text-sm mt-2">{errors.accommodationType}</p>
                  )}
                </div>

                {/* Date Selection */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    <label className="text-lg font-semibold text-gray-900">Stay Dates</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Check-in Date
                      </label>
                      <input
                        type="date"
                        value={formData.checkInDate}
                        onChange={(e) => updateFormData('checkInDate', e.target.value)}
                        min={getTomorrowDate()}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-gray-700 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                      {errors.checkInDate && (
                        <p className="text-red-600 text-xs mt-1">{errors.checkInDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Check-out Date
                      </label>
                      <input
                        type="date"
                        value={formData.checkOutDate}
                        onChange={(e) => updateFormData('checkOutDate', e.target.value)}
                        min={getMinCheckOutDate()}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-gray-700 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                      {errors.checkOutDate && (
                        <p className="text-red-600 text-xs mt-1">{errors.checkOutDate}</p>
                      )}
                    </div>
                  </div>
                  {formData.checkInDate && formData.checkOutDate && calculateNights() > 0 && (
                    <div className="mt-4 text-center">
                      <span className="text-lg font-semibold text-primary-600">
                        {calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Guest Count and Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-primary-600" />
                      <label className="text-lg font-semibold text-gray-900">Number of Guests</label>
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
                        onClick={() => updateNumberOfGuests(Math.min(6, formData.numberOfGuests + 1))}
                        disabled={formData.numberOfGuests >= 6}
                        className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-center mb-6">
                    {formData.numberOfGuests === 1 ? '1 guest' : `${formData.numberOfGuests} guests`} • Maximum 6 guests per room
                  </div>

                  {/* Guest Details */}
                  <div className="space-y-4">
                    {formData.guestDetails.map((guest, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">
                            {index === 0 ? 'Primary Guest (You)' : `Guest ${index + 1}`}
                          </h4>
                          {index === 0 && (
                            <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded-full">
                              Main Contact
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={guest.name}
                              onChange={(e) => updateGuestDetail(index, 'name', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              placeholder="Enter full name"
                            />
                            {errors.guestDetails && errors.guestDetails[index] && (
                              <p className="text-red-600 text-xs mt-1">{errors.guestDetails[index]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email {index === 0 ? '*' : '(Optional)'}
                            </label>
                            <input
                              type="email"
                              value={guest.email || ''}
                              onChange={(e) => updateGuestDetail(index, 'email', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              placeholder="Enter email"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone {index === 0 ? '*' : '(Optional)'}
                            </label>
                            <input
                              type="tel"
                              value={guest.phone || ''}
                              onChange={(e) => updateGuestDetail(index, 'phone', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                              placeholder="Enter phone"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Requests */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <label className="block text-lg font-semibold text-gray-800 mb-4">Special Requests</label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => updateFormData('specialRequests', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                    rows={3}
                    placeholder="Any special requests, accessibility needs, or preferences..."
                  />
                </div>

                {/* Total Calculation */}
                {formData.accommodationType && formData.checkInDate && formData.checkOutDate && calculateNights() > 0 && (
                  <div className="bg-primary-50 rounded-xl p-6 border border-primary-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {roomTypes.find(r => r.id === formData.accommodationType)?.name}
                        </span>
                        <span className="font-medium">
                          ₦{roomTypes.find(r => r.id === formData.accommodationType)?.rate}/night
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'}
                        </span>
                        <span className="font-medium">
                          ₦{roomTypes.find(r => r.id === formData.accommodationType)?.rate} × {calculateNights()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {formData.numberOfGuests} {formData.numberOfGuests === 1 ? 'guest' : 'guests'}
                        </span>
                        <span className="font-medium">
                          {formData.checkInDate} to {formData.checkOutDate}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-semibold text-gray-900">Total Amount</span>
                        <span className="text-2xl font-bold text-primary-600">₦{calculateTotal()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Terms Agreement */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={(e) => updateFormData('agreeToTerms', e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 mt-0.5"
                  />
                  <label htmlFor="agreeToTerms" className="text-sm text-gray-700 leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-primary-600 hover:underline font-medium">
                      cancellation policy
                    </a>{' '}
                    and hotel terms. Cancellations must be made 24 hours in advance for a full refund.
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-red-600 text-sm">{errors.agreeToTerms}</p>
                )}

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.accommodationType || !formData.checkInDate || !formData.checkOutDate || !formData.agreeToTerms || calculateTotal() === 0}
                    className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        Processing Booking...
                      </>
                    ) : (
                      <>
                        Book for ₦{calculateTotal()}
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
          <p>Questions about accommodation? Contact us at bookings@company.com or (555) 123-4567</p>
        </div>
      </div>
    </div>
  )
}

export default Accommodation