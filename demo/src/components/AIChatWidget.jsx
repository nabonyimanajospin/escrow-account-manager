import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAiReply } from '../data/demoData';

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content:
        "Hello! I'm the **EscrowTrust AI Co-Pilot** (demo). Ask about fees, contracts, or how escrow works.",
    },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'ai', content: getAiReply(userMsg) }]);
    }, 400);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-xl"
        >
          AI Help
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setOpen(false)} aria-hidden />
          <div className="fixed bottom-4 right-4 z-50 flex h-[min(480px,80vh)] w-[min(100%-1.5rem,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-3 text-white">
              <div>
                <p className="text-sm font-bold">AI Co-Pilot</p>
                <p className="text-[10px] text-blue-100">Demo · scripted answers</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-white/90" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 text-sm">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {msg.role === 'ai' ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about fees..."
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
              <button type="submit" className="btn-primary !rounded-full !px-3">
                →
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
