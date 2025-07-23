"use client"

import React, { useState } from 'react'
import { MessageCircle, Loader2, Heart, Send, Users, Sparkles, Star } from 'lucide-react'

interface FormData {
  includeMessage: boolean
  message: string
  agreeToTerms: boolean
}

interface Errors {
  message?: string
  agreeToTerms?: string
}

const GoodwillMessage = () => {
  const [formData, setFormData] = useState<FormData>({
    includeMessage: false,
    message: '',
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    
    if (formData.includeMessage && !formData.message.trim()) {
      newErrors.message = "Message is required when including a goodwill message"
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
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const successMessage = formData.includeMessage 
        ? "Thank you for your wonderful message!" 
        : "Thank you for your support!"
      
      showToast(successMessage, 'success')
      
      // Reset form
      setFormData({
        includeMessage: false,
        message: '',
        agreeToTerms: false,
      })
    } catch (error) {
      showToast("Submission failed. Please try again.", 'error')
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
                      <div className="text-xs text-gray-500 mt-1">- Your Goodwill Message</div>
                    </div>
                  </div>
                )}

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
                  disabled={isSubmitting || !formData.agreeToTerms}
                  className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {formData.includeMessage ? "Send Goodwill Message" : "Show Support"}
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