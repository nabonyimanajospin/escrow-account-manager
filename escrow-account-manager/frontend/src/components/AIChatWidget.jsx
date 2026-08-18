import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import axios from '../api/axiosConfig';
import ReactMarkdown from 'react-markdown';

const AIChatWidget = () => {
  const location = useLocation();
  const escrowMatch =
    location.pathname.match(/^\/escrow\/(\d+)/) ||
    location.pathname.match(/^\/transactions\/(\d+)/);
  const transactionId = escrowMatch ? escrowMatch[1] : undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: transactionId
        ? 'Hello! I\'m the **EscrowTrust AI Co-Pilot** for this deal. How can I help with this transaction?'
        : 'Hello! I\'m the **EscrowTrust AI Co-Pilot**. Ask me about buying property, escrow fees, contracts, or how the platform works.',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = { role: 'user', content: inputValue.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const endpoint = transactionId ? `/escrow/${transactionId}/ai-chat` : `/ai/global-chat`;

      const response = await axios.post(endpoint, {
        message: userMsg.content,
      });

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: response.data.response,
            timestamp: response.data.timestamp,
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          content:
            error.response?.status === 401
              ? 'Please log in to use deal-specific assistance, or ask general platform questions here as a guest.'
              : error.response?.data?.message ||
                'Sorry, I am having trouble connecting right now. Please try again later.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const widget = (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed z-[9999] flex items-center gap-2.5 bg-[#2554eb] text-white shadow-2xl transition-all hover:scale-105 group border-2 border-white/20 touch-target
            bottom-4 right-4 pl-3 pr-4 py-3 rounded-full
            sm:bottom-6 sm:right-6 sm:pl-4 sm:pr-5 sm:py-3.5"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          title="Chat with AI Co-Pilot"
          aria-label="Open AI assistant chat"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </span>
          <span className="text-sm font-bold tracking-tight">AI Help</span>
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed z-[9999] flex flex-col bg-white shadow-2xl overflow-hidden border border-slate-200
            inset-x-3 bottom-3 rounded-2xl
            sm:inset-x-auto sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 sm:rounded-2xl"
            style={{
              height: 'min(520px, calc(100vh - 5rem - env(safe-area-inset-bottom, 0px)))',
              maxHeight: '85vh',
              marginBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
          <div className="bg-gradient-to-r from-[#2554eb] to-indigo-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Co-Pilot</h3>
                <p className="text-[10px] text-blue-100">
                  {transactionId ? 'Deal assistant' : 'Platform guide'}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="text-white hover:text-slate-200 transition-colors" aria-label="Close chat">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-sm">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-[#2554eb] text-white rounded-tr-none'
                      : msg.role === 'error'
                        ? 'bg-red-100 text-red-800 border border-red-200 rounded-tl-none'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.role === 'ai' ? (
                    <div className="prose prose-sm prose-slate max-w-none prose-p:leading-snug prose-headings:mb-1 prose-p:mb-2 last:prose-p:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <div className={`text-[9px] mt-1 text-right ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 text-sm border border-slate-200 rounded-full focus:ring-[#2554eb] focus:border-[#2554eb] px-4 py-2 bg-slate-50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="w-10 h-10 rounded-full bg-[#2554eb] text-white flex items-center justify-center hover:bg-[#1d40d8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          </div>
        </>
      )}
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(widget, document.body);
};

export default AIChatWidget;
