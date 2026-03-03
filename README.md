# 🇮🇳 NPS Bondhu

**Your AI-Powered Guide to the National Pension System**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-npsbondhu.vercel.app-blue?style=flat-square)](https://npsbondhu.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-HuggingFace%20Spaces-yellow?style=flat-square)](https://huggingface.co/spaces/NilimKr/nps-bondhu-backend)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

##  What is NPS Bondhu?

NPS Bondhu is an intelligent virtual assistant that helps NPS (National Pension System) subscribers understand pension rules, calculate retirement corpus, and get accurate answers sourced directly from official PFRDA documents.

### Key Features
- ✅ **AI-Powered Q&A** — Ask questions in natural language, get answers from official docs
- ✅ **Multilingual Support** — English, Hindi (हिन्दी), Assamese (অসমীয়া)
- ✅ **Source Citations** — Every answer includes the source document name, mapped directly from FAISS metadata
- ✅ **Voice Input** — Speak your questions directly via the browser's native Web Speech API
- ✅ **Official Documents** — Powered by PFRDA/NPS Trust PDFs and FAQs

---

## 🏗️ Architecture

```
User Browser
    │
    ▼
Frontend (Vercel)               ← React + Vite + TailwindCSS
    │  HTTPS POST /chat
    ▼
Backend (HuggingFace Spaces)    ← FastAPI + Gunicorn (Docker)
    │
    ├── Translator              ← deep-translator (Google Translate)
    ├── FAISS Vector Store      ← Pre-built from official NPS PDFs
    ├── HuggingFace Embeddings  ← sentence-transformers/all-MiniLM-L6-v2
    └── Groq LLM                ← Llama 3.3 70B (via Groq API)
```

### RAG Pipeline & Technical Implementation
1. **Voice & Query Processing:** Use `window.SpeechRecognition` (Web Speech API) to capture voice in BCP-47 tags (`en-IN`, `hi-IN`, `as-IN`). The text query is then translated to English (if needed) using `deep-translator`.
2. **Retrieval:** The query is embedded. FAISS runs an MMR (Maximal Marginal Relevance) search retrieving the top 5 diverse chunks.
3. **Citation & Metadata Storage:** During ingestion (`ingest.py`), each text chunk is saved with a `metadata` dictionary containing `source` (the original filename) and `page` number.
4. **Generation:** The retrieved chunks + query are passed to Groq (Llama 3.3 70B) to generate the answer.
5. **Citation Rendering Method:** The backend extracts the `source` metadata from the primary document retrieved. It strips the `.pdf` extension and replaces underscores/hyphens with spaces to generate a clean, human-readable citation (e.g., "07 Corp FAQ"). The final response and citation are sent to the frontend.

---

## 🚀 Production Deployment

| Component | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://npsbondhu.vercel.app |
| Backend | HuggingFace Spaces | https://NilimKr-nps-bondhu-backend.hf.space |

### Deploying the Backend (HuggingFace Spaces)

1. **Create a Space** at [huggingface.co/new-space](https://huggingface.co/new-space)
   - SDK: **Docker**
   - Name: `nps-bondhu-backend`

2. **Upload files** using the HF API:
   ```bash
   python3 scripts/upload_to_hf.py
   ```

3. **Add Secret** in Space Settings → Variables and Secrets:
   - `GROQ_API_KEY` = your key from [console.groq.com](https://console.groq.com)

### Deploying the Frontend (Vercel)

1. Connect the GitHub repo to Vercel
2. Set **Root Directory** to `frontend/`
3. The `frontend/.env.production` file already contains the backend URL — no extra env vars needed
4. Deploy

---

## 💻 Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone & Install

```bash
git clone https://github.com/NilimKr/NPS-Bondhu.git
cd "NPS Bondhu"

# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment

Create a `.env` file in the project root:
```bash
GROQ_API_KEY=your_groq_api_key_here
```

Create `frontend/.env` for local development:
```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. Run Locally

```bash
# Terminal 1 — Backend
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

App available at **http://localhost:5173**

### 4. Rebuild Vector Store (optional)

Only needed if you want to update the knowledge base with fresh documents:
```bash
# Scrape latest data from PFRDA/NPS Trust
python3 scripts/scrape_nps_data.py

# Re-ingest documents into FAISS vector store
python3 src/ingest.py
```

---

## 📁 Project Structure

```
NPS Bondhu/
├── backend/
│   └── main.py                # FastAPI app (CORS, /chat, /health endpoints)
├── frontend/                  # React + Vite frontend
│   ├── src/
│   │   └── components/
│   │       ├── ChatInterface.jsx
│   │       ├── MessageBubble.jsx
│   │       ├── Sidebar.jsx
│   │       └── MobileHeader.jsx
│   └── .env.production        # Production backend URL (committed)
├── src/
│   ├── rag_chain.py           # RAG chain (retriever + Groq LLM)
│   ├── translator.py          # Multilingual translation utilities
│   ├── ingest.py              # Document ingestion pipeline (handles chunk metadata)
│   └── download_model.py      # Pre-downloads embedding model at build
├── vector_store/              # Pre-built FAISS index (committed)
│   ├── index.faiss
│   └── index.pkl
├── data/                      # Raw source documents
├── scripts/
│   ├── scrape_nps_data.py     # PFRDA/NPS Trust web scraper
│   └── upload_to_hf.py        # HuggingFace Space upload utility
├── Dockerfile                 # For HuggingFace Spaces (port 7860)
├── requirements.txt
└── README.md
```

---

## 📚 Data Sources

Official documents indexed from:
- PFRDA/NPS Trust **Circulars**
- **FAQs** (Central Govt, State Govt, All-Citizens, NRI, Corporate models)
- **Exit & Withdrawal** guides
- **APY** (Atal Pension Yojana) documents
- **NPS Vatsalya** scheme guidelines
- Gazette notifications and regulatory amendments

---

## 🔑 API Keys

### Groq (Required)
- **Model:** Llama 3.3 70B Versatile
- **Speed:** Very fast (~1–3s response)
- **Free tier:** Generous daily limits
- **Get key:** [console.groq.com](https://console.groq.com)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Backend | FastAPI, Gunicorn, Uvicorn |
| LLM | Groq (Llama 3.3 70B) via LangChain |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 |
| Vector Store | FAISS (MMR search) |
| Translation | deep-translator (Google Translate) |
| Hosting | Vercel (frontend) + HuggingFace Spaces (backend) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

> ⚠️ This is a prototype/demo. Always verify NPS information with official PFRDA sources.

---

##  Acknowledgments

- **PFRDA/NPS Trust** for official NPS documents
- **LangChain** for the RAG framework
- **Groq** for fast LLM inference
- **HuggingFace** for free ML hosting
- **Vercel** for frontend hosting

---

**Built with ❤️ for NPS subscribers**
**Version:** 3.1 | **Last Updated:** February 2026
