'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { staggerContainer, riseItem } from './variants'

/** Wraps a list so its children cascade in when scrolled into view. */
export function RevealGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  )
}

/** A single cascading child. Pair inside <RevealGroup>. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={riseItem}>
      {children}
    </motion.div>
  )
}
