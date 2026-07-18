# Changelog

## [Unreleased]

### Added
- **Custom 404 & error pages** — `/not-found.tsx` and `/error.tsx` with branded design
- **Standalone OpenAI Realtime SDK module** (`src/lib/openai-realtime/`) — framework-agnostic WebRTC client for voice tutoring, extractable as a standalone package
- **Voice-driven onboarding flow** — interactive step-by-step setup with AI voice guide using Realtime API's `select_option` tool
- **Avatar upload** — UploadThing integration in settings with instant sidebar & profile updates
- **Settings page overhaul** — removed non-functional controls; added avatar upload, name editing, dark mode toggle
- **Canvas presenter chrome redesign** — replaced hardcoded colors/gradients with coss design tokens (semantic colors, proper buttons, theme-aware styling)
- **Start class dialog redesign** — compact visual mode cards (Voice Director / AI Companion) with info popovers for descriptions

### Fixed
- **Canvas grid layout regression** — panel visibility now uses opacity instead of conditional mounting, preventing main stage from shifting into empty grid tracks
- **Realtime silent-failure risk** — `/api/token` now surfaces agent dispatch failures; client shows amber warning banner when AI tutor can't join
- **UploadThing stuck "Uploading..." state** — `awaitServerData: false` prevents infinite wait on localhost callback; avatar saves immediately after file upload
- **Sidebar avatar display** — avatar URL from user metadata now renders in sidebar user card & popup menu (falls back to initial letter)
- **Realtime API timeouts** — added 15s timeout & try/catch to OpenAI client_secrets endpoint calls (canvas, arrays, onboarding routes)

### Changed
- **Animation refinements** — grid card stagger, tab crossfade, button press feedback, panel enter/exit all verified against motion-performance rules
- **Settings page controls** — replaced Profile notes / Session Defaults / Reset preferences placeholders with real, working features
- **Onboarding** — moved from stub route to fully interactive flow; logic kept separate (modular, reusable SDK pattern)

### Technical Details
- Motion.dev animations use compositor-safe properties (opacity, scale, transform) only
- Canvas grid tracks always present (0px when hidden) to maintain stable column layout
- Avatar stored in Supabase user_metadata.avatar_url; sidebar fetched server-side, updates via router.refresh()
- Realtime client measures once per connection, no continuous polling or scroll-linked animation
- Onboarding tool call handler is synchronous (event returns immediately) for realtime interaction loop
