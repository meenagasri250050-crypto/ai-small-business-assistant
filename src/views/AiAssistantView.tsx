import React, { useState, useRef, useEffect } from 'react';
import { Product, Invoice, Expense, UserProfile } from '../types';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  HelpCircle, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  RefreshCw,
  Store,
  Layers,
  ArrowRight
} from 'lucide-react';
import { compileBusinessContext, askBusinessAssistant, BusinessAIContext } from '../services/aiService';

interface AiAssistantViewProps {
  products: Product[];
  invoices: Invoice[];
  expenses: Expense[];
  profile: UserProfile | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  products,
  invoices,
  expenses,
  profile,
}) => {
  const currency = profile?.currency || '₹';
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${profile?.name || 'Shop Owner'}! I am your AI Business Advisor for **${profile?.shopName || 'your shop'}**.\n\nI have real-time access to your store's ${products.length} products, inventory stock counts, customer bills, and expenses.\n\nFeel free to ask me about your best-sellers, restocking priorities, sales trends, or profit margins!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const businessContext = compileBusinessContext(profile, products, invoices, expenses);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isTyping) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const reply = await askBusinessAssistant(textToSend.trim(), businessContext);
      const assistantMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('AI error:', err);
      setErrorMsg(err.message || 'Unable to connect to AI Advisor.');
      const errorChatMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `I encountered an issue analyzing your request: ${err.message || 'Server error'}. Please verify that GEMINI_API_KEY is configured in your project secrets.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorChatMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const samplePrompts = [
    "Which products sell the most?",
    "Which products need restocking right now?",
    "What were my sales and profit this week?",
    "What is my net profit this month?",
    "Which products contribute most to gross profit?",
    "What should I consider restocking next and why?",
    "Why might my sales or profit be lower than before?",
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow">
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              AI Small Business Advisor
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Private, data-grounded intelligence for {profile?.shopName || 'your business'}. Powered by Gemini.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-xs text-indigo-700 flex items-center gap-1.5 self-start sm:self-auto font-medium">
          <Store className="h-3.5 w-3.5" />
          <span>Synced with {products.length} products & {invoices.filter(i => i.status === 'completed').length} bills</span>
        </div>
      </div>

      {/* Quick Prompts Carousel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Quick Business Insights (Click to ask):
        </span>
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isTyping}
              onClick={() => handleSend(prompt)}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 transition text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex flex-col h-[520px] rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    isUser
                      ? 'bg-indigo-600 text-white shadow-xs rounded-tr-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-800 rounded-tl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line prose-xs">
                    {msg.text}
                  </div>
                  <span
                    className={`block mt-2 text-[10px] text-right ${
                      isUser ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500 flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>Analyzing store figures...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about sales, low stock, profits, or product margins..."
              disabled={isTyping}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />

            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-1.5">Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
