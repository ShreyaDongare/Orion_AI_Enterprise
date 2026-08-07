# OrionAI Enterprise - Frontend Integration Guide

This document serves as the official, comprehensive specification for building the OrionAI Enterprise frontend. It details the backend architecture, complete database schema, REST API documentation, AI agent workflows, and frontend development recommendations.

---

## 1. Project Overview

### Purpose of the application
OrionAI Enterprise is an AI-powered business productivity ecosystem. It unifies multiple specialized AI agents (research, reporting, data analysis, presentations, email automation, and executive assistance) behind a single conversational, agent-orchestrated system. 

### Features
- Centralized multi-agent orchestration.
- Document parsing and Retrieval-Augmented Generation (RAG).
- Multi-modal file ingestion (PDF, CSV, Word, Excel).
- Automated reporting and presentation generation.
- Secure Role-Based Access Control (RBAC).

### User flow
1. User logs in/registers.
2. User selects or creates a Project, then starts a Conversation.
3. User interacts via a chat interface, uploading files or providing text prompts.
4. The system automatically classifies the intent and routes the request to a specialized AI agent.
5. The agent processes the input (optionally running background jobs) and returns a response, which may include downloadable artifacts.

### High-level architecture
The backend is a Flask RESTful API using PostgreSQL for relational data, ChromaDB for vector storage, and an asynchronous task execution model utilizing Python's `concurrent.futures`. The LLM layer leverages LangChain to communicate with Google Gemini via a round-robin, multi-key manager.

### AI Agent overview
The system relies on an **Intent Classifier** to route messages to one of the following agents:
- **Research**: Web search and competitor analysis.
- **Report**: Markdown/PDF report generation.
- **Data Analysis**: CSV/Excel statistical analysis.
- **Presentation**: Slide generation.
- **Email**: Professional email drafting.
- **Executive**: Task planning and briefings.
- **Knowledge**: RAG-based document Q&A.
- **Chat**: General conversational AI.

---

## 2. Backend Architecture

### Folder structure
```
backend/
├── app/
│   ├── agents/         # LangChain agents (Research, Report, etc.)
│   ├── controllers/    # API request handling
│   ├── llm_manager/    # Gemini API key rotation and retry logic
│   ├── middleware/     # Auth and error handling
│   ├── models/         # SQLAlchemy ORM definitions
│   ├── prompts/        # System prompts for agents
│   ├── rag/            # ChromaDB ingestion and retrieval
│   ├── repositories/   # DB query abstractions
│   ├── routes/         # Flask-Smorest blueprints (API endpoints)
│   ├── schemas/        # Request/Response validation (Marshmallow)
│   ├── tools/          # LangChain custom tools (Search, Data Analysis)
│   └── utils/          # Helpers (File Parsing, Background Tasks, Email)
├── storage/            # Local file storage
├── tests/              # Pytest suites
└── scripts/            # Setup and migration scripts
```

### Core modules
- **`llm_manager`**: Abstracts Gemini keys, ensuring zero downtime via round-robin rotation.
- **`workflow_orchestrator`**: The central brain that receives a message, runs the Intent Classifier, and delegates to a specific agent.

### Services
- **Auth Service**: JWT token generation and validation.
- **Chat Service**: Manages conversation history in DB.
- **Storage Service**: Handles file saving and byte management.

### AI orchestration
Uses LangChain `AgentExecutor` and custom `PromptTemplates`. Tools are bound to agents (e.g., `web_search` for ResearchAgent, `analyze_csv_data` for DataAnalysisAgent).

### RAG pipeline
Files are processed by `InputNormalizer`, chunked via `RecursiveCharacterTextSplitter`, embedded using `models/embedding-001`, and stored in ChromaDB. 

### Authentication flow
Uses `Flask-JWT-Extended` for secure access and refresh tokens.

---

## 3. Complete Database Schema

### Table: `users`
- **Columns**: `id` (UUID, PK), `email` (String, Unique), `password_hash` (String), `first_name` (String), `last_name` (String), `is_active` (Boolean), `created_at` (DateTime), `updated_at` (DateTime).
- **Relationships**: One-to-Many to `sessions`, `refresh_tokens`, `projects`, `user_roles`.
- **Example**: `{"id": "123e4567-e89b-12d3-a456-426614174000", "email": "test@example.com", "first_name": "Test"}`

### Table: `roles`
- **Columns**: `id` (Integer, PK), `name` (String, Unique), `description` (String).
- **Relationships**: One-to-Many to `user_roles`.

### Table: `user_roles`
- **Columns**: `user_id` (UUID, FK), `role_id` (Integer, FK), `assigned_at` (DateTime).

### Table: `projects`
- **Columns**: `id` (UUID, PK), `name` (String), `description` (Text), `owner_id` (UUID, FK to users), `created_at`, `updated_at`.
- **Relationships**: One-to-Many to `conversations`.

### Table: `conversations`
- **Columns**: `id` (UUID, PK), `project_id` (UUID, FK), `title` (String), `created_at`, `updated_at`.
- **Relationships**: One-to-Many to `messages`.

### Table: `messages`
- **Columns**: `id` (UUID, PK), `conversation_id` (UUID, FK), `role` (String: 'user', 'assistant'), `content` (Text), `agent_type` (String), `created_at` (DateTime).
- **Relationships**: One-to-Many to `input_artifacts`.

### Table: `input_artifacts`
- **Columns**: `id` (UUID, PK), `message_id` (UUID, FK), `artifact_type` (String: 'text', 'pdf', 'csv', etc.), `raw_storage_ref` (String), `extracted_text` (Text), `metadata_json` (JSON), `created_at`.

### Table: `knowledge_collections`
- **Columns**: `id` (UUID, PK), `name` (String), `description` (Text), `owner_id` (UUID, FK).

### Table: `documents`
- **Columns**: `id` (UUID, PK), `collection_id` (UUID, FK), `title` (String), `file_type` (String), `tags` (JSON).

### Table: `document_versions`
- **Columns**: `id` (UUID, PK), `document_id` (UUID, FK), `version_number` (Integer), `storage_path` (String), `chroma_collection_id` (String).

---

## 4. Complete REST API Documentation

### POST `/api/v1/auth/register`
- **Description**: Registers a new user.
- **Auth**: None
- **Request Body**: `{"email": "user@example.com", "password": "securepassword123", "first_name": "John", "last_name": "Doe"}`
- **Response (201)**: `{"access_token": "eyJ...", "refresh_token": "eyJ..."}`
- **Error (400)**: `{"error": "User already exists."}`

### POST `/api/v1/auth/login`
- **Description**: Authenticates a user.
- **Auth**: None
- **Request Body**: `{"email": "user@example.com", "password": "securepassword123"}`
- **Response (200)**: `{"access_token": "eyJ...", "refresh_token": "eyJ..."}`
- **Error (401)**: `{"error": "Invalid email or password."}`

### POST `/api/v1/chat/message`
- **Description**: Submits a message to the AI system.
- **Auth**: Bearer JWT (Note: Currently disabled for local testing, will be enabled in production).
- **Request Body**: `{"conversation_id": "uuid", "message": "Analyze this data."}`
- **Response (200)**: `{"response": "The average is 42.", "agent_used": "data_analysis"}`
- **Error (404)**: `{"error": "Conversation not found"}`
- **Error (500)**: `{"error": "Internal server error processing chat"}`

*(Additional endpoints for Projects, Dashboard, RAG Uploads will follow a standard CRUD pattern under `/api/v1/projects`, `/api/v1/knowledge`, etc., returning JSON standard responses.)*

---

## 5. Authentication Flow

- **Registration**: Client sends credentials -> DB creates User with hashed password -> Returns JWT.
- **Login**: Verifies hash -> Returns `access_token` (short lived) and `refresh_token` (long lived).
- **JWT Tokens**: Sent via `Authorization: Bearer <token>` header.
- **Refresh Tokens**: When `access_token` expires, frontend hits `/api/v1/auth/refresh` (to be implemented on backend) with the refresh token to get a new access token.
- **Storage**: Frontend should store `access_token` in memory/React state, and `refresh_token` in an HTTP-only secure cookie (recommended) or localStorage.
- **RBAC**: Handled via backend middleware checking `role` claims in the JWT payload.

---

## 6. File Upload APIs

- **Supported Types**: `.pdf`, `.docx`, `.xlsx`, `.csv`, `.txt`, `.png`/`.jpg` (via future OCR).
- **Processing Flow**: Frontend uploads file as `multipart/form-data` -> Backend `InputNormalizer` sniffs MIME, extracts text -> Saves to `storage/` -> Creates `InputArtifact` -> Appends context to LLM Prompt.
- **Endpoints**: File uploads will be attached to the `/api/v1/chat/message` endpoint via multipart form data, or via a dedicated `/api/v1/upload` endpoint returning a file ID to pass in the chat JSON.

---

## 7. AI Agents

- **Research Agent**: 
  - Input: Search queries. Output: Web summaries. UI: Standard chat bubble, potentially with markdown links for citations.
- **Data Analysis Agent**:
  - Input: CSV data/Text query. Output: Statistical summary. UI: Chat bubble with rendered markdown tables.
- **Report & Presentation Agents**:
  - Output: Long-form text. Expected UI: Chat bubble containing a "Download Report" button or rendered markdown view.
- **Knowledge Agent**:
  - Input: Questions about documents. Output: RAG-based answers. UI: Must support displaying citations.

---

## 8. Chat APIs

- **Conversation Flow**: User selects a project -> creates conversation (UUID) -> POSTs messages to `/api/v1/chat/message`.
- **Message Schema**: `{"role": "user|assistant", "content": "text", "agent_type": "research|chat|..."}`
- **Conversation Memory**: Handled entirely by the backend `ConversationMemory` class. Frontend just needs to fetch history on load.
- **Streaming**: Currently synchronous REST. For streaming, the frontend would need Server-Sent Events (SSE) or WebSockets implemented on the backend.

---

## 9. RAG APIs

- **Knowledge Upload**: Dedicated UI to upload PDFs to a `KnowledgeCollection`.
- **Document Retrieval**: Backend chunks and embeds automatically via ChromaDB.
- **Citations**: The `RAGRetriever` appends "Source: filename" to the LLM context. The frontend should parse the LLM output for these citations to display tooltips.

---

## 10. Dashboard APIs

- **Analytics**: Read-only endpoints fetching counts of generated reports, active projects, and LLM token usage from the `analytics` and `llm_key_usage` tables.
- **Frontend UI**: Display as KPI cards and simple charts (e.g., using Recharts).

---

## 11. Generated Files

- **Download URLs**: The backend saves artifacts to local storage (`storage/local.py`) and will serve them via a `/api/v1/download/<file_id>` endpoint.
- **Background Jobs**: For heavy reports, the backend uses `concurrent.futures`. The frontend should implement a polling mechanism or handle a "pending" status if the API takes longer than standard timeout.

---

## 12. Frontend State Management Guide

- **Authentication State**: Zustand or Context API. Store user details and auth status.
- **Chat State**: Zustand. Maintain current conversation ID, message array, and `isTyping` / `isLoading` boolean.
- **Server State**: React Query (TanStack Query) for fetching projects, history, and knowledge collections.

---

## 13. Frontend Folder Structure Recommendation

```
src/
├── agents/       # Agent-specific UI components (e.g. DataAnalysisTable.jsx)
├── api/          # Axios instances and endpoint definitions
├── assets/       # Images, icons
├── components/   # Reusable UI (Buttons, Inputs, Modals)
├── constants/    # Enums, API routes
├── contexts/     # React Contexts (Auth, Theme)
├── hooks/        # Custom hooks (useChat, useAuth)
├── layouts/      # AppShell, Sidebar, Navbar
├── pages/        # Dashboard, ChatArea, KnowledgeBase, Settings
├── routes/       # React Router configurations
├── services/     # Complex frontend business logic
├── store/        # Zustand stores
├── styles/       # Global CSS/Tailwind
└── utils/        # Formatters, helpers
```

---

## 14. API Service Layer

Recommended Axios service files:
- `authService.js`: `register()`, `login()`, `logout()`
- `chatService.js`: `sendMessage()`, `getHistory()`
- `projectService.js`: `getProjects()`, `createProject()`
- `knowledgeService.js`: `uploadDocument()`, `getCollections()`

---

## 15. React Query / TanStack Query

- **Query Keys**: Use structured arrays, e.g., `['chatHistory', conversationId]`.
- **Mutations**: Use `useMutation` for `sendMessage`. On success, invalidate the `chatHistory` query or optimistically append the message to the cache.
- **Optimistic Updates**: Append user messages instantly before the backend responds to reduce perceived latency.

---

## 16. Forms

- **Login/Register**: Fields: Email, Password. Validation: Valid email format, Password > 8 chars. Recommend using `react-hook-form` with `zod` for validation matching the backend Marshmallow schemas.

---

## 17. WebSocket / Streaming Support

- *Note*: The current backend is REST-based. If real-time streaming is added later via Flask-SocketIO, the frontend should implement a socket context provider and listen to `message_chunk` events, appending text to the latest `AIMessage` in state.

---

## 18. Error Handling

- **Axios Interceptor**: Catch 401 Unauthorized errors and trigger the refresh token flow or redirect to login.
- **Rate Limiting (429)**: Show a toast notification "Too many requests. Please wait."
- **Fallback**: Display an error boundary for unexpected UI crashes.

---

## 19. Environment Variables

Frontend `.env`:
- `VITE_API_BASE_URL=http://localhost:5000/api/v1`
- `VITE_APP_ENV=development`

---

## 20. UI Pages Required

1. **Login/Register Page**: Public, contains auth forms.
2. **Dashboard**: Protected, shows KPIs, recent projects.
3. **Project View**: Protected, lists conversations in a project.
4. **Chat Interface**: Protected, the main interaction hub. Requires message list, input area, attachment button.
5. **Knowledge Base**: Protected, table of uploaded documents and upload form.
6. **Settings**: Protected, user profile and preferences.

---

## 21. Component Checklist

- [ ] `Sidebar`: Navigation.
- [ ] `ChatBubble`: Renders markdown. Differentiates user vs assistant.
- [ ] `AgentBadge`: Small chip indicating which agent responded (e.g., "Research Agent").
- [ ] `FileUploader`: Drag-and-drop zone.
- [ ] `TypingIndicator`: Animated dots.
- [ ] `DataTable`: For displaying CSV analysis results.

---

## 22. Frontend Development Roadmap

1. **Phase 1**: Scaffold Vite project, setup Tailwind, Axios, React Router.
2. **Phase 2**: Build Auth screens and implement JWT storage.
3. **Phase 3**: Build App Layout (Sidebar, Topbar).
4. **Phase 4**: Build the Chat Interface and connect to `/chat/message`.
5. **Phase 5**: Build specialized UI renderers for Agent outputs (markdown, tables, download links).
6. **Phase 6**: Build Knowledge Base upload screens.

---

## 23. API Testing Guide

- Use the generated Swagger UI at `http://localhost:5000/api/v1/docs` to test payloads before wiring them in React.
- Verify headers: Always ensure `Authorization: Bearer <token>` is present for protected routes.

---

## 24. Deployment Notes

- **CORS**: The backend has `Flask-Cors` configured for `*` currently. In production, update the backend `cors.init_app(app, origins=["https://yourfrontend.com"])`.
- **Build**: Run `npm run build` to generate static assets.
- **Hosting**: Can be deployed to Vercel, Netlify, or AWS S3/CloudFront. Ensure API calls are routed via HTTPS.
