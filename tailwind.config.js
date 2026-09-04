/** @type {import('tailwindcss').Config} */

// Every colour resolves to a CSS custom property defined in src/styles/tokens.css.
//
// The `rgb(var(--x) / <alpha-value>)` form is deliberate: it keeps Tailwind's
// opacity modifiers working, so `bg-warning/10` and `border-brand/40` still
// compose correctly. Plain `var(--x)` holding a hex would silently break every
// one of those utilities, and the codebase uses them heavily.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // ---- structure ----
        surface: {
          0: token('surface-0'),
          1: token('surface-1'),
          2: token('surface-2'),
          3: token('surface-3'),
          inset: token('surface-inset'),
        },
        line: {
          subtle: token('border-subtle'),
          DEFAULT: token('border-default'),
          strong: token('border-strong'),
        },
        ink: {
          DEFAULT: token('text-primary'),
          secondary: token('text-secondary'),
          tertiary: token('text-tertiary'),
          disabled: token('text-disabled'),
          onBrand: token('text-on-brand'),
        },

        // ---- brand ----
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          pressed: token('brand-pressed'),
          text: token('brand-text'),
          subtle: token('brand-subtle'),
          border: token('brand-border'),
        },

        // ---- ISO 7010 semantics. Reserved: never a hover state, never decoration.
        hazard: {
          DEFAULT: token('hazard'),
          text: token('hazard-text'),
          subtle: token('hazard-subtle'),
          border: token('hazard-border'),
        },
        warning: {
          DEFAULT: token('warning'),
          text: token('warning-text'),
          subtle: token('warning-subtle'),
          border: token('warning-border'),
        },
        safe: {
          DEFAULT: token('safe'),
          text: token('safe-text'),
          subtle: token('safe-subtle'),
          border: token('safe-border'),
        },
        mandate: {
          DEFAULT: token('mandate'),
          text: token('mandate-text'),
          subtle: token('mandate-subtle'),
          border: token('mandate-border'),
        },

        ore: token('ore'),

        // The legacy palette (steel / amber / concrete / chalk) used to be aliased
        // here so unmigrated pages kept working during the phased rebuild. Every
        // reference is now gone — verified across src including comments, dynamic
        // strings and utilities like accent-* — so the aliases are deleted rather
        // than left as a second way to say the same thing.
        //
        // Worth recording why `amber` was NOT simply mapped to `warning` on the way
        // out: in the old palette amber was the accent, not a caution signal, and
        // mapping it to raw ISO yellow made every accent both semantically wrong
        // and, as text on a light surface, about 1.9:1 — unreadable. It was mapped
        // to `brand` (7.71:1 dark, 5.15:1 light) for the migration, and call sites
        // now name `brand-*` or `warning-*` explicitly according to meaning.
      },

      fontFamily: {
        // Set at runtime by fonts.js so the stack follows the active language.
        display: ['var(--font-display)', "'Barlow Condensed'", 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },

      fontSize: {
        '2xs': 'var(--text-2xs)',
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        hero: 'var(--text-hero)',
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },

      boxShadow: {
        1: 'var(--elev-1)',
        2: 'var(--elev-2)',
        3: 'var(--elev-3)',
        4: 'var(--elev-4)',
        brand: 'var(--glow-brand)',
      },

      spacing: {
        touch: 'var(--touch-min)',
      },

      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },

      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },

      zIndex: {
        sticky: 'var(--z-sticky)',
        nav: 'var(--z-nav)',
        sheet: 'var(--z-sheet)',
        toast: 'var(--z-toast)',
        cursor: 'var(--z-cursor)',
      },

      backgroundImage: {
        // Kept, but now used ONCE — in the hero — instead of as a repeating
        // section divider. Five repetitions flattened a strong industrial motif.
        'hazard-stripes':
          'repeating-linear-gradient(135deg, rgb(var(--warning)) 0 12px, rgb(var(--surface-0)) 12px 24px)',
        'hero-glow':
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgb(var(--hero-from) / 0.9), transparent 70%)',
        'brand-sheen':
          'linear-gradient(135deg, rgb(var(--brand) / 0.14), transparent 55%)',
      },
    },
  },
  plugins: [],
}
