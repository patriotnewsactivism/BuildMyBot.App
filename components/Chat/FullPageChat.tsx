import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, AlertCircle, Loader } from 'lucide-react';
import { Bot as BotType } from '../../types';

// Generate a unique session ID for this chat session
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getSupabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

interface FullPageChatProps {
  botId: string;
}

export const FullPageChat: React.FC<FullPageChatProps> = ({ botId }) => {
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bot, setBot] = useState<BotType | null>(null);
  const [embedToken, setEmbedToken] = useState<string | null>(null);
  const [sessionId] = useState(generateSessionId());
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for embed mode in URL params
  const isEmbed = window.location.search.includes('mode=embed');

  useEffect(() => {
    const fetchBot = async () => {
      if (!botId) return;

      const supabaseUrl = getSupabaseUrl();
      if (!supabaseUrl) {
        setError("Configuration error");
        return;
      }

      try {
        // Use public endpoint - NO authentication required
        const response = await fetch(`${supabaseUrl}/functions/v1/public-bot?botId=${botId}`);

        if (!response.ok) {
          setError("Bot not found or not active");
          return;
        }

        const data = await response.json();
        if (data.bot) {
          setBot(data.bot);
          setEmbedToken(data.embedToken);

          // Welcome message with human touch
          setTimeout(() => {
            const welcomeMessages = [
              `Hi there! I'm ${data.bot.name}. How can I help you today?`,
              `Hello! Welcome. I'm here to help - what can I do for you?`,
              `Hey! Great to see you. What brings you here today?`,
            ];
            const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
            setMessages([{ role: 'assistant', text: randomWelcome }]);
          }, 500);
        } else {
          setError("Bot not found");
        }
      } catch (e) {
        console.error("Failed to fetch bot", e);
        setError("Failed to load chat");
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
    setError(null);

    try {
      const supabaseUrl = getSupabaseUrl();
      if (!supabaseUrl) throw new Error("Configuration error");

      // Build message history
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.text
      }));
      history.push({ role: 'user', content: userMsg.text });

      // Call AI through Edge Function with embed token (NO auth needed)
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Embed-Token': embedToken || '',
        },
        body: JSON.stringify({
          botId: bot.id,
          messages: history,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get response");
      }

      const data = await response.json();
      const aiResponse = data.message || "I apologize, I couldn't process that. Could you try again?";

      // Apply response delay for human-like feel
      const delay = bot.responseDelay || Math.random() * 1000 + 500;

      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', text: aiResponse }]);
        setIsTyping(false);
      }, delay);

    } catch (e) {
      console.error("Chat error:", e);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (error && !bot) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isEmbed ? 'bg-transparent' : 'bg-slate-50'}`}>
        <div className="text-center p-8">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oops!</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isEmbed ? 'bg-transparent' : 'bg-slate-50'}`}>
        <div className="text-center">
          <Loader className="animate-spin text-blue-900 mx-auto mb-4" size={32} />
          <p className="text-slate-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  // EMBED MODE - Compact widget style
  if (isEmbed) {
    return (
      <div className="h-full bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm sticky top-0 z-10">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
            style={{backgroundColor: bot.themeColor || '#1e3a8a'}}
          >
            {bot.avatar ? (
              <img src={bot.avatar} alt={bot.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <Bot size={20} />
            )}
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm">{bot.name}</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-slate-500">Online now</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white text-slate-700 border border-slate-200 rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">
                {error}
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
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="w-full pl-4 pr-12 py-3 rounded-full border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FULL PAGE MODE - Standalone chat page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
            style={{backgroundColor: bot.themeColor || '#1e3a8a'}}
          >
            {bot.avatar ? (
              <img src={bot.avatar} alt={bot.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <Bot size={24} />
            )}
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg">{bot.name}</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-slate-500">Online and ready to help</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-slate-600 text-white'
                      : 'text-white'
                  }`}
                  style={msg.role === 'assistant' ? {backgroundColor: bot.themeColor || '#1e3a8a'} : {}}
                >
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-slate-700 text-white rounded-tr-md'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-tl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{backgroundColor: bot.themeColor || '#1e3a8a'}}
                >
                  <Bot size={16} />
                </div>
                <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="relative flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <Send size={18} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
