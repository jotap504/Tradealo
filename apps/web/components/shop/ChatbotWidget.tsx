'use client';
import { useState, useRef, useEffect } from 'react';
import { shopChatbot } from '@/lib/api';
import type { ChatMessage } from '@/lib/api';

interface ChatbotWidgetProps {
  shopId: string;
  shopName: string | null;
  whatsappNumber?: string | null;
}

export default function ChatbotWidget({ shopId, shopName, whatsappNumber }: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const next: ChatMessage[] = [...history, { role: 'user', content: msg }];
    setHistory(next);
    setLoading(true);
    try {
      const res = await shopChatbot.sendMessage(shopId, msg, history);
      setHistory([...next, { role: 'assistant', content: res.answer }]);
      if (res.suggestWhatsapp && res.whatsappUrl) {
        setHistory((h) => [
          ...h,
          {
            role: 'assistant',
            content: `__WA__${res.whatsappUrl}`,
          },
        ]);
      }
    } catch {
      setHistory([...next, { role: 'assistant', content: 'No pude procesar tu consulta. Intentá de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const waBase = whatsappNumber ? whatsappNumber.replace(/\D/g, '') : '';

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl text-white transition-transform hover:scale-110"
          style={{ backgroundColor: 'var(--shop-primary)' }}
          aria-label="Abrir chat"
        >
          💬
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 max-h-[520px] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ backgroundColor: 'var(--shop-surface)', border: '1px solid var(--shop-border)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: 'var(--shop-primary)', color: '#fff' }}
          >
            <span className="font-semibold text-sm">Asistente de {shopName ?? 'la tienda'}</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none" aria-label="Cerrar chat">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: '200px', maxHeight: '340px' }}>
            {history.length === 0 && (
              <p className="text-xs text-center mt-4" style={{ color: 'var(--shop-text-muted)' }}>
                Hola 👋 ¿En qué te puedo ayudar?
              </p>
            )}
            {history.map((m, i) => {
              if (m.content.startsWith('__WA__')) {
                const url = m.content.replace('__WA__', '');
                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-center py-2 px-3 rounded-xl text-white"
                    style={{ backgroundColor: '#25d366' }}
                  >
                    💬 Contactar por WhatsApp
                  </a>
                );
              }
              return (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[80%] text-xs rounded-2xl px-3 py-2 leading-snug"
                    style={
                      m.role === 'user'
                        ? { backgroundColor: 'var(--shop-primary)', color: '#fff' }
                        : { backgroundColor: 'var(--shop-border)', color: 'var(--shop-text)' }
                    }
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="text-xs rounded-2xl px-3 py-2 animate-pulse"
                  style={{ backgroundColor: 'var(--shop-border)', color: 'var(--shop-text-muted)' }}
                >
                  Escribiendo…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 border-t"
            style={{ borderColor: 'var(--shop-border)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Escribí tu consulta…"
              className="flex-1 text-xs rounded-full px-3 py-2 outline-none"
              style={{
                backgroundColor: 'var(--shop-bg)',
                border: '1px solid var(--shop-border)',
                color: 'var(--shop-text)',
              }}
              maxLength={500}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: 'var(--shop-primary)' }}
              aria-label="Enviar"
            >
              ➤
            </button>
          </div>

          {waBase && (
            <a
              href={`https://wa.me/${waBase}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs py-2 border-t"
              style={{ borderColor: 'var(--shop-border)', color: 'var(--shop-text-muted)' }}
            >
              💬 Hablar directo por WhatsApp
            </a>
          )}
        </div>
      )}
    </>
  );
}
