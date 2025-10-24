# Guided Topics Chat

An interactive chatbot application that guides users through configurable topics and exports collected data to a Word document. Built with LangChain, LangGraph, React, and a glassmorphic UI.

## Features

- 🤖 AI-powered conversation flow using LangChain and LangGraph
- 📊 Topic-based progression with automatic field extraction
- 🎨 Beautiful glassmorphic interface
- 📄 Export session data to Word document (DOCX)
- 🔄 Navigate back to completed topics
- ⚙️ Fully configurable via `app.config.json`

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and add your OpenAI API key:
```bash
cp .env.example .env
```

Then edit `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
VITE_API_URL=http://localhost:3000
```

3. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3000
- Frontend dev server on http://localhost:5173

## Configuration

Edit `app.config.json` to customize:
- App title and greeting message
- Topics and their prompts
- Fields to extract for each topic
- Document export settings

Example topic configuration:
```json
{
  "id": "t1",
  "title": "About You",
  "systemPrompt": "Collect the user's full name, role, and city.",
  "userIntro": "Let's start with some basics about you.",
  "fields": [
    { "key": "fullName", "label": "Full name", "required": true },
    { "key": "role", "label": "Role/Title", "required": true }
  ],
  "completionRule": "all_required_fields_present"
}
```

## Project Structure

```
.
├── app.config.json          # Topic configuration
├── src/
│   ├── client/              # React frontend
│   │   ├── App.tsx          # Main app component
│   │   ├── ChatWindow.tsx   # Chat interface
│   │   ├── TopicSidebar.tsx # Topic navigation
│   │   └── styles/          # Glassmorphic CSS
│   └── server/              # Express backend
│       ├── index.ts         # Server entry point
│       ├── routes.ts        # API endpoints
│       ├── llm.ts           # LangChain LLM setup
│       ├── docx.ts          # Document generation
│       └── graph/           # LangGraph orchestration
│           ├── topicGraph.ts       # State machine
│           ├── fieldExtractor.ts  # Field extraction
│           └── stateManager.ts    # Session management
```

## API Endpoints

- `POST /api/chat` - Send message and get AI response
- `GET /api/session/:id` - Get current session state
- `POST /api/navigate` - Navigate to completed topic
- `POST /api/docx` - Download session summary
- `GET /api/config` - Get app configuration

## Building for Production

```bash
npm run build
npm start
```

## License

MIT
