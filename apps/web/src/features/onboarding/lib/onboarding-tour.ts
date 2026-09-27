import type { Tour } from "nextstepjs";

export const ONBOARDING_TOUR_NAME = "onboarding";

/** Visiting any dashboard page with `?tour=start` kicks off the onboarding
 * tour — used for the post-signup redirect and the manual "replay" trigger. */
export const ONBOARDING_QUERY_PARAM = "tour";
export const ONBOARDING_QUERY_VALUE = "start";

/**
 * Named indices into the tour's steps array — used by the `setCurrentStep`
 * calls scattered across the pages/dialogs this tour walks through, so those
 * call sites read as intent ("move to the create-project-dialog step")
 * rather than a bare number that silently drifts out of sync if a step is
 * ever inserted or removed here.
 */
export const OnboardingStep = {
  ClickNewProject: 0,
  FillProjectDialog: 1,
  ClickNewCanvas: 2,
  FillCanvasDialog: 3,
  DragBlock: 4,
} as const;

/**
 * Five steps, four real actions, one page each (a dialog counts as its own
 * "page" here). The tour never advances on its own "Next" click except on
 * the very last step — every other step advances because the component the
 * user is guided to (create-project dialog opening, project created and
 * navigated, create-canvas dialog opening, canvas created and navigated)
 * actually happened, which calls `setCurrentStep` from that component. See
 * the `useNextStep()` calls in create-project-dialog.tsx,
 * canvas-library-browser.tsx, and canvas-editor-screen.tsx.
 */
export const onboardingTours: Tour[] = [
  {
    tour: ONBOARDING_TOUR_NAME,
    steps: [
      {
        icon: "📁",
        title: "Create your first project",
        content:
          "Projects group canvases by class, unit, or term. Click New project to start one.",
        selector: "#onboarding-new-project",
        side: "bottom",
        pointerPadding: 8,
        pointerRadius: 14,
        selectorRetryAttempts: 10,
        selectorRetryDelay: 200,
        // The dashboard header is `sticky top-0` at h-14 (56px); without
        // this, scrollIntoView stops the target right at the boundary and
        // the sticky header covers the top slice of it.
        scrollOffset: 80,
      },
      {
        icon: "✏️",
        title: "Name it and create it",
        content:
          "Give your project a name, then click Create project to jump straight in.",
        selector: "#onboarding-project-name",
        side: "right",
        pointerPadding: 10,
        pointerRadius: 16,
        selectorRetryAttempts: 10,
        selectorRetryDelay: 150,
      },
      {
        icon: "🖼️",
        title: "Start a canvas from a template",
        content:
          "This project has no canvases yet. Click New canvas to see the templates.",
        selector: "#onboarding-new-canvas",
        side: "bottom",
        pointerPadding: 8,
        pointerRadius: 14,
        selectorRetryAttempts: 15,
        selectorRetryDelay: 200,
        scrollOffset: 80,
      },
      {
        icon: "🎨",
        title: "Pick a template",
        content:
          "Hover a card to preview it, pick a favorite, then click Open editor below.",
        selector: "#onboarding-canvas-templates",
        side: "bottom",
        pointerPadding: 10,
        pointerRadius: 16,
        selectorRetryAttempts: 10,
        selectorRetryDelay: 150,
      },
      {
        icon: "🧩",
        title: "Drag blocks onto the canvas",
        content:
          "Every teaching block lives here — text, arrays, code, diagrams, and more. Drag any of them onto the canvas to add it.",
        selector: "#onboarding-component-palette",
        side: "right",
        pointerPadding: 8,
        pointerRadius: 14,
        selectorRetryAttempts: 15,
        selectorRetryDelay: 200,
      },
    ],
  },
];
