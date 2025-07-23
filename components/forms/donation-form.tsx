import React, { useState } from 'react'
import { Heart, Loader2, Users, Lightbulb, BookOpen, Shield } from 'lucide-react'

interface FormData {
  donationAmount: number
  donationAnonymous: boolean
  agreeToTerms: boolean
}

interface Errors {
  donationAmount?: string
  agreeToTerms?: string
}

interface DonationOption {
  amount: number
  label: string
  description: string
  icon: React.ElementType
}

const DonationForm = () => {
  const [formData, setFormData] = useState<FormData>({
    donationAmount: 0,
    donationAnonymous: false,
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customAmount, setCustomAmount] = useState('')

  const donationOptions: DonationOption[] = [
    {
      amount: 25,
      label: '$25',
      description: 'Provides materials for one student',
      icon: BookOpen
    },
    {
      amount: 50,
      label: '$50',
      description: 'Supports a workshop session',
      icon: Lightbulb
    },
    {
      amount: 100,
      label: '$100',
      description: 'Sponsors a community program',
      icon: Users
    },
    {
      amount: 250,
      label: '$250',
      description: 'Funds a complete course',
      icon: Shield
    }
  ]

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    
    if (formData.donationAmount < 1) {
      newErrors.donationAmount = "Donation amount must be at least $1"
    }
    
    if (!formData.agreeToTerms) {
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
      showToast(`Thank you for your $${formData.donationAmount} donation!`, 'success')
      // Reset form after successful submission
      setFormData({
        donationAmount: 0,
        donationAnonymous: false,
        agreeToTerms: false,
      })
      setCustomAmount('')
    } catch (error) {
      showToast("Donation failed. Please try again.", 'error')
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
    setCustomAmount('')
  }

  const handleCustomAmount = (value: string): void => {
    setCustomAmount(value)
    const numericValue = parseFloat(value) || 0
    updateFormData('donationAmount', numericValue)
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
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                        formData.donationAmount === option.amount && !customAmount
                          ? 'border-primary-600 bg-primary-50 shadow-lg'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-primary-25'
                      }`}
                      onClick={() => handlePresetAmount(option.amount)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <IconComponent className={`w-6 h-6 ${
                          formData.donationAmount === option.amount && !customAmount
                            ? 'text-primary-600'
                            : 'text-gray-500'
                        }`} />
                        <span className={`text-2xl font-bold ${
                          formData.donationAmount === option.amount && !customAmount
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
                  Or enter a custom amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl font-semibold">$</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-4 text-xl font-semibold rounded-xl border border-gray-300 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="0"
                    min="1"
                    step="1"
                  />
                </div>
                {errors.donationAmount && (
                  <p className="text-red-600 text-sm mt-2">{errors.donationAmount}</p>
                )}
              </div>
            </div>

            {/* Total Display */}
            {formData.donationAmount > 0 && (
              <div className="bg-gradient-to-r from-primary-600 to-secondary-500 rounded-2xl p-6 mb-8 text-white animate-in slide-in-from-top-4 duration-500">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">Your generous donation</div>
                  <div className="text-4xl font-bold">${formData.donationAmount}</div>
                  <div className="text-primary-100 mt-2">will make a real difference in our community</div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-6 mb-8">
              {/* Anonymous Donation */}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="donationAnonymous"
                  checked={formData.donationAnonymous}
                  onChange={(e) => updateFormData('donationAnonymous', e.target.checked)}
                  className="w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <label htmlFor="donationAnonymous" className="text-gray-700 font-medium">
                  Make this donation anonymous
                </label>
              </div>

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
                    Terms and Conditions
                  </a>{' '}
                  and confirm this is a non-refundable donation. I understand that this donation will be used to support the organization's mission and programs.
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-red-600 text-sm">{errors.agreeToTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || formData.donationAmount < 1 || !formData.agreeToTerms}
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
                    Donate ${formData.donationAmount || 0}
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