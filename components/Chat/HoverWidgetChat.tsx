import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader } from 'lucide-react';
import { generateBotResponse } from '../../services/openaiService';

interface HoverWidgetChatProps {
  botName?: string;
  systemPrompt?: string;
  themeColor?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export const HoverWidgetChat: React.FC<HoverWidgetChatProps> = ({
  botName = 'Assistant',
  systemPrompt = 'You are a helpful AI assistant. Be friendly, professional, and concise.',
  themeColor = '#102a43',
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      setIsTyping(true);
      setTimeout(() => {
        setMessages([{
          role: 'model',
          text: `Hi! I'm ${botName}. I'm here to help you 24/7. What can I assist you with today?`
        }]);
        setIsTyping(false);
      }, 800);
    }
  }, [isOpen, botName]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await generateBotResponse(
        systemPrompt,
        messages,
        userMsg.text,
        'gpt-4o-mini'
      );

      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'model', text: response }]);
        setIsTyping(false);
      }, 1000);
    } catch (e) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "I'm having trouble connecting. Please try again."
      }]);
    }
  };

  const positionClasses = position === 'bottom-right'
    ? 'bottom-6 right-6'
    : 'bottom-6 left-6';

  return (
    <div className={`fixed ${positionClasses} z-40 flex flex-col items-end gap-4`}>
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 flex items-center justify-between text-white" style={{ backgroundColor: themeColor }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shadow-sm">
                {botName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="font-bold block">{botName}</span>
                <div className="flex items-center gap-1.5 opacity-90">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded transition"
            >
              <X size={18}/>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            <div className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-wider my-2">
              Powered by BuildMyBot
            </div>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-navy-900 text-white rounded-br-sm'
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
          <div className="p-3 bg-white border-t border-slate-100">
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="w-full pl-4 pr-10 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-navy-900 focus:ring-0 rounded-xl text-sm transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-2 p-1.5 bg-navy-900 text-white rounded-lg hover:bg-navy-800 disabled:opacity-50 transition"
                style={{ backgroundColor: themeColor }}
              >
                {isTyping ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 text-white px-5 py-4 rounded-full shadow-xl hover:scale-105 transition-all duration-300"
          style={{ backgroundColor: themeColor, boxShadow: `0 10px 40px ${themeColor}40` }}
        >
          <span className="font-bold text-sm hidden md:block">Chat with {botName}</span>
          <MessageSquare size={24} fill="currentColor" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-crimson-600 border-2 border-white"></span>
          </span>
        </button>
      )}
    </div>
  );
};
