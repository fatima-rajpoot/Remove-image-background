<<<<<<< HEAD
# Erase AI

```
background-remover/
  frontend/   React + Vite UI
  backend/    FastAPI + RMBG-1.4
```

## Run backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL (usually http://localhost:5173). It proxies `/api` to the backend.
=======
# Remove-image-background
AI-powered web application built using React, CSS, Python, and an AI model to provide intelligent image processing and automation features.
>>>>>>> e24dcf853d3910359890527fd6a6cc8a7312f542
