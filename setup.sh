#!/bin/bash
set -e

echo "=== PlateDaddy Setup ==="

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo ">>> IMPORTANT: Edit .env and add your Stripe test secret key <<<"
    echo ">>> Get one at https://dashboard.stripe.com/test/apikeys <<<"
    echo ""
fi

echo ""
echo "Setup complete! To run the server:"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --reload"
echo ""
echo "API docs will be at: http://localhost:8000/docs"
