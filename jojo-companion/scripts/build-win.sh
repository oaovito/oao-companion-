#!/usr/bin/env bash
# Gera o pacote Windows x64 (instalador NSIS + ZIP portátil) em dist/.
# Funciona no Windows (Git Bash) e no Linux (requer wine + wine32 para o NSIS).
# Uso: bash scripts/build-win.sh          → instalador + zip
#      bash scripts/build-win.sh --dir    → apenas a pasta dist/win-unpacked
set -euo pipefail
cd "$(dirname "$0")/.."

KOFFI_VER=$(node -p "require('./node_modules/koffi/package.json').version")
WINPKG=node_modules/@koromix/koffi-win32-x64
if [ ! -f "$WINPKG/package.json" ]; then
  echo "Baixando binário do koffi para win32-x64 ($KOFFI_VER)…"
  tmp=$(mktemp -d)
  (cd "$tmp" && npm pack "@koromix/koffi-win32-x64@$KOFFI_VER" >/dev/null)
  mkdir -p "$WINPKG"
  tar -xzf "$tmp"/koromix-koffi-win32-x64-*.tgz -C "$WINPKG" --strip-components=1
  rm -rf "$tmp"
fi

if [ "${1:-}" = "--dir" ]; then
  npx electron-builder --win --x64 --dir
else
  npx electron-builder --win --x64
fi
echo "Pronto. Artefatos em dist/"
ls -la dist | grep -Ei "\.exe|\.zip|win-unpacked" || true
