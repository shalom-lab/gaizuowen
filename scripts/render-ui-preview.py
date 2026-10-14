"""Draw a layout preview of the two main screens, following the real design
tokens from src/components and src/utils/annotationMeta.ts.

This is an ILLUSTRATION of the interface (drawn with Pillow) — there is no
browser in this environment. Colors and arrangement mirror the Tailwind classes
actually used, so it reflects the real layout.
"""
import json
import glob
import math
from PIL import Image, ImageDraw, ImageFont


def draw_wavy(d, x0, x1, y, color, amp=2.2, period=7):
    """Wavy underline — the teacher's mark for a sentence worth praising."""
    if x1 <= x0:
        return
    px, py = x0, y
    x = x0
    while x < x1:
        nx = min(x + 1.0, x1)
        ny = y + amp * math.sin((nx - x0) / period * 2 * math.pi)
        d.line([(px, py), (nx, ny)], fill=color, width=2)
        px, py = nx, ny
        x = nx


def pick(cands, size):
    for c in cands:
        if glob.glob(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


KAI = ["C:/Windows/Fonts/simkai.ttf", "C:/Windows/Fonts/STKAITI.TTF"]
UI = ["C:/Windows/Fonts/msyh.ttc"]
UI_B = ["C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/msyh.ttc"]

f_title = pick(UI_B, 25)
f_h = pick(UI_B, 19)
f_body = pick(UI, 14)
f_small = pick(UI, 12)
f_tiny = pick(UI, 10)
f_btn = pick(UI_B, 16)
f_essay = pick(KAI, 18)
f_note = pick(UI, 11)
f_note_b = pick(UI_B, 11)

SLATE_50 = (248, 250, 252)
SLATE_100 = (241, 245, 249)
SLATE_200 = (226, 232, 240)
SLATE_400 = (148, 163, 184)
SLATE_500 = (100, 116, 139)
SLATE_600 = (71, 85, 105)
SLATE_900 = (15, 23, 42)
ROSE_200 = (254, 205, 211)
ROSE_600 = (225, 29, 72)
WHITE = (255, 255, 255)
AMBER_50 = (255, 251, 235)
AMBER_200 = (253, 230, 138)
AMBER_900 = (120, 53, 15)

# Mirrors TYPE_META in src/utils/annotationMeta.ts
TYPE = {
    "typo":        {"bg": (254, 226, 226), "fg": (69, 10, 10), "line": (239, 68, 68), "fix_bg": (254, 242, 242), "fix_fg": (185, 28, 28), "fix_bd": (254, 202, 202), "chip": (220, 38, 38)},
    "grammar":     {"bg": (255, 237, 213), "fg": (67, 20, 7),   "line": (249, 115, 22), "fix_bg": (255, 247, 237), "fix_fg": (194, 65, 12), "fix_bd": (254, 215, 170), "chip": (234, 88, 12)},
    "punctuation": {"bg": (243, 232, 255), "fg": (59, 7, 100),  "line": (168, 85, 247), "fix_bg": (250, 245, 255), "fix_fg": (126, 34, 206), "fix_bd": (233, 213, 255), "chip": (147, 51, 234)},
    "highlight":   {"bg": (254, 243, 199), "fg": (69, 26, 3),   "line": (234, 179, 8),  "fix_bg": (255, 251, 235), "fix_fg": (146, 64, 14), "fix_bd": (253, 230, 138), "chip": (245, 158, 11)},
}
LABEL = {"typo": "错别字", "grammar": "病句", "punctuation": "标点", "highlight": "好句"}

PW, PH = 440, 1010
GAP = 34
W = PW * 2 + GAP + 60
H = PH + 116

img = Image.new("RGB", (W, H), (226, 232, 240))
d = ImageDraw.Draw(img)
d.text((30, 22), "作文批改助手  ·  移动端界面预览(示意图,非截图)", font=f_title, fill=SLATE_900)
d.text((30, 56), "左:上传/收集作文　　右:批改结果 — 原文标注 + 每段下方批注全部展开 + 总评", font=f_body, fill=SLATE_500)


def phone(x, y):
    d.rounded_rectangle([x, y, x + PW, y + PH], radius=26, fill=SLATE_50, outline=SLATE_200, width=2)


def header(x, y, subtitle):
    d.rounded_rectangle([x + 12, y + 12, x + PW - 12, y + 62], radius=14, fill=WHITE, outline=SLATE_200)
    d.rounded_rectangle([x + 26, y + 22, x + 54, y + 50], radius=9, fill=ROSE_600)
    d.text((x + 33, y + 27), "书", font=f_tiny, fill=WHITE)
    d.text((x + 62, y + 22), "作文批改助手", font=f_h, fill=SLATE_900)
    d.text((x + 62, y + 43), subtitle, font=f_tiny, fill=SLATE_400)
    d.ellipse([x + PW - 84, y + 26, x + PW - 66, y + 44], outline=SLATE_400, width=2)
    d.ellipse([x + PW - 50, y + 26, x + PW - 32, y + 44], outline=SLATE_400, width=2)


# ================= LEFT: capture =================
LX, LY = 30, 86
phone(LX, LY)
header(LX, LY, "上传 · 识别 · 批注")

y = LY + 92
d.text((LX + 28, y), "上传作文,生成批注", font=f_title, fill=SLATE_900)
d.text((LX + 28, y + 34), "拍下学生作文,逐字识别后给出可直接抄写的批注", font=f_small, fill=SLATE_500)

y += 80
d.rounded_rectangle([LX + 24, y, LX + PW - 24, y + 74], radius=18, fill=ROSE_600)
d.rounded_rectangle([LX + 42, y + 15, LX + 84, y + 57], radius=12, fill=(244, 63, 94))
d.text((LX + 53, y + 24), "拍", font=f_h, fill=WHITE)
d.text((LX + 100, y + 18), "拍照上传", font=f_btn, fill=WHITE)
d.text((LX + 100, y + 44), "对准作文,拍一页即收录一页", font=f_tiny, fill=(254, 205, 211))

y += 90
d.rounded_rectangle([LX + 24, y, LX + PW - 24, y + 74], radius=18, fill=WHITE, outline=SLATE_200, width=2)
d.rounded_rectangle([LX + 42, y + 15, LX + 84, y + 57], radius=12, fill=SLATE_100)
d.text((LX + 53, y + 24), "图", font=f_h, fill=SLATE_500)
d.text((LX + 100, y + 18), "从相册选择", font=f_btn, fill=SLATE_900)
d.text((LX + 100, y + 44), "可一次选中多张,自动按顺序排列", font=f_tiny, fill=SLATE_500)

y += 104
d.text((LX + 34, y), "多页作文可以连续拍照收录,全部拍完再一起批改", font=f_tiny, fill=SLATE_400)

by = LY + PH - 76
d.rounded_rectangle([LX + 12, by, LX + PW - 12, LY + PH - 12], radius=18, fill=WHITE, outline=SLATE_200)
d.rounded_rectangle([LX + 24, by + 12, LX + PW - 24, by + 52], radius=15, fill=ROSE_600)
d.text((LX + 148, by + 23), "开始批改(4 页)", font=f_btn, fill=WHITE)

# ================= RIGHT: result =================
RX = LX + PW + GAP
phone(RX, LY)
header(RX, LY, "上传 · 识别 · 批注")

data = json.load(open("scripts/fixture-result.json", encoding="utf-8"))
X0 = RX + 26
RIGHT = RX + PW - 26
y = LY + 78

d.text((X0, y), "《" + data["title"] + "》", font=f_h, fill=SLATE_900)
y += 28
d.text((X0, y), f"{data['gradeLevel']} · {data['studentName']} · {data['wordCount']} 字 · {len(data['annotations'])} 处批注", font=f_tiny, fill=SLATE_500)
y += 24

lx = X0
for t in ["typo", "grammar", "punctuation", "highlight"]:
    n = sum(1 for a in data["annotations"] if a["type"] == t)
    if not n:
        continue
    d.ellipse([lx, y + 3, lx + 9, y + 12], fill=TYPE[t]["line"])
    d.text((lx + 15, y), f"{LABEL[t]} {n}", font=f_tiny, fill=SLATE_500)
    lx += 74
y += 24

anns_by_p = {}
for a in data["annotations"]:
    anns_by_p.setdefault(a["paragraphIndex"], []).append(a)
for k in anns_by_p:
    anns_by_p[k].sort(key=lambda a: a["charStart"])

ESSAY_LH = 30
NOTE_LH = 17
BOTTOM = LY + PH - 92


def wrap(text, font, maxw):
    lines, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=font) > maxw:
            lines.append(cur)
            cur = ""
        cur += ch
    if cur:
        lines.append(cur)
    return lines


def draw_paragraph(text, anns, y):
    """Essay line with inline marks + 〔→fix〕, then all notes below."""
    toks = []
    cur = 0
    for a in anns:
        s, e = a["charStart"], a["charEnd"]
        if s < cur or e > len(text):
            continue
        if s > cur:
            toks.append((text[cur:s], None, None))
        toks.append((text[s:e], "mark", a))
        lbl = ("〔→" + a["suggestedText"] + "〕") if a.get("suggestedText") else ("〔" + (a.get("category") or "批注") + "〕")
        toks.append((lbl, "badge", a))
        cur = e
    if cur < len(text):
        toks.append((text[cur:], None, None))

    x = X0
    for tok, kind, a in toks:
        if kind is None:
            f, col = f_essay, (30, 41, 59)
        elif kind == "badge":
            f, col = f_small, TYPE[a["type"]]["fix_fg"]
        else:
            f, col = f_essay, TYPE[a["type"]]["fg"]
        for ch in tok:
            w = d.textlength(ch, font=f)
            if x + w > RIGHT:
                x = X0
                y += ESSAY_LH
                if y > BOTTOM:
                    return y, False
            if kind == "mark":
                t = TYPE[a["type"]]
                d.rectangle([x - 1, y + 3, x + w + 1, y + 22], fill=t["bg"])
                # Straight line = fix, wavy = praise (the teacher's convention).
                if a["type"] == "highlight":
                    draw_wavy(d, x, x + w, y + 24, t["line"])
                else:
                    d.line([(x, y + 24), (x + w, y + 24)], fill=t["line"], width=2)
            elif kind == "badge":
                t = TYPE[a["type"]]
                d.rectangle([x - 1, y + 4, x + w + 1, y + 21], fill=t["fix_bg"], outline=t["fix_bd"])
            d.text((x, y + 3), ch, font=f, fill=col)
            x += w
    y += ESSAY_LH + 4

    # --- notes for this paragraph: a left-bordered stack, fully expanded ---
    if anns:
        d.line([(X0 + 3, y), (X0 + 3, y + len(anns) * 34)], fill=SLATE_200, width=2)
        for a in anns:
            if y > BOTTOM:
                return y, False
            t = TYPE[a["type"]]
            d.ellipse([X0 + 14, y + 1, X0 + 29, y + 16], fill=t["chip"])
            d.text((X0 + 18 if a["order"] > 9 else X0 + 19, y + 2), str(a["order"]), font=f_tiny, fill=WHITE)

            nx = X0 + 36
            d.text((nx, y), a["originalText"], font=f_note, fill=SLATE_500)
            nx += d.textlength(a["originalText"], font=f_note) + 1
            d.line([(X0 + 36, y + 8), (nx, y + 8)], fill=(248, 113, 113))
            if a.get("suggestedText"):
                fix = a["suggestedText"]
                fw = d.textlength(fix, font=f_note_b)
                d.rectangle([nx + 3, y - 2, nx + 9 + fw, y + 13], fill=t["fix_bg"], outline=t["fix_bd"])
                d.text((nx + 6, y), fix, font=f_note_b, fill=t["fix_fg"])
                nx += fw + 12
            else:
                cw = d.textlength(a.get("category", "好句"), font=f_note_b)
                d.rectangle([nx + 3, y - 2, nx + 9 + cw, y + 13], fill=t["fix_bg"], outline=t["fix_bd"])
                d.text((nx + 6, y), a.get("category", "好句"), font=f_note_b, fill=t["fix_fg"])
                nx += cw + 12

            y += NOTE_LH
            for line in wrap(a["explanation"], f_note, RIGHT - nx)[:2]:
                d.text((nx, y), line, font=f_note, fill=SLATE_600)
                y += NOTE_LH
            y += 5
        y += 8
    return y, True


for p in data["paragraphs"]:
    if y > BOTTOM - 40:
        break
    y, ok = draw_paragraph(p["text"], anns_by_p.get(p["paragraphIndex"], []), y)
    if not ok:
        break

# --- summary card ---
sy = LY + PH - 84
d.rounded_rectangle([RX + 12, sy, RX + PW - 12, sy + 62], radius=16, fill=AMBER_50, outline=AMBER_200)
d.text((X0, sy + 9), "★ 总评", font=f_small, fill=AMBER_900)
d.text((X0 + 58, sy + 10), f"{len(data['summaryComment'])} 字", font=f_tiny, fill=(180, 130, 40))
ty = sy + 29
for line in wrap(data["summaryComment"], f_small, PW - 76)[:2]:
    d.text((X0, ty), line, font=f_small, fill=SLATE_600)
    ty += 16

img.save("docs/ui-preview.png")
print("wrote docs/ui-preview.png")
