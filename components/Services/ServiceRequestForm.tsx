import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle, Building2, Target, Cog, Clock, FileText } from 'lucide-react';
import { ServiceTierId, User, ServiceRequest } from '../../types';
import { SERVICE_TIERS, BOT_PURPOSE_OPTIONS, BUSINESS_TYPE_OPTIONS, FEATURE_OPTIONS } from '../../constants';

interface ServiceRequestFormProps {
  tierId: ServiceTierId;
  user?: User;
  onClose: () => void;
  onSubmit: (request: Partial<ServiceRequest>) => void;
}

export const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({
  tierId,
  user,
  onClose,
  onSubmit,
}) => {
  const tier = SERVICE_TIERS.find(t => t.id === tierId);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    businessType: '',
    botPurpose: [] as string[],
    desiredFeatures: [] as string[],
    budgetRange: '',
    timeline: '',
    additionalNotes: '',
    companyName: user?.companyName || '',
    contactEmail: user?.email || '',
    contactName: user?.name || '',
  });

  const handlePurposeToggle = (purpose: string) => {
    setFormData(prev => ({
      ...prev,
      botPurpose: prev.botPurpose.includes(purpose)
        ? prev.botPurpose.filter(p => p !== purpose)
        : [...prev.botPurpose, purpose],
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      desiredFeatures: prev.desiredFeatures.includes(feature)
        ? prev.desiredFeatures.filter(f => f !== feature)
        : [...prev.desiredFeatures, feature],
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const request: Partial<ServiceRequest> = {
      tier: tierId,
      businessType: formData.businessType,
      botPurpose: formData.botPurpose,
      desiredFeatures: formData.desiredFeatures,
      budgetRange: formData.budgetRange,
      timeline: formData.timeline,
      additionalNotes: formData.additionalNotes,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(false);
    setIsSubmitted(true);

    // Wait a moment before calling onSubmit
    setTimeout(() => {
      onSubmit(request);
    }, 2000);
  };

  const canProceedStep1 = formData.businessType && formData.botPurpose.length > 0;
  const canProceedStep2 = formData.desiredFeatures.length > 0;
  const canSubmit = formData.companyName && formData.contactEmail;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Request Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Thank you for your interest in BuildMyBot 4Me. Our team will review your request
            and contact you within 1 business day.
          </p>
          <div className="bg-blue-50 rounded-xl p-4 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">Selected Package</p>
            <p className="text-blue-700">{tier?.name} - ${tier?.price}</p>
            <p className="text-sm text-blue-600 mt-1">Delivery: {tier?.deliveryDays} business days</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Start Your Project</h1>
            <p className="text-slate-600">{tier?.name} Package - ${tier?.price}</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    step > s ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">About Your Business</h2>
                <p className="text-sm text-slate-500">Tell us about your company and goals</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Business Type *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select your industry...</option>
                  {BUSINESS_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  What will your bot do? * <span className="font-normal text-slate-400">(Select all that apply)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BOT_PURPOSE_OPTIONS.map(purpose => (
                    <button
                      key={purpose}
                      type="button"
                      onClick={() => handlePurposeToggle(purpose)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.botPurpose.includes(purpose)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {purpose}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Features */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Cog size={24} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Desired Features</h2>
                <p className="text-sm text-slate-500">Select the capabilities you need</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Features * <span className="font-normal text-slate-400">(Select all that apply)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {FEATURE_OPTIONS.map(feature => (
                    <label
                      key={feature}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        formData.desiredFeatures.includes(feature)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.desiredFeatures.includes(feature)}
                        onChange={() => handleFeatureToggle(feature)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          formData.desiredFeatures.includes(feature)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {formData.desiredFeatures.includes(feature) && (
                          <CheckCircle size={14} className="text-white" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Timeline Preference
                </label>
                <div className="flex flex-wrap gap-2">
                  {['ASAP', 'Within 2 weeks', 'Within a month', 'Flexible'].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFormData({ ...formData, timeline: option })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.timeline === option
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Clock size={14} className="inline mr-1" />
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="text-slate-600 px-6 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact & Notes */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Contact & Additional Info</h2>
                <p className="text-sm text-slate-500">How should we reach you?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Any specific requirements, existing systems to integrate with, or questions..."
                />
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-slate-50 rounded-xl p-4 mt-6">
              <h3 className="font-semibold text-slate-900 mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Package:</span>
                  <span className="font-medium text-slate-900">{tier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivery:</span>
                  <span className="font-medium text-slate-900">{tier?.deliveryDays} business days</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-900">Total:</span>
                  <span className="font-bold text-blue-600">${tier?.price}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(2)}
                className="text-slate-600 px-6 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRequestForm;
