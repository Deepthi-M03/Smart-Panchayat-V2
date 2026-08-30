#!/usr/bin/env bash
# Smart Panchayat — one-command local launcher
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "== Smart Panchayat: installing server dependencies =="
cd "$ROOT_DIR/server"
npm install --no-audit --no-fund

if [ ! -f "$ROOT_DIR/server/data/complaints.json" ]; then
  echo "== Smart Panchayat: generating synthetic demo dataset =="
  node seed.js
fi

echo "== Smart Panchayat: starting server on :4000 =="
echo ""
echo "Open:      http://localhost:4000"
echo "Officer:   http://localhost:4000/login.html"
echo "  admin@smartpanchayat.demo / admin123"
echo "  officer@smartpanchayat.demo / officer123"
echo ""
node server.js
