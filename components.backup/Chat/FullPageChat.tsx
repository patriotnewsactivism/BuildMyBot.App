import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, AlertCircle, Loader } from 'lucide-react';
import { generateBotResponse } from '../../services/geminiService';
import { dbService } from '../../services/dbService';
import { Bot as BotType } from '../../types';

interface FullPageChatProps {
  botId: string;
}

export const FullPageChat: React.FC<FullPageChatProps> = ({ botId }) => {
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bot, setBot] = useState<BotType | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Check for embed mode in URL params
  const isEmbed = window.location.search.includes('mode=embed');
  
  useEffect(() => {
    const fetchBot = async () => {
      if (!botId) return;
      try {
        const foundBot = await dbService.getBotById(botId);
        if (foundBot) {
          setBot(foundBot);
          setTimeout(() => {
             setMessages([{ role: 'model', text: "Hello! How can I help you today?" }]);
          }, 500);
        }
      } catch (e) {
        console.error("Failed to fetch bot", e);
      }
    };
    fetchBot();
  }, [botId]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !bot) return;

    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const response = await generateBotResponse(
            bot.systemPrompt, 
            messages, 
            userMsg.text, 
            bot.model,
            bot.knowledgeBase ? bot.knowledgeBase.join('\n') : ''
        );
        
        // Simulating network delay based on bot config if available, else 1s
        const delay = bot.responseDelay || 1000;
        
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'model', text: response }]);
            setIsTyping(false);
        }, delay);
    } catch (e) {
        setIsTyping(false);
    }
  };

  if (!bot) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isEmbed ? 'bg-transparent' : 'bg-slate-50'}`}>
        <Loader className="animate-spin text-blue-900" size={32} />
      </div>
    );
  }

  // Widget Mode Styles (Embed)
  if (isEmbed) {
      return (
        <div className="h-full bg-white flex flex-col overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm sticky top-0 z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{backgroundColor: bot.themeColor}}>
                    <Bot size={16} />
                </div>
                <div>
                    <h1 className="font-bold text-slate-800 text-sm">{bot.name}</h1>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] text-slate-500">Online</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50" ref={scrollRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-sm' 
                            : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl rounded-bl-sm shadow-sm flex gap-1 items-center">
                            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
                <div className="relative">
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-blue-900 text-white rounded-md hover:bg-blue-950 disabled:opacity-50 transition"
                    >
                        {isTyping ? <Loader className="animate-spin" size={14} /> : <Send size={14} />}
                    </button>
                </div>
                <div className="text-center mt-1">
                    <span className="text-[9px] text-slate-300 font-medium">Powered by BuildMyBot</span>
                </div>
            </div>
        </div>
      );
  }

  // Full Page Mode
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
       <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[80vh] border border-slate-200">
          {/* Header */}
          <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{backgroundColor: bot.themeColor}}>
               <Bot size={20} />
             </div>
             <div>
               <h1 className="font-bold text-slate-800">{bot.name}</h1>
               <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-slate-500">Online Now</span>
               </div>
             </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
             {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                      msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                   }`}>
                     {msg.text}
                   </div>
                </div>
             ))}
             {isTyping && (
                <div className="flex justify-start">
                   <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-1 items-center">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                   </div>
                </div>
             )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
             <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 p-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 disabled:opacity-50 transition"
                >
                   {isTyping ? <Loader className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
             </div>
             <div className="text-center mt-2">
               <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Powered by BuildMyBot</span>
             </div>
          </div>
       </div>
    </div>
  );
};