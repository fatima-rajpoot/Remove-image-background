"""
Train / fine-tune a background-removal model, then export ONNX for the API.

1. Put training photos in:  train/data/images/
2. Put matching masks in:   train/data/masks/   (same filenames, white=subject)
3. Install train deps:      pip install -r train/requirements.txt
4. Run:                     python train/train.py
5. Copy output ONNX to:     backend/models/model.onnx
6. Call POST /api/model/reload  (or restart the server)
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset


ROOT = Path(__file__).resolve().parent
DATA_IMAGES = ROOT / "data" / "images"
DATA_MASKS = ROOT / "data" / "masks"
OUTPUT_DIR = ROOT / "outputs"
SIZE = 320


class U2Block(nn.Module):
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.net(x)


class TinyMattingNet(nn.Module):
    """Small encoder-decoder you can train, then export as model.onnx."""

    def __init__(self):
        super().__init__()
        self.enc1 = U2Block(3, 32)
        self.enc2 = U2Block(32, 64)
        self.enc3 = U2Block(64, 128)
        self.pool = nn.MaxPool2d(2)
        self.up = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
        self.dec2 = U2Block(128 + 64, 64)
        self.dec1 = U2Block(64 + 32, 32)
        self.out = nn.Conv2d(32, 1, 1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        d2 = self.dec2(torch.cat([self.up(e3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up(d2), e1], dim=1))
        return torch.sigmoid(self.out(d1))


class PairDataset(Dataset):
    def __init__(self, images_dir: Path, masks_dir: Path):
        self.pairs = []
        for image_path in sorted(images_dir.glob("*")):
            if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            mask_path = masks_dir / image_path.name
            if not mask_path.exists():
                stem = image_path.stem
                for ext in (".png", ".jpg", ".jpeg", ".webp"):
                    candidate = masks_dir / f"{stem}{ext}"
                    if candidate.exists():
                        mask_path = candidate
                        break
            if mask_path.exists():
                self.pairs.append((image_path, mask_path))

        if not self.pairs:
            raise FileNotFoundError(
                f"No image/mask pairs found in {images_dir} and {masks_dir}. "
                "Add files with matching names, then re-run."
            )

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, index):
        image_path, mask_path = self.pairs[index]
        image = Image.open(image_path).convert("RGB").resize((SIZE, SIZE))
        mask = Image.open(mask_path).convert("L").resize((SIZE, SIZE))

        x = np.asarray(image).astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        x = (x - mean) / std
        x = torch.from_numpy(x.transpose(2, 0, 1))

        y = np.asarray(mask).astype(np.float32) / 255.0
        y = torch.from_numpy(y[None, ...])
        return x, y


def export_onnx(model: nn.Module, out_path: Path):
    model.eval()
    dummy = torch.randn(1, 3, SIZE, SIZE)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        dummy,
        str(out_path),
        input_names=["input"],
        output_names=["mask"],
        dynamic_axes={"input": {0: "batch"}, "mask": {0: "batch"}},
        opset_version=17,
    )


def main():
    parser = argparse.ArgumentParser(description="Train Erase AI matting model")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument(
        "--export",
        type=Path,
        default=ROOT.parent / "models" / "model.onnx",
        help="Where to write the ONNX file for the API",
    )
    args = parser.parse_args()

    DATA_IMAGES.mkdir(parents=True, exist_ok=True)
    DATA_MASKS.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    dataset = PairDataset(DATA_IMAGES, DATA_MASKS)
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True)

    model = TinyMattingNet().to(device)
    optim = torch.optim.Adam(model.parameters(), lr=args.lr)
    loss_fn = nn.BCELoss()

    print(f"Training on {len(dataset)} pairs · device={device}")
    for epoch in range(1, args.epochs + 1):
        model.train()
        total = 0.0
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            pred = model(x)
            loss = loss_fn(pred, y)
            optim.zero_grad()
            loss.backward()
            optim.step()
            total += float(loss.item()) * x.size(0)
        print(f"epoch {epoch}/{args.epochs}  loss={total / len(dataset):.4f}")

    ckpt = OUTPUT_DIR / "model.pt"
    torch.save(model.state_dict(), ckpt)
    export_onnx(model.cpu(), args.export)
    print(f"Saved checkpoint: {ckpt}")
    print(f"Exported ONNX for API: {args.export}")
    print("Restart backend or POST /api/model/reload to load it.")


if __name__ == "__main__":
    main()
