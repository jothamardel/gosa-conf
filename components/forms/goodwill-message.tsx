"use client"

import React, { useState } from 'react'
import { MessageCircle, Loader2, Heart, Send, Users, Sparkles, Star, DollarSign, User, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface FormData {
  includeMessage: boolean
  message: string
  donationAmount: number
  customAmount: string
  attributionName: string
  anonymous: boolean
  agreeToTerms: boolean
}

interface Errors {
  message?: string
  donationAmount?: string
  customAmount?: string
  attributionName?: string
  agreeToTerms?: string
}

// Mock user data - in real app this would come from auth
const MOCK_USER = {
  id: '507f1f77bcf86cd799439011',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890'
}

const SUGGESTED_AMOUNTS = [10, 25, 50, 100, 250]
const MIN_DONATION = 10

const GoodwillMessage = () => {
  const [formData, setFormData] = useState<FormData>({
    includeMessage: false,
    message: '',
    donationAmount: 25,
    customAmount: '',
    attributionName: MOCK_USER.name,
    anonymous: false,
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getDonationAmount = (): number => {
    if (formData.donationAmount === 0) {
      return parseFloat(formData.customAmount) || 0
    }
    return formData.donationAmount
  }

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    
    if (formData.includeMessage && !formData.message.trim()) {
      newErrors.message = "Message is required when including a goodwill message"
    }

    if (formData.message.length > 500) {
      newErrors.message = "Message must be 500 characters or less"
    }

    const donationAmount = getDonationAmount()
    if (donationAmount < MIN_DONATION) {
      if (formData.donationAmount === 0) {
        newErrors.customAmount = `Minimum donation amount is ₦${MIN_DONATION}`
      } else {
        newErrors.donationAmount = `Minimum donation amount is ₦${MIN_DONATION}`
      }
    }

    if (!formData.anonymous && !formData.attributionName.trim()) {
      newErrors.attributionName = "Attribution name is required when not anonymous"
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
      const response = await fetch('/api/v1/goodwill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: MOCK_USER.email,
          fullName: MOCK_USER.name,
          phoneNumber: MOCK_USER.phone,
          message: formData.includeMessage ? formData.message.trim() : '',
          donationAmount: getDonationAmount(),
          attributionName: formData.anonymous ? undefined : formData.attributionName.trim(),
          anonymous: formData.anonymous
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to process goodwill message')
      }

      // Redirect to Paystack payment page
      if (result.data.paymentLink) {
        window.location.href = result.data.paymentLink
      } else {
        toast.success("Goodwill message submitted! Redirecting to payment...")
      }
    } catch (error: any) {
      console.error('Goodwill message error:', error)
      toast.error(error.message || "Submission failed. Please try again.")
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

  const messagePrompts = [
    "Thank you for all your hard work...",
    "Your efforts make a real difference...",
    "Keep up the amazing work...",
    "We appreciate everything you do...",
    "Your dedication inspires us all..."
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-full mb-4 shadow-lg">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Your Goodwill</h1>
          <p className="text-gray-600">Send a message of support, encouragement, or appreciation</p>
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Community Messages Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="text-center mb-6">
                <Sparkles className="w-10 h-10 text-primary-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Message Impact</h3>
                <p className="text-gray-600 text-sm">Your words of encouragement brighten someone's day</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-primary-50 rounded-xl">
                  <Users className="w-5 h-5 text-primary-600" />
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">750+</div>
                    <div className="text-gray-600">Messages shared</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-xl">
                  <Heart className="w-5 h-5 text-secondary-600" />
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">98%</div>
                    <div className="text-gray-600">Positive feedback</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-primary-50 rounded-xl">
                  <Star className="w-5 h-5 text-primary-600" />
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">Daily</div>
                    <div className="text-gray-600">Inspiration shared</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Messages Preview */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Messages</h3>
              <div className="space-y-3">
                <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
                  <p className="text-sm text-gray-700 italic">"Thank you for all your amazing work in the community! Your dedication doesn't go unnoticed."</p>
                  <div className="text-xs text-gray-500 mt-2">- Anonymous Supporter</div>
                </div>
                <div className="p-4 bg-secondary-50 rounded-xl border border-secondary-200">
                  <p className="text-sm text-gray-700 italic">"Keep up the fantastic efforts. You're making a real difference in people's lives!"</p>
                  <div className="text-xs text-gray-500 mt-2">- Community Member</div>
                </div>
                <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
                  <p className="text-sm text-gray-700 italic">"Your positive energy and hard work inspire us all. Thank you for everything you do!"</p>
                  <div className="text-xs text-gray-500 mt-2">- Grateful Friend</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-6">
                {/* Message Section */}
                <div className="mb-6">
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      formData.includeMessage
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                    onClick={() => updateFormData('includeMessage', !formData.includeMessage)}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="checkbox"
                        checked={formData.includeMessage}
                        onChange={(e) => updateFormData('includeMessage', e.target.checked)}
                        className="w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">I want to share a goodwill message</h3>
                        <p className="text-gray-600 text-sm">Spread positivity and show your appreciation</p>
                      </div>
                      <MessageCircle className={`w-6 h-6 ${formData.includeMessage ? 'text-primary-600' : 'text-gray-400'}`} />
                    </div>

                    {formData.includeMessage && (
                      <div className="animate-in slide-in-from-top-4 duration-500">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Message of Goodwill *
                        </label>
                        
                        {/* Message Prompts */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Need inspiration? Try one of these:</p>
                          <div className="flex flex-wrap gap-1">
                            {messagePrompts.map((prompt, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => updateFormData('message', prompt)}
                                className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors duration-200"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <textarea
                          value={formData.message}
                          onChange={(e) => updateFormData('message', e.target.value)}
                          className="w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                          rows={5}
                          placeholder="Share your thoughts, appreciation, encouragement, or kind words..."
                        />
                        <div className="flex justify-between items-center mt-1">
                          {errors.message && (
                            <p className="text-red-600 text-sm">{errors.message}</p>
                          )}
                          <div className="text-xs text-gray-500 ml-auto">
                            {formData.message.length}/500 characters
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Preview */}
                {formData.includeMessage && formData.message.trim() && (
                  <div className="bg-primary-50 rounded-xl p-4 mb-6 border border-primary-200 animate-in slide-in-from-top-4 duration-500">
                    <h3 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                      <Heart className="w-4 h-4 text-secondary-600 mr-2" />
                      Message Preview
                    </h3>
                    <div className="bg-white rounded-lg p-3 border border-primary-100">
                      <p className="text-gray-700 italic">"{formData.message}"</p>
                      <div className="text-xs text-gray-500 mt-1">
                        - {formData.anonymous ? 'Anonymous Supporter' : formData.attributionName}
                      </div>
                    </div>
                  </div>
                )}

                {/* Donation Amount Section */}
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <DollarSign className="w-5 h-5 text-primary-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Support with a Donation</h3>
                        <p className="text-gray-600 text-sm">Your contribution helps support our mission</p>
                      </div>
                    </div>

                    {/* Suggested Amounts */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Select Amount</label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {SUGGESTED_AMOUNTS.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => {
                              updateFormData('donationAmount', amount)
                              updateFormData('customAmount', '')
                            }}
                            className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                              formData.donationAmount === amount
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-primary-300 text-gray-700'
                            }`}
                          >
                            <div className="font-semibold">₦{amount}</div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateFormData('donationAmount', 0)}
                          className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                            formData.donationAmount === 0
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-primary-300 text-gray-700'
                          }`}
                        >
                          <div className="font-semibold text-sm">Custom</div>
                        </button>
                      </div>
                      {errors.donationAmount && (
                        <p className="text-red-600 text-sm">{errors.donationAmount}</p>
                      )}
                    </div>

                    {/* Custom Amount Input */}
                    {formData.donationAmount === 0 && (
                      <div className="mb-4 animate-in slide-in-from-top-4 duration-300">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Amount (minimum ₦{MIN_DONATION})
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="number"
                            min={MIN_DONATION}
                            step="1"
                            value={formData.customAmount}
                            onChange={(e) => updateFormData('customAmount', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            placeholder={`${MIN_DONATION}`}
                          />
                        </div>
                        {errors.customAmount && (
                          <p className="text-red-600 text-sm mt-1">{errors.customAmount}</p>
                        )}
                      </div>
                    )}

                    {/* Total Display */}
                    <div className="bg-primary-100 rounded-lg p-3 border border-primary-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Donation Amount:</span>
                        <span className="text-2xl font-bold text-primary-600">
                          ₦{getDonationAmount() || MIN_DONATION}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attribution Section */}
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <User className="w-5 h-5 text-primary-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Attribution</h3>
                        <p className="text-gray-600 text-sm">How would you like to be recognized?</p>
                      </div>
                    </div>

                    {/* Anonymous Toggle */}
                    <div className="mb-4">
                      <div 
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          formData.anonymous
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
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <EyeOff className="w-4 h-4 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">Submit anonymously</div>
                            <div className="text-sm text-gray-600">Your name will not be displayed</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Attribution Name */}
                    {!formData.anonymous && (
                      <div className="animate-in slide-in-from-top-4 duration-300">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={formData.attributionName}
                          onChange={(e) => updateFormData('attributionName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                          placeholder="How should we credit you?"
                          maxLength={100}
                        />
                        {errors.attributionName && (
                          <p className="text-red-600 text-sm mt-1">{errors.attributionName}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          This name will be displayed with your message (if included)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="mb-6">
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
                      and confirm that my message is respectful and appropriate
                    </label>
                  </div>
                  {errors.agreeToTerms && (
                    <p className="text-red-600 text-sm mt-1">{errors.agreeToTerms}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.agreeToTerms || getDonationAmount() < MIN_DONATION}
                  className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5 mr-2" />
                      {formData.includeMessage 
                        ? `Send Message & Donate ₦${getDonationAmount()}` 
                        : `Donate ₦${getDonationAmount()}`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>Your words of encouragement mean the world to our community</p>
          <p className="mt-1">Questions? Contact us at messages@organization.org</p>
        </div>
      </div>
    </div>
  )
}

export default GoodwillMessage