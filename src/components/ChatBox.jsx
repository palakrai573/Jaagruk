import { useState, useRef, useEffect } from 'react'
import { askSiteAssistant, getApiKey } from '../lib/api.js'
import { findAnswer, answerText, suggestedQuestions, entryById, questionText } from '../lib/sahayak.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { langName } from '../lib/i18n.js'

export default function ChatBox() {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  /* Questions already answered, so the chips stop offering them and keep being useful
     as the conversation goes on. */
  const [asked, setAsked] = useState([])
  const scrollRef = useRef(null)

  /*
   * Tappable questions. The most important part of this for the intended user: someone
   * with gloves on, mid-shift, will not compose a sentence into a text box, but they will
   * tap a question that is already written. It also makes the assistant's scope visible
   * rather than leaving them to guess what it knows.
   */
  const chips = suggestedQuestions(lang, { exclude: asked, limit: 4 })

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

  /*
   * Answered from the device first, and in almost every case entirely.
   *
   * The old flow refused to say anything without an API key, which asked a mine worker to
   * obtain a Google Cloud credential and then failed underground where the app is most
   * needed. Now the built-in knowledge base answers, offline and instantly. A remote model
   * is consulted ONLY when the question is outside what the app can answer locally AND a
   * key happens to be configured — so it is an optional enhancement rather than a
   * prerequisite.
   */
  const answer = async (text) => {
    if (!text) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])

    const hit = findAnswer(text)
    if (hit) {
      setAsked((prev) => (prev.includes(hit.entry.id) ? prev : [...prev, hit.entry.id]))
      setMessages((m) => [...m, { role: 'assistant', content: answerText(hit.entry, lang) }])
      return
    }

    // Nothing local matched. Without a key this is the end of the road, and saying so
    // plainly beats a generated paragraph the app has no basis for.
    if (!getApiKey()) {
      setMessages((m) => [...m, { role: 'assistant', content: t('chat_local_miss') }])
      return
    }

    const history = [...messages, { role: 'user', content: text }]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    setLoading(true)
    try {
      const reply = await askSiteAssistant(history, langName(lang))
      setMessages((m) => [...m, { role: 'assistant', content: reply || t('chat_local_miss') }])
    } catch {
      // The remote path is a bonus; its failure must read as "I don't know that one",
      // not as the assistant being broken.
      setMessages((m) => [...m, { role: 'assistant', content: t('chat_local_miss') }])
    } finally {
      setLoading(false)
    }
  }

  const send = () => answer(input.trim())

  /* Tapping a suggested question sends its exact authored wording, which retrieval is
     tested to resolve back to the entry it came from. */
  const askSuggestion = (id) => {
    const entry = entryById(id)
    if (entry) answer(questionText(entry, lang))
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
        aria-label={open ? t('close_label') : t('chat_title')}
        aria-expanded={open}
        // hover:bg-white was a leftover from the dark-only build. On the light
        // theme the label is white, so hovering erased the glyph.
        className="fixed bottom-20 md:bottom-6 end-5 z-30 w-14 h-14 rounded-full bg-brand text-ink-onBrand font-display font-bold text-2xl shadow-lg flex items-center justify-center hover:bg-brand-hover transition-colors"
      >
        <span aria-hidden="true">{open ? '×' : '?'}</span>
      </button>

      {open && (
        <div className="fixed bottom-36 md:bottom-24 end-5 z-30 w-[92vw] max-w-sm h-[60vh] max-h-[520px] bg-surface-1 border border-line-subtle rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-line-subtle bg-surface-0 flex items-center justify-between">
            <span className="font-display font-bold text-brand-text uppercase tracking-wide text-sm">{t('chat_title')}</span>
            <button
              onClick={() => setOpen(false)}
              aria-label={t('close_label')}
              className="text-ink-tertiary hover:text-ink text-lg leading-none"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm leading-relaxed rounded-lg px-3 py-2 max-w-[90%] ${
                  m.role === 'user' ? 'bg-brand text-ink-onBrand ms-auto font-medium' : 'bg-surface-0 border border-line-subtle text-ink'
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="text-xs text-ink-tertiary font-mono">{t('chat_thinking')}</div>
            )}

            {/*
              Pre-written questions, tappable. Placed after the messages so they behave
              as "what could I ask next" rather than a menu the worker must get past, and
              they disappear as each is used.
            */}
            {!loading && chips.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                {chips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => askSuggestion(chip.id)}
                    className="text-start text-xs border border-line-subtle rounded-lg px-3 py-2 text-ink-secondary hover:border-brand hover:text-brand-text min-h-[44px]"
                  >
                    {chip.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-line-subtle bg-surface-0 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label={t('chat_placeholder')}
              placeholder={t('chat_placeholder')}
              className="flex-1 bg-surface-1 border border-line-subtle rounded px-3 py-2 text-sm focus:border-brand outline-none"
            />
            <button
              onClick={send}
              disabled={loading}
              className="bg-brand text-ink-onBrand font-bold text-sm px-4 rounded disabled:opacity-50"
            >
              {t('chat_send')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
