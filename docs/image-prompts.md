# Пакет промтов для изображений NABI (Gemini / Nano Banana)

## Как работать

1. **Сначала сгенерируй одну картинку-эталон** — иконку категории «Сыворотки» (промт B4). Добейся результата, который нравится.
2. **Все остальные иконки генерируй с этим эталоном** как референсом: прикрепи его к запросу и добавь фразу *"Match the exact style, material, lighting and color of the attached reference image."* Так все 7 иконок будут из одного набора, а не из разных.
3. Фон проси **чисто белый**: Gemini не умеет делать прозрачный PNG. Белый фон я вырежу сам.
4. Сохраняй файлы **с именами из таблиц** и клади в репозиторий в `public/images/raw/` или присылай в чат. Сжатие, обрезку и встраивание делаю я.
5. Если картинка вышла с текстом, логотипом или лишними предметами, перегенерируй. Не исправляй руками.

**Не генерируем:** фото товаров (только настоящие фото, иначе подрываем обещание «оригинал»), лица креаторов и «покупательниц» в отзывах, логотип.

---

## A. Стиль-якорь

Этот абзац уже вшит в каждый промт ниже. Если Gemini уходит в сторону, добавь его отдельной строкой ещё раз.

> Style: glossy translucent 3D render, soft candy-pink glass and jelly material, color palette fuchsia #E4467E, soft pink #FBE6EF, pale lavender #D9C8F0, highlights pure white. Soft diffused studio light from top-left, gentle inner glow, subtle subsurface scattering, very soft contact shadow. Clean, premium Korean beauty aesthetic. No text, no letters, no logos, no brand names, no people.

---

## B. Иконки категорий (7 шт.)

Формат 1:1, 1024×1024, объект по центру, занимает ~65% кадра, белый фон.

| # | Файл | Промт |
|---|---|---|
| B1 | `icon-clean.png` | A single 3D icon of a soft foam cloud with three glossy bubbles rising from it, made of translucent pink jelly glass. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| B2 | `icon-toner.png` | A single 3D icon of a tall rounded cosmetic bottle with a short cap, no label, made of translucent pink glass with liquid visible inside. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| B3 | `icon-essence.png` | A single 3D icon of a large glossy liquid droplet with a small four-point sparkle next to it, translucent pink jelly. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| B4 | `icon-serum.png` | **Эталон.** A single 3D icon of a small dropper bottle with a rubber bulb, one droplet falling from the pipette, translucent pink glass, no label. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| B5 | `icon-cream.png` | A single 3D icon of a short round cream jar with the lid slightly open and a smooth swirl of cream visible, translucent pink glass jar, white cream. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| B6 | `icon-spf.png` | A single 3D icon of a rounded shield with a simple sun symbol embossed in the middle, translucent pink glass. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| B7 | `icon-mask.png` | A single 3D icon of a small round jar of cosmetic pads with two soft round pads stacked on top, translucent pink glass jar. *[стиль-якорь]* Centered on a pure white background, 1:1. |

---

## C. Фон главного баннера

Без товаров и без людей: только материал и свет. Левая часть пустая, там будет текст.

| # | Файл | Формат | Промт |
|---|---|---|---|
| C1 | `hero-desktop.png` | 16:9 (если есть 21:9, бери его) | Wide abstract beauty background: a calm surface of pink translucent gel with soft ripples and a few floating glossy droplets and bubbles concentrated on the right third of the frame. Left two thirds stay mostly empty, smooth soft gradient from pale pink #FBE6EF to lavender #D9C8F0, suitable for overlaid headline text. Soft daylight, dreamy, premium Korean skincare mood, shallow depth of field. No products, no text, no logos, no people. |
| C2 | `hero-mobile.png` | 4:5 | Vertical abstract beauty background: pink translucent gel surface with soft ripples and a few glossy droplets in the bottom third of the frame. Top half stays mostly empty, smooth gradient from pale pink #FBE6EF to lavender #D9C8F0, room for headline text. Soft daylight, dreamy, premium Korean skincare mood. No products, no text, no logos, no people. |

---

## D. Баннер «Подберём уход за 1 минуту» (тёмный)

| # | Файл | Формат | Промт |
|---|---|---|---|
| D1 | `quiz-bg.png` | 16:9 | Dark premium background, near-black #111111, with a soft glowing fuchsia #E4467E light bloom in the top-right corner and a few glossy pink glass droplets and tiny sparkles floating on the right side. Left side stays dark and empty for white text. Cinematic, minimal. No text, no logos, no people. |

---

## E. «Почему нам доверяют» (3 иллюстрации)

1:1, 1024×1024, белый фон, тот же стиль, что у иконок (прикрепи эталон B4).

| # | Файл | Промт |
|---|---|---|
| E1 | `trust-check.png` | A 3D illustration of a round magnifying glass made of pink glass hovering over a small cosmetic jar, with a glossy check mark badge floating next to it. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| E2 | `trust-gift.png` | A 3D illustration of an open gift box in soft pink with crinkled white tissue paper inside and a small round sticker on the lid, a little butterfly shape resting on the edge. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| E3 | `trust-delivery.png` | A 3D illustration of a closed pink shipping box with a glossy speed trail behind it and a small clock icon floating above, conveying next-day delivery. *[стиль-якорь]* Centered on a pure white background, 1:1. |

---

## F. Подписка на Telegram

| # | Файл | Формат | Промт |
|---|---|---|---|
| F1 | `subscribe.png` | 1:1 | A 3D illustration of a paper airplane made of glossy translucent pink glass flying upward, leaving a soft dotted trail, with two small floating percent-sign badges in pink jelly. *[стиль-якорь]* Centered on a pure white background, 1:1. |

---

## G. Пустые состояния

| # | Файл | Формат | Промт |
|---|---|---|---|
| G1 | `empty-cart.png` | 1:1 | A 3D illustration of an empty shopping bag made of translucent pink glass with handles, slightly tilted, a couple of tiny sparkles around it. *[стиль-якорь]* Centered on a pure white background, 1:1. |
| G2 | `empty-search.png` | 1:1 | A 3D illustration of a pink glass magnifying glass with a few soft bubbles drifting out of the lens, playful. *[стиль-якорь]* Centered on a pure white background, 1:1. |

---

## H. Шапки категорий в каталоге (по желанию)

Фон для верхнего блока страницы категории. 16:9, текстура справа, слева пусто.

| # | Файл | Промт (общий, меняется только материал) |
|---|---|---|
| H1–H7 | `cat-clean.png`, `cat-toner.png`, `cat-essence.png`, `cat-serum.png`, `cat-cream.png`, `cat-spf.png`, `cat-mask.png` | Macro texture shot of **[МАТЕРИАЛ]** on the right third of the frame, the rest is a smooth light background #F7F6F9 with a very soft pink tint. Clean beauty editorial lighting, high detail. No products, no packaging, no text, no logos. |

Материалы: clean — *rich white foam with tiny bubbles*; toner — *splash of clear water with droplets*; essence — *a glossy clear gel drop with light refraction*; serum — *golden-pink serum drops on glass*; cream — *a smooth swirl of thick white cream*; spf — *soft sunlight rays with a light milky lotion smear*; mask — *soft cotton pads stacked with a light essence sheen*.

---

## I. Картинка для ссылок в соцсетях

| # | Файл | Формат | Промт |
|---|---|---|---|
| I1 | `og-image.png` | 1200×630 (≈1.91:1, если нет, бери 16:9) | Soft pink and lavender gradient background with a cluster of glossy pink glass skincare shapes (dropper, jar, droplets) on the right side, left half empty for the store name. *[стиль-якорь]* |

---

## Чек-лист перед отправкой мне

- [ ] Нет текста, букв, логотипов и надписей на картинке
- [ ] Иконки B1–B7 выглядят как один набор (один материал, свет, угол)
- [ ] Фон у иконок и иллюстраций чисто белый, без теней на краях кадра
- [ ] У фонов C/D/H пустая сторона действительно пустая
- [ ] Имена файлов как в таблицах
