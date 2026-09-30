from __future__ import annotations

import io
from functools import lru_cache
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision.transforms.functional import normalize
from transformers import AutoModelForImageSegmentation

from .config import HF_MODEL_ID, LOCAL_MODEL_DIRNAMES, MODELS_DIR, MODEL_INPUT_SIZE


def find_local_model_dir() -> Path | None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    for name in LOCAL_MODEL_DIRNAMES:
        path = MODELS_DIR / name
        if path.is_dir() and (
            (path / "config.json").exists()
            or (path / "model.safetensors").exists()
            or (path / "pytorch_model.bin").exists()
        ):
            return path

    return None


def resolve_model_source() -> str:
    local = find_local_model_dir()
    return str(local) if local is not None else HF_MODEL_ID


@lru_cache(maxsize=1)
def get_engine():
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    source = resolve_model_source()
    model = AutoModelForImageSegmentation.from_pretrained(
        source,
        trust_remote_code=True,
    )
    model.to(device)
    model.eval()
    return {
        "kind": "rmbg",
        "source": source,
        "device": str(device),
        "model": model,
    }


def model_status() -> dict:
    local = find_local_model_dir()
    source = resolve_model_source()
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    cached = get_engine.cache_info().currsize > 0

    return {
        "ready": True,
        "loaded": cached,
        "custom_model": str(local) if local else None,
        "using": f"rmbg:{source}",
        "device": device,
        "models_dir": str(MODELS_DIR),
    }


def preprocess_image(im: np.ndarray, model_input_size: tuple[int, int]) -> torch.Tensor:
    if len(im.shape) < 3:
        im = im[:, :, np.newaxis]
    im_tensor = torch.tensor(im, dtype=torch.float32).permute(2, 0, 1)
    im_tensor = F.interpolate(
        torch.unsqueeze(im_tensor, 0),
        size=model_input_size,
        mode="bilinear",
    )
    image = torch.divide(im_tensor, 255.0)
    image = normalize(image, [0.5, 0.5, 0.5], [1.0, 1.0, 1.0])
    return image


def postprocess_image(result: torch.Tensor, im_size: tuple[int, int]) -> np.ndarray:
    result = torch.squeeze(
        F.interpolate(result, size=im_size, mode="bilinear"),
        0,
    )
    ma = torch.max(result)
    mi = torch.min(result)
    result = (result - mi) / (ma - mi + 1e-8)
    im_array = (result * 255).permute(1, 2, 0).cpu().data.numpy().astype(np.uint8)
    im_array = np.squeeze(im_array)
    return im_array


@torch.inference_mode()
def remove_background(image_bytes: bytes) -> bytes:
    engine = get_engine()
    model = engine["model"]
    device = torch.device(engine["device"])

    original = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    orig_im = np.asarray(original)
    orig_im_size = (orig_im.shape[0], orig_im.shape[1])

    image = preprocess_image(orig_im, MODEL_INPUT_SIZE).to(device)
    result = model(image)
    mask_tensor = result[0][0]
    result_image = postprocess_image(mask_tensor, orig_im_size)

    mask = Image.fromarray(result_image)
    cutout = original.copy()
    cutout.putalpha(mask)

    out = io.BytesIO()
    cutout.save(out, format="PNG")
    return out.getvalue()


def clear_session_cache() -> None:
    get_engine.cache_clear()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
