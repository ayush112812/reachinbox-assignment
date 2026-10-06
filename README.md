# AI Email OneBox

A production-grade, real-time email synchronization, indexing, and intelligent triage platform. Built with **Node.js/TypeScript**, **Elasticsearch 8**, **Google Gemini**, and a **React 3-Pane UI**.

---

## ⚡ Overview

This platform connects directly to multiple IMAP mailboxes, streams incoming messages instantly via **IMAP IDLE**, indexes them into **Elasticsearch** for sub-millisecond search, automatically classifies prospect intent with **Gemini AI**, routes high-intent leads to **Slack / Webhooks**, and provides **RAG-grounded contextual reply suggestions**.

```
                   ┌────────────────────────┐
                   │  Multi-Account IMAP    │
                   │ (Persistent IDLE / RFC)│
                   └───────────┬────────────┘
                               │ RFC 822 Streams
                               ▼
                   ┌────────────────────────┐
                   │  Node.js Event Engine  │
                   └─────┬────────────┬─────┘
                         │            │
       Index & Highlight │            │ Real-time Push
                         ▼            ▼
               ┌──────────────┐   ┌──────────────────────┐
               │Elasticsearch │   │ Server-Sent Events   │
               │  Index & kNN │   │ (/api/events)        │
               └──────┬───────┘   └──────────┬───────────┘
                      │                      │
                      ▼                      ▼
               ┌──────────────┐   ┌──────────────────────┐
               │  Gemini AI   │──▶│ React OneBox Client  │
               │ Categorize & │   │ (Search, Triage, RAG)│
               │  Vector RAG  │   └──────────────────────┘
               └──────────────┘
```

---

## ✨ Key Features

- **Real-Time IMAP IDLE (RFC 2177)**: Persistent TCP socket connection to multiple IMAP accounts with automated heartbeat renewal, exponential reconnect backoff, and zero polling.
- **Elasticsearch Full-Text Search**: Custom analyzers with boosted multi-match (`subject^3`, `from^2`, `bodyText^1`), fuzzy matching, and `<mark>` hit highlighting.
- **Gemini Intent Categorization**: Zero-shot structured JSON classification (*Interested*, *Meeting Booked*, *Not Interested*, *Spam*, *Out of Office*) with confidence scoring and model fallback resilience.
- **Automated Lead Routing**: Instant Slack and HMAC-signed webhook dispatch whenever high-value leads (*Interested*) are detected, with deduplication guarantees.
- **Vector RAG Suggested Replies**: Dense vector embeddings (`dense_vector`, 768 dimensions) stored directly in Elasticsearch with cosine similarity retrieval and strict prompt-injection defenses.
- **React OneBox UI**: Responsive 3-pane email client featuring instant search debouncing, sanitized HTML email rendering (`DOMPurify`), manual re-categorization, and live SSE event updates.

---

## 🚀 Quickstart

### Prerequisites
- **Node.js** v20+ & **npm** v10+
- **Docker & Docker Compose**

### 1. Clone & Install
```bash
git clone https://github.com/ayush112812/ai-email-onebox.git
cd ai-email-onebox

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Start Elasticsearch
```bash
docker compose up -d
```
Verify cluster health:
```bash
curl http://localhost:9200
```

### 3. Configure Environment
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```
Fill in your credentials in `.env`:
- `GEMINI_API_KEY`: Google Gemini API key
- `IMAP_ACC1_*`, `IMAP_ACC2_*`: (Optional) IMAP credentials for live sync
- `SLACK_WEBHOOK_URL`: (Optional) Slack incoming webhook URL for notifications

### 4. Run the Application
In your primary terminal (Backend):
```bash
npm run dev
```
In a secondary terminal (Frontend):
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Cluster health, ES connection status, index states |
| `GET` | `/api/accounts` | Active IMAP accounts & connection status |
| `POST` | `/api/accounts/:id/sync` | Trigger historical backfill (default: 30 days) |
| `GET` | `/api/emails` | Paginated emails with category/folder/account filters |
| `GET` | `/api/emails/:id` | Full email details with headers and parsed body |
| `GET` | `/api/search?q=query` | Full-text search with highlight snippets and filters |
| `POST` | `/api/emails/:id/categorize` | Trigger on-demand AI re-categorization |
| `POST` | `/api/emails/:id/suggest-reply` | Generate RAG-grounded concise and detailed replies |
| `POST` | `/api/knowledge/seed` | Seed default product FAQ chunks into vector store |
| `GET` | `/api/knowledge/stats` | Vector index dimension and document counts |
| `GET` | `/api/events` | Server-Sent Events (SSE) stream for live updates |

---

## 🧪 Testing

The codebase includes comprehensive test suites covering unit logic, API endpoints, mock email parsing, Elasticsearch queries, and React components.

```bash
# Run backend tests (Jest)
npm test

# Run backend typecheck & lint
npm run build
npm run lint

# Run frontend tests (Vitest)
cd frontend
npm test
npm run build
```

---

## 🛡️ Architecture & Design Decisions

1. **Persistent IMAP IDLE over Cron/Polling**: Rather than polling mailboxes on an interval (which wastes bandwidth and delays alerts), each account maintains an open IDLE socket. The mail server notifies the application within milliseconds of an incoming email.
2. **Elasticsearch as Unified Store & Vector Engine**: Used Elasticsearch for both document indexing (fast full-text search, filtering, highlight fragments) and dense vector storage (kNN cosine similarity), avoiding an extra vector database dependency.
3. **RAG Prompt Injection Defense**: Prospect email content is treated as untrusted data and strictly isolated within boundary tokens. System prompts prohibit following instructions contained inside email text and enforce grounded citations from the knowledge base.
4. **Resilient AI Fallbacks**: Built with graceful model degradation and backoff retry logic to handle rate-limiting and service degradation transparently.

---

## 📄 License
MIT
