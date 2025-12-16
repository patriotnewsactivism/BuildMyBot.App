
import { Briefcase, Building, Heart, Shield, ShoppingCart, Users } from "lucide-react";

const industries = [
    {
      title: 'Real Estate',
      icon: Building,
      color: 'sky',
      desc: 'Never miss a lead. Capture, qualify and nurture leads 24/7 with an AI-powered chatbot for your real estate business.'
    },
    {
      title: 'Healthcare',
      icon: Heart,
      color: 'red',
      desc: 'Provide instant answers to patient questions, book appointments and reduce administrative overhead with a HIPAA-compliant chatbot.'
    },
    {
      title: 'E-commerce',
      icon: ShoppingCart,
      color: 'amber',
      desc: 'Convert more visitors into customers. Offer personalized recommendations, answer product questions and recover abandoned carts.'
    },
    {
      title: 'Insurance',
      icon: Shield,
      color: 'emerald',
      desc: 'Generate more leads and policyholders. Qualify leads, provide quotes and answer policy questions with an AI-powered chatbot.'
    },
    {
      title: 'Marketing Agencies',
      icon: Users,
      color: 'violet',
      desc: 'Generate more leads for your clients. Capture and qualify leads, book appointments and provide 24/7 customer service.'
    },
    {
      title: 'Agencies',
      icon: Briefcase,
      color: 'sky',
      desc: 'White-label our platform. Sell AI chatbots to your own clients under your brand and create a new recurring revenue stream.'
    }
  ];

export const Industries: React.FC = () => {
    return (
        <section id="industries" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Who is this for?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">BuildMyBot powers the immediate response engine for thousands of industries.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {industries.map((item, index) => (
              <div key={index} className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className={`w-16 h-16 rounded-full bg-${item.color}-100 flex items-center justify-center mb-6`}>
                  <item.icon className={`w-8 h-8 text-${item.color}-600`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
}
