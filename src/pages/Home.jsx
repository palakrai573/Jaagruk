import { Link } from 'react-router-dom'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Home() {
  const { t } = useLanguage()

  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-14 pb-16">
        <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-4">{t('home_eyebrow')}</p>

        <h1 className="font-display font-bold text-5xl md:text-8xl leading-[0.95] uppercase tracking-tight mb-6">
          {t('home_title_1')}
          <br />
          <span className="text-amber">{t('home_title_2')}</span>
          <br />
          {t('home_title_3')}
        </h1>

        <p className="text-concrete text-lg max-w-2xl mb-6 leading-relaxed">{t('home_desc')}</p>

        <p className="font-mono text-[11px] uppercase tracking-widest text-safe flex items-center gap-2 mb-9">
          <Pictogram name="correct" size={16} />
          {t('home_offline_badge')}
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            to="/train"
            className="bg-amber text-steel font-display font-bold text-xl uppercase tracking-wide px-8 py-4 rounded hover:bg-white transition-colors"
          >
            {t('home_cta_train')}
          </Link>
          <Link
            to="/scan"
            className="border border-concrete text-chalk font-display font-bold text-xl uppercase tracking-wide px-8 py-4 rounded hover:border-amber hover:text-amber transition-colors"
          >
            {t('home_cta_scan')}
          </Link>
        </div>
      </section>

      <div className="stripe-divider" />

      {/* The four layers — the actual differentiators */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="font-display font-bold text-4xl uppercase mb-10 tracking-tight">{t('home_layers_title')}</h2>

        <div className="grid md:grid-cols-2 gap-5">
          <LayerCard
            n="01"
            pictogram="exit"
            title={t('home_l1_title')}
            body={t('home_l1_body')}
            to="/site"
            cta={t('nav_site')}
          />
          <LayerCard
            n="02"
            pictogram="slow"
            title={t('home_l2_title')}
            body={t('home_l2_body')}
            to="/train"
            cta={t('nav_train')}
          />
          <LayerCard
            n="03"
            pictogram="lockout"
            title={t('home_l3_title')}
            body={t('home_l3_body')}
            to="/verify"
            cta={t('vf_check_now')}
          />
          <LayerCard
            n="04"
            pictogram="report_it"
            title={t('home_l4_title')}
            body={t('home_l4_body')}
            to="/report"
            cta={t('nav_report')}
          />
        </div>
      </section>

      <div className="stripe-divider" />

      {/* Why it matters */}
      <section className="max-w-5xl mx-auto px-5 py-16 grid md:grid-cols-3 gap-8">
        <Stat number={t('home_stat1_n')} label={t('home_stat1_l')} />
        <Stat number={t('home_stat2_n')} label={t('home_stat2_l')} />
        <Stat number={t('home_stat3_n')} label={t('home_stat3_l')} />
      </section>

      <div className="stripe-divider" />

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="font-display font-bold text-4xl uppercase mb-10 tracking-tight">{t('home_how')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <StepCard eyebrow={t('home_step1_e')} title={t('home_step1_t')} body={t('home_step1_b')} pictogram="warning" />
          <StepCard eyebrow={t('home_step2_e')} title={t('home_step2_t')} body={t('home_step2_b')} pictogram="listen" />
          <StepCard eyebrow={t('home_step3_e')} title={t('home_step3_t')} body={t('home_step3_b')} pictogram="ppe" />
        </div>
      </section>

      {/* Secondary entry points */}
      <section className="max-w-5xl mx-auto px-5 pb-16">
        <div className="grid sm:grid-cols-3 gap-3">
          <QuickLink to="/buddy" pictogram="buddy" label={t('home_cta_buddy')} />
          <QuickLink to="/refresher" pictogram="alarm" label={t('nav_refresher')} />
          <QuickLink to="/certification" pictogram="correct" label={t('nav_cert')} />
        </div>
      </section>

      <div className="stripe-divider" />

      <p className="max-w-5xl mx-auto px-5 py-8 font-mono text-[10px] text-concrete text-center leading-relaxed">
        {t('home_problem_ref')}
      </p>
    </div>
  )
}

/* ================================================================== */

function LayerCard({ n, pictogram, title, body, to, cta }) {
  return (
    <div className="bg-steel-light border border-steel-lighter rounded-lg p-6 flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        <Pictogram name={pictogram} size={44} />
        <div className="min-w-0">
          <p className="font-mono text-amber text-[10px] tracking-widest mb-1">{n}</p>
          <h3 className="font-display font-bold text-2xl uppercase leading-tight">{title}</h3>
        </div>
      </div>

      <p className="text-concrete text-sm leading-relaxed flex-1 mb-5">{body}</p>

      <Link
        to={to}
        className="font-mono text-[11px] uppercase tracking-widest text-amber hover:text-white self-start"
      >
        {cta} →
      </Link>
    </div>
  )
}

function Stat({ number, label }) {
  return (
    <div className="border-t-2 border-amber pt-4">
      <div className="font-display font-bold text-3xl text-amber uppercase mb-2">{number}</div>
      <p className="text-concrete text-sm leading-relaxed">{label}</p>
    </div>
  )
}

function StepCard({ eyebrow, title, body, pictogram }) {
  return (
    <div className="bg-steel-light rounded p-6 border border-steel-lighter">
      <Pictogram name={pictogram} size={34} className="mb-4" />
      <p className="font-mono text-amber text-xs uppercase tracking-widest mb-2">{eyebrow}</p>
      <h3 className="font-display font-bold text-2xl uppercase mb-3">{title}</h3>
      <p className="text-concrete text-sm leading-relaxed">{body}</p>
    </div>
  )
}

function QuickLink({ to, pictogram, label }) {
  return (
    <Link
      to={to}
      className="border border-steel-lighter rounded-lg p-4 flex items-center gap-3 hover:border-amber transition-colors"
    >
      <Pictogram name={pictogram} size={30} />
      <span className="font-mono text-xs uppercase tracking-widest text-concrete">{label}</span>
    </Link>
  )
}
