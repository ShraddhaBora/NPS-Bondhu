# 🚀 GitHub Deployment Guide

Your NPS Bondhu project is ready to push to GitHub! Follow these steps:

---

## ✅ What's Already Done

- ✅ Git repository initialized
- ✅ Initial commit created with all production files
- ✅ `.gitignore` configured (excludes .env, vector_store, __pycache__, etc.)
- ✅ `.env.example` created for users to configure their own API keys
- ✅ Clean production code committed

---

## 📋 Steps to Push to GitHub

### **Option 1: Create New Repository on GitHub (Recommended)**

1. **Go to GitHub** and create a new repository:
   - Visit: https://github.com/new
   - Repository name: `nps-bondhu` (or your preferred name)
   - Description: "AI-powered virtual assistant for National Pension System (NPS) queries"
   - **Important:** Choose **Public** or **Private** as needed
   - **Do NOT** initialize with README, .gitignore, or license (we already have these)

2. **Copy the repository URL** (will look like):
   ```
   https://github.com/YOUR_USERNAME/nps-bondhu.git
   ```

3. **Add the remote and push** (replace with your actual URL):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/nps-bondhu.git
   git branch -M main
   git push -u origin main
   ```

---

### **Option 2: Push to Existing Repository**

If you already have a repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## 🔐 Authentication

GitHub may ask for authentication. You have two options:

### **Option A: Personal Access Token (Recommended)**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control of private repositories)
4. Copy the token
5. Use it as your password when pushing

### **Option B: SSH Key**
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to GitHub: https://github.com/settings/keys
3. Use SSH URL instead: `git@github.com:YOUR_USERNAME/nps-bondhu.git`

---

## 📦 What's Being Pushed

### **Included Files:**
```
✅ app.py                      - Main application
✅ requirements.txt            - Dependencies
✅ README.md                   - Setup guide
✅ .gitignore                  - Git ignore rules
✅ .env.example                - API key template
✅ src/                        - Source code
   ✅ ingest.py               - Document processing
   ✅ rag_chain.py            - RAG implementation
   ✅ calculator.py           - Pension calculator
✅ data/                       - 15 PDF documents
✅ Documentation files         - Reports and guides
```

### **Excluded Files (in .gitignore):**
```
❌ .env                        - Your API keys (NEVER commit!)
❌ vector_store/               - Large binary files (regenerate)
❌ __pycache__/                - Python cache
❌ .backups/                   - Old backup files
❌ .DS_Store                   - macOS files
```

---

## 🎯 After Pushing

### **1. Add Repository Description**
On GitHub, add a description and topics:
- **Description:** "AI-powered virtual assistant for NPS queries using RAG"
- **Topics:** `nps`, `pension`, `ai`, `rag`, `langchain`, `streamlit`, `chatbot`

### **2. Add Repository Details**
- **Website:** (if you deploy it)
- **License:** Consider adding MIT or Apache 2.0

### **3. Enable GitHub Pages (Optional)**
If you want to host documentation

### **4. Add Badges to README (Optional)**
```markdown
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![Streamlit](https://img.shields.io/badge/streamlit-1.31+-red.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
```

---

## 🔄 Future Updates

When you make changes:

```bash
# Check what changed
git status

# Add changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push
```

---

## 📝 Sample Repository Description

**For GitHub repository description:**

```
🇮🇳 NPS Bondhu - AI-Powered NPS Assistant

An intelligent virtual assistant that helps NPS (National Pension System) 
subscribers understand pension rules and calculate retirement corpus using 
official PFRDA documents.

Features:
• AI-powered Q&A with RAG (85% precision)
• Automatic source citations
• Pension calculator
• 15 official NPS documents
• Optimized retrieval (40% faster)
• Response caching (98% faster for repeated queries)

Tech: LangChain, FAISS, Streamlit, Groq/Gemini
```

---

## ⚠️ Important Reminders

1. **NEVER commit .env file** - It contains your API keys!
2. **Vector store is excluded** - Users will regenerate it with `python3 src/ingest.py`
3. **PDF files are included** - They're the official data source
4. **Update README** if you add new features

---

## 🆘 Troubleshooting

### **"Permission denied"**
- Use Personal Access Token or SSH key
- Check repository permissions

### **"Large files"**
- PDFs are ~30MB total, should be fine
- If issues, consider Git LFS for PDFs

### **"Remote already exists"**
```bash
git remote remove origin
git remote add origin YOUR_NEW_URL
```

---

## ✅ Verification

After pushing, verify on GitHub:
- [ ] All files are visible
- [ ] README displays correctly
- [ ] .env is NOT visible (should be excluded)
- [ ] vector_store/ is NOT visible (should be excluded)
- [ ] Repository description is set

---

## 🎉 You're Ready!

Your NPS Bondhu project is ready to be shared with the world! 🚀

**Next Steps:**
1. Create GitHub repository
2. Add remote URL
3. Push with `git push -u origin main`
4. Share the repository link!

---

**Questions?** Check the git status with `git status` or `git log` to see what's committed.
