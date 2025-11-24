import React, { useState } from 'react';
import { User, Bell, Lock, Building, CreditCard, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [notification, setNotification] = useState<string | null>(null);

  const handleSave = () => {
    setNotification('Settings saved successfully!');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in relative">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Settings</h2>

      {notification && (
        <div className="absolute top-0 right-0 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in flex items-center gap-2">
          <Save size={16} /> {notification}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 space-y-1">
          {[
            { id: 'profile', label: 'My Profile', icon: User },
            { id: 'company', label: 'Company Info', icon: Building },
            { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                activeTab === item.id 
                ? 'bg-white text-blue-900 shadow-sm border border-slate-200' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          
          {activeTab === 'profile' && (
            <div className="space-y-6">
               <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-4">Personal Information</h3>
               <div className="flex items-center gap-6">
                 <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 text-2xl font-bold">AJ</div>
                 <button className="text-sm text-blue-900 font-medium hover:text-blue-950">Change Avatar</button>
               </div>
               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                   <input type="text" defaultValue="Alex" className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                   <input type="text" defaultValue="Johnson" className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" />
                 </div>
                 <div className="col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                   <input type="email" defaultValue="alex@agency.com" className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" />
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'company' && (
             <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-4">Business Details</h3>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                   <input type="text" defaultValue="Apex Digital" className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Website URL</label>
                   <input type="text" defaultValue="https://apexdigital.com" className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
                   <select className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900">
                     <option>Marketing Agency</option>
                     <option>E-commerce</option>
                     <option>Real Estate</option>
                     <option>SaaS</option>
                   </select>
                </div>
             </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-4">Email Notifications</h3>
              <div className="space-y-4">
                {[
                  'New lead captured',
                  'Daily performance summary',
                  'Weekly analytics report',
                  'System updates and maintenance',
                  'Reseller commission alerts'
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-slate-700 text-sm">{item}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={i < 3} />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder for other tabs */}
          {(activeTab === 'security' || activeTab === 'billing') && (
            <div className="text-center py-12 text-slate-400">
               <Lock size={48} className="mx-auto mb-4 opacity-20" />
               <p>This section is handled securely via our payment provider (Stripe).</p>
               <button className="mt-4 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-600">
                 Manage on Stripe
               </button>
            </div>
          )}

          {activeTab !== 'security' && activeTab !== 'billing' && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
               <button 
                 onClick={handleSave}
                 className="px-6 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-950 shadow-sm transition flex items-center gap-2"
               >
                 <Save size={18} /> Save Changes
               </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};