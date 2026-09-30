from __future__ import annotations

import io
import zipfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .config import MAX_UPLOAD_MB, TMP_DIR
from .inference import clear_session_cache, model_status, remove_background

app = FastAPI(
    title="Erase AI Backend",
    description="Background removal with BRIAAI RMBG-1.4.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMP_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/api/health")
def health():
    return {"ok": True, **model_status()}


@app.get("/api/model")
def model_info():
    return model_status()


@app.post("/api/model/reload")
def reload_model():
    clear_session_cache()
    return {"reloaded": True, **model_status()}


@app.post("/api/remove")
async def remove_one(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file")

    data = await file.read()
    max_bytes = MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {MAX_UPLOAD_MB} MB)",
        )

    try:
        result = remove_background(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Removal failed: {exc}") from exc

    return Response(content=result, media_type="image/png")


@app.post("/api/remove/batch")
async def remove_batch(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Max 20 images per batch")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for index, upload in enumerate(files):
            data = await upload.read()
            if not data:
                continue
            try:
                result = remove_background(data)
            except Exception as exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed on {upload.filename or index}: {exc}",
                ) from exc
            name = (upload.filename or f"image-{index + 1}").rsplit(".", 1)[0]
            zf.writestr(f"{name}-no-bg.png", result)

    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=erase-ai-batch.zip"},
    )
