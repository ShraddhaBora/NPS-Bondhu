#!/usr/bin/env bash
# =============================================================================
# setup_hf_space.sh — Migrate NPS Bondhu backend to HuggingFace Spaces
# Usage: bash scripts/setup_hf_space.sh YOUR_HF_USERNAME
# =============================================================================
set -e

HF_USERNAME="${1}"
SPACE_NAME="nps-bondhu-backend"

if [ -z "$HF_USERNAME" ]; then
    echo "❌ Usage: bash scripts/setup_hf_space.sh YOUR_HF_USERNAME"
    exit 1
fi

SPACE_URL="https://${HF_USERNAME}-${SPACE_NAME}.hf.space"
HF_SPACE_REPO="https://huggingface.co/spaces/${HF_USERNAME}/${SPACE_NAME}"

echo ""
echo "🚀 NPS Bondhu → HuggingFace Spaces Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  HF Username : ${HF_USERNAME}"
echo "  Space Name  : ${SPACE_NAME}"
echo "  Space URL   : ${SPACE_URL}"
echo ""

# 1. Navigate to project root
cd "$(dirname "$0")/.."

# 2. Replace USERNAME placeholder in backend/main.py
echo "📝 Updating CORS with your HF Space URL..."
sed -i.bak "s|https://USERNAME-nps-bondhu-backend.hf.space|${SPACE_URL}|g" backend/main.py
rm -f backend/main.py.bak

# 3. Update frontend production env
echo "📝 Updating frontend/.env.production with new backend URL..."
echo "VITE_API_BASE_URL=${SPACE_URL}" > frontend/.env.production

# 4. Rename hf_space_README.md → README.md for the HF repo (we'll use a separate push)
echo "📝 Preparing HF Space README..."
cp hf_space_README.md /tmp/hf_space_README.md

# 5. Commit changes to GitHub
echo ""
echo "💾 Committing URL updates to GitHub..."
git add backend/main.py frontend/.env.production
git commit -m "Migrate: Switch backend from Render to HuggingFace Spaces

- Update CORS to allow ${SPACE_URL}
- Update frontend/.env.production to point to HF Space"
git push origin main

# 6. Add HuggingFace Space as a git remote (if not already added)
echo ""
echo "🔗 Setting up HuggingFace Space remote..."
REMOTE_URL="https://huggingface.co/spaces/${HF_USERNAME}/${SPACE_NAME}"

if git remote get-url hf-space &>/dev/null; then
    git remote set-url hf-space "${REMOTE_URL}"
    echo "   Updated existing 'hf-space' remote"
else
    git remote add hf-space "${REMOTE_URL}"
    echo "   Added 'hf-space' remote → ${REMOTE_URL}"
fi

# 7. Create a HF-compatible branch with the Space README
echo ""
echo "📤 Preparing content for HF Space push..."

# Create a temporary branch for the HF push
git checkout -b hf-space-deploy 2>/dev/null || git checkout hf-space-deploy

# Replace README.md with the HF Space version for the Space repo
cp /tmp/hf_space_README.md README.md
git add README.md
git commit -m "HF Space: Add Space README with docker config" 2>/dev/null || true

# 8. Push to HuggingFace Space
echo ""
echo "🚀 Pushing to HuggingFace Space..."
echo "   (You'll be prompted for your HF token if not cached)"
echo "   Get your token at: https://huggingface.co/settings/tokens"
echo ""
git push hf-space hf-space-deploy:main --force

# 9. Go back to main branch
git checkout main
git branch -D hf-space-deploy 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Go to ${HF_SPACE_REPO}"
echo "   2. Go to Settings → Variables and Secrets"
echo "   3. Add secret: GROQ_API_KEY = your_key"
echo "   4. Add secret: GOOGLE_API_KEY = your_key (optional)"
echo "   5. The Space will auto-rebuild — wait ~5 minutes"
echo ""
echo "🌐 Your new backend URL: ${SPACE_URL}"
echo "   Test it: ${SPACE_URL}/health"
echo ""
