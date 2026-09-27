"use client";

import { useMemo, useState } from "react";
import { motion, type Variants } from "motion/react";

import {
  CanvasBoxCard,
  CanvasListRow,
} from "@/features/project/components/canvas-preview-card";
import {
  CanvasViewToggle,
  type CanvasViewMode,
} from "@/features/project/components/canvas-view-toggle";
import { ProjectFolderCard } from "@/features/project/components/project-folder-card";
import type { TeachingCanvasPreview } from "@/features/project/lib/canvas-preview";
import type { TeachingProject } from "@/features/project/types/project-types";

type ProjectsGridProps = {
  projects: TeachingProject[];
  canvases: TeachingCanvasPreview[];
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
} satisfies Variants;

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
} satisfies Variants;

export function ProjectsGrid({ projects, canvases }: ProjectsGridProps) {
  // Scoped to the canvases section below — projects always render as a row.
  const [viewMode, setViewMode] = useState<CanvasViewMode>("grid");

  const canvasCounts = useMemo(
    () =>
      canvases.reduce<Record<string, number>>((acc, canvas) => {
        if (canvas.project_id) {
          acc[canvas.project_id] = (acc[canvas.project_id] ?? 0) + 1;
        }
        return acc;
      }, {}),
    [canvases],
  );

  const projectNames = useMemo(
    () =>
      Object.fromEntries(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const getProjectName = (canvas: TeachingCanvasPreview) =>
    canvas.project_id ? (projectNames[canvas.project_id] ?? null) : null;

  return (
    <div className="flex flex-col gap-8">
      {projects.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Projects" count={projects.length} />

          <motion.div
            className="flex flex-wrap gap-3"
            initial="hidden"
            animate="visible"
            variants={listVariants}
          >
            {projects.map((project) => (
              <motion.div key={project.id} variants={itemVariants}>
                <ProjectFolderCard
                  project={project}
                  canvasCount={canvasCounts[project.id] ?? 0}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading title="Canvases" count={canvases.length} />
          <CanvasViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {canvases.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
            No canvases yet. Open a project to create your first one.
          </p>
        ) : (
          <motion.div
            key={viewMode}
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "grid gap-2"
            }
            initial="hidden"
            animate="visible"
            variants={listVariants}
          >
            {canvases.map((canvas) => (
              <motion.div key={canvas.id} variants={itemVariants}>
                {viewMode === "grid" ? (
                  <CanvasBoxCard
                    canvas={canvas}
                    projectName={getProjectName(canvas)}
                  />
                ) : (
                  <CanvasListRow
                    canvas={canvas}
                    projectName={getProjectName(canvas)}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <span className="text-xs text-muted-foreground">{count}</span>
    </div>
  );
}
