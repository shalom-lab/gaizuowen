"""Mock of the printable annotation sheet (A4 portrait), drawn with Pillow.

Illustration of src/components/ExportPreview.tsx, not a screenshot — there is no
browser here. Layout, fonts and rules mirror what the print stylesheet produces.
"""
import glob
import json
import math
from PIL import Image, ImageDraw, ImageFont


def pick(cands, size):
    for c in cands:
        if glob.glob(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def draw_wavy(d, x0, x1, y, color, amp=1.8, period=6):
    """Wavy rule — the teacher's mark for a sentence worth praising."""
    if x1 <= x0:
        return
    px, py = x0, y
    x = x0
    while x < x1:
        nx = min(x + 1.0, x1)
        ny = y + amp * math.sin((nx - x0) / period * 2 * math.pi)
        d.line([(px, py), (nx, ny)], fill=color, width=1)
        px, py = nx, ny
        x = nx


SONG = ["C:/Windows/Fonts/simsun.ttc", "C:/Windows/Fonts/simsunb.ttf"]
HEI = ["C:/Windows/Fonts/msyh.ttc"]
HEI_B = ["C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/msyh.ttc"]

f_title = pick(SONG, 30)
f_h2 = pick(HEI_B, 17)
f_meta = pick(HEI, 13)
f_body = pick(SONG, 17)
f_tbl = pick(HEI, 13)
f_tbl_b = pick(HEI_B, 13)
f_tiny = pick(HEI, 11)

INK = (17, 24, 39)
GREY = (90, 100, 115)
LIGHT = (150, 160, 175)
RULE = (40, 48, 62)
CELL = (190, 198, 210)
HEAD_BG = (240, 242, 246)
PRAISE_BG = (255, 251, 235)

# Mirrors EXPORT_INK in ExportPreview.tsx — colour on text and thin rules only,
# so the sheet still reads correctly on a black-and-white school printer.
EXPORT_INK = {
    "typo":        {"line": (185, 28, 28),  "text": (185, 28, 28)},
    "grammar":     {"line": (234, 88, 12),  "text": (194, 65, 12)},
    "punctuation": {"line": (147, 51, 234), "text": (126, 34, 206)},
    "highlight":   {"line": (234, 179, 8),  "text": (180, 83, 9)},
}
LABEL = {"typo": "错别字", "grammar": "病句", "punctuation": "标点", "highlight": "好句"}

# A4 at ~96 dpi
W, H = 794, 1123
M = 56  # page margin

img = Image.new("RGB", (W, H), (255, 255, 255))
d = ImageDraw.Draw(img)

data = json.load(open("scripts/fixture-result.json", encoding="utf-8"))
r = data


def wrap(text, font, maxw):
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur)
            cur = ""
            continue
        if d.textlength(cur + ch, font=font) > maxw:
            lines.append(cur)
            cur = ""
        cur += ch
    if cur:
        lines.append(cur)
    return lines or [""]


y = M

# ---------- header ----------
d.text((W / 2, y), f"《{r['title']}》批注单", font=f_title, fill=INK, anchor="mm")
y += 32

meta = f"学生：{r['studentName']}    年级：{r['gradeLevel']}    字数：{r['wordCount']}    页数：{r.get('pageCount', 1)}"
d.text((W / 2, y + 8), meta, font=f_meta, fill=GREY, anchor="mm")
y += 30
d.line([(M, y), (W - M, y)], fill=RULE, width=2)
y += 14

# ---- score chip, coloured by how good it is ----
score = r["overallScore"]
if score >= 90:
    sbg, stx = (236, 253, 245), (5, 150, 105)
elif score >= 80:
    sbg, stx = (255, 251, 235), (217, 119, 6)
else:
    sbg, stx = (255, 241, 242), (225, 29, 72)
chip = f"{score} 分（{r['letterGrade']}）"
cw = d.textlength(chip, font=f_tbl_b)
d.rounded_rectangle([W / 2 - cw / 2 - 8, y, W / 2 + cw / 2 + 8, y + 20], radius=5, fill=sbg, outline=stx)
d.text((W / 2, y + 10), chip, font=f_tbl_b, fill=stx, anchor="mm")
y += 30

# ---- colour legend ----
lx = M
d.text((lx, y), "色标：", font=f_tiny, fill=(70, 80, 95))
lx += d.textlength("色标：", font=f_tiny)
for t in ["typo", "grammar", "punctuation", "highlight"]:
    if not any(a["type"] == t for a in r["annotations"]):
        continue
    mark = "〰 " if t == "highlight" else "— "
    txt = mark + LABEL[t]
    d.text((lx, y), txt, font=f_tiny, fill=EXPORT_INK[t]["text"])
    lx += d.textlength(txt, font=f_tiny) + 12
d.text((lx, y), "（原文一字未改，〔→〕内为修改建议）", font=f_tiny, fill=LIGHT)
y += 22

# ---------- 一、原文与批注 ----------
def heading(text):
    """Section heading with the left accent rule (mirrors border-l-4 pl-2)."""
    global y
    d.rectangle([M, y + 1, M + 3, y + 17], fill=RULE)
    d.text((M + 12, y), text, font=f_h2, fill=INK)
    y += 26


heading("一、原文与批注")
d.text((M, y), "原文未作改动，〔→　〕内为修改建议；带编号的批注见下表。", font=f_tiny, fill=LIGHT)
y += 22

anns_by_p = {}
for a in r["annotations"]:
    anns_by_p.setdefault(a["paragraphIndex"], []).append(a)
for k in anns_by_p:
    anns_by_p[k].sort(key=lambda a: a["charStart"])

RIGHT = W - M
LH = 30


def draw_paragraph(text, anns):
    """Transcript with a straight underline + 〔→fix〕 bracket, per the pen rule."""
    global y
    toks = []
    cur = 0
    for a in anns:
        s, e = a["charStart"], a["charEnd"]
        if s < cur or e > len(text):
            continue
        if s > cur:
            toks.append((text[cur:s], None, None))
        toks.append((text[s:e], "mark", a))
        lbl = f"〔→{a['suggestedText']}〕" if a.get("suggestedText") else f"〔{a.get('category','好句')}〕"
        toks.append((lbl, "note", a))
        cur = e
    if cur < len(text):
        toks.append((text[cur:], None, None))

    x = M
    for tok, kind, a in toks:
        f = f_tiny if kind == "note" else f_body
        col = EXPORT_INK[a["type"]]["text"] if kind == "note" else INK
        for ch in tok:
            w = d.textlength(ch, font=f)
            if x + w > RIGHT:
                x = M
                y += LH
            if kind == "mark":
                t = EXPORT_INK[a["type"]]
                # Same pen rule as the app: straight = fix, wavy = praise.
                if a["type"] == "highlight":
                    draw_wavy(d, x, x + w, y + 24, t["line"], amp=1.6, period=6)
                else:
                    d.line([(x, y + 24), (x + w, y + 24)], fill=t["line"], width=1)
            d.text((x, y + 2), ch, font=f, fill=col)
            x += w
    y += LH + 8


for p in r["paragraphs"]:
    if y > H - 330:
        break
    draw_paragraph(p["text"], anns_by_p.get(p["paragraphIndex"], []))

y += 8
if y > H - 320:
    d.text((M, y), "（原文接下页）", font=f_tiny, fill=LIGHT)
    y += 22

y += 8

# ---------- 二、批注明细 ----------
heading(f"二、批注明细（共 {len(r['annotations'])} 处）")

cols = [34, 78, 210, RIGHT - M - 34 - 78 - 210]
headers = ["#", "类型", "原文 → 修改", "批语"]
x = M
d.rectangle([M, y, RIGHT, y + 26], fill=HEAD_BG, outline=CELL)
for c, h in zip(cols, headers):
    d.text((x + 7, y + 6), h, font=f_tbl_b, fill=(40, 48, 62))
    x += c
    if x < RIGHT:
        d.line([(x, y), (x, y + 26)], fill=CELL, width=1)
y += 26

for a in sorted(r["annotations"], key=lambda a: a["order"]):
    fix = f"{a['originalText']} → {a['suggestedText']}" if a.get("suggestedText") else a["originalText"]
    cells = [
        wrap(str(a["order"]), f_tbl, cols[0] - 12),
        wrap(a.get("category", ""), f_tbl, cols[1] - 12),
        wrap(fix, f_tbl, cols[2] - 12),
        wrap(a["explanation"], f_tbl, cols[3] - 12),
    ]
    row_h = max(len(c) for c in cells) * 18 + 10
    if y + row_h > H - M - 120:
        break
    ink = EXPORT_INK[a["type"]]
    if a["type"] == "highlight":
        d.rectangle([M, y, RIGHT, y + row_h], fill=PRAISE_BG)
    x = M
    for ci, (c, lines) in enumerate(zip(cols, cells)):
        # Colour the number, the type, and the struck-through original.
        col = ink["text"] if ci in (0, 1) else (INK if ci == 2 else (60, 68, 82))
        for i, ln in enumerate(lines):
            d.text((x + 7, y + 6 + i * 18), ln, font=f_tbl, fill=col)
        x += c
    d.rectangle([M, y, RIGHT, y + row_h], outline=CELL)
    x = M
    for c in cols[:-1]:
        x += c
        d.line([(x, y), (x, y + row_h)], fill=CELL, width=1)
    y += row_h

y += 22

# ---------- 三、总评 ----------
heading("三、总评")
lines = wrap(r["summaryComment"], f_body, RIGHT - M - 24)
box_h = len(lines) * 28 + 22
d.rectangle([M, y, RIGHT, y + box_h], outline=CELL, fill=(249, 250, 252))
for i, ln in enumerate(lines):
    d.text((M + 12, y + 11 + i * 28), ln, font=f_body, fill=INK)

# ---------- footer ----------
d.line([(M, H - M + 6), (W - M, H - M + 6)], fill=(220, 226, 234), width=1)
d.text((W / 2, H - M + 18), "作文批改助手 生成", font=f_tiny, fill=(190, 196, 206), anchor="mm")

img.save("docs/export-preview.png")
print("wrote docs/export-preview.png")
