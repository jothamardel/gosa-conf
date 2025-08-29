"use client"

import React, { useState } from 'react'
import { BookOpen, Loader2, Download, Check, FileText, Users, Calendar, MapPin, Star, Plus, Minus, Package, Monitor } from 'lucide-react'
import { toast } from 'sonner'

interface RecipientDetails {
  name: string
  email?: string
  phone?: string
}

interface FormData {
  purchaseBrochure: boolean
  brochureType: 'digital' | 'physical'
  quantity: number
  recipientDetails: RecipientDetails[]
  agreeToTerms: boolean
}

interface Errors {
  purchaseBrochure?: string
  brochureType?: string
  agreeToTerms?: string
  recipientDetails?: string[]
}

const BROCHURE_PRICING = {
  digital: +process.env.BROCHURE_PHYSICAL_FEE as number,
  physical: +process.env.BROCHURE_PHYSICAL_FEE as number
}
// BROCHURE_PHYSICAL_FEE=1200
// BROCHURE_DIGITAL_FEE=2200

const ConventionBrochure = () => {
  const [formData, setFormData] = useState<FormData>({
    purchaseBrochure: false,
    brochureType: 'physical',
    quantity: 1,
    recipientDetails: [{ name: '', email: '', phone: '' }],
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [brochureUnlocked] = useState(false)

  const calculateTotal = (): number => {
    if (!formData.purchaseBrochure || !formData.brochureType) return 0
    return BROCHURE_PRICING[formData.brochureType] * formData.quantity
  }

  const getPricePerUnit = (): number => {
    if (!formData.brochureType) return 0
    return BROCHURE_PRICING[formData.brochureType]
  }

  const normalizePhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return phoneNumber

    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '')

    // If already in international format with +234
    if (cleanNumber.startsWith('234') && cleanNumber.length === 13) {
      return '+' + cleanNumber
    }

    // If starts with 0 (Nigerian local format)
    if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
      return '+234' + cleanNumber.substring(1)
    }

    // If 10 digits starting with 7, 8, or 9 (Nigerian without 0)
    if (cleanNumber.length === 10 && /^[789]/.test(cleanNumber)) {
      return '+234' + cleanNumber
    }

    // If it's already a valid international number, add + if missing
    if (cleanNumber.length >= 10 && !phoneNumber.startsWith('+')) {
      return '+' + cleanNumber
    }

    // Return as is if already has + or doesn't match patterns
    return phoneNumber
  }

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    const recipientErrors: string[] = []

    if (!formData.purchaseBrochure) {
      newErrors.purchaseBrochure = "Please select brochure purchase to proceed"
    }

    if (formData.purchaseBrochure && !formData.brochureType) {
      newErrors.brochureType = "Please select brochure type"
    }

    // Validate recipient details
    if (formData.purchaseBrochure && formData.brochureType === 'digital') {
      formData.recipientDetails.forEach((recipient, index) => {
        if (!recipient.name.trim()) {
          recipientErrors[index] = "Recipient name is required"
        } else if (formData.brochureType === 'digital' && !recipient.email?.trim()) {
          recipientErrors[index] = "Email is required for digital brochures"
        } else if (formData.brochureType === 'digital' && recipient.email && !/\S+@\S+\.\S+/.test(recipient.email)) {
          recipientErrors[index] = "Please enter a valid email address"
        }
        // For physical brochures, name is sufficient (email and phone are optional)
      })

      if (recipientErrors.some(error => error)) {
        newErrors.recipientDetails = recipientErrors
      }
    }

    if (formData.purchaseBrochure && !formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (): Promise<void> => {
    console.log('Form submission started', { formData })

    if (!validateForm()) {
      console.log('Form validation failed', errors)
      return
    }

    setIsSubmitting(true)
    try {
      // Normalize phone numbers in recipient details
      const normalizedRecipientDetails = formData.recipientDetails.map(recipient => ({
        ...recipient,
        phone: recipient.phone ? normalizePhoneNumber(recipient.phone) : recipient.phone
      }))

      const requestBody = {
        email: formData.recipientDetails[0]?.email || '',
        fullName: formData.recipientDetails[0]?.name || '',
        phoneNumber: formData.recipientDetails[0]?.phone ? normalizePhoneNumber(formData.recipientDetails[0].phone) : '',
        quantity: formData.quantity,
        brochureType: formData.brochureType,
        recipientDetails: normalizedRecipientDetails
      }

      console.log('Sending request to API:', requestBody)

      const response = await fetch('/api/v1/brochure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('API response status:', response.status)
      const result = await response.json()
      console.log('API response data:', result)

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to process brochure order')
      }

      // Redirect to Paystack payment page
      if (result.data.paymentLink) {
        console.log('Redirecting to payment:', result.data.paymentLink)
        window.location.href = result.data.paymentLink
      } else {
        toast.success("Brochure order initiated! Redirecting to payment...")
      }
    } catch (error: any) {
      console.error('Brochure order error:', error)
      toast.error(error.message || "Order failed. Please try again.")
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

  const updateQuantity = (newQuantity: number): void => {
    const currentRecipients = [...formData.recipientDetails]

    if (newQuantity > currentRecipients.length) {
      // Add new empty recipient entries
      for (let i = currentRecipients.length; i < newQuantity; i++) {
        currentRecipients.push({ name: '' })
      }
    } else if (newQuantity < currentRecipients.length) {
      // Remove excess recipient entries
      currentRecipients.splice(newQuantity)
    }

    setFormData(prev => ({
      ...prev,
      quantity: newQuantity,
      recipientDetails: currentRecipients
    }))
  }

  const updateRecipientDetail = (index: number, field: keyof RecipientDetails, value: string): void => {
    const updatedRecipients = [...formData.recipientDetails]

    // Normalize phone number on blur/change for better UX
    if (field === 'phone' && value) {
      // Only normalize if it looks like a complete phone number
      const cleanValue = value.replace(/\D/g, '')
      if (cleanValue.length >= 10) {
        value = normalizePhoneNumber(value)
      }
    }

    updatedRecipients[index] = {
      ...updatedRecipients[index],
      [field]: value
    }

    setFormData(prev => ({
      ...prev,
      recipientDetails: updatedRecipients
    }))

    // Clear recipient-specific errors
    if (errors.recipientDetails && errors.recipientDetails[index]) {
      const newRecipientErrors = [...(errors.recipientDetails || [])]
      newRecipientErrors[index] = ''
      setErrors(prev => ({
        ...prev,
        recipientDetails: newRecipientErrors
      }))
    }
  }

  const handleBrochureView = (): void => {
    toast.info("Preparing your brochure...")
    // Add your brochure download/view logic here
  }

  const brochureFeatures = [
    { icon: Calendar, text: "Complete event schedule" },
    { icon: Users, text: "Speaker profiles & biographies" },
    { icon: MapPin, text: "Venue maps & directions" },
    { icon: Star, text: "Exclusive content & insights" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-full mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Convention Brochure</h1>
          <p className="text-gray-600">Your complete guide to the event experience</p>
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Brochure Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-secondary-500 p-6 text-white">
                <div className="flex items-center space-x-3">
                  <FileText className="w-6 h-6" />
                  <div>
                    <h2 className="text-xl font-bold">Official Event Brochure</h2>
                    <p className="text-primary-100">Complete program details & exclusive content</p>
                  </div>
                </div>
              </div>

              {/* Brochure Preview Content */}
              <div className="p-6">
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {brochureFeatures.map((feature, index) => {
                    const IconComponent = feature.icon
                    return (
                      <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-primary-600" />
                        </div>
                        <span className="text-gray-700 font-medium">{feature.text}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Sample Content Preview */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Premium Content Preview</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Unlock detailed schedules, speaker insights, networking guides, and exclusive behind-the-scenes content
                    </p>
                    {!brochureUnlocked && (
                      <div className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        <BookOpen className="w-3 h-3 mr-1" />
                        Purchase required to unlock
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {brochureUnlocked ? (
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">Brochure Unlocked!</h3>
                    <p className="text-green-600 text-sm">
                      Thank you for your purchase. You now have full access to the event brochure.
                    </p>
                  </div>

                  <button
                    onClick={handleBrochureView}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    View Brochure
                  </button>

                  <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">What's Included:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• 50+ page detailed guide</li>
                      <li>• Digital & print versions</li>
                      <li>• Lifetime access</li>
                      <li>• Regular updates</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-primary-600">
                      {formData.brochureType ? `₦${getPricePerUnit()}` : '₦10-25'}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {formData.brochureType ? 'per brochure' : 'per brochure (varies by type)'}
                    </div>
                  </div>

                  {/* Purchase Option */}
                  <div className="mb-6">
                    <div
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${formData.purchaseBrochure
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      onClick={() => updateFormData('purchaseBrochure', !formData.purchaseBrochure)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.purchaseBrochure}
                          onChange={(e) => updateFormData('purchaseBrochure', e.target.checked)}
                          className="w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Purchase Convention Brochure</div>
                          <div className="text-sm text-gray-600">Complete access to all content</div>
                        </div>
                      </div>
                    </div>
                    {errors.purchaseBrochure && (
                      <p className="text-red-600 text-sm mt-2">{errors.purchaseBrochure}</p>
                    )}
                  </div>

                  {formData.purchaseBrochure && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                      {/* Brochure Type Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">Brochure Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${formData.brochureType === 'digital'
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-300'
                              }`}
                            onClick={() => updateFormData('brochureType', 'digital')}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                checked={formData.brochureType === 'digital'}
                                onChange={() => updateFormData('brochureType', 'digital')}
                                className="w-4 h-4 text-primary-600"
                              />
                              <Monitor className="w-4 h-4 text-primary-600" />
                              <span className="text-sm font-medium">Digital</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-6">₦{BROCHURE_PRICING.digital} • Instant download</p>
                          </div>
                          <div
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${formData.brochureType === 'physical'
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-300'
                              }`}
                            onClick={() => updateFormData('brochureType', 'physical')}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                checked={formData.brochureType === 'physical'}
                                onChange={() => updateFormData('brochureType', 'physical')}
                                className="w-4 h-4 text-primary-600"
                              />
                              <Package className="w-4 h-4 text-primary-600" />
                              <span className="text-sm font-medium">Physical</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-6">₦{BROCHURE_PRICING.physical} • Pickup at venue</p>
                          </div>
                        </div>
                        {errors.brochureType && (
                          <p className="text-red-600 text-sm mt-2">{errors.brochureType}</p>
                        )}
                      </div>

                      {/* Quantity Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-gray-900">Quantity</label>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(Math.max(1, formData.quantity - 1))}
                              disabled={formData.quantity <= 1}
                              className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-lg font-bold text-primary-600 min-w-[2rem] text-center">
                              {formData.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(Math.min(10, formData.quantity + 1))}
                              disabled={formData.quantity >= 10}
                              className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          Maximum 10 brochures per order
                        </div>
                      </div>

                      {/* Recipient Details */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          {formData.brochureType === 'digital' ? 'Email Recipients' : 'Recipients'}
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {formData.recipientDetails.map((recipient, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-medium text-gray-800">
                                  {index === 0 ? 'Primary (You)' : `Recipient ${index + 1}`}
                                </h4>
                                {index === 0 && (
                                  <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded-full">
                                    Main
                                  </span>
                                )}
                              </div>
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={recipient.name}
                                  onChange={(e) => updateRecipientDetail(index, 'name', e.target.value)}
                                  className="w-full rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  placeholder="Full name"
                                />
                                <input
                                  type="email"
                                  value={recipient.email || ''}
                                  onChange={(e) => updateRecipientDetail(index, 'email', e.target.value)}
                                  className="w-full rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  placeholder={formData.brochureType === 'digital' ? 'Email (required)' : 'Email (optional)'}
                                />
                                {formData.brochureType === 'physical' && (
                                  <input
                                    type="tel"
                                    value={recipient.phone || ''}
                                    onChange={(e) => updateRecipientDetail(index, 'phone', e.target.value)}
                                    onBlur={(e) => {
                                      // Format phone number when user finishes typing
                                      if (e.target.value) {
                                        updateRecipientDetail(index, 'phone', normalizePhoneNumber(e.target.value))
                                      }
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="Phone (optional) - e.g., 090xxxxxxxx"
                                  />
                                )}
                                {errors.recipientDetails && errors.recipientDetails[index] && (
                                  <p className="text-red-600 text-xs">{errors.recipientDetails[index]}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-gray-700 font-medium text-sm">Total Amount</div>
                            <div className="text-xs text-gray-500">
                              {formData.quantity} × ₦{getPricePerUnit()}
                            </div>
                          </div>
                          <div className="text-xl font-bold text-primary-600">₦{calculateTotal()}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terms Agreement */}
                  {formData.purchaseBrochure && (
                    <div className="mt-4">
                      <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                        <input
                          type="checkbox"
                          id="agreeToTerms"
                          checked={formData.agreeToTerms}
                          onChange={(e) => updateFormData('agreeToTerms', e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 mt-0.5"
                        />
                        <label htmlFor="agreeToTerms" className="text-xs text-gray-700 leading-relaxed">
                          I agree to the{' '}
                          <a href="#" className="text-primary-600 hover:underline font-medium">
                            Terms and Conditions
                          </a>{' '}
                          for digital content purchase
                        </label>
                      </div>
                      {errors.agreeToTerms && (
                        <p className="text-red-600 text-sm mt-2">{errors.agreeToTerms}</p>
                      )}
                    </div>
                  )}

                  {/* Purchase Button */}
                  {formData.purchaseBrochure && (
                    <div className="mt-4">
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.purchaseBrochure || !formData.agreeToTerms || calculateTotal() === 0}
                        className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Processing Order...
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-5 h-5 mr-2" />
                            Order for ₦{calculateTotal()}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Security Badge */}
                  {formData.purchaseBrochure && (
                    <div className="mt-3 text-center">
                      <div className="inline-flex items-center text-xs text-gray-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Secure payment processing
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>Questions about the brochure? Contact us at info@convention.com</p>
          <p className="mt-1">Instant access • Lifetime updates • 30-day money-back guarantee</p>
        </div>
      </div>
    </div>
  )
}

export default ConventionBrochure