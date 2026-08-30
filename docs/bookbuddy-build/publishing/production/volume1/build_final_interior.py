#!/usr/bin/env python3
"""
Phase 3B — Final interior publication candidate builder.
Derived-layer presentation only. Never modifies frozen 04_FULL.md.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[5]
PROD = Path(__file__).resolve().parent
MS_ROOT = REPO / "docs/bookbuddy-build/publishing/manuscript/volume1"
FONTS = PROD / "fonts"
DERIVED = PROD / "derived"
OUTPUT = PROD / "output"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PY = Path("/tmp/bb-vol1-venv/bin/python")

CHAPTERS = [
    ("00", "ch00_introduction"),
    ("01", "ch01_mind_wont_quiet"),
    ("02", "ch02_person_becoming"),
    ("03", "ch03_small_faithfulness"),
    ("04", "ch04_money_kitchen_table"),
    ("05", "ch05_who_you_let_close"),
    ("06", "ch06_when_life_hurts"),
    ("07", "ch07_open_bible"),
    ("08", "ch08_what_god_is_like"),
    ("09", "ch09_prayer_tells_truth"),
    ("10", "ch10_rule_of_life"),
    ("11", "ch11_leaving_a_mark"),
    ("12", "ch12_monday_morning"),
]

LENA_PEAK = "I’m still here. It’s still hard. God is still God."
LENA_PEAK_ALT = "I'm still here. It's still hard. God is still God."


def sha256_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def esc(s: str) -> str:
    return html.escape(s)


def inline_fmt(s: str) -> str:
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    s = re.sub(
        r"([\u0590-\u05FF\uFB1D-\uFB4F]+(?:[\u0590-\u05FF\uFB1D-\uFB4F\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]*)*)",
        r'<span class="he" dir="rtl" lang="he">\1</span>',
        s,
    )
    s = re.sub(
        r"([\u0370-\u03FF\u1F00-\u1FFF]+)",
        r'<span class="el" lang="el">\1</span>',
        s,
    )
    return s


def display_title(raw_h1: str, chap_num: str) -> str:
    """Presentation-only: strip redundant Chapter/Introduction em-dash prefix."""
    t = raw_h1.strip()
    t = re.sub(r"^Chapter\s*[—–\-]\s*", "", t)
    t = re.sub(r"^Introduction\s*[—–\-]\s*", "", t)
    return t


def chap_label(num: str) -> str:
    if num == "00":
        return "Introduction"
    return f"Chapter {num}"


def md_to_blocks(text: str):
    lines = text.splitlines()
    blocks, buf, table_rows = [], [], []

    def flush_para():
        nonlocal buf
        if buf:
            blocks.append(("p", " ".join(buf)))
            buf = []

    def flush_table():
        nonlocal table_rows
        if table_rows:
            blocks.append(("table", table_rows[:]))
            table_rows = []

    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip() == "---":
            flush_para(); flush_table(); blocks.append(("hr", "")); i += 1; continue
        if line.startswith("# "):
            flush_para(); flush_table(); blocks.append(("h1", line[2:].strip())); i += 1; continue
        if line.startswith("## "):
            flush_para(); flush_table(); blocks.append(("h2", line[3:].strip())); i += 1; continue
        if line.startswith("### "):
            flush_para(); flush_table(); blocks.append(("h3", line[4:].strip())); i += 1; continue
        if line.startswith(">"):
            flush_para(); flush_table()
            q = []
            while i < len(lines) and lines[i].startswith(">"):
                q.append(lines[i].lstrip("> ").rstrip()); i += 1
            blocks.append(("quote", " ".join(q))); continue
        if re.match(r"^\|.*\|$", line.strip()) and "---" not in line:
            flush_para()
            row = [c.strip() for c in line.strip().strip("|").split("|")]
            if i + 1 < len(lines) and re.match(r"^\|?\s*[-:| ]+\|", lines[i + 1]):
                i += 2
                table_rows.append(row)
                while i < len(lines) and re.match(r"^\|.*\|$", lines[i].strip()) and "---" not in lines[i]:
                    table_rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                    i += 1
                flush_table(); continue
            i += 1; continue
        if re.match(r"^[-*] ", line):
            flush_para(); flush_table()
            items = []
            while i < len(lines) and re.match(r"^[-*] ", lines[i]):
                items.append(lines[i][2:].strip()); i += 1
            blocks.append(("ul", items)); continue
        if re.match(r"^\d+\. ", line):
            flush_para(); flush_table()
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                items.append(re.sub(r"^\d+\. ", "", lines[i]).strip()); i += 1
            blocks.append(("ol", items)); continue
        if not line.strip():
            flush_para(); flush_table(); i += 1; continue
        buf.append(line.strip()); i += 1
    flush_para(); flush_table()
    return blocks


def classify_h2(title: str) -> str:
    low = title.lower()
    if "you’ve probably heard" in low or "you've probably heard" in low:
        return "h2-furniture"
    if "story return" in low:
        return "h2-return"
    if "monday morning" in low:
        return "h2-monday"
    if "line upon line" in low:
        return "h2-g2r"
    if "what this does not mean" in low:
        return "h2-furniture"
    if "named frame" in low:
        return "h2-frame"
    if "what the word actually says" in low:
        return "h2-ol"
    if low.startswith("what are you really asking"):
        return "h2-question"
    return "h2"


def is_key_scripture(cite: str, body: str) -> bool:
    keys = ("Exodus 34", "Lamentations 3:22", "Romans 8:18", "Philippians 4",
            "Hebrews 4:14", "John 1:1", "Job 2:13")
    blob = cite + " " + body
    return any(k in blob for k in keys)


def render_blocks(blocks, chap_num: str) -> str:
    out = []
    for typ, content in blocks:
        if typ == "h1":
            continue
        if typ == "h2":
            cls = classify_h2(content)
            out.append(f'<h2 class="{cls}">{inline_fmt(content)}</h2>')
            if cls == "h2-ol":
                out.append('<div class="ol-insight">')
        elif typ == "h3":
            out.append(f"<h3>{inline_fmt(content)}</h3>")
        elif typ == "p":
            peak = LENA_PEAK in content or LENA_PEAK_ALT in content
            if peak and chap_num == "06":
                out.append(f'<p class="lena-isolated">{inline_fmt(content)}</p>')
            elif content.startswith("*") and content.endswith("*") and content.count("*") == 2:
                out.append(f'<p class="ital-alone"><em>{esc(content.strip("*"))}</em></p>')
            else:
                out.append(f"<p>{inline_fmt(content)}</p>")
        elif typ == "quote":
            m = re.search(r"\(([^)]+, KJV)\)\s*$", content)
            if m:
                body = content[: m.start()].strip().strip('"').strip("“”")
                cite = m.group(1)
                cls = "scripture scripture-key" if is_key_scripture(cite, body) else "scripture"
                out.append(
                    f'<blockquote class="{cls}"><p>{inline_fmt(body)}</p>'
                    f"<cite>{esc(cite)}</cite></blockquote>"
                )
            else:
                out.append(f'<blockquote class="scripture"><p>{inline_fmt(content)}</p></blockquote>')
        elif typ == "ul":
            out.append("<ul>" + "".join(f"<li>{inline_fmt(x)}</li>" for x in content) + "</ul>")
        elif typ == "ol":
            out.append("<ol>" + "".join(f"<li>{inline_fmt(x)}</li>" for x in content) + "</ol>")
        elif typ == "table":
            rows = content
            out.append(
                '<table class="compare"><thead><tr>'
                + "".join(f"<th>{inline_fmt(c)}</th>" for c in rows[0])
                + "</tr></thead><tbody>"
            )
            for r in rows[1:]:
                out.append("<tr>" + "".join(f"<td>{inline_fmt(c)}</td>" for c in r) + "</tr>")
            out.append("</tbody></table>")
        elif typ == "hr":
            out.append('<hr class="scene"/>')
    html_s = "\n".join(out)
    if html_s.count('<div class="ol-insight">') > html_s.count("</div>"):
        html_s += "</div>"
    return html_s


def font_css() -> str:
    def url(name: str) -> str:
        return (FONTS / name).resolve().as_uri()

    return f"""
@font-face {{ font-family:'LiterataBook'; src:url('{url("Literata-Regular.ttf")}') format('truetype'); font-weight:400; font-style:normal; }}
@font-face {{ font-family:'LiterataBook'; src:url('{url("Literata-Italic.ttf")}') format('truetype'); font-weight:400; font-style:italic; }}
@font-face {{ font-family:'LiterataBook'; src:url('{url("Literata-SemiBold.ttf")}') format('truetype'); font-weight:600; font-style:normal; }}
@font-face {{ font-family:'LiterataBook'; src:url('{url("Literata-Bold.ttf")}') format('truetype'); font-weight:700; font-style:normal; }}
@font-face {{ font-family:'LiterataBook'; src:url('{url("Literata-BoldItalic.ttf")}') format('truetype'); font-weight:700; font-style:italic; }}
@font-face {{ font-family:'NotoSerifHebrew'; src:url('{url("NotoSerifHebrew-Regular.ttf")}') format('truetype'); font-weight:400; font-style:normal; }}
@font-face {{ font-family:'NotoSerifFallback'; src:url('{url("NotoSerif-Regular.ttf")}') format('truetype'); font-weight:400; font-style:normal; }}
@font-face {{ font-family:'NotoSerifFallback'; src:url('{url("NotoSerif-Italic.ttf")}') format('truetype'); font-weight:400; font-style:italic; }}
"""


def book_css() -> str:
    return font_css() + r"""
@page { size: 6in 9in; margin: 0.75in 0.80in 0.90in 0.90in; }
@page :left { margin-left: 0.80in; margin-right: 0.90in; }
@page :right { margin-left: 0.90in; margin-right: 0.80in; }
* { box-sizing: border-box; }
html, body {
  margin:0; padding:0; color:#111; background:#fff;
  font-family:'LiterataBook','NotoSerifFallback','Times New Roman',serif;
  font-size:10.8pt; line-height:1.48; hyphens:auto; -webkit-hyphens:auto;
  text-rendering:optimizeLegibility;
}
.chapter { page-break-before: always; }
.chapter-opener { padding-top: 1.55in; }
.chapter.ch-06 .chapter-opener { padding-top: 1.9in; }
.chap-num {
  font-size:10pt; letter-spacing:0.14em; text-transform:uppercase;
  font-weight:600; color:#333; margin:0 0 0.55em; text-indent:0;
}
.chapter-title {
  font-size:17pt; font-weight:600; line-height:1.25;
  margin:0 0 1.25em; max-width:28em; text-indent:0;
}
h2 { font-size:11.2pt; font-weight:600; margin:1.3em 0 0.5em; line-height:1.3; page-break-after:avoid; }
h2.h2-furniture { font-variant:small-caps; letter-spacing:0.045em; font-weight:600; font-size:10.2pt; color:#222; }
h2.h2-return { font-variant:small-caps; font-weight:600; font-size:10pt; color:#333; margin-top:1.7em; }
h2.h2-monday { font-size:11pt; }
h2.h2-g2r { font-size:11pt; border-top:0.4pt solid #999; padding-top:0.5em; }
h2.h2-frame { font-size:11.2pt; }
h2.h2-question { font-size:11.5pt; }
h2.h2-ol { font-size:10.5pt; font-weight:600; }
h3 { font-size:10.4pt; font-weight:600; margin:1em 0 0.4em; page-break-after:avoid; }
p { margin:0 0 0.65em; text-align:justify; text-indent:1.15em; orphans:3; widows:3; }
p:first-of-type, h2+p, h3+p, blockquote+p, .chapter-opener p,
.ital-alone, .lena-isolated, .note-sm, .chap-num, .chapter-title, .placeholder p, .front p, .toc li {
  text-indent:0;
}
.ital-alone { margin:1em 0; }
blockquote.scripture {
  margin:0.95em 0 1.1em 1.05em; padding:0; border:none;
  font-style:normal; font-size:10.15pt; line-height:1.45; page-break-inside:avoid;
}
blockquote.scripture p { text-indent:0; margin:0 0 0.3em; text-align:left; }
blockquote.scripture cite { display:block; font-style:normal; font-size:9pt; color:#333; margin-top:0.15em; }
blockquote.scripture-key {
  margin:1.25em 0 1.35em 0.85em; padding:0.5em 0 0.5em 0.7em; border-left:0.6pt solid #666;
}
hr.scene { border:none; border-top:0.4pt solid #bbb; width:28%; margin:1.3em auto; }
ul, ol { margin:0.35em 0 0.85em 1.15em; padding:0; }
li { margin:0.22em 0; text-align:justify; }
table.compare {
  width:100%; border-collapse:collapse; margin:0.95em 0 1.1em; font-size:9.4pt; page-break-inside:avoid;
}
table.compare th, table.compare td {
  border-top:0.4pt solid #999; border-bottom:0.4pt solid #ccc;
  padding:0.32em 0.35em; vertical-align:top; text-align:left;
}
table.compare th { font-variant:small-caps; letter-spacing:0.03em; font-weight:600; }
.lena-isolated { margin:1.55em 0 1.65em; padding:0.3em 0; font-size:11pt; line-height:1.5; }
.ol-insight { margin:0.85em 0 1.1em; padding:0.45em 0 0.45em 0.65em; border-left:0.5pt solid #777; }
.he { font-family:'NotoSerifHebrew','LiterataBook',serif; font-size:1.05em; }
.el { font-family:'LiterataBook','NotoSerifFallback',serif; }
.front-half { page-break-after:always; padding-top:2.7in; text-align:center; }
.front-title { page-break-after:always; padding-top:2.0in; text-align:center; }
.front-title h1 { font-size:20pt; margin:0 0 0.35em; text-indent:0; font-weight:600; }
.front-copy { page-break-after:always; padding-top:1.4in; }
.toc { page-break-after:always; padding-top:0.7in; hyphens:none; -webkit-hyphens:none; }
.toc h2 { font-variant:small-caps; letter-spacing:0.08em; font-size:12pt; margin-bottom:1.15em; }
.toc-table { width:100%; border-collapse:collapse; font-size:10.2pt; table-layout:fixed; hyphens:none; -webkit-hyphens:none; }
.toc-table td { padding:0.42em 0; vertical-align:baseline; border-bottom:0.35pt dotted #aaa; }
.toc-table td.toc-title { text-align:left; padding-right:0.55em; width:88%; line-height:1.35; }
.toc-table td.toc-page { text-align:right; width:12%; white-space:nowrap; font-variant-numeric:tabular-nums; vertical-align:bottom; padding-bottom:0.42em; }
.toc-lab { font-variant:small-caps; letter-spacing:0.04em; font-weight:600; }
.placeholder { border:0.4pt dashed #bbb; padding:0.9em; margin:1em 0; color:#555; font-size:9.5pt; }
.final-quiet { page-break-before:always; padding-top:2.2in; text-align:center; }
.back-start { page-break-before:always; padding-top:1.1in; color:#444; }
.note-sm { font-size:8.5pt; color:#666; margin:0.4em 0 0.9em; text-indent:0; }
.marker {
  font-size:0.8pt; color:#ffffff; line-height:1pt;
}
"""


def ensure_derived() -> dict:
    DERIVED.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for num, folder in CHAPTERS:
        src = MS_ROOT / folder / "04_FULL.md"
        data = src.read_bytes()
        dest = DERIVED / f"{num}_{folder}_DERIVED.md"
        dest.write_bytes(data)
        hashes[str(src.relative_to(REPO))] = hashlib.sha256(data).hexdigest()
        assert dest.read_bytes() == data
    return hashes


def load_chapter(num: str, folder: str):
    md = (DERIVED / f"{num}_{folder}_DERIVED.md").read_text(encoding="utf-8")
    blocks = md_to_blocks(md)
    raw_h1 = next((c for t, c in blocks if t == "h1"), folder)
    title = display_title(raw_h1, num)
    return raw_h1, title, blocks


def chapter_html(num: str, folder: str) -> str:
    raw_h1, title, blocks = load_chapter(num, folder)
    opener, rest, seen = [], [], False
    for b in blocks:
        if b[0] == "h1":
            continue
        if b[0] == "h2":
            seen = True
        (rest if seen else opener).append(b)
    quiet = " ch-06" if num == "06" else ""
    # Tiny white marker stays in PDF text layer for TOC pagination (not reader-visible).
    marker = f'<span class="marker">CHAPTER_START_{num}</span>'
    return f"""
<section class="chapter{quiet}" id="ch{num}">
  <div class="chapter-opener">
    <p class="chap-num">{marker}{esc(chap_label(num))}</p>
    <h1 class="chapter-title">{inline_fmt(title)}</h1>
    {render_blocks(opener, num)}
  </div>
  {render_blocks(rest, num)}
</section>
"""


def toc_html(entries: list[tuple[str, str, str | None]]) -> str:
    """entries: (label, title, page_or_None)"""
    rows = []
    for label, title, page in entries:
        pg = esc(str(page)) if page is not None else ""
        if label == "Introduction":
            left = f'<span class="toc-lab">Introduction</span> {inline_fmt(title)}'
        else:
            left = f'<span class="toc-lab">{esc(label)}</span> {inline_fmt(title)}'
        rows.append(
            f'<tr><td class="toc-title">{left}</td>'
            f'<td class="toc-page">{pg}</td></tr>'
        )
    return f"""
<section class="toc" id="toc">
  <h2>Contents</h2>
  <table class="toc-table">{''.join(rows)}</table>
</section>
"""


def front_matter(toc_entries) -> str:
    return f"""
<section class="front-half front">
  <p style="letter-spacing:0.16em;text-transform:uppercase;font-size:10pt">BibleBuddy</p>
  <p style="margin-top:1.6em;font-size:14pt">[TITLE]</p>
</section>
<section class="front-title front">
  <h1>[TITLE]</h1>
  <p style="margin-top:0.4em">[SUBTITLE]</p>
</section>
<section class="front-copy front">
  <div class="placeholder">
    <p>[Copyright / imprint / ISBN — to be supplied]</p>
    <p>[Dedication — optional — to be supplied]</p>
  </div>
</section>
{toc_html(toc_entries)}
"""


def wrap(body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>BibleBuddy Volume 1</title>
<style>{book_css()}</style>
</head>
<body>
{body}
</body>
</html>"""


def chrome_pdf(html_path: Path, pdf_path: Path):
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path.resolve()}", html_path.resolve().as_uri(),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not pdf_path.exists():
        raise RuntimeError(r.stderr[-2000:] or "chrome pdf failed")


def pdf_pages(pdf: Path) -> int:
    return len(re.findall(rb"/Type\s*/Page\b", pdf.read_bytes()))


def find_markers(pdf: Path) -> dict:
    """Return chapter starts and quiet/back markers (1-based PDF pages)."""
    script = r"""
from pypdf import PdfReader
import sys, json, re
reader = PdfReader(sys.argv[1])
found = {}
quiet = None
back = None
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ''
    compact = re.sub(r'\s+', '', text)
    for m in re.finditer(r'CHAPTER_START_(\d{2})', text):
        num = m.group(1)
        if num not in found:
            found[num] = i + 1
    # Fallback: letter-spaced labels from CSS text-transform + letter-spacing
    if '00' not in found and 'INTRODUCTION' in compact.replace(' ', ''):
        # I N T R O D U C T I O N -> INTRODUCTION when spaces removed from whole page may false-positive;
        # require spaced form near top
        head = text[:120]
        if re.search(r'I\s*N\s*T\s*R\s*O\s*D\s*U\s*C\s*T\s*I\s*O\s*N', head):
            found['00'] = i + 1
    for m in re.finditer(r'C\s*H\s*A\s*P\s*T\s*E\s*R\s+(\d)\s*(\d)', text[:160]):
        num = f"{m.group(1)}{m.group(2)}"
        if num not in found:
            found[num] = i + 1
    if quiet is None and 'QUIET_START' in text:
        quiet = i + 1
    if back is None and ('BACK_START' in text or (text.strip().startswith('Notes') and 'to be supplied' in text)):
        back = i + 1
print(json.dumps({"chapters": found, "quiet": quiet, "back": back}))
"""
    r = subprocess.run([str(PY), "-c", script, str(pdf)], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    return json.loads(r.stdout.strip() or "{}")


def find_chapter_pages(pdf: Path) -> dict[str, int]:
    return find_markers(pdf).get("chapters", {})


def folio_map(pdf_pages_count: int, chapter_pdf_pages: dict[str, int]) -> dict:
    """
    Arabic folio 1 begins at Introduction (ch00) PDF page.
    Front matter before that: no folio (or blank).
    """
    start = chapter_pdf_pages.get("00", 5)
    # pages to suppress folios: before start, and final quiet/back if detectable
    suppress = set(range(1, start))  # 1-based pdf pages
    # Also suppress last 2 pages typically quiet+back — refine later via markers if needed
    return {"arabic_start_pdf_page": start, "suppress": sorted(suppress), "total": pdf_pages_count}


def stamp_folios(src_pdf: Path, dest_pdf: Path, arabic_start: int, opener_pages: set[int]):
    """Centered quiet Arabic folios; skip front matter and chapter openers."""
    script = r"""
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from io import BytesIO
import sys, json

src, dest, arabic_start, opener_json = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
openers = set(json.loads(opener_json))
reader = PdfReader(src)
writer = PdfWriter()
W, H = 6 * inch, 9 * inch
for i, page in enumerate(reader.pages):
    pdf_page = i + 1
    if pdf_page >= arabic_start and pdf_page not in openers:
        folio = pdf_page - arabic_start + 1
        packet = BytesIO()
        c = canvas.Canvas(packet, pagesize=(W, H))
        c.setFont('Times-Roman', 9)
        c.setFillGray(0.35)
        c.drawCentredString(W / 2, 0.45 * inch, str(folio))
        c.save()
        packet.seek(0)
        overlay = PdfReader(packet)
        if overlay.pages:
            page.merge_page(overlay.pages[0])
    writer.add_page(page)
with open(dest, 'wb') as f:
    writer.write(f)
print('stamped', len(reader.pages))
"""
    r = subprocess.run(
        [str(PY), "-c", script, str(src_pdf), str(dest_pdf), str(arabic_start), json.dumps(sorted(opener_pages))],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    print(r.stdout.strip())


def build_html(toc_pages: dict[str, int] | None) -> tuple[str, list[tuple[str, str]]]:
    entries = []
    titles = []
    for num, folder in CHAPTERS:
        _, title, _ = load_chapter(num, folder)
        label = "Introduction" if num == "00" else num
        display_label = "Introduction" if num == "00" else f"{num}"
        page = None
        if toc_pages and num in toc_pages:
            # folio number relative to arabic start = ch00 page
            start = toc_pages["00"]
            page = toc_pages[num] - start + 1
        entries.append((display_label if num != "00" else "Introduction", title, page))
        # For TOC label: "Introduction" or "01"
        titles.append((num, title))

    # rebuild entries with cleaner labels
    toc_entries = []
    for num, folder in CHAPTERS:
        _, title, _ = load_chapter(num, folder)
        label = "Introduction" if num == "00" else num.lstrip("0") if num != "00" else "00"
        if num == "00":
            label = "Introduction"
        else:
            label = num  # keep 01, 02 for alignment
        page = None
        if toc_pages and "00" in toc_pages and num in toc_pages:
            page = toc_pages[num] - toc_pages["00"] + 1
        toc_entries.append((label, title, page))

    body = front_matter(toc_entries)
    for num, folder in CHAPTERS:
        body += chapter_html(num, folder)
    body += """
<section class="final-quiet" id="literary-quiet">
  <p class="marker">QUIET_START</p>
  <p class="note-sm">&nbsp;</p>
</section>
<section class="back-start" id="back-matter">
  <p class="marker">BACK_START</p>
  <h2>Notes</h2>
  <div class="placeholder">
    <p>[Notes / source statements — to be supplied]</p>
  </div>
  <h2 style="margin-top:1.4em">Series note</h2>
  <div class="placeholder">
    <p>[Series note — to be supplied]</p>
  </div>
  <h2 style="margin-top:1.4em">About the Author</h2>
  <div class="placeholder">
    <p>[About the Author — to be supplied]</p>
  </div>
</section>
"""
    return wrap(body), titles


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    print("Ensuring derived sources…")
    before_hashes = ensure_derived()

    # Pass 1 — discover chapter PDF pages
    print("Pass 1: pagination discovery…")
    html1, titles = build_html(None)
    html_path = OUTPUT / "_build_pass1.html"
    pdf1 = OUTPUT / "_build_pass1.pdf"
    html_path.write_text(html1, encoding="utf-8")
    chrome_pdf(html_path, pdf1)
    ch_pages = find_chapter_pages(pdf1)
    print("  chapter PDF pages:", ch_pages)
    if len(ch_pages) < 13:
        print("WARNING: missing chapter markers", set(f"{i:02d}" for i in range(13)) - set(ch_pages))

    # Pass 2 — TOC with folio numbers
    print("Pass 2: publication HTML with TOC pages…")
    html2, _ = build_html(ch_pages)
    html_pub = OUTPUT / "BOOKBUDDY_VOLUME1_FINAL_INTERIOR_CANDIDATE.html"
    pdf_raw = OUTPUT / "_final_raw.pdf"
    html_pub.write_text(html2, encoding="utf-8")
    chrome_pdf(html_pub, pdf_raw)

    # Re-detect after TOC change (page shifts possible)
    ch_pages2 = find_chapter_pages(pdf_raw)
    print("  chapter PDF pages after TOC:", ch_pages2)
    if ch_pages2 != ch_pages and len(ch_pages2) == 13:
        # One more pass if TOC length shifted pages
        print("Pass 2b: TOC regenerate after shift…")
        html3, _ = build_html(ch_pages2)
        html_pub.write_text(html3, encoding="utf-8")
        chrome_pdf(html_pub, pdf_raw)
        ch_pages2 = find_chapter_pages(pdf_raw)
        print("  final chapter PDF pages:", ch_pages2)

    markers = find_markers(pdf_raw)
    ch_pages2 = markers.get("chapters", ch_pages2)
    arabic_start = ch_pages2.get("00", 5)
    opener_pages = set(ch_pages2.values())  # suppress folio on chapter openers
    quiet_page = markers.get("quiet")
    back_page = markers.get("back")
    # Suppress folios from literary quiet through end (protect ending silence)
    suppress_from = quiet_page or back_page
    if suppress_from:
        for p in range(suppress_from, pdf_pages(pdf_raw) + 1):
            opener_pages.add(p)

    final_pdf = OUTPUT / "BOOKBUDDY_VOLUME1_FINAL_INTERIOR_CANDIDATE.pdf"
    print("Stamping folios…")
    stamp_folios(pdf_raw, final_pdf, arabic_start, opener_pages)

    after_hashes = {str((MS_ROOT / f / "04_FULL.md").relative_to(REPO)): sha256_file(MS_ROOT / f / "04_FULL.md") for _, f in CHAPTERS}
    pages = pdf_pages(final_pdf)
    meta = {
        "pages": pages,
        "arabic_start_pdf_page": arabic_start,
        "chapter_pdf_pages": ch_pages2,
        "quiet_pdf_page": quiet_page,
        "back_pdf_page": back_page,
        "titles": titles,
        "manuscript_hash_unchanged": before_hashes == after_hashes,
        "running_heads": "OMITTED_BY_DESIGN",
        "folios": "centered Arabic from Introduction; openers + quiet/back suppressed",
    }
    (OUTPUT / "final_interior_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))
    # cleanup intermediates optional keep for debug
    print("DONE", final_pdf)


if __name__ == "__main__":
    main()
