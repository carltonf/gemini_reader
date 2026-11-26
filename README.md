# Gemini CLI Reader

A modern, fast, and local Single Page Application (SPA) designed for exploring, searching, inspecting, and exporting chat sessions and tool execution logs produced by the Gemini CLI.

---

## 1. Technology Stack

* **Framework:** [Svelte 5](https://svelte.dev/) — Reactive, compiler-driven framework with zero virtual DOM overhead, ideal for lightweight, high-performance local SPAs.
* **Build Tool:** [Vite 8](https://vite.dev/) — Lightning-fast development server with Hot Module Replacement (HMR) and optimized Rollup/ESBuild production bundling.
* **Type System:** [TypeScript](https://www.typescriptlang.org/) — Strict type checking for sessions, conversation turns, tool calls, and handles.
* **Styling:** [Tailwind CSS v3](https://tailwindcss.com/) with `@tailwindcss/typography` — Compiled via PostCSS into an optimized CSS bundle, replacing runtime CDN scripts.
* **Markdown & Syntax Highlighting:** [Marked](https://marked.js.org/) + [Highlight.js](https://highlightjs.org/) (Atom One Dark theme with unselectable line numbers, code copy buttons, and overflow wrap).
* **Icons:** [Phosphor Icons](https://phosphoricons.com/) (`@phosphor-icons/web`).
* **Storage:** Browser **IndexedDB** for persistent directory handles and `localStorage` for user preferences and folder history.

---

## 2. Directory Structure

```text
gemini_reader/
├── index.html                   # HTML entry point mounting Svelte onto #app
├── package.json                 # Project scripts and dependencies
├── vite.config.ts               # Vite configuration with Svelte and singlefile plugins
├── svelte.config.js             # Svelte compiler configuration
├── tailwind.config.js           # Tailwind palette, dark mode class, typography plugin
├── postcss.config.js            # PostCSS configuration
├── tsconfig.json                # TypeScript project references
├── tsconfig.app.json            # Application TypeScript configuration (strict mode)
├── tsconfig.node.json           # Vite / config TypeScript configuration
├── .gitignore                   # Ignore node_modules/, dist/, and local artifacts
├── README.md                    # Architecture documentation
└── src/
    ├── main.ts                  # Application bootstrap (mounts App.svelte)
    ├── app.css                  # Tailwind directives, fonts, code block styles, scrollbars
    ├── App.svelte               # Root component (switches between Landing and Chat workspace)
    └── lib/
        ├── types.ts             # Shared TypeScript interfaces (ChatSession, ConversationTurn, etc.)
        ├── stores/              # Svelte reactive stores (Central state management)
        │   ├── chatStore.ts     # Sessions, active chat, favorites, filtered search results
        │   ├── folderStore.ts   # Directory handles, recent folders, background polling
        │   ├── uiStore.ts       # Theme, zoom, sidebar state, active filters, TTS speed
        │   └── toastStore.ts    # Notification toast queue
        ├── utils/               # Pure utility functions and logic
        │   ├── parser.ts        # JSON and JSONL event stream parsing ($set, $patch, $rewindTo)
        │   ├── fileSystem.ts    # File System Access API & IndexedDB handle persistence
        │   ├── formatters.ts    # Date/time formatting, text sanitization, line numbering
        │   ├── markdown.ts      # Marked renderer configuration with Highlight.js
        │   └── export.ts        # Markdown, HTML, print, and standalone tab viewers
        └── components/          # Modular Svelte components
            ├── layout/
            │   ├── LandingScreen.svelte # Directory & file pickers, recent folders list
            │   ├── Sidebar.svelte       # Chat list, search input, favorites, project filter
            │   ├── Header.svelte        # Title, model badge, zoom, TTS, export menu, theme
            │   └── StatsModal.svelte    # Workspace analytics, tokens, models, project breakdown
            ├── chat/
            │   ├── ChatContainer.svelte # Scrollable conversation feed
            │   ├── MessageBubble.svelte # User prompt bubble with TTS and copy
            │   ├── AssistantBubble.svelte # Markdown response with code highlighting and copy
            │   └── TurnDetails.svelte   # Expandable accordion for Context, Files, Tools, Thoughts
            └── ui/
                └── ToastContainer.svelte # Floating alert bubbles
```

---

## 3. Architecture & State Management

The application replaces monolithic global variables with reactive **Svelte Stores** located in `src/lib/stores/`:

### 3.1 `chatStore.ts`
* `allChats`: Writable store containing all parsed sessions, sorted by date (newest first).
* `currentChatId`: ID of the currently selected conversation.
* `currentChat`: Derived store resolving the active `ChatSession` object.
* `favorites`: Persistent `Set<string>` of favorited session IDs stored in `localStorage`.
* `filteredChats`: Reactive derived store that dynamically computes the visible chat list based on search queries, favorites tab, or active project filters.

### 3.2 `folderStore.ts`
* `dirHandle`: Active `FileSystemDirectoryHandle` obtained from `window.showDirectoryPicker()`.
* `recentFolders`: Remembers recently opened directories. Persists handles in **IndexedDB** (`gemini_reader_db`) so folders can be reopened in future sessions without picking them again.
* **Path Disambiguation**: Tracks both `actualPath` (the folder opened locally) and `originalPath` (detected from remote hosts when history folders are transferred). Displays the actual opened folder prominently, with the original path shown underneath in smaller text (`orig: ...`).
* `scanDirectory()` / `ingestFileList()`: Recursively discovers `.jsonl` and `.json` session files, parsing them asynchronously.
* `startPolling()`: Automatically polls the active directory every 10 seconds to detect newly written sessions or background updates.

### 3.3 `uiStore.ts`
* `theme`: Supports `'dark'` and `'light'` mode, initializing from `localStorage` or system preferences (`prefers-color-scheme`).
* `zoom`: Chat zoom scaling (0.7x to 1.8x) bound to CSS custom property `--chat-zoom`.
* `sidebarCollapsed`: Controls sidebar visibility (collapsible on desktop, off-canvas drawer on mobile).
* `allDetailsExpanded`: Global toggle to expand or collapse all tool call outputs, system contexts, and agent thoughts across all message turns.
* `ttsSpeed`: Speed multiplier for the Web Speech API Text-to-Speech reader.

### 3.4 `toastStore.ts`
* Queue-based notification manager providing non-intrusive feedback for actions like folder opening, handle permissions, export, and errors.

---

## 4. Key Utilities

* **`parser.ts`**:
  * Supports both legacy single-object JSON files and modern Gemini CLI streaming **JSON Lines (JSONL)** logs.
  * Handles event-stream operations: `$set`, `$patch` (atomic updates), `$rewindTo` (rewinding turns), and message removal.
  * `buildConversationTurns()` groups user prompts, agent thoughts, tool executions, and assistant responses into structured, turn-based conversation cards.
* **`fileSystem.ts`**:
  * Safe IndexedDB transaction wrappers (`saveHandleToDb`, `getHandleFromDb`, `removeHandleFromDb`).
  * `detectGeminiRootPath()` extracts the original environment path from session initialization transcripts.
  * `detectActualFolderPath()` resolves the native filesystem path or directory name.
* **`markdown.ts`**:
  * Configures `marked` with syntax highlighting via `highlight.js`.
  * Generates code blocks with header language tags, unselectable line numbers, and embedded "Copy" buttons.
* **`export.ts`**:
  * Markdown (`.md`) export including full prompt details, tool outputs, and assistant responses.
  * Portable standalone HTML (`.html`) export.
  * Standalone Tab inspector: renders system contexts and tool execution histories in a dedicated browser tab.

---

## 5. Development & Build Commands

All development and build tasks are managed via `npm`:

```bash
# Install dependencies
npm install

# Start local development server with Hot Module Replacement (HMR)
npm run dev

# Run strict TypeScript and Svelte validation
npm run check

# Build optimized production assets (outputs to dist/)
npm run build

# Build a self-contained, single-file HTML distribution
npm run build:singlefile

# Preview the production build locally
npm run preview
```

---

## 6. Single-File vs. Multi-Asset Distribution

* **Standard Build (`npm run build`)**: Outputs `dist/index.html` referencing split JavaScript, CSS, and font chunks for optimal browser caching.
* **Single-File Build (`npm run build:singlefile`)**: Utilizes `vite-plugin-singlefile` to bundle all JavaScript, CSS, and SVG icons directly into a single, portable `dist/index.html` file that can be opened locally via `file://` without running a web server.
