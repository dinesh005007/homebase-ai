#!/bin/bash
set -e

echo "Pulling models for HomeBase AI..."

echo "==> Pulling nomic-embed-text (embeddings)..."
ollama pull nomic-embed-text

echo "==> Pulling qwen2.5:7b (primary reasoning)..."
ollama pull qwen2.5:7b

echo ""
echo "Testing nomic-embed-text..."
curl -s http://localhost:11434/api/embed -d '{
  "model": "nomic-embed-text",
  "input": "test embedding"
}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Embedding dims: {len(d[\"embeddings\"][0])}')"

echo ""
echo "Testing qwen2.5:7b..."
curl -s http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "Say hello in one sentence.",
  "stream": false
}' | python3 -c "import sys,json; print(json.load(sys.stdin)['response'])"

echo ""
echo "Models ready."
