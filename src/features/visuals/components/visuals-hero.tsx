"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { TypingAnimation } from "@/components/ui/typing-animation";
import { HERO_MORPH_ICONS } from "@/features/visuals/lib/visual-config";
import { Coolshape } from "coolshapes-react";

const MORPH_INTERVAL_MS = 2200;

/**
 * Small hero above the prompt input: a typed headline plus a soft blob that
 * morphs between a few icons. Icons are swappable in one place —
 * `HERO_MORPH_ICONS` in visual-config.ts — once real shapes are supplied.
 */
export function VisualsHero() {
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIconIndex((index) => (index + 1) % HERO_MORPH_ICONS.length);
    }, MORPH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const Icon = HERO_MORPH_ICONS[iconIndex];

  return (
    <div className="mb-6 flex items-center gap-4 justify-center flex-col mt-24 mb-10">
      <div className="relative grid size-14 shrink-0 place-items-center ">
        <AnimatePresence mode="wait">
          <motion.div
            key={iconIndex}
            initial={{
              opacity: 0,
              scale: 0.6,
              rotate: -20,
              filter: "blur(4px)",
            }}
            animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.6, rotate: 20, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Coolshape type="star" index={0} size={48} noise={true} />{" "}
            {/* <Icon className="size-6 text-primary" aria-hidden="true" /> */}
          </motion.div>
        </AnimatePresence>
      </div>

      <div>
        <TypingAnimation
          as="h1"
          className="text-2xl font-semibold tracking-tight"
          duration={45}
        >
          Visualization made easy
        </TypingAnimation>
        {/* <p className="mt-1 text-sm text-muted-foreground">
          Describe what you want to teach and generate a clean illustration or
          diagram.
        </p> */}
      </div>
    </div>
  );
}
