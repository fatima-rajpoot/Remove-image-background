from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
TRAIN_DIR = BASE_DIR / "train"
TMP_DIR = BASE_DIR / "tmp"

HF_MODEL_ID = "briaai/RMBG-1.4"
LOCAL_MODEL_DIRNAMES = (
    "RMBG-1.4",
    "briaai-RMBG-1.4",
    "model",
)

HOST = "127.0.0.1"
PORT = 8000
MAX_UPLOAD_MB = 25
MODEL_INPUT_SIZE = (1024, 1024)
