#!/usr/bin/env bash
set -euo pipefail

npm run build
wrangler pages deploy dist --project-name google-maker --commit-dirty=true

echo "✅ Deployed to Cloudflare Pages"
