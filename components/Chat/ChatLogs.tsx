import React, { useState } from 'react';
import { Search, MessageSquare, Clock, User, Smile, Frown, Meh, Filter, Download } from 'lucide-react';
import { Conversation } from '../../types';

export const ChatLogs: React.FC = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string>('c1');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Data
  const conversations: Conversation[] = [
    {
      id: 'c1',
      botId: 'b1',
      sentiment: 'Positive',
      timestamp: Date.now() - 1000 * 60 * 5,
      messages: [
        { role: 'user', text: 'Hi, I need help with pricing.', timestamp: Date.now() - 1000 * 60 * 5 },
        { role: 'model', text: 'Sure! Our Enterprise plan is $399/mo and includes unlimited bots. Would you like to know more?', timestamp: Date.now() - 1000 * 60 * 4 },
        { role: 'user', text: 'That sounds perfect. Does it include SLA?', timestamp: Date.now() - 1000 * 60 * 3 },
        { role: 'model', text: 'Yes, the Enterprise plan includes Priority SLA support and a dedicated account manager.', timestamp: Date.now() - 1000 * 60 * 2 },
      ]
    },
    {
      id: 'c2',
      botId: 'b1',
      sentiment: 'Neutral',
      timestamp: Date.now() - 1000 * 60 * 60,
      messages: [
        { role: 'user', text: 'Where are you located?', timestamp: Date.now() - 1000 * 60 * 60 },
        { role: 'model', text: 'We are a digital-first company with headquarters in San Francisco.', timestamp: Date.now() - 1000 * 60 * 59 },
      ]
    },
    {
      id: 'c3',
      botId: 'b2',
      sentiment: 'Negative',
      timestamp: Date.now() - 1000 * 60 * 60 * 24,
      messages: [
        { role: 'user', text: 'My login is not working.', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
        { role: 'model', text: 'I apologize. Have you tried resetting your password?', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
        { role: 'user', text: 'Yes, it is still broken. This sucks.', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
      ]
    }
  ];

  const activeConversation = conversations.find(c => c.id === selectedConversationId) || conversations[0];

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return <Smile className="text-emerald-500" size={16} />;
      case 'Negative': return <Frown className="text-red-500" size={16} />;
      default: return <Meh className="text-yellow-500" size={16} />;
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6 animate-fade-in">
      {/* Sidebar List */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800 mb-3">Conversations</h3>
          <div className="relative">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Search logs..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-3 py-2 rounded-lg border-slate-200 text-sm focus:ring-blue-900 focus:border-blue-900" 
             />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
           {conversations.map(conv => (
             <div 
               key={conv.id}
               onClick={() => setSelectedConversationId(conv.id)}
               className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition ${
                 selectedConversationId === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-900' : ''
               }`}
             >
               <div className="flex justify-between items-start mb-1">
                 <span className="font-medium text-slate-700 text-sm">Visitor #{conv.id.substring(0,4)}</span>
                 <span className="text-[10px] text-slate-400">{new Date(conv.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
               <p className="text-xs text-slate-500 truncate mb-2">{conv.messages[conv.messages.length - 1].text}</p>
               <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-medium text-slate-600">
                    {getSentimentIcon(conv.sentiment)} {conv.sentiment}
                  </div>
                  <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    {conv.messages.length} msgs
                  </div>
               </div>
             </div>
           ))}
        </div>
      </div>

      {/* Main Chat View */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
         {/* Header */}
         <div className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Visitor #{activeConversation.id.substring(0,4)}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                   <Clock size={12} /> {new Date(activeConversation.timestamp).toLocaleString()}
                   <span className="mx-1">•</span>
                   <span className="flex items-center gap-1">{getSentimentIcon(activeConversation.sentiment)} {activeConversation.sentiment} Sentiment</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
               <button className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition">
                 <Filter size={18} />
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
                 <Download size={16} /> Export JSON
               </button>
            </div>
         </div>

         {/* Messages */}
         <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
           {activeConversation.messages.map((msg, idx) => (
             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-2 ml-3' : 'order-1 mr-3'}`}>
                   <div className={`rounded-2xl px-5 py-3 text-sm shadow-sm ${
                     msg.role === 'user' 
                     ? 'bg-white text-slate-700 border border-slate-200 rounded-tl-none' 
                     : 'bg-blue-900 text-white rounded-tr-none'
                   }`}>
                     {msg.text}
                   </div>
                   <p className={`text-[10px] text-slate-400 mt-1 ${msg.role === 'user' ? 'text-left' : 'text-right'}`}>
                     {new Date(msg.timestamp).toLocaleTimeString()}
                   </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'order-1 bg-slate-200 text-slate-500' : 'order-2 bg-blue-100 text-blue-900'
                }`}>
                  {msg.role === 'user' ? <User size={14} /> : <MessageSquare size={14} />}
                </div>
             </div>
           ))}
         </div>

         {/* Analytics Footer */}
         <div className="bg-slate-900 text-slate-300 p-4 flex justify-between items-center text-xs">
            <div className="flex gap-6">
              <span>Token Usage: <span className="text-white font-mono">452</span></span>
              <span>Response Time: <span className="text-white font-mono">1.2s</span></span>
              <span>Cost: <span className="text-white font-mono">$0.002</span></span>
            </div>
            <div className="text-blue-400">
               ID: {activeConversation.id}
            </div>
         </div>
      </div>
    </div>
  );
};