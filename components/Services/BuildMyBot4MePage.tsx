import React, { useState } from 'react';
import { Bot, CheckCircle, Clock, Zap, Users, Shield, ArrowRight, Star, Sparkles, HeadphonesIcon } from 'lucide-react';
import { SERVICE_TIERS } from '../../constants';
import { ServiceTier, ServiceTierId, User } from '../../types';
import { ServiceRequestForm } from './ServiceRequestForm';

interface BuildMyBot4MePageProps {
  user?: User;
  onStartRequest?: (tierId: ServiceTierId) => void;
}

const TierCard: React.FC<{
  tier: ServiceTier;
  onSelect: () => void;
}> = ({ tier, onSelect }) => {
  return (
    <div
      className={`relative bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-xl ${
        tier.popular
          ? 'border-blue-500 shadow-lg scale-105'
          : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
          Most Popular
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">{tier.name}</h3>
        <p className="text-sm text-slate-500 mb-4">{tier.description}</p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-slate-900">${tier.price}</span>
          <span className="text-slate-500">one-time</span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-600">
          <Clock size={16} />
          <span>Delivered in {tier.deliveryDays} business days</span>
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
          tier.popular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
        }`}
      >
        Get Started <ArrowRight size={18} />
      </button>
    </div>
  );
};

const Testimonial: React.FC<{
  quote: string;
  author: string;
  role: string;
  company: string;
}> = ({ quote, author, role, company }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-6">
    <div className="flex gap-1 mb-4">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
      ))}
    </div>
    <p className="text-slate-700 mb-4 italic">&quot;{quote}&quot;</p>
    <div>
      <p className="font-semibold text-slate-900">{author}</p>
      <p className="text-sm text-slate-500">{role}, {company}</p>
    </div>
  </div>
);

export const BuildMyBot4MePage: React.FC<BuildMyBot4MePageProps> = ({ user, onStartRequest }) => {
  const [selectedTier, setSelectedTier] = useState<ServiceTierId | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSelectTier = (tierId: ServiceTierId) => {
    setSelectedTier(tierId);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedTier(null);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setSelectedTier(null);
    if (onStartRequest && selectedTier) {
      onStartRequest(selectedTier);
    }
  };

  if (showForm && selectedTier) {
    return (
      <ServiceRequestForm
        tierId={selectedTier}
        user={user}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-6">
            <Sparkles size={16} className="text-yellow-400" />
            <span>Done-For-You AI Chatbot Setup</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Let Our Experts Build Your<br />
            <span className="text-blue-300">Perfect AI Chatbot</span>
          </h1>

          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            No technical skills required. Our team will design, train, and deploy
            a custom AI chatbot tailored to your business needs.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              <span>Expert Setup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              <span>Custom Training</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              <span>Ongoing Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Users, title: 'Tell Us About Your Business', desc: 'Fill out our intake form with your goals and requirements' },
              { icon: Bot, title: 'We Build Your Bot', desc: 'Our experts design and train your custom AI assistant' },
              { icon: Zap, title: 'Review & Refine', desc: 'Test your bot and request any adjustments' },
              { icon: CheckCircle, title: 'Go Live', desc: 'Deploy your bot and start engaging customers' },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <step.icon size={28} className="text-blue-600" />
                </div>
                <div className="text-sm text-blue-600 font-semibold mb-2">Step {index + 1}</div>
                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="py-16 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
            Choose Your Package
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Select the service tier that matches your needs. All packages include a fully trained,
            deployment-ready AI chatbot.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {SERVICE_TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                onSelect={() => handleSelectTier(tier.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            What Our Clients Say
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial
              quote="The team delivered exactly what we needed. Our chatbot handles 70% of customer inquiries automatically now."
              author="Sarah Johnson"
              role="Operations Manager"
              company="TechFlow Solutions"
            />
            <Testimonial
              quote="Professional, fast, and they really understood our business. The onboarding call was incredibly helpful."
              author="Michael Chen"
              role="CEO"
              company="Harbor Real Estate"
            />
            <Testimonial
              quote="We went with the Enterprise package and it was worth every penny. Multiple bots working seamlessly."
              author="Emily Rodriguez"
              role="Director of Sales"
              company="Apex Insurance Group"
            />
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'What information do you need from me?',
                a: 'We\'ll ask about your business, target audience, common customer questions, and any existing materials (FAQs, docs) that can help train your bot.',
              },
              {
                q: 'Can I make changes after the bot is delivered?',
                a: 'Yes! Professional and Enterprise packages include revision rounds. You can also modify your bot anytime using our platform.',
              },
              {
                q: 'Do I need a subscription to use the bot?',
                a: 'The setup fee is a one-time charge. You\'ll need a BuildMyBot subscription plan to host and run your bot.',
              },
              {
                q: 'What if I\'m not satisfied with the result?',
                a: 'We work closely with you throughout the process. If you\'re not happy, we\'ll make adjustments until you are.',
              },
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-6 bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <HeadphonesIcon size={48} className="mx-auto mb-6 text-blue-300" />
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-blue-100 mb-8">
            Let our experts build the perfect AI chatbot for your business.
            Most projects are completed within a week.
          </p>
          <button
            onClick={() => handleSelectTier('professional')}
            className="bg-white text-blue-900 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
          >
            Start Your Project <ArrowRight size={20} />
          </button>
          <p className="text-sm text-blue-300 mt-4">
            <Shield size={14} className="inline mr-1" />
            Satisfaction guaranteed
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuildMyBot4MePage;
