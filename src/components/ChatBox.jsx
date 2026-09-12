import { useState, useRef, useEffect } from 'react'
import { useEscape } from './ui/motion.js'
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
  const inputRef = useRef(null)
  const launcherRef = useRef(null)

  /*
   * Escape closes it, and focus goes back to the button that opened it.
   *
   * Not a nicety: this is a panel that covers content and traps nothing, so a
   * keyboard user who opened it had no way out except tabbing through every message
   * to reach the close button. Dialog already had useEscape for the same reason;
   * this was the one overlay in the app without it.
   */
  useEscape(open, () => {
    setOpen(false)
    launcherRef.current?.focus()
  })

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

  /* Focus the input on open, so a keyboard or screen-reader user lands somewhere
     actionable instead of at the top of the document. */
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

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
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t('close_label') : t('chat_title')}
        aria-expanded={open}
        // hover:bg-white was a leftover from the dark-only build. On the light
        // theme the label is white, so hovering erased the glyph.
        /*
          Was bottom-20 (80px), which put it UNDERNEATH the bottom navigation on any
          phone with gesture navigation: the bar is 60px plus an inset of up to 34px,
          so the button was unreachable on exactly the current handsets. Now measured
          from the nav itself rather than guessed.

          shadow-3/shadow-brand rather than Tailwind's shadow-lg: the theme defines an
          elevation ramp whose values differ per theme (near-black alphas on dark,
          a blue-grey tint on light), and shadow-lg ignored it — so the launcher cast
          a dark-theme shadow on the light theme. The brand glow on hover is what
          makes it read as raised rather than as a flat circle stuck to the page.
        */
        className="fixed bottom-[calc(var(--nav-total)+0.75rem)] md:bottom-6 end-5 z-30 w-14 h-14 rounded-full
                   bg-brand text-ink-onBrand font-display font-bold text-2xl leading-none
                   shadow-3 hover:shadow-brand hover:bg-brand-hover active:scale-95
                   flex items-center justify-center transition duration-fast ease-out"
      >
        <span aria-hidden="true">{open ? '×' : '?'}</span>
      </button>

      {open && (
        /* Sits above the button, which sits above the nav. dvh rather than vh so the
           panel does not extend behind the mobile browser's collapsing address bar. */
        <div
          role="dialog"
          aria-label={t('chat_title')}
          /* shadow-4, the theme's top elevation step, rather than Tailwind's
             shadow-2xl — same reason as the launcher. rounded-xl to match the cards
             it floats over; rounded-lg was a half-step smaller than everything else. */
          className="fixed bottom-[calc(var(--nav-total)+5rem)] md:bottom-24 end-5 z-30 w-[92vw] max-w-sm
                     h-[55dvh] max-h-[520px] bg-surface-1 border border-line-subtle rounded-xl shadow-4
                     flex flex-col overflow-hidden rise-in"
        >
          <div className="px-4 py-2.5 border-b border-line-subtle bg-surface-0 flex items-center justify-between gap-2">
            <span className="font-display font-bold text-brand-text uppercase tracking-wide text-sm">{t('chat_title')}</span>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                launcherRef.current?.focus()
              }}
              aria-label={t('close_label')}
              /* Was a bare glyph with no padding — about 18px of tappable area on a
                 control a gloved hand is expected to hit. */
              className="text-ink-tertiary hover:text-ink text-xl leading-none rounded
                         min-w-[44px] min-h-[44px] -me-2 flex items-center justify-center
                         transition-colors duration-fast"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {/*
            A live region, so a screen reader announces the answer.
            
            Without it the reply landed silently: the assistant is the one surface in
            the app whose entire purpose is to respond, and a blind worker got no
            indication that it had. `polite` rather than `assertive` because an answer
            should not interrupt narration mid-drill, and the log is not atomic so only
            the appended message is read rather than the whole conversation again.
          */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-atomic="false"
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                /*
                  whitespace-pre-line: the authored answers in sahayak.js are written as
                  short paragraphs, and without this every line break collapsed into one
                  run-on block — the longest answers in the app rendered as the least
                  readable. The rounded corner is squared on the sender's side so the
                  two voices are distinguishable without relying on colour alone.
                */
                className={`text-sm leading-relaxed rounded-xl px-3.5 py-2.5 max-w-[90%] whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-brand text-ink-onBrand ms-auto font-medium rounded-ee-sm'
                    : 'bg-surface-2 border border-line-subtle text-ink rounded-es-sm'
                }`}
              >
                {/* Named for a screen reader, which otherwise hears two identical
                    streams of text with no way to tell who is speaking. */}
                <span className="sr-only">
                  {m.role === 'user' ? `${t('chat_you')}: ` : `${t('chat_title')}: `}
                </span>
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
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label={t('chat_placeholder')}
              placeholder={t('chat_placeholder')}
              className="flex-1 min-w-0 bg-surface-1 border border-line-control rounded-lg px-3 py-2.5 text-sm
                         min-h-[44px] focus:border-brand outline-none
                         focus-visible:outline-2 focus-visible:outline-offset-1
                         transition-colors duration-fast"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              /* min-h-[44px] because this was px-4 in a flex row and inherited its
                 height from the input beside it — about 38px, under the 44px floor,
                 on the one control that commits the question. Also disabled on empty
                 input: it used to be tappable and silently do nothing. */
              className="bg-brand text-ink-onBrand font-bold text-sm px-4 rounded-lg shrink-0 min-h-[44px]
                         hover:bg-brand-hover active:scale-95 disabled:opacity-45 disabled:pointer-events-none
                         transition duration-fast ease-out"
            >
              {t('chat_send')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
