#!/bin/bash

# Environment Switcher for Scout Platform
# Usage: ./scripts/switch-env.sh [demo|c2a]

ENV=$1

if [ -z "$ENV" ]; then
  echo "Usage: ./scripts/switch-env.sh [demo|c2a]"
  echo ""
  echo "Current environment:"
  if [ -f .env.local ]; then
    grep "SUPABASE_URL" .env.local | head -1
  else
    echo "  No .env.local found"
  fi
  exit 1
fi

if [ "$ENV" = "demo" ]; then
  if [ -f .env.demo ]; then
    cp .env.demo .env.local
    echo "✓ Switched to DEMO environment"
    echo "  Database: Demo/placeholder data"
  else
    echo "✗ .env.demo not found"
    exit 1
  fi
elif [ "$ENV" = "c2a" ]; then
  if [ -f .env.c2a ]; then
    cp .env.c2a .env.local
    echo "✓ Switched to C2A PRODUCTION environment"
    echo "  Database: C2A real data"
  else
    echo "✗ .env.c2a not found"
    exit 1
  fi
else
  echo "Unknown environment: $ENV"
  echo "Valid options: demo, c2a"
  exit 1
fi

echo ""
echo "Restart your dev server for changes to take effect."
