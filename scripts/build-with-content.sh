#!/usr/bin/env bash
#
# 由 Cloudflare Pages 在私有内容仓中调用：
#   git clone --depth 1 https://github.com/acshameless/zhaizhi-codex.git .zhaizhi \
#     && bash .zhaizhi/scripts/build-with-content.sh "$PWD" .zhaizhi
#
set -euo pipefail

CONTENT_DIR="${1:?用法: build-with-content.sh <内容目录> [代码目录]}"
CODE_DIR="${2:-$(cd "$(dirname "$0")/.." && pwd)}"

cd "$CODE_DIR"
npm ci
ZHAIZHI_CONTENT_DIR="$CONTENT_DIR" npm run build

echo "构建完成：$CODE_DIR/dist"
