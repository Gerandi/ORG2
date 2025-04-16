#!/bin/bash

# Create and activate virtual environment for backend
if [ ! -d "backend/venv" ]; then
  echo "Creating virtual environment for backend..."
  cd backend
  python3 -m venv venv
  cd ..
fi

# Start backend server
echo "Starting backend server..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..


# Start frontend server
echo "Starting frontend server..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

# Function to handle script termination
cleanup() {
  echo "Stopping servers..."
  kill $BACKEND_PID
  kill $FRONTEND_PID
  exit 0
}

# Trap termination signals
trap cleanup SIGINT SIGTERM

echo "Development servers are running:"
echo "- Frontend: http://localhost:5173"
echo "- Backend: http://localhost:8000"
echo "Press Ctrl+C to stop both servers"

# Keep script running
wait