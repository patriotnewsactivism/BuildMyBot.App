import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, AlertCircle, Loader, ShieldCheck } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { edgeFunctions } from '../../services/edgeFunctions';
import { Bot as BotType, Conversation } from '../../types';
import { calculateLeadScore, extractLeadDetection, getScoreBand } from '../../services/leadCapture';

// Generate a unique session ID for this chat session
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface FullPageChatProps {
  botId: string;
}

export const FullPageChat: React.FC<FullPageChatProps> = ({ botId }) => {
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string, timestamp: number}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bot, setBot] = useState<BotType | null>(null);
  const [sessionId] = useState(generateSessionId());
  const [error, setError] = useState<string | null>(null);
  const [leadCapture, setLeadCapture] = useState<{ email: string; id?: string; score?: number } | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleSendRef = useRef<() => Promise<void> | void>(() => {});

  // Check for embed mode in URL params
  const isEmbed = window.location.search.includes('mode=embed');

  // Setup postMessage communication for widget mode
  useEffect(() => {
    if (!isEmbed) return;

    const handleMessage = (event: MessageEvent) => {
      // In production, verify origin for security
      // const allowedOrigins = ['https://buildmybot.app', 'http://localhost:8080'];
      // if (!allowedOrigins.includes(event.origin)) return;

      const message = event.data;

      switch (message.action) {
        case 'open':
          // Widget opened - track event
          console.log('[FullPageChat] Widget opened');
          break;

        case 'close':
          // Widget closed - track event
          console.log('[FullPageChat] Widget closed');
          break;

        case 'sendMessage':
          // Programmatic message from host page
          if (message.text) {
            setInput(message.text);
            // Auto-send if requested
            if (message.autoSend) {
              setTimeout(() => handleSendRef.current(), 100);
            }
          }
          break;

        default:
          console.log('[FullPageChat] Unknown message:', message);
      }
    };

    window.addEventListener('message', handleMessage);

    // Send ready signal to parent
    if (window.parent !== window) {
      window.parent.postMessage({ action: 'ready', botId }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isEmbed, botId]);

  // Notify parent window of new messages in embed mode
  useEffect(() => {
    if (!isEmbed || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant' && window.parent !== window) {
      // Notify parent of new bot message
      window.parent.postMessage({
        action: 'newMessage',
        botId,
        message: lastMessage.text,
        timestamp: lastMessage.timestamp
      }, '*');
    }
  }, [messages, isEmbed, botId]);

  useEffect(() => {
    const fetchBot = async () => {
      if (!botId) return;
      try {
        const foundBot = await dbService.getBotById(botId);
        if (foundBot) {
          setBot(foundBot);
          setTimeout(() => {
             const welcomeMessage = { role: 'assistant' as const, text: "Hello! How can I help you today?", timestamp: Date.now() };
             setMessages([welcomeMessage]);
             dbService.appendConversationMessage({
               sessionId,
               botId: foundBot.id,
               message: { ...welcomeMessage },
             });
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
  }, [botId, sessionId]);

  useEffect(() => {
    if (!bot) return;
    const unsubscribe = dbService.subscribeToConversationSession(sessionId, bot.id, (conversation) => {
      if (conversation?.messages) {
        const syncedMessages = conversation.messages.map((msg) => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          text: msg.text,
          timestamp: msg.timestamp,
        }));
        setMessages(syncedMessages);
      }
    });

    return () => unsubscribe();
  }, [bot, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !bot) return;

    const userMsg = { role: 'user' as const, text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setError(null);
    setLeadError(null);

    try {
      await dbService.appendConversationMessage({
        sessionId,
        botId: bot.id,
        message: userMsg,
        leadId: leadCapture?.id,
      });
    } catch (logError) {
      console.error('Unable to store conversation message', logError);
    }

    const detection = extractLeadDetection(userMsg.text);
    if (detection?.email && !leadCapture) {
      const score = calculateLeadScore(detection);
      try {
        const createdLead = await dbService.createLead({
          botId: bot.id,
          name: detection.name || 'Website Visitor',
          email: detection.email,
          phone: detection.phone,
          score,
          sourceUrl: window.location.href,
        });

        if (createdLead) {
          setLeadCapture({ email: createdLead.email, id: createdLead.id, score: createdLead.score });
          try {
            await dbService.appendConversationMessage({
              sessionId,
              botId: bot.id,
              message: { role: 'assistant', text: 'Lead captured automatically from this chat session.', timestamp: Date.now() },
              leadId: createdLead.id,
            });
          } catch (logError) {
            console.error('Unable to store lead capture message', logError);
          }
        }
      } catch (captureError) {
        console.error('Lead capture failed', captureError);
        setLeadError('Unable to save lead right now.');
      }
    }

    try {
      // Convert messages to OpenAI service format
      const history = [...messages, userMsg].map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        text: m.text
      }));

      // Call OpenAI directly
      const response = await generateBotResponse(
        bot.systemPrompt || "You are a helpful assistant.",
        history,
        userMsg.text,
        bot.model || 'gpt-4o-mini',
        bot.knowledgeBase?.join('\n\n') || ''
      );

      // Apply response delay if configured
      const delay = bot.responseDelay || 0;

      setTimeout(() => {
        (async () => {
          const assistantMessage = { role: 'assistant' as const, text: response, timestamp: Date.now() };
          setMessages(prev => [...prev, assistantMessage]);
          try {
            await dbService.appendConversationMessage({
              sessionId,
              botId: bot.id,
              message: assistantMessage,
              sentiment: 'Positive',
              leadId: leadCapture?.id,
            });
          } catch (logError) {
            console.error('Unable to store assistant message', logError);
          }
          setIsTyping(false);
        })();
      }, delay);
    } catch (e) {
      console.error("Chat error:", e);
      setError(e instanceof Error ? e.message : "Failed to get response");
      setIsTyping(false);
    }
  }, [bot, input, leadCapture, messages, sessionId]);

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

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
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <ShieldCheck size={10} /> Session {sessionId.slice(-6)}
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
                {leadCapture && (
                  <div className="mt-2 text-center text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded p-1">
                    Lead captured: {leadCapture.email} • Score {leadCapture.score ?? calculateLeadScore({ email: leadCapture.email })} ({getScoreBand(leadCapture.score ?? calculateLeadScore({ email: leadCapture.email }))})
                  </div>
                )}
                {leadError && (
                  <div className="mt-2 text-center text-[10px] text-red-600 bg-red-50 border border-red-100 rounded p-1 flex items-center justify-center gap-1">
                    <AlertCircle size={12} /> {leadError}
                  </div>
                )}
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
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 flex-wrap">
                  <ShieldCheck size={12} /> Session {sessionId.slice(-6)}
                  {leadCapture && (
                    <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] border border-emerald-100">
                      Lead saved ({leadCapture.email})
                    </span>
                  )}
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
             {leadError && (
               <div className="mt-2 text-center text-[11px] text-red-600 bg-red-50 border border-red-100 rounded p-2 flex items-center gap-1 justify-center">
                 <AlertCircle size={14} /> {leadError}
               </div>
             )}
          </div>
       </div>
    </div>
  );
};
