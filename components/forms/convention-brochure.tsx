"use client"

import React, { useState } from 'react'
import { BookOpen, Loader2, Download, Check, FileText, Users, Calendar, MapPin, Star } from 'lucide-react'

interface FormData {
  purchaseBrochure: boolean
  agreeToTerms: boolean
}

interface Errors {
  purchaseBrochure?: string
  agreeToTerms?: string
}

const ConventionBrochure = () => {
  const [formData, setFormData] = useState<FormData>({
    purchaseBrochure: false,
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [brochureUnlocked, setBrochureUnlocked] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    
    if (!formData.purchaseBrochure) {
      newErrors.purchaseBrochure = "Please select brochure purchase to proceed"
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success'): void => {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 shadow-lg transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
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
      await new Promise(resolve => setTimeout(resolve, 1500))
      setBrochureUnlocked(true)
      showToast("Brochure purchased successfully!", 'success')
    } catch (error) {
      showToast("Purchase failed. Please try again.", 'error')
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

  const handleBrochureView = (): void => {
    showToast("Preparing your brochure...", 'info')
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
                    <div className="text-2xl font-bold text-primary-600">$25</div>
                    <div className="text-gray-500 text-sm">One-time purchase</div>
                  </div>

                  {/* Purchase Option */}
                  <div className="mb-6">
                    <div 
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        formData.purchaseBrochure
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
                        for digital content purchase
                      </label>
                    </div>
                    {errors.agreeToTerms && (
                      <p className="text-red-600 text-sm mt-2">{errors.agreeToTerms}</p>
                    )}
                  </div>

                  {/* Purchase Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.purchaseBrochure || !formData.agreeToTerms}
                    className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing Purchase...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-5 h-5 mr-2" />
                        Purchase Brochure
                      </>
                    )}
                  </button>

                  {/* Security Badge */}
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center text-xs text-gray-500">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      Secure payment processing
                    </div>
                  </div>
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