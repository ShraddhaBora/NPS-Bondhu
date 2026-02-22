---
title: NPS Bondhu Backend
emoji: 🏛️
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

# NPS Bondhu — Backend API

FastAPI backend for the [NPS Bondhu](https://npsbondhu.vercel.app) chatbot.

Provides:
- `/chat` — RAG-powered Q&A using official PFRDA/NPS documents
- `/health` — Health check endpoint

Built with FastAPI · LangChain · FAISS · Groq LLM · HuggingFace Embeddings
