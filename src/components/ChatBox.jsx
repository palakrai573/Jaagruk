import { useState, useRef, useEffect } from 'react'
import { askSiteAssistant, getApiKey } from '../lib/api.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { langName } from '../lib/i18n.js'

export default function ChatBox() {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: t('chat_greeting') }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')

    if (!getApiKey()) {
      setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: t('chat_no_key') }])
      return
    }

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setLoading(true)
    try {
      const history = nextMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))
      const reply = await askSiteAssistant(history, langName(lang))
      setMessages((m) => [...m, { role: 'assistant', content: reply || '...' }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: e.message || 'Something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('chat_title')}
        className="fixed bottom-20 md:bottom-6 right-5 z-30 w-14 h-14 rounded-full bg-amber text-steel font-display font-bold text-2xl shadow-lg flex items-center justify-center hover:bg-white transition-colors"
      >
        {open ? '×' : '?'}
      </button>

      {open && (
        <div className="fixed bottom-36 md:bottom-24 right-5 z-30 w-[92vw] max-w-sm h-[60vh] max-h-[520px] bg-steel-light border border-steel-lighter rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-steel-lighter bg-steel flex items-center justify-between">
            <span className="font-display font-bold text-amber uppercase tracking-wide text-sm">{t('chat_title')}</span>
            <button onClick={() => setOpen(false)} className="text-concrete hover:text-chalk text-lg leading-none">×</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm leading-relaxed rounded-lg px-3 py-2 max-w-[90%] ${
                  m.role === 'user' ? 'bg-amber text-steel ml-auto font-medium' : 'bg-steel border border-steel-lighter text-chalk'
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="text-xs text-concrete font-mono">{t('chat_thinking')}</div>
            )}
          </div>

          <div className="p-3 border-t border-steel-lighter bg-steel flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('chat_placeholder')}
              className="flex-1 bg-steel-light border border-steel-lighter rounded px-3 py-2 text-sm focus:border-amber outline-none"
            />
            <button
              onClick={send}
              disabled={loading}
              className="bg-amber text-steel font-bold text-sm px-4 rounded disabled:opacity-50"
            >
              {t('chat_send')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
