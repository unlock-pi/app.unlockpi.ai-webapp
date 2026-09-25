"use client";

import { Render } from "@puckeditor/core";
import {
  ActivityIcon,
  BotIcon,
  BracketsIcon,
  CaptionsIcon,
  CaptionsOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStopIcon,
  Grid2X2Icon,
  MicIcon,
  MicOffIcon,
  PowerIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AgentState } from "@livekit/components-react";
import type { RemoteAudioTrack } from "livekit-client";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { ArraysAgentActivityPanel } from "@/features/arrays-agent/components/arrays-agent-activity-panel";
import { ArraysAgentOverlays } from "@/features/arrays-agent/components/arrays-agent-overlays";
import { ArraysAgentViewProvider } from "@/features/arrays-agent/components/arrays-agent-view-context";
import { useArraysAgentOnCanvas } from "@/features/arrays-agent/hooks/use-arrays-agent-on-canvas";
import { ARRAYS_AGENT_NAME } from "@/features/arrays-agent/lib/agent-name";
import {
  PresenterDock,
  type DockAction,
} from "@/features/canvas/components/presenter/presenter-dock";
import { PresenterFooter } from "@/features/canvas/components/presenter/presenter-footer";
import type { PresentationControls } from "@/features/arrays-agent/tools/tool-context";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import { CopilotPanel } from "@/features/canvas/components/copilot-panel";
import { AgentAudioVisualizerWave } from "@/features/talk/components/agent-audio-visualizer-wave";
import {
  type CanvasRealtimeAction,
  type CanvasRealtimeStatus,
  type RealtimeActivity,
  useCanvasRealtimeSession,
} from "@/features/canvas/hooks/use-canvas-realtime-session";
import { useChromeReveal } from "@/features/canvas/hooks/use-chrome-reveal";
import { useCopilotPanel } from "@/features/canvas/hooks/use-copilot-panel";
import type { PanelGenerateRequest } from "@/features/canvas/lib/panel-generation";
import { playCanvasActionSound } from "@/features/canvas/lib/canvas-action-sound";
import {
  applyCanvasAction,
  summarizeCanvas,
} from "@/features/canvas/lib/canvas-commands";
import {
  describeFrameForModel,
  describeFrameReadable,
  getCanvasPresentationFrames,
} from "@/features/canvas/lib/canvas-presentation";
import type { CanvasPresentationMode } from "@/features/canvas/lib/canvas-presentation";
import type {
  CanvasAiAction,
  CanvasDocument,
} from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";

// Re-exported so existing import sites keep working; the list itself lives in
// canvas-presentation.ts, which has no React dependency.
export type { CanvasPresentationMode } from "@/features/canvas/lib/canvas-presentation";

/**
 * Represents the properties for the `CanvasPresenter` component.
 *
 * @property {string | null} canvasId - The ID of the canvas.
 * @property {CanvasDocument} document - The document for the canvas.
 * @property {string | null} initialFrameId - The ID of the initial frame.
 * @property {CanvasPresentationMode} mode - The mode of the canvas presentation.
 * @property {() => void} onClose - The callback to be called when the canvas presenter is closed.
 * @property {boolean} publicView - Indicates whether the canvas is in public view.
 * @property {string} title - The title of the canvas.
 */
type CanvasPresenterProps = {
  canvasId?: string | null;
  document: CanvasDocument;
  initialFrameId?: string | null;
  mode?: CanvasPresentationMode;
  onClose?: () => void;
  publicView?: boolean;
  title: string;
};

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

/** Keeps a busy frame inside the fixed presentation stage without scrolling. */
function FittedPresentationFrame({
  document,
  zoom = 1,
}: {
  document: CanvasDocument;
  /** The teacher's zoom, multiplied on top of the automatic fit. */
  zoom?: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let animationFrame = 0;

    // Schedules the execution of the 'measure' function using the 'requestAnimationFrame' method.
    // Cancels any previously scheduled animation frame before scheduling a new one.
    const measure = () => {
      const viewport = frame.querySelector<HTMLElement>(
        "[data-slot='scroll-area-viewport']",
      );
      const content = frame.querySelector<HTMLElement>(
        "[data-slot='scroll-area-content']",
      );
      if (!viewport || !content) return;

      // scrollHeight/scrollWidth describe the unscaled lesson composition.
      // Scaling that composition is what lets every element remain visible
      // without giving the teacher a nested scrollbar.
      const nextScale = Math.min(
        1,
        viewport.clientHeight / content.scrollHeight,
        viewport.clientWidth / content.scrollWidth,
      );
      setScale((current) =>
        Math.abs(current - nextScale) < 0.01 ? current : nextScale,
      );
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(frame);
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [document]);

  return (
    <div
      ref={frameRef}
      className="size-full"
      // Zoomed past the fit the frame is deliberately larger than its box, so
      // the teacher can scroll to the part they are talking about.
      style={{ overflow: zoom > 1 ? "auto" : "hidden" }}
    >
      <div
        className="size-full"
        style={{
          transform: `scale(${scale * zoom})`,
          transformOrigin: "top center",
        }}
      >
        <Render config={canvasPuckConfig} data={document} />
      </div>
    </div>
  );
}

export function CanvasPresenter({
  canvasId,
  document: authoredDocument,
  initialFrameId,
  mode = "manual",
  onClose,
  publicView = false,
  title,
}: CanvasPresenterProps) {
  const [runtimeDocument, setRuntimeDocument] = useState(() =>
    structuredClone(authoredDocument),
  );
  const [selectedMode, setSelectedMode] =
    useState<CanvasPresentationMode>(mode);
  const [hasLiveChanges, setHasLiveChanges] = useState(false);
  // Closed by default: it is a diagnostic view, opened from the dock on demand.
  const [activityOpen, setActivityOpen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  /** A one-off line in the dock's pill — "it is already talking", say. */
  const [transientHint, setTransientHint] = useState<string | null>(null);
  const frames = useMemo(
    () => getCanvasPresentationFrames(runtimeDocument),
    [runtimeDocument],
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      frames.findIndex((frame) => frame.id === initialFrameId),
    ),
  );
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pointerStartRef = useRef<number | null>(null);
  const presenterRef = useRef<HTMLDivElement | null>(null);
  const activeFrame = frames[activeIndex] ?? null;
  // A frame with several blocks needs a slightly denser presentation scale to
  // keep every block visible on the fixed 16:9 stage.
  const activeSlide = activeFrame?.document.content[0];
  const isDenseFrame =
    activeSlide?.type === "SlideBlock" &&
    Array.isArray(activeSlide.props.content) &&
    activeSlide.props.content.length >= 3;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (frames.length === 0) return;
      const boundedIndex = Math.min(Math.max(nextIndex, 0), frames.length - 1);
      setDirection(boundedIndex < activeIndex ? "backward" : "forward");
      setActiveIndex(boundedIndex);
      setOverviewOpen(false);
    },
    [activeIndex, frames.length],
  );

  const applyRealtimeAction = useCallback(
    (action: CanvasRealtimeAction) => {
      const navigationIndex = resolveNavigationIndex(
        action,
        frames,
        activeIndex,
      );
      if (navigationIndex !== null) {
        goTo(navigationIndex);
        const frame = frames[navigationIndex];
        return frame
          ? `Frame ${navigationIndex + 1} of ${frames.length}: ${frame.title}`
          : "No frame is available.";
      }

      const canvasAction = toCanvasAction(action);
      if (!canvasAction || !activeFrame) {
        return "The requested live visual change could not be applied.";
      }

      const result = applyCanvasAction(
        runtimeDocument,
        activeFrame.id,
        canvasAction,
      );
      // Same cue whether the teacher clicked it or said it out loud — the
      // class hears the array change, not just sees it.
      playCanvasActionSound(canvasAction);
      const nextFrames = getCanvasPresentationFrames(result.document);
      setRuntimeDocument(result.document);
      setActiveIndex(
        Math.max(
          0,
          nextFrames.findIndex((frame) => frame.id === result.activeSlideId),
        ),
      );
      setHasLiveChanges(true);

      return `${result.message}\n${summarizeCanvas(result.document, result.activeSlideId)}`;
    },
    [activeFrame, activeIndex, frames, goTo, runtimeDocument],
  );

  const panel = useCopilotPanel();
  const [panelOpen, setPanelOpen] = useState(false);
  const { addPending: addPanelItem, resolve: resolvePanelItem } = panel;
  const lastPanelRequestRef = useRef<{ key: string; at: number } | null>(null);

  // When the AI asks to show something in the panel: open it, drop a skeleton
  // in instantly, then generate independently and stream the result in. Because
  // this lives in the panel (not on the frame), navigating away never breaks it.
  const handlePanelRequest = useCallback(
    async (request: PanelGenerateRequest) => {
      // Defensive dedupe: if the AI calls show_in_panel again for the same
      // type+topic within a few seconds (e.g. from a forced follow-up
      // response), don't spawn a second skeleton/generation for it.
      const key = `${request.type}:${request.topic}`;
      const now = Date.now();
      if (
        lastPanelRequestRef.current?.key === key &&
        now - lastPanelRequestRef.current.at < 6000
      ) {
        return;
      }
      lastPanelRequestRef.current = { key, at: now };

      setPanelOpen(true);
      const itemId = addPanelItem(request.type, request.topic);
      try {
        const frameContext = activeFrame
          ? describeFrameForModel(activeFrame, frames.length)
          : undefined;
        const response = await fetch("/api/canvas/panel-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, frameContext }),
        });
        const data = await response.json();
        if (!response.ok || !data.content) {
          throw new Error(data.error ?? "Generation failed.");
        }
        resolvePanelItem(itemId, {
          status: "ready",
          content: data.content,
          topic: data.topic ?? request.topic,
          language: data.language,
        });
      } catch {
        resolvePanelItem(itemId, { status: "error" });
      }
    },
    [activeFrame, frames.length, addPanelItem, resolvePanelItem],
  );

  const realtimeSession = useCanvasRealtimeSession({
    canvasId,
    canvasTitle: title,
    frames,
    mode: selectedMode === "companion" ? "companion" : "director",
    onAction: applyRealtimeAction,
    onPanelRequest: handlePanelRequest,
  });

  const {
    activity: aiActivity,
    caption: aiCaption,
    isConnected: aiConnected,
    remoteAudioStream,
    status: aiStatus,
    syncFrameContext,
  } = realtimeSession;

  // The arrays agent runs on the same runtime document. Reads go through refs
  // so the bridge always sees current state rather than the document captured
  // when a tool sequence started — a burst of calls (create, insert, explain)
  // would otherwise all write against the first one's snapshot.
  const runtimeDocumentRef = useRef(runtimeDocument);
  const activeFrameIdRef = useRef<string | null>(activeFrame?.id ?? null);

  // Picks up changes made OUTSIDE the agent — manual navigation, resetting
  // live changes. Changes made BY the agent keep these refs fresh
  // synchronously in `applyArraysDocument` below, because a burst of tool
  // calls all runs before React re-renders and each must see the previous
  // one's document.
  useEffect(() => {
    runtimeDocumentRef.current = runtimeDocument;
    activeFrameIdRef.current = activeFrame?.id ?? null;
  }, [activeFrame?.id, runtimeDocument]);

  // Stable identities, deliberately.
  //
  // These read refs, so they never need to change — and they MUST not: the
  // bridge's callbacks depend on them, the agent's adopt effect depends on
  // those, and adopting calls setState. Inline arrows here gave every render a
  // new identity, which re-fired that effect, which re-rendered — an infinite
  // loop that also cleared the animation and re-sent board state on every pass.
  const getArraysDocument = useCallback(() => runtimeDocumentRef.current, []);
  const getArraysFrameId = useCallback(() => activeFrameIdRef.current, []);

  const applyArraysDocument = useCallback(
    (nextDocument: CanvasDocument, nextFrameId: string | null) => {
      runtimeDocumentRef.current = nextDocument;
      activeFrameIdRef.current = nextFrameId;
      const nextFrames = getCanvasPresentationFrames(nextDocument);
      setRuntimeDocument(nextDocument);
      setActiveIndex(
        Math.max(
          0,
          nextFrames.findIndex((frame) => frame.id === nextFrameId),
        ),
      );
      setHasLiveChanges(true);
    },
    [],
  );

  // Navigation the agent can drive. Every call derives frames from the live
  // document ref at the moment it runs — never from `frames`/`activeIndex`
  // captured in a render. Those go stale the instant the agent adds or edits a
  // frame, and a burst of tool calls ("add a heading, then tell me what's on
  // this frame") runs entirely before React re-renders. Reading the stale copy
  // is how the agent described a frame without the block it had just added.
  const arraysPresentation = useMemo<PresentationControls>(() => {
    const liveFrames = () => getCanvasPresentationFrames(runtimeDocumentRef.current);
    const liveIndex = (list: ReturnType<typeof getCanvasPresentationFrames>) =>
      Math.max(
        0,
        list.findIndex((frame) => frame.id === activeFrameIdRef.current),
      );

    const show = (index: number) => {
      const list = liveFrames();
      if (list.length === 0) return "There are no frames in this canvas.";
      const current = liveIndex(list);
      const bounded = Math.min(Math.max(index, 0), list.length - 1);
      const frame = list[bounded];
      // Updated synchronously so the next call in the same burst sees it.
      activeFrameIdRef.current = frame.id;
      setDirection(bounded < current ? "backward" : "forward");
      setActiveIndex(bounded);
      setOverviewOpen(false);
      // Returning the whole frame lets the agent explain it straight away,
      // without a second round-trip to read what it just moved to.
      return describeFrameReadable(frame, list.length);
    };

    return {
      next: () => {
        const list = liveFrames();
        return show(liveIndex(list) + 1);
      },
      previous: () => {
        const list = liveFrames();
        return show(liveIndex(list) - 1);
      },
      first: () => show(0),
      last: () => show(liveFrames().length - 1),
      goTo: (frameNumber: number) => show(frameNumber - 1),
      find: (query: string) => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const best = liveFrames()
          .map((frame) => ({
            frame,
            score: words.filter((word) => frame.searchText.includes(word)).length,
          }))
          .sort((left, right) => right.score - left.score)[0];
        return best?.score
          ? show(best.frame.index)
          : `Nothing on the frames matches "${query}". Staying on the current frame.`;
      },
      describe: () => {
        const list = liveFrames();
        const frame = list[liveIndex(list)];
        return frame
          ? describeFrameReadable(frame, list.length)
          : "No frame is currently showing.";
      },
    };
  }, []);

  const arrays = useArraysAgentOnCanvas({
    canvasId,
    canvasTitle: title,
    getDocument: getArraysDocument,
    getActiveFrameId: getArraysFrameId,
    applyDocument: applyArraysDocument,
    presentation: arraysPresentation,
    activeFrameId: activeFrame?.id ?? null,
    enabled: selectedMode === "arrays",
  });

  const isArraysMode = selectedMode === "arrays";
  const isCopilotMode = selectedMode === "voice" || selectedMode === "companion";

  // `AgentAudioVisualizerWave` drives its "speaking" amplitude from LiveKit's
  // `useTrackVolume`, which only ever reads `.mediaStream` and
  // `.mediaStreamTrack` off the track (verified in the bundle). A minimal shim
  // over the raw WebRTC stream satisfies it without constructing a full LiveKit
  // RemoteAudioTrack — that's what makes the wave move with the actual voice.
  const aiAudioTrack = useMemo(() => {
    const track = remoteAudioStream?.getAudioTracks()[0];
    if (!remoteAudioStream || !track) {
      return undefined;
    }
    return {
      mediaStream: remoteAudioStream,
      mediaStreamTrack: track,
    } as unknown as RemoteAudioTrack;
  }, [remoteAudioStream]);
  const [captionsOn, setCaptionsOn] = useState(true);

  // All chrome — title, end-class button, dock, footer — hides until wanted
  // and comes back together: pointer at the top or bottom edge, or on any
  // piece of it. It is held up while connecting so that state is never missed.

  // Give the AI sight: every time the visible frame changes — whether the
  // teacher navigated manually or the AI did — tell the model exactly what is
  // now on screen. Also fires on connect (aiConnected flips true), so the AI
  // gets its bearings the moment it joins. This is what stops it going blind
  // after the first second.
  useEffect(() => {
    if (!aiConnected || !activeFrame) return;
    syncFrameContext(describeFrameForModel(activeFrame, frames.length));
  }, [aiConnected, activeFrame, frames.length, syncFrameContext]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowRight" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        goTo(activeIndex + 1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goTo(activeIndex - 1);
      }
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(frames.length - 1);
      if (event.key === "Escape" && overviewOpen) setOverviewOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, frames.length, goTo, overviewOpen]);

  useEffect(() => {
    const syncFullscreen = () =>
      setIsFullscreen(Boolean(window.document.fullscreenElement));
    window.document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      window.document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (window.document.fullscreenElement) {
      await window.document.exitFullscreen();
    } else {
      await presenterRef.current?.requestFullscreen();
    }
  };

  const selectMode = (nextMode: CanvasPresentationMode) => {
    if (nextMode === selectedMode) return;
    // Only one voice session may hold the microphone, so leaving a mode always
    // ends its session before the next one can start.
    realtimeSession.disconnect();
    arrays.agent.disconnect();
    setSelectedMode(nextMode);
  };

  const resetLiveChanges = () => {
    const nextDocument = structuredClone(authoredDocument);
    const nextFrames = getCanvasPresentationFrames(nextDocument);
    const currentFrameId = activeFrame?.id;
    setRuntimeDocument(nextDocument);
    setActiveIndex(
      Math.max(
        0,
        nextFrames.findIndex((frame) => frame.id === currentFrameId),
      ),
    );
    setHasLiveChanges(false);
  };

  const endClass = () => {
    realtimeSession.disconnect();
    arrays.agent.disconnect();
    onClose?.();
  };

  const voiceConnected = isArraysMode
    ? arrays.agent.isConnected
    : realtimeSession.isConnected;
  // `use-canvas-realtime-session` (the non-arrays modes) doesn't have an
  // automatic-reconnect path yet, so it has no "reconnecting" status to check.
  const voiceReconnecting = isArraysMode && arrays.agent.status === "reconnecting";
  const voiceConnecting =
    (isArraysMode ? arrays.agent.status === "connecting" : aiStatus === "connecting") ||
    voiceReconnecting;
  const micLive = isArraysMode ? arrays.agent.micEnabled : !realtimeSession.isPaused;

  const reveal = useChromeReveal({ hold: voiceConnecting });
  /** Shared by every piece of chrome so they move as one. */
  const chromeMotion = {
    initial: false,
    animate: { opacity: reveal.visible ? 1 : 0 },
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
    // Inert while hidden: an invisible button must not take clicks or focus.
    inert: !reveal.visible,
    ...reveal.pinHandlers,
  };

  const flashHint = (message: string) => {
    setTransientHint(message);
    window.setTimeout(() => setTransientHint(null), 2600);
  };

  const toggleVoice = () => {
    // Connecting and reconnecting are both "there is an attempt in flight
    // someone might want out of" — same disconnect() as stopping a live
    // session, not a separate cancel path. Its own generation/abort
    // machinery is what makes that safe: the in-flight connect() notices
    // and unwinds itself rather than finishing and resurrecting a
    // connection the teacher just tried to call off.
    if (voiceConnected || voiceConnecting) {
      if (isArraysMode) arrays.agent.disconnect();
      else realtimeSession.disconnect();
      return;
    }
    void (isArraysMode ? arrays.agent.connect() : realtimeSession.connect());
  };

  const dockPrimary: DockAction[] = [
    {
      id: "power",
      label: voiceConnected
        ? `Stop ${isArraysMode ? ARRAYS_AGENT_NAME : "the AI"}`
        : voiceReconnecting
          ? "Cancel reconnecting"
          : voiceConnecting
            ? "Cancel connecting"
            : `Start ${isArraysMode ? ARRAYS_AGENT_NAME : "the AI"}`,
      icon: <PowerIcon className="size-4" />,
      active: voiceConnected,
      status: voiceConnecting ? "busy" : voiceConnected ? "live" : undefined,
      // Stays clickable while connecting/reconnecting — that's what lets a
      // teacher back out of an attempt instead of being stuck watching a
      // spinner they can't stop.
      disabled: selectedMode === "manual",
      onClick: toggleVoice,
    },
  ];

  // Hidden for now — kept so it can come straight back.
  // "Say hello" (greet):
  const dockHidden: DockAction[] = [
    {
      id: "greet",
      label: "Say hello",
      text: "HI",
      icon: null,
      disabled: !voiceConnected || !isArraysMode,
      onClick: () => {
        const spoke = arrays.agent.speakNow(
          "Greet the class in one short sentence, then say what is on this frame.",
        );
        if (!spoke) flashHint("It is already speaking — try again in a moment.");
      },
    },
  ];
  void dockHidden;

  // Only when they mean something: the mic once a session is live, the
  // activity panel toggle only in the mode that has one.
  if (voiceConnected) {
    dockPrimary.push({
      id: "mic",
      label: micLive ? "Mute your microphone" : "Unmute your microphone",
      icon: micLive ? <MicIcon className="size-4" /> : <MicOffIcon className="size-4" />,
      active: micLive,
      disabled: !voiceConnected,
      onClick: () => {
        if (isArraysMode) arrays.agent.toggleMic();
        else realtimeSession.togglePause();
      },
    });
  }
  if (isArraysMode) {
    dockPrimary.push({
      id: "activity",
      label: activityOpen ? "Hide agent activity" : "Show agent activity",
      icon: <ActivityIcon className="size-4" />,
      active: activityOpen,
      onClick: () => setActivityOpen((open) => !open),
    });
  }
  // "End class" moved out of the dock to the ✕ at the top right.

  const dockSecondary: DockAction[] = publicView
    ? []
    : [
        {
          id: "mode-manual",
          label: "Manual",
          icon: <CircleStopIcon className="size-4" />,
          active: selectedMode === "manual",
          onClick: () => selectMode("manual"),
        },
        {
          id: "mode-voice",
          label: "Copilot",
          icon: <MicIcon className="size-4" />,
          active: selectedMode === "voice",
          onClick: () => selectMode("voice"),
        },
        {
          id: "mode-companion",
          label: "Co-teacher",
          icon: <BotIcon className="size-4" />,
          active: selectedMode === "companion",
          onClick: () => selectMode("companion"),
        },
        {
          id: "mode-arrays",
          label: ARRAYS_AGENT_NAME,
          icon: <BracketsIcon className="size-4" />,
          active: isArraysMode,
          onClick: () => selectMode("arrays"),
        },
        {
          id: "overview",
          label: "All frames",
          icon: <Grid2X2Icon className="size-4" />,
          active: overviewOpen,
          onClick: () => setOverviewOpen((open) => !open),
        },
        {
          id: "captions",
          label: captionsOn ? "Hide captions" : "Show captions",
          icon: captionsOn ? (
            <CaptionsIcon className="size-4" />
          ) : (
            <CaptionsOffIcon className="size-4" />
          ),
          active: captionsOn,
          onClick: () => setCaptionsOn((on) => !on),
        },
        ...(hasLiveChanges
          ? [
              {
                id: "reset",
                label: "Undo live changes",
                icon: <RotateCcwIcon className="size-4" />,
                onClick: resetLiveChanges,
              } satisfies DockAction,
            ]
          : []),
      ];

  const liveCaption = isArraysMode ? arrays.agent.caption : aiCaption;
  // The pill above the dock (live transcript / keyboard hint) is hidden for
  // now; the logic stays so it can be switched back on.
  const SHOW_DOCK_HINT = false;
  const dockHint =
    transientHint ??
    (captionsOn && liveCaption
      ? liveCaption
      : selectedMode === "manual"
        ? "Manual mode · ← → to move between frames"
        : voiceReconnecting
          ? "Connection dropped — reconnecting automatically… press power to give up"
          : voiceConnecting
            ? "Connecting… press power to cancel"
            : voiceConnected
              ? "Listening — just talk to change the board"
              : `Press power to start ${isArraysMode ? ARRAYS_AGENT_NAME : "the AI"}`);

  if (!activeFrame) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        This canvas has no frames yet.
      </div>
    );
  }

  return (
    <motion.div
      ref={presenterRef}
      // Entering presentation mode used to be an instant hard cut — one
      // frame you're in the editor, the next you're not. This eases in over
      // 1s (a gentle scale-up + fade) so it reads as a deliberate transition
      // onto "stage" rather than a jarring switch. Exit is quicker (0.4s) —
      // getting back to editing should feel snappy, not ceremonial.
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        // A column: the stage takes the height that is left, and the status
        // bar sits under it at a fixed height, spanning the activity panel
        // too. Everything else floats over the stage.
        "canvas-presenter relative flex h-svh w-full flex-col overflow-hidden bg-background text-foreground",
        !publicView && "fixed inset-0 z-[100]",
      )}
    >

      {aiActivity ? (
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-6 z-30 flex max-w-[80vw] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium backdrop-blur-md",
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              aiActivity.kind === "listening"
                ? "bg-muted-foreground"
                : "animate-pulse bg-primary",
            )}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            {activityVerb(aiActivity.kind)}
          </span>
          <span className="truncate text-foreground">{aiActivity.label}</span>
        </div>
      ) : null}

      {hasLiveChanges ? (
        <div
          className={cn(
            "absolute left-6 top-24 z-30 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-md",
          )}
        >
          <span
            className="size-1.5 rounded-full bg-warning"
            aria-hidden="true"
          />
          Live-only changes · not saved to canvas
        </div>
      ) : null}

      {/* The stage row: board on the left, agent panel on the right. */}
      <div className="relative flex min-h-0 flex-1">
        <main
          className="relative grid flex-1 place-items-center overflow-hidden"
          onPointerDown={(event) => {
            pointerStartRef.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (pointerStartRef.current === null) return;
            const distance = event.clientX - pointerStartRef.current;
            pointerStartRef.current = null;
            if (Math.abs(distance) < 70) return;
            goTo(activeIndex + (distance < 0 ? 1 : -1));
          }}
        >
          {/* A soft backing so the title never blends into frame content
              sitting beneath it. Text is shown exactly as the author wrote it. */}
          <motion.div
            {...chromeMotion}
            className="absolute left-6 top-6 z-20 flex max-w-[60%] gap-3 rounded-xl bg-background/80 py-2 pl-2.5 pr-4 backdrop-blur-md"
          >
            <span
              aria-hidden="true"
              className="w-1 shrink-0 rounded-full bg-foreground/70"
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                {title}
              </p>
              {/* Frame subtitle hidden for now.
              <p className="truncate text-sm text-muted-foreground">
                {activeFrame.title}
              </p> */}
            </div>
          </motion.div>

          {publicView ? null : (
            <motion.button
              {...chromeMotion}
              type="button"
              onClick={endClass}
              aria-label="End class"
              title="End class"
              className="absolute right-6 top-6 z-30 grid size-11 place-items-center rounded-full border border-border/60 bg-background/85 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <XIcon className="size-5" />
            </motion.button>
          )}

          {aiConnected ? (
            // Anchored inside `main` (not the outer presenter) so it shares the
            // same box the frame card centers in — when the Copilot panel opens
            // and narrows `main`, both move together instead of drifting into
            // each other. `main`'s overflow-hidden also clips it from ever
            // reaching into the panel. z-0, below the frame card's z-10, so the
            // card visually wins any overlap rather than drawing over it.
            //
            // The panel eats into main's width, so the wave itself shrinks
            // (xl -> sm) rather than relying on overflow-hidden to crop it —
            // clipping read as a cut-off shape, not a resize.
            <div className="pointer-events-none absolute left-4 top-1/2 z-0 -translate-y-1/2">
              <AgentAudioVisualizerWave
                size={panelOpen ? "sm" : "xl"}
                color="#ff0d00"
                colorShift={0.06}
                lineWidth={1.8}
                state={toAgentVisualizerState(aiStatus, aiActivity)}
                audioTrack={aiAudioTrack}
                className="mx-auto aspect-square size-auto h-full transition-[height,width] duration-300 ease-out"
              />
            </div>
          ) : null}

          <div
            key={activeFrame.id}
            className={cn(
              // This is the presentation surface: it always fits as one 16:9
              // frame inside the available stage.
              "canvas-presenter-frame canvas-presenter-surface relative z-10 animate-in fade-in duration-300",
              isDenseFrame && "canvas-presenter-surface--dense",
              direction === "forward"
                ? "slide-in-from-right-8"
                : "slide-in-from-left-8",
            )}
          >
            <ArraysAgentViewProvider
              {...(isArraysMode
                ? arrays.viewProviderProps
                : { blockId: null, view: null, showIndices: true, isAnimating: false })}
            >
              <FittedPresentationFrame
                document={activeFrame.document}
                zoom={zoomPercent / 100}
              />
            </ArraysAgentViewProvider>
          </div>

          {isArraysMode && arrays.agent.overlays.length > 0 ? (
            <div className="pointer-events-auto absolute right-4 top-1/2 z-20 w-72 max-w-[40vw] -translate-y-1/2">
              <ArraysAgentOverlays
                overlays={arrays.agent.overlays}
                onDismiss={arrays.agent.dismissOverlay}
              />
            </div>
          ) : null}

          <FrameArrow
            direction="previous"
            disabled={activeIndex === 0}
            onClick={() => goTo(activeIndex - 1)}
          />
          <FrameArrow
            direction="next"
            disabled={activeIndex === frames.length - 1}
            onClick={() => goTo(activeIndex + 1)}
          />
        </main>

        {!publicView && isArraysMode && activityOpen ? (
          <ArraysAgentActivityPanel
            events={arrays.agent.events}
            latency={arrays.agent.latency}
            status={arrays.agent.status}
            isConnected={arrays.agent.isConnected}
            isUserSpeaking={arrays.agent.isUserSpeaking}
            isResponding={arrays.agent.isResponding}
            isAnimating={arrays.agent.isAnimating}
            animationNote={arrays.agent.animationNote}
            animationProgress={arrays.agent.animationProgress}
            animationSpeed={arrays.agent.animationSpeed}
            onSkipAnimation={arrays.agent.skipAnimation}
            onClose={() => setActivityOpen(false)}
          />
        ) : null}

        {!publicView && isCopilotMode && panelOpen ? (
          <CopilotPanel
            items={panel.items}
            onClose={() => setPanelOpen(false)}
            onRemove={panel.remove}
          />
        ) : null}
      </div>

      {/* The bottom chrome is ONE unit — dock sitting on the footer — spanning
          the full presenter width, so the activity panel never shifts it. It
          slides as a whole, so the dock never moves relative to the footer
          and never slides out from under the pointer. */}
      <motion.div
        {...chromeMotion}
        animate={{ opacity: reveal.visible ? 1 : 0, y: reveal.visible ? 0 : 24 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col"
      >
        {/* A shared/embedded canvas has no AI session and no class to end. */}
        {publicView ? null : (
          <div className="pointer-events-auto flex justify-center px-4 pb-3">
            <PresenterDock
              primary={dockPrimary}
              secondary={dockSecondary}
              hint={SHOW_DOCK_HINT ? dockHint : undefined}
            />
          </div>
        )}
        <PresenterFooter
          className="pointer-events-auto"
          frameNumber={activeIndex + 1}
          frameCount={frames.length}
          onPrevious={() => goTo(activeIndex - 1)}
          onNext={() => goTo(activeIndex + 1)}
          zoomPercent={zoomPercent}
          onZoomIn={() => setZoomPercent((zoom) => Math.min(MAX_ZOOM, zoom + ZOOM_STEP))}
          onZoomOut={() => setZoomPercent((zoom) => Math.max(MIN_ZOOM, zoom - ZOOM_STEP))}
          onZoomReset={() => setZoomPercent(100)}
          canZoomIn={zoomPercent < MAX_ZOOM}
          canZoomOut={zoomPercent > MIN_ZOOM}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => void toggleFullscreen()}
        />
      </motion.div>

      {/*
        Was `realtimeSession.error` only — arrays mode's own connection
        errors (including "reconnecting gave up after 4 attempts") set
        `arrays.agent.error` but nothing ever rendered it. A teacher whose
        session silently gave up had no way to know why the board went quiet.
      */}
      {(isArraysMode ? arrays.agent.error : realtimeSession.error) ? (
        <div className="absolute bottom-16 left-1/2 z-30 -translate-x-1/2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive shadow-xl backdrop-blur-md">
          {isArraysMode ? arrays.agent.error : realtimeSession.error}
        </div>
      ) : null}

      {overviewOpen ? (
        <FrameOverview
          activeIndex={activeIndex}
          frames={frames}
          onClose={() => setOverviewOpen(false)}
          onSelect={goTo}
        />
      ) : null}
    </motion.div>
  );
}

function FrameArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "next" ? ChevronRightIcon : ChevronLeftIcon;
  return (
    <button
      type="button"
      aria-label={`${direction === "next" ? "Next" : "Previous"} frame`}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "absolute z-20 grid size-11 place-items-center rounded-full border bg-card/80 text-foreground shadow-lg backdrop-blur-md transition hover:bg-accent disabled:pointer-events-none disabled:opacity-20",
        direction === "next" ? "right-2 sm:right-5" : "left-2 sm:left-5",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function FrameOverview({
  activeIndex,
  frames,
  onClose,
  onSelect,
}: {
  activeIndex: number;
  frames: ReturnType<typeof getCanvasPresentationFrames>;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-background/95 p-5 backdrop-blur-md sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Overview
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Choose a frame</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Close frame overview"
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              onClick={() => onSelect(frame.index)}
              className={cn(
                "rounded-2xl border bg-card p-4 text-left outline-none transition hover:-translate-y-0.5 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                frame.index === activeIndex && "border-primary",
              )}
            >
              <div className="mb-8 aspect-video rounded-xl bg-muted/40 p-4">
                <span className="text-4xl font-semibold text-muted-foreground/40">
                  {String(frame.index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Frame {frame.index + 1}
              </p>
              <p className="mt-1 truncate font-semibold">{frame.title}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * `AgentAudioVisualizerWave` and its animation hook take a LiveKit `AgentState`
 * purely as a prop — they don't call `useAgent()` or read from a LiveKit Room
 * themselves, so they work here even though this session is an OpenAI
 * Realtime WebRTC connection with no LiveKit room in the tree. This just maps
 * our own connection status/activity onto that same state vocabulary.
 */
function toAgentVisualizerState(
  status: CanvasRealtimeStatus,
  activity: RealtimeActivity | null,
): AgentState {
  if (status === "connecting") return "connecting";
  if (status === "error") return "failed";
  if (status === "idle") return "disconnected";

  // status is "connected" or "paused" here.
  if (!activity) return "idle";

  switch (activity.kind) {
    case "listening":
      return "listening";
    case "generating":
    case "navigating":
      return "thinking";
    case "explaining":
    case "walkthrough":
      return "speaking";
  }
}

function activityVerb(
  kind: NonNullable<
    ReturnType<typeof useCanvasRealtimeSession>["activity"]
  >["kind"],
) {
  switch (kind) {
    case "listening":
      return "Listening";
    case "navigating":
      return "Showing";
    case "explaining":
      return "Explaining";
    case "generating":
      return "Creating";
    case "walkthrough":
      return "Walkthrough";
  }
}

function resolveNavigationIndex(
  action: CanvasRealtimeAction,
  frames: ReturnType<typeof getCanvasPresentationFrames>,
  activeIndex: number,
) {
  if (action.action === "next")
    return Math.min(activeIndex + 1, frames.length - 1);
  if (action.action === "previous") return Math.max(activeIndex - 1, 0);
  if (action.action === "first") return 0;
  if (action.action === "last") return Math.max(frames.length - 1, 0);
  if (action.action === "goto" && action.frame_number) {
    return Math.min(Math.max(action.frame_number - 1, 0), frames.length - 1);
  }
  if (action.action === "find" && action.query) {
    const words = action.query.toLowerCase().split(/\s+/).filter(Boolean);
    const match = frames
      .map((frame) => ({
        frame,
        score: words.filter((word) => frame.searchText.includes(word)).length,
      }))
      .sort((left, right) => right.score - left.score)[0];
    return match?.score ? match.frame.index : activeIndex;
  }
  return null;
}

function toCanvasAction(action: CanvasRealtimeAction): CanvasAiAction | null {
  if (action.action === "add_array") {
    return {
      action: "add_array_block",
      title: action.title,
      values: action.values,
    };
  }
  if (action.action === "set_array") {
    return { action: "set_array_values", values: action.values ?? [] };
  }
  if (action.action === "resize_array") {
    return { action: "resize_array", length: action.length ?? 4 };
  }
  if (action.action === "highlight_array_index") {
    return { action: "highlight_array_index", index: action.index };
  }
  if (action.action === "clear_array_highlight") {
    return { action: "highlight_array_index" };
  }
  if (action.action === "append_array_value") {
    return { action: "append_array_value", value: action.value };
  }
  if (action.action === "pop_array_value") {
    return { action: "pop_array_value" };
  }
  if (action.action === "duplicate_array") {
    return {
      action: "duplicate_array_block",
      title: action.title,
      appendValue: action.value,
    };
  }
  if (action.action === "push_stack") {
    return { action: "push_stack_value", value: action.value };
  }
  if (action.action === "pop_stack") {
    return { action: "pop_stack_value" };
  }
  return null;
}
