#!/bin/bash
# Start both backend and frontend for development

export PATH="/opt/homebrew/bin:$PATH"

# Start backend
cd /Users/karthikeyanravi/PlateDaddy
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
cd /Users/karthikeyanravi/PlateDaddy/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== PlateDaddy Dev Server ==="
echo "Backend:  http://localhost:8000 (API docs: http://localhost:8000/docs)"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
