#!/bin/bash
# Generate SVGs from all D2 source files

# Ensure we're in the right directory (apps/www)
cd "$(dirname "$0")/.." || exit

D2_BIN="./d2-v0.7.1/bin/d2"

if [ ! -f "$D2_BIN" ]; then
  # Fallback to global d2 if available
  if command -v d2 >/dev/null 2>&1; then
    D2_BIN="d2"
  else
    echo "Error: D2 binary not found."
    echo "Please download D2 or ensure it's available in PATH."
    exit 1
  fi
fi

echo "Generating SVGs from D2 sources..."
mkdir -p public/flows

for file in d2/*.d2; do
  if [ -f "$file" ]; then
    filename=$(basename -- "$file")
    name="${filename%.*}"
    echo " -> Compiling $filename"
    $D2_BIN "$file" "public/flows/${name}.svg"
  fi
done

echo "Done! All SVGs are updated in public/flows/"
