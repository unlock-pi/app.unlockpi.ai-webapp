"use client"

import { useLayoutEffect, useRef } from "react"
import type React from "react"
import { motion, useAnimation, useInView } from "motion/react"
import { annotate } from "rough-notation"
import { type RoughAnnotation } from "rough-notation/lib/model"

/** The seven hand-drawn marks rough-notation itself knows how to draw. */
type RoughAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket"

/**
 * `"mark"` is the plain web convention instead of a hand-drawn one — a solid
 * background behind the text plus a matching font color, the way a
 * `<mark>` tag or a highlighter pen in a PDF reader works. It is rendered
 * entirely differently below (no rough-notation involved).
 */
export type AnnotationAction = "mark" | RoughAction

/**
 * The little "hand marking this up" wobble each style gets once it starts
 * drawing. Not the same shape for every style — a circle nudges like a hand
 * looping around the word, a box snaps like a stamp, a strike-through gives
 * the text itself a small shake, "mark" just settles into place like a
 * highlighter pen pressing down — so the text's own motion echoes the shape
 * being drawn around it instead of every mark feeling identical.
 */
const MICRO_INTERACTIONS: Record<
  AnnotationAction,
  { scale?: number[]; rotate?: number[]; x?: number[]; y?: number[] }
> = {
  mark: { scale: [0.98, 1.03, 1] },
  highlight: { scale: [1, 1.04, 1], y: [0, -1, 0] },
  underline: { scale: [1, 1.03, 1], x: [0, 1, -0.5, 0] },
  box: { scale: [0.97, 1.05, 1] },
  circle: { scale: [1, 1.05, 0.98, 1], rotate: [0, -1.2, 0.8, 0] },
  "strike-through": { x: [0, -1.5, 1.5, 0] },
  "crossed-off": { x: [0, -1.5, 1.5, 0], rotate: [0, -0.5, 0.5, 0] },
  bracket: { scale: [1, 1.03, 1], y: [0, 1, 0] },
}

interface HighlighterProps {
  children: React.ReactNode
  action?: AnnotationAction
  /** Stroke color for a rough-notation style, or the background for "mark". */
  color?: string
  /** Font color once revealed. Only meaningful for the "mark" style. */
  textColor?: string
  strokeWidth?: number
  animationDuration?: number
  iterations?: number
  padding?: number
  multiline?: boolean
  isView?: boolean
  /**
   * Milliseconds to wait before this mark starts drawing. Lets a caller stage
   * several Highlighters to reveal one after another instead of all at once —
   * e.g. every pronoun in a sentence circled in reading order.
   */
  delay?: number
  /** Fires the moment this mark starts drawing (after `delay`). */
  onReveal?: () => void
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  textColor = "#1f2937",
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,
  delay = 0,
  onReveal,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const pop = useAnimation()
  const mark = useAnimation()

  const isInView = useInView(elementRef, {
    once: true,
    margin: "-10%",
  })

  // If isView is false, always show. If isView is true, wait for inView
  const shouldShow = !isView || isInView
  const isMark = action === "mark"

  // Rough-notation path: highlight, underline, box, circle, strike-through,
  // crossed-off, bracket. Skipped entirely for "mark", which has no
  // equivalent in rough-notation's own vocabulary.
  useLayoutEffect(() => {
    const element = elementRef.current
    let annotation: RoughAnnotation | null = null
    let resizeObserver: ResizeObserver | null = null
    let revealTimeout: ReturnType<typeof setTimeout> | null = null

    if (shouldShow && !isMark && element) {
      const annotationConfig = {
        type: action as RoughAction,
        color,
        strokeWidth,
        animationDuration,
        iterations,
        padding,
        multiline,
      }

      const currentAnnotation = annotate(element, annotationConfig)
      annotation = currentAnnotation

      const reveal = () => {
        currentAnnotation.show()
        void pop.start({
          ...MICRO_INTERACTIONS[action],
          transition: { duration: 0.5, ease: "easeOut" },
        })
        onReveal?.()
      }

      if (delay > 0) {
        revealTimeout = setTimeout(reveal, delay)
      } else {
        reveal()
      }

      resizeObserver = new ResizeObserver(() => {
        currentAnnotation.hide()
        currentAnnotation.show()
      })

      resizeObserver.observe(element)
      resizeObserver.observe(document.body)
    }

    return () => {
      if (revealTimeout) clearTimeout(revealTimeout)
      annotation?.remove()
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [
    shouldShow,
    isMark,
    action,
    color,
    strokeWidth,
    animationDuration,
    iterations,
    padding,
    multiline,
    delay,
    onReveal,
    pop,
  ])

  // "mark" path: a plain background + font-color highlight, the normal way
  // web pages mark text up — animated in like a highlighter pen pressing
  // down rather than appearing instantly.
  useLayoutEffect(() => {
    if (!shouldShow || !isMark) return

    let revealTimeout: ReturnType<typeof setTimeout> | null = null
    const reveal = () => {
      void mark.start({
        backgroundColor: color,
        color: textColor,
        transition: { duration: 0.35, ease: "easeOut" },
      })
      void pop.start({
        ...MICRO_INTERACTIONS.mark,
        transition: { duration: 0.4, ease: "easeOut" },
      })
      onReveal?.()
    }

    if (delay > 0) {
      revealTimeout = setTimeout(reveal, delay)
    } else {
      reveal()
    }

    return () => {
      if (revealTimeout) clearTimeout(revealTimeout)
    }
  }, [shouldShow, isMark, color, textColor, delay, onReveal, pop, mark])

  if (isMark) {
    return (
      <motion.mark
        ref={elementRef as React.Ref<HTMLElement>}
        animate={mark}
        className="inline rounded-[0.2em] px-[0.15em] py-[0.02em] -mx-[0.05em]"
        style={{ backgroundColor: "transparent" }}
      >
        <motion.span animate={pop} className="inline-block">
          {children}
        </motion.span>
      </motion.mark>
    )
  }

  return (
    <span ref={elementRef} className="relative inline-block bg-transparent">
      <motion.span animate={pop} className="inline-block">
        {children}
      </motion.span>
    </span>
  )
}
