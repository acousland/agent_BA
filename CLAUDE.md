# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a guided chatbot application that walks users through configurable topics and exports collected data to a Word document. The application uses:

- **Frontend**: React + Vite + TypeScript with glassmorphic UI
- **Backend**: Node.js + Express + TypeScript
- **AI Orchestration**: LangChainJS + LangGraphJS
- **Export**: DOCX generation via `docx` package

## Architecture

### High-Level Flow
1. Chat interface guides users through ordered topics defined in `app.config.json`
2. LangGraph orchestrates topic progression and tracks completion state
3. Each topic is a node in the graph with its own system prompt and required fields
4. Topic completion logic validates that all required fields are collected
5. Users can revisit completed topics but cannot skip ahead
6. When all topics complete, a Word document is generated with collected data

### State Management
The LangGraph state (`TopicState`) tracks:
- `activeTopicId`: Current topic being discussed
- `topics`: Map of topic IDs to their transcripts, extracted fields, and status
- `done`: Boolean indicating all topics are complete

Status values: `NotStarted`, `InProgress`, `Complete`

### UI Layout
- Left 2/3: Chat window with conversation bubbles
- Right 1/3: Topic sidebar showing completion badges (grey=not started, blue=in progress, green=complete)
- Glassmorphic styling with `backdrop-filter: blur(18px)` and semi-transparent backgrounds

## Key Files (When Implemented)

- `app.config.json`: Defines topics, prompts, fields, and completion rules
- `src/server/graph/`: LangGraph node definitions and state management
- `src/server/llm.ts`: LangChain LLM configuration and topic prompt handling
- `src/server/docx.ts`: Word document generation from collected session data
- `src/client/ChatWindow.tsx`: Main chat interface component
- `src/client/TopicSidebar.tsx`: Topic list with navigation and status indicators

## Development Commands

### Setup
```bash
npm install
```

### Development
```bash
npm run dev          # Start both frontend and backend in dev mode
npm run dev:client   # Start only Vite frontend (port 5173)
npm run dev:server   # Start only Express backend (port 3000)
```

### Testing
```bash
npm test            # Run all tests
npm test -- <file>  # Run specific test file
```

### Build
```bash
npm run build       # Build both frontend and backend
npm run build:client # Build only frontend
npm run build:server # Build only backend
```

### Type Checking
```bash
npm run typecheck   # Check TypeScript types without building
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Process user message, update graph state, return AI response |
| `/api/session/:id` | GET | Retrieve current session state and topic progress |
| `/api/navigate` | POST | Navigate to a completed topic (revisit) |
| `/api/docx` | POST | Generate and download Word document with all collected data |

## Configuration

### Multiple Conversation Types

The application supports multiple conversation configurations stored in the `configs/` directory. Users can switch between different conversation types using a dropdown at the top of the UI.

Default configurations:
- `configs/professional-profile.json` - Professional background intake
- `configs/customer-feedback.json` - Product feedback collection
- `configs/medical-intake.json` - Medical intake form

### Configuration Structure

Each config file in `configs/` has this structure:
- `id`: Unique topic identifier
- `title`: Display name in sidebar
- `systemPrompt`: Instructions for LLM when handling this topic
- `userIntro`: Initial message shown to user when topic starts
- `fields`: Array of data to extract (with `key`, `label`, `required`)
- `completionRule`: Logic determining when topic is complete (e.g., `all_required_fields_present`)

## LangGraph Implementation Notes

- Each topic should be implemented as a separate node in the graph
- Node functions receive current state and return updated state with new messages/field values
- Use conditional edges to enforce topic ordering (only progress when current topic complete)
- Field extraction should use LLM structured output or tool calling to populate topic fields
- The graph should maintain immutability - return new state objects rather than mutating

## Environment Variables

Create `.env` from `.env.example`:
```
OPENAI_API_KEY=your_key_here
PORT=3000
VITE_API_URL=http://localhost:3000
```
