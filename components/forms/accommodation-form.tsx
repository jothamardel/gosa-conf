"use client"

import React, { useState } from 'react'
import { Building, Loader2, Bed, Calendar, Star, Wifi, Car, Coffee } from 'lucide-react'

interface FormData {
  needsAccommodation: boolean
  roomType: string
  nights: number
  agreeToTerms: boolean
}

interface Errors {
  needsAccommodation?: string
  roomType?: string
  agreeToTerms?: string
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
    roomType: '',
    nights: 1,
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

  const calculateTotal = (): number => {
    if (!formData.needsAccommodation || !formData.roomType) return 0
    
    const selectedRoom = roomTypes.find(room => room.id === formData.roomType)
    return selectedRoom ? selectedRoom.rate * formData.nights : 0
  }

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    
    if (!formData.needsAccommodation) {
      newErrors.needsAccommodation = "Please select accommodation to proceed"
    }
    
    if (formData.needsAccommodation && !formData.roomType) {
      newErrors.roomType = "Please select a room type"
    }
    
    if (formData.needsAccommodation && !formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success'): void => {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 shadow-lg transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast)
        }
      }, 300)
    }, 3000)
  }

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      showToast(`Accommodation booked for ${formData.nights} night(s)!`, 'success')
    } catch (error) {
      showToast("Booking failed. Please try again.", 'error')
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
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          formData.roomType === room.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                        onClick={() => updateFormData('roomType', room.id)}
                      >
                        <div className="flex items-center mb-3">
                          <input
                            type="radio"
                            checked={formData.roomType === room.id}
                            onChange={() => updateFormData('roomType', room.id)}
                            className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-center">
                              <h4 className="text-lg font-semibold text-gray-900">{room.name}</h4>
                              <span className="text-2xl font-bold text-primary-600">${room.rate}</span>
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
                  {errors.roomType && (
                    <p className="text-red-600 text-sm mt-2">{errors.roomType}</p>
                  )}
                </div>

                {/* Number of Nights */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    <label className="text-lg font-semibold text-gray-900">Number of Nights</label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => updateFormData('nights', Math.max(1, formData.nights - 1))}
                      className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-3xl font-bold text-primary-600">{formData.nights}</div>
                      <div className="text-sm text-gray-600">{formData.nights === 1 ? 'night' : 'nights'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateFormData('nights', Math.min(14, formData.nights + 1))}
                      className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-500 mt-2">
                    Maximum 14 nights
                  </div>
                </div>

                {/* Total Calculation */}
                {formData.roomType && (
                  <div className="bg-primary-50 rounded-xl p-6 border border-primary-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {roomTypes.find(r => r.id === formData.roomType)?.name}
                        </span>
                        <span className="font-medium">
                          ${roomTypes.find(r => r.id === formData.roomType)?.rate}/night
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {formData.nights} {formData.nights === 1 ? 'night' : 'nights'}
                        </span>
                        <span className="font-medium">
                          ${roomTypes.find(r => r.id === formData.roomType)?.rate} × {formData.nights}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-semibold text-gray-900">Total Amount</span>
                        <span className="text-2xl font-bold text-primary-600">${calculateTotal()}</span>
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
                    disabled={isSubmitting || !formData.roomType || !formData.agreeToTerms}
                    className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        Processing Booking...
                      </>
                    ) : (
                      <>
                        Book for ${calculateTotal()}
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