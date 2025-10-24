# Replit Project Specification — Guided Topics Chat (LangGraph + React)

This document defines a complete specification for a Replit project that builds a guided chatbot application using **LangChainJS**, **LangGraphJS**, and **React** with a **glassmorphic interface**.

---

## 1. Purpose

The goal is to create an interactive chat experience that guides a user through a configurable set of topics. The left two-thirds of the UI hosts the chat window, while the right third shows a list of topics with completion states. When all topics are complete, the collected data is exported to a Word document for download.

---

## 2. Architecture Overview

**Frontend:** React + Vite + TypeScript  
**Backend:** Node.js (Express, TypeScript)  
**AI Orchestration:** LangChainJS + LangGraphJS  
**Styling:** Glassmorphic theme (Tailwind or CSS Modules)  
**Export:** DOCX via `docx` npm package  

### Core Behaviour
1. Chat starts with a greeting and first topic.  
2. User responds; AI guides them through prompts.  
3. Topic completion turns green on the sidebar.  
4. User can revisit completed topics but cannot skip ahead.  
5. When all topics are complete, a Word document is generated.  

---

## 3. Folder Structure

```
.
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ .env.example
├─ /src
│  ├─ /client
│  │  ├─ App.tsx
│  │  ├─ ChatWindow.tsx
│  │  ├─ TopicSidebar.tsx
│  │  ├─ /styles
│  │  │  ├─ glass.css
│  ├─ /server
│  │  ├─ index.ts
│  │  ├─ /graph
│  │  ├─ /config
│  │  ├─ docx.ts
│  │  ├─ llm.ts
│  │  ├─ routes.ts
```

---

## 4. Configuration Schema

`app.config.json`
```json
{
  "appTitle": "Guided Topics Chat",
  "greeting": "G’day. I’ll guide you through a short set of topics.",
  "topics": [
    {
      "id": "t1",
      "title": "About You",
      "systemPrompt": "Collect profile details.",
      "userIntro": "What is your full name, role, and city?",
      "fields": [
        { "key": "fullName", "label": "Full name", "required": true },
        { "key": "role", "label": "Role", "required": true }
      ],
      "completionRule": "all_required_fields_present"
    }
  ],
  "docx": {
    "title": "Session Summary",
    "fileName": "session-summary.docx"
  }
}
```

---

## 5. Backend APIs

| Endpoint | Method | Description |
|-----------|--------|--------------|
| `/api/chat` | POST | Sends a user message and updates session state |
| `/api/session/:id` | GET | Returns current session data |
| `/api/navigate` | POST | Moves to a completed topic |
| `/api/docx` | POST | Generates and returns DOCX file |

---

## 6. LangGraph Model

- Each topic is a **node** with a system prompt and fields.
- The graph tracks completion state, active topic, and user input.
- Example types:
```ts
type TopicState = {
  activeTopicId: string;
  topics: Record<string, {
    transcript: { role: 'user'|'assistant', text: string }[];
    fields: Record<string, string>;
    status: 'NotStarted'|'InProgress'|'Complete';
  }>;
  done: boolean;
};
```

---

## 7. Frontend Behaviour

- Sidebar (right 1/3) shows topics with badges (grey, blue, green).
- Chat window (left 2/3) contains conversation bubbles.
- Completed topics are clickable; future ones are locked.
- When done, user can download DOCX.

### Glassmorphism Example
```css
.glass {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(18px) saturate(130%);
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
```

---

## 8. Example Sidebar Component

```tsx
export function TopicSidebar({ topics, onRevisit }) {
  return (
    <aside className="glass">
      <h3>Topics</h3>
      <ul>
        {topics.map(t => (
          <li key={t.id}>
            <button
              disabled={t.status !== 'Complete'}
              onClick={() => t.status === 'Complete' && onRevisit(t.id)}
            >
              {t.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

---

## 9. DOCX Export

- Uses `docx` package to build a styled Word document.
- Sections map to topic titles and captured fields.
- Served as an attachment on `/api/docx`.

---

## 10. Example Dependencies

```json
{
  "dependencies": {
    "express": "^4.19.2",
    "langchain": "^0.2.0",
    "@langchain/langgraph": "^0.0.24",
    "docx": "^8.5.0",
    "openai": "^4.58.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

---

## 11. Acceptance Criteria

- Topics auto-progress in order.
- Sidebar reflects correct completion states.
- Revisit works only for completed topics.
- Exported DOCX contains all field data.
- Config file updates without code changes.

---

## 12. Optional Enhancements

- Persist sessions in SQLite or file-based KV.
- Add per-topic summaries.
- Support light/dark glass themes.
- Add AI model selection in config.
