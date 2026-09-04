// Barrel for the UI primitives.
//
// One import site means a page pulls its whole vocabulary from one line, and it
// makes the boundary explicit: anything not exported here is not part of the
// design system and should not be reached into directly.

export { default as Button } from './Button.jsx'
export { default as Card, CardHeader, CardBody, CardMeta, CardActions, CardSpacer } from './Card.jsx'
export { default as Badge, StatusDot, Chevron } from './Badge.jsx'
export { default as Stat, MiniStat } from './Stat.jsx'
export { default as Section, SectionHeader, Reveal } from './Section.jsx'
export { Skeleton, SkeletonText, SkeletonCard, EmptyState, ErrorState, Progress } from './Feedback.jsx'
export { default as Field, TextField, TextAreaField } from './Field.jsx'
export { default as Dialog, useConfirm, usePrompt } from './Dialog.jsx'
export { ToastProvider, useToast } from './Toast.jsx'
export { default as ThemeToggle } from './ThemeToggle.jsx'

export {
  usePrefersReducedMotion,
  useMediaQuery,
  useReveal,
  useCountUp,
  useFocusTrap,
  useScrollLock,
  useEscape,
  stagger,
} from './motion.js'
