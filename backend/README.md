# Erase AI Backend — BRIAAI RMBG-1.4

## Install & run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

First run downloads `briaai/RMBG-1.4` from Hugging Face (needs internet once).

Health: http://127.0.0.1:8000/api/health

## Use your own / offline model folder

Copy the full HF model directory into:

```
backend/models/RMBG-1.4/
```

It should contain files like `config.json` and `model.safetensors` (or `pytorch_model.bin`).

Then:

```bash
curl -X POST http://127.0.0.1:8000/api/model/reload
```

## Train stub (optional)

See `train/train.py` if you want to fine-tune a small custom net and export ONNX.
RMBG-1.4 inference does not need that — it loads the BRIAAI weights directly.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Status + model source |
| GET | `/api/model` | Model info |
| POST | `/api/model/reload` | Reload after adding local weights |
| POST | `/api/remove` | image file → PNG with alpha |
| POST | `/api/remove/batch` | multiple images → ZIP |
