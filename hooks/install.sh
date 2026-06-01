#!/bin/sh
# Install DELTA pre-commit hook
cp hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "✅ DELTA pre-commit hook installed"
echo "   It will check commit message quality before each commit."
echo "   Set DELTA_API_URL and DELTA_THRESHOLD in your environment to configure."
