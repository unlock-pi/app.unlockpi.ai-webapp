1. The app is a Next.js App Router client that serves as the visual and audio surface for the tutor agent.
2. Global layout in `src/app/layout.tsx` loads fonts, global CSS, and `streamdown/styles.css`.
3. The root layout wraps all pages with `TooltipProvider` so shared UI primitives behave consistently.
4. The home route (`src/app/page.tsx`) is a branded landing experience and routes users to `/dashboard/talk`.
5. Authentication state is enforced in `src/app/dashboard/layout.tsx` using Appwrite `account.get()`.
6. Unauthenticated users are redirected to `/login`, and a loading state guards protected dashboard routes.
7. Appwrite client wiring lives in `src/app/appwrite.ts` with endpoint and project initialization.
8. LiveKit access is issued by `src/app/api/token/route.ts` through signed room JWT creation.
9. The same token route dispatches the voice agent (`UnlockPi`) into the requested room.
10. Dispatch uses `AgentDispatchClient`, so frontend joins and server agent orchestration stay coupled.
11. The `classroom` page is the legacy rich layout with content board, seating matrix, and transcript panel.
12. It fetches a token for room `classroom-101` with identity `teacher-interface`.
13. `LiveKitRoom` handles transport while `RoomAudioRenderer` plays synthesized agent audio.
14. `StartAudio` gates browser autoplay restrictions and lets users explicitly enable sound.
15. Classroom UI registers RPC handlers through `useRpcHandler`, the reusable LiveKit RPC hook.
16. `highlight_text` RPC updates client-side word highlight state for rendered lesson content.
17. `update_content` RPC replaces current lesson text and clears old highlight decorations.
18. `show_student_focus` RPC drives transient emphasis in the seating matrix visualization.
19. Cognitive-test RPCs (`start_cognitive_test`, `reveal_answer`, `update_scores`) switch interaction mode.
20. Cognitive mode renders `CognitiveBoard`, including answer flip cards and team score footer.
21. Non-cognitive mode renders `ContentPanel`, which applies style rules to matched highlight words.
22. The modern voice-first experience is implemented in `/dashboard/talk`.
23. `useConnection` handles connect/disconnect state and token fetch lifecycle for talk mode.
24. `TalkRoomContent` combines LiveKit assistant state, board RPC state, and transcript aggregation.
25. `useVoiceAssistant` provides assistant state machine values like listening, thinking, and speaking.
26. `useAudioAnalyzer` transforms microphone or agent tracks into bar levels for animated visual feedback.
27. `TalkVisualizer` maps assistant state into branded matrix motion, labels, and top status controls.
28. `TalkBoardStage` chooses between markdown board and structured document board renderers.
29. Legacy markdown board rendering uses `BoardPanel` with `react-markdown`, KaTeX, and media helpers.
30. Structured board rendering uses `BoardDocumentPanel` and typed block renderers.
31. Core board schema lives in `src/types/board.ts` with block unions and operation contracts.
32. Client reducer logic in `src/lib/board-engine.ts` applies operations as pure immutable transforms.
33. `createEmptyBoard()` seeds deterministic initial state for consistent hydration and reset flows.
34. `useBoardState` wraps reducer state and exposes a stable dispatch API for RPC handlers.
35. `useBoardRPC` bridges agent RPC messages into both legacy markdown and structured board systems.
36. `set_board` RPC replaces the full board document and clears legacy markdown state.
37. `board_operation` RPC applies incremental edits like line update, insert, delete, and highlight.
38. `clear_board` RPC resets both board models so users never see stale content.
39. Transcript logic in `use-transcript` merges finalized agent and user speech segments.
40. Live partial speech is exposed separately so UI can show in-progress utterances.
41. Transcript entries carry sender tags and unique IDs for deterministic animated list rendering.
42. `useRpcHandler` registers methods once per participant and uses refs to avoid re-register churn.
43. Incoming RPC payloads are parsed as JSON when possible, with safe fallback to raw strings.
44. The hook also unregisters methods on unmount to prevent duplicate callbacks across remounts.
45. `next.config.ts` enables MD and MDX pages and relaxes image host constraints for rich board content.
46. Custom headers currently set a broad image CSP to permit external classroom media.
47. Styling follows tokenized CSS variables and dark classroom aesthetics across pages and components.
48. Audio, transcript, board, and agent-state channels remain decoupled but synchronized through LiveKit.
49. Frontend therefore acts as a reactive control surface while Python agent remains orchestration authority.
50. Net effect: a real-time voice classroom UI that renders agent intent as speech, board edits, and feedback.
