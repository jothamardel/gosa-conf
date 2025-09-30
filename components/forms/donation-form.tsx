"use client"

import React, { useState } from 'react'
import { Heart, Loader2, Users, Lightbulb, BookOpen, Shield, User, Mail, Phone, EyeOff, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface FormData {
  donationAmount: number
  customAmount: string
  donorName: string
  donorEmail: string
  donorPhone: string
  anonymous: boolean
  onBehalfOf: string
  agreeToTerms: boolean
}

interface Errors {
  donationAmount?: string
  customAmount?: string
  donorName?: string
  donorEmail?: string
  agreeToTerms?: string
}

interface DonationOption {
  amount: number
  label: string
  description: string
  icon: React.ElementType
}

const MIN_DONATION = 5

const DonationForm = () => {
  const [formData, setFormData] = useState<FormData>({
    donationAmount: 2500,
    customAmount: '',
    donorName: '',
    donorEmail: '',
    donorPhone: '',
    anonymous: false,
    onBehalfOf: '',
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const donationOptions: DonationOption[] = [
    {
      amount: 2500,
      label: '₦2,500',
      description: 'Provides materials for one student',
      icon: BookOpen
    },
    {
      amount: 5000,
      label: '₦5,000',
      description: 'Supports a workshop session',
      icon: Lightbulb
    },
    {
      amount: 10000,
      label: '₦10,000',
      description: 'Sponsors a community program',
      icon: Users
    },
    {
      amount: 25000,
      label: '₦25,000',
      description: 'Funds a complete course',
      icon: Shield
    }
  ]

  const getDonationAmount = (): number => {
    if (formData.donationAmount === 0) {
      return parseFloat(formData.customAmount) || 0
    }
    return formData.donationAmount
  }

  const validateForm = (): boolean => {
    const newErrors: Errors = {}

    const donationAmount = getDonationAmount()
    if (donationAmount < MIN_DONATION) {
      if (formData.donationAmount === 0) {
        newErrors.customAmount = `Minimum donation amount is ₦${MIN_DONATION}`
      } else {
        newErrors.donationAmount = `Minimum donation amount is ₦${MIN_DONATION}`
      }
    }

    if (!formData.anonymous) {
      if (!formData.donorName.trim()) {
        newErrors.donorName = "Donor name is required"
      }
      if (!formData.donorEmail.trim()) {
        newErrors.donorEmail = "Email address is required"
      } else if (!/\S+@\S+\.\S+/.test(formData.donorEmail)) {
        newErrors.donorEmail = "Please enter a valid email address"
      }
    }

    if (!formData.agreeToTerms) {
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
      const response = await fetch('/api/v1/donation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.donorEmail,
          fullName: formData.donorName,
          phoneNumber: formData.donorPhone,
          amount: getDonationAmount(),
          donorName: formData.anonymous ? undefined : formData.donorName.trim(),
          donorEmail: formData.anonymous ? undefined : formData.donorEmail.trim(),
          donorPhone: formData.anonymous ? undefined : formData.donorPhone.trim(),
          anonymous: formData.anonymous,
          onBehalfOf: formData.onBehalfOf.trim() || undefined
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to process donation')
      }

      // Redirect to Paystack payment page
      if (result.data.paymentLink) {
        window.location.href = result.data.paymentLink
      } else {
        toast.success("Donation initiated! Redirecting to payment...")
      }
    } catch (error: any) {
      console.error('Donation error:', error)
      toast.error(error.message || "Donation failed. Please try again.")
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

  const handlePresetAmount = (amount: number): void => {
    updateFormData('donationAmount', amount)
    updateFormData('customAmount', '')
  }

  const handleCustomAmount = (value: string): void => {
    updateFormData('customAmount', value)
    updateFormData('donationAmount', 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-full mb-4 shadow-lg">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Make a Donation</h1>
          <p className="text-gray-600 text-lg">Your generous contribution helps support our mission and programs</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8">
            {/* Donation Amount Selection */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Choose Your Impact</h3>

              {/* Preset Amounts */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {donationOptions.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <div
                      key={option.amount}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${formData.donationAmount === option.amount && !formData.customAmount
                        ? 'border-primary-600 bg-primary-50 shadow-lg'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-primary-25'
                        }`}
                      onClick={() => handlePresetAmount(option.amount)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <IconComponent className={`w-6 h-6 ${formData.donationAmount === option.amount && !formData.customAmount
                          ? 'text-primary-600'
                          : 'text-gray-500'
                          }`} />
                        <span className={`text-2xl font-bold ${formData.donationAmount === option.amount && !formData.customAmount
                          ? 'text-primary-600'
                          : 'text-gray-700'
                          }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{option.description}</p>
                    </div>
                  )
                })}
              </div>

              {/* Custom Amount */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Or enter a custom amount (minimum ₦{MIN_DONATION})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl font-semibold">₦</span>
                  <input
                    type="number"
                    value={formData.customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-4 text-xl font-semibold rounded-xl border border-gray-300 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="0"
                    min={MIN_DONATION}
                    step="1"
                  />
                </div>
                {errors.donationAmount && (
                  <p className="text-red-600 text-sm mt-2">{errors.donationAmount}</p>
                )}
                {errors.customAmount && (
                  <p className="text-red-600 text-sm mt-2">{errors.customAmount}</p>
                )}
              </div>
            </div>

            {/* Total Display */}
            {getDonationAmount() >= MIN_DONATION && (
              <div className="bg-gradient-to-r from-primary-600 to-secondary-500 rounded-2xl p-6 mb-8 text-white animate-in slide-in-from-top-4 duration-500">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">Your generous donation</div>
                  <div className="text-4xl font-bold">₦{getDonationAmount()}</div>
                  <div className="text-primary-100 mt-2">will make a real difference in our community</div>
                </div>
              </div>
            )}

            {/* Donor Information */}
            <div className="mb-8">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <User className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Donor Information</h3>
                </div>

                {/* Anonymous Toggle */}
                <div className="mb-4">
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${formData.anonymous
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                      }`}
                    onClick={() => updateFormData('anonymous', !formData.anonymous)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.anonymous}
                        onChange={(e) => updateFormData('anonymous', e.target.checked)}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <EyeOff className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Make this donation anonymous</div>
                        <div className="text-sm text-gray-600">Your name will not be displayed publicly</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Donor Details */}
                {!formData.anonymous && (
                  <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.donorName}
                          onChange={(e) => updateFormData('donorName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                          placeholder="Enter your full name"
                        />
                        {errors.donorName && (
                          <p className="text-red-600 text-sm mt-1">{errors.donorName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.donorEmail}
                          onChange={(e) => updateFormData('donorEmail', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                          placeholder="Enter your email"
                        />
                        {errors.donorEmail && (
                          <p className="text-red-600 text-sm mt-1">{errors.donorEmail}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.donorPhone}
                        onChange={(e) => updateFormData('donorPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                )}

                {/* On Behalf Of */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Donating on behalf of someone? (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.onBehalfOf}
                    onChange={(e) => updateFormData('onBehalfOf', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="e.g., In memory of John Smith, On behalf of ABC Company"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    This will be displayed with your donation if provided
                  </div>
                </div>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="mb-8">
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
                    Terms and Conditions
                  </a>{' '}
                  and confirm this is a non-refundable donation. I understand that this donation will be used to support the organization's mission and programs.
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-red-600 text-sm mt-2">{errors.agreeToTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || getDonationAmount() < MIN_DONATION || !formData.agreeToTerms}
                className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-[1.02] hover:shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Processing Donation...
                  </>
                ) : (
                  <>
                    <Heart className="w-5 h-5 mr-2" />
                    Donate ₦{getDonationAmount() || MIN_DONATION}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8 space-y-2">
          <p>Your donation is secure and will be processed safely</p>
          <p>Questions? Contact us at donations@organization.org or (555) 123-4567</p>
        </div>

        {/* Impact Statement */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mt-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">Your Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-600">1,200+</div>
              <div className="text-sm text-gray-600">People helped this year</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-600">95%</div>
              <div className="text-sm text-gray-600">Goes directly to programs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-600">24/7</div>
              <div className="text-sm text-gray-600">Support available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DonationForm