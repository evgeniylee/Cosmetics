"""Использование: python3 scripts/cutout-icons.py вход.jpg [вход2.png ...] --out public/images/icons

Вырезает белый фон у 3D-иконок, обрезает по объекту и сохраняет WebP с прозрачностью.
Фон = почти белые нейтральные пиксели, связанные с краем кадра (белые детали внутри объекта остаются)."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage



HI, LO = 253, 228  # выше HI — фон полностью, ниже LO — объект полностью


def border_connected(mask):
    lab, _ = ndimage.label(mask)
    ids = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    ids = ids[ids != 0]
    return np.isin(lab, ids)


def key(img: Image.Image) -> Image.Image:
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    mn, mx = a.min(axis=2), a.max(axis=2)
    sat = mx - mn
    # 1) чистый белый фон (253–255), связанный с краем кадра
    bg0 = border_connected((mn >= 251) & (sat <= 6))
    # 2) розовые тени и светлые края стекла: светлые, но с оттенком (белые крышки/диски нейтральные — не трогаем)
    shadow = border_connected(bg0 | ((mn >= 222) & (sat >= 4)) | (mn >= 246)) & ~bg0
    # 3) полоса сглаживания по краю
    band = ndimage.binary_dilation(bg0 | shadow, iterations=2) & ~(bg0 | shadow)
    t = np.clip((HI - mn) / (HI - LO), 0, 1)
    alpha = np.ones(mn.shape, np.float32)
    alpha[bg0] = 0
    alpha[shadow] = t[shadow] ** 3.2
    alpha[band] = np.maximum(t[band], 0.0) ** 0.8
    # 4) «пол»: светлые нейтральные тени и отражения в нижней четверти объекта
    ys = np.where((alpha > 0.5).any(axis=1))[0]
    if len(ys):
        y0 = int(ys[0] + 0.72 * (ys[-1] - ys[0]))
        zone = np.zeros_like(bg0)
        zone[y0:] = True
        floor = zone & (mn >= 226) & (sat <= 14)
        floor = border_connected(bg0 | floor) & floor & ~bg0
        t2 = np.clip((248 - mn) / 40, 0, 1)
        alpha[floor] = np.minimum(alpha[floor], t2[floor] ** 2.5)
    # мягкий край
    alpha = np.minimum(alpha, ndimage.gaussian_filter(alpha, 0.8) + 0.15)
    alpha = np.clip(alpha, 0, 1)
    # убираем белую кайму: восстанавливаем цвет без примеси белого
    a3 = alpha[..., None]
    rgb = np.where(a3 > 0.02, (a - (1 - a3) * 255) / np.maximum(a3, 0.02), a)
    rgb = np.clip(rgb, 0, 255)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def crop_square(im: Image.Image, pad=0.06, size=480) -> Image.Image:
    bbox = im.getchannel("A").point(lambda v: 255 if v > 60 else 0).getbbox()
    im = im.crop(bbox)
    w, h = im.size
    s = int(max(w, h) * (1 + pad * 2))
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - w) // 2, (s - h) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def main():
    import argparse, os
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", help="картинки на белом фоне; имя файла = имя иконки")
    ap.add_argument("--out", default="public/images/icons")
    ap.add_argument("--size", type=int, default=480)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    for f in args.files:
        name = os.path.splitext(os.path.basename(f))[0]
        im = crop_square(key(Image.open(f)), size=args.size)
        path = os.path.join(args.out, f"{name}.webp")
        im.save(path, "WEBP", quality=88, method=6)
        print(path, os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    main()
