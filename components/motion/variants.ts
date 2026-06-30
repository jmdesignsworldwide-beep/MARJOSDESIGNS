import type { Variants } from 'framer-motion'

/** Container that staggers its children in a soft cascade. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}

/** A single item rising into place with a spring. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 28 },
  },
}

/** Scale-fade, used for cards / modal content. */
export const popItem: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 26 },
  },
}

/** Standard tap/hover micro-interaction for clickable surfaces. */
export const tapScale = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.97 },
}
