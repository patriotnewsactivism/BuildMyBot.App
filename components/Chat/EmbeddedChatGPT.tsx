import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Loader, Sparkles } from 'lucide-react';
import { generateBotResponse } from '../../services/openaiService';

interface EmbeddedChatGPTProps {
  botName?: string;
  systemPrompt?: string;
  themeColor?: string;
  height?: string;
}

export const EmbeddedChatGPT: React.FC<EmbeddedChatGPTProps> = ({
  botName = 'AI Assistant',
  systemPrompt = 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
  themeColor = '#7f1d40',
  height = '600px'
}) => {
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
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      setTimeout(() => {
        setMessages([{
          role: 'model',
          text: `Hello! I'm ${botName}, your AI assistant. I can help answer questions, provide information, and assist with tasks. What would you like to know?`
        }]);
      }, 500);
    }
  }, [botName]);

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
      }, 1200);
    } catch (e) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "I'm experiencing technical difficulties. Please try again in a moment."
      }]);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ height }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg" style={{ backgroundColor: themeColor }}>
            <Bot size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              {botName}
              <Sparkles size={14} className="text-crimson-600" />
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-500 font-medium">Always Online</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-100 rounded-full">
          GPT-4o
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0 ${
                msg.role === 'user' ? 'bg-navy-900' : 'bg-crimson-600'
              }`}>
                {msg.role === 'user' ? 'You' : <Bot size={16} />}
              </div>
              {/* Message Bubble */}
              <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                msg.role === 'user'
                  ? 'bg-navy-900 text-white rounded-tr-sm'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-crimson-600 text-white font-bold text-xs shadow-md shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-2 items-center">
                <Loader className="animate-spin text-crimson-600" size={16} />
                <span className="text-sm text-slate-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message here..."
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:border-crimson-600 focus:ring-0 resize-none text-sm placeholder-slate-400 transition-all"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            style={{ backgroundColor: themeColor }}
          >
            {isTyping ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <>
                <Send size={18} />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
          Powered by BuildMyBot • Real-time AI responses
        </p>
      </div>
    </div>
  );
};
