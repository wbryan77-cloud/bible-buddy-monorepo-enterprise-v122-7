#!/usr/bin/env python3
"""
Volume 1 Phase 3 — complete interior reading-proof builder.
Tool lock: HTML + headless Chrome (proven Phase 2 pipeline), hardened.
Fonts: Literata (OFL) + Noto Serif Hebrew (OFL) + Noto Serif fallback.
Does NOT modify frozen 04_FULL.md sources.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[5]  # monorepo root via production/volume1
# __file__ = .../production/volume1/build_full_interior.py → parents: volume1, production, publishing, bookbuddy-build, docs, REPO
# parents[0]=volume1, [1]=production, [2]=publishing, [3]=bookbuddy-build, [4]=docs, [5]=repo
PROD = Path(__file__).resolve().parent
MS_ROOT = REPO / "docs/bookbuddy-build/publishing/manuscript/volume1"
FONTS = PROD / "fonts"
DERIVED = PROD / "derived"
PROOFS = PROD / "proofs"
OUTPUT = PROD / "output"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CHAPTERS = [
    ("00", "ch00_introduction", "Introduction"),
    ("01", "ch01_mind_wont_quiet", "When your mind won’t quiet"),
    ("02", "ch02_person_becoming", "The person you’re becoming"),
    ("03", "ch03_small_faithfulness", "Small faithfulness"),
    ("04", "ch04_money_kitchen_table", "Money on the kitchen table"),
    ("05", "ch05_who_you_let_close", "Who you let close"),
    ("06", "ch06_when_life_hurts", "When life hurts"),
    ("07", "ch07_open_bible", "How to open the Bible"),
    ("08", "ch08_what_god_is_like", "What God is like"),
    ("09", "ch09_prayer_tells_truth", "Prayer that tells the truth"),
    ("10", "ch10_rule_of_life", "A rule of life"),
    ("11", "ch11_leaving_a_mark", "Leaving a mark"),
    ("12", "ch12_monday_morning", "Beginning again on Monday morning"),
]

LENA_PEAK = "I’m still here. It’s still hard. God is still God."
LENA_PEAK_ALT = "I'm still here. It's still hard. God is still God."


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def esc(s: str) -> str:
    return html.escape(s)


def inline_fmt(s: str) -> str:
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    # Hebrew / Greek spans
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


def md_to_blocks(text: str):
    lines = text.splitlines()
    blocks = []
    buf = []
    table_rows = []

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
            flush_para()
            flush_table()
            blocks.append(("hr", ""))
            i += 1
            continue
        if line.startswith("# "):
            flush_para()
            flush_table()
            blocks.append(("h1", line[2:].strip()))
            i += 1
            continue
        if line.startswith("## "):
            flush_para()
            flush_table()
            blocks.append(("h2", line[3:].strip()))
            i += 1
            continue
        if line.startswith("### "):
            flush_para()
            flush_table()
            blocks.append(("h3", line[4:].strip()))
            i += 1
            continue
        if line.startswith(">"):
            flush_para()
            flush_table()
            q = []
            while i < len(lines) and lines[i].startswith(">"):
                q.append(lines[i].lstrip("> ").rstrip())
                i += 1
            blocks.append(("quote", " ".join(q)))
            continue
        if re.match(r"^\|.*\|$", line.strip()) and "---" not in line:
            flush_para()
            row = [c.strip() for c in line.strip().strip("|").split("|")]
            if i + 1 < len(lines) and re.match(r"^\|?\s*[-:| ]+\|", lines[i + 1]):
                i += 2
                table_rows.append(row)
                while (
                    i < len(lines)
                    and re.match(r"^\|.*\|$", lines[i].strip())
                    and "---" not in lines[i]
                ):
                    table_rows.append(
                        [c.strip() for c in lines[i].strip().strip("|").split("|")]
                    )
                    i += 1
                flush_table()
                continue
            i += 1
            continue
        if re.match(r"^[-*] ", line):
            flush_para()
            flush_table()
            items = []
            while i < len(lines) and re.match(r"^[-*] ", lines[i]):
                items.append(lines[i][2:].strip())
                i += 1
            blocks.append(("ul", items))
            continue
        if re.match(r"^\d+\. ", line):
            flush_para()
            flush_table()
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                items.append(re.sub(r"^\d+\. ", "", lines[i]).strip())
                i += 1
            blocks.append(("ol", items))
            continue
        if not line.strip():
            flush_para()
            flush_table()
            i += 1
            continue
        buf.append(line.strip())
        i += 1
    flush_para()
    flush_table()
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
    keys = (
        "Exodus 34",
        "Lamentations 3:22",
        "Romans 8:18",
        "Philippians 4",
        "Hebrews 4:14",
        "John 1:1",
        "Job 2:13",
    )
    blob = cite + " " + body
    return any(k in blob for k in keys)


def render_blocks(blocks, chap_num: str) -> str:
    out = []
    for typ, content in blocks:
        if typ == "h1":
            continue  # handled by opener
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
                out.append(
                    f'<p class="ital-alone"><em>{esc(content.strip("*"))}</em></p>'
                )
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
                out.append(
                    f'<blockquote class="scripture"><p>{inline_fmt(content)}</p></blockquote>'
                )
        elif typ == "ul":
            out.append(
                "<ul>" + "".join(f"<li>{inline_fmt(x)}</li>" for x in content) + "</ul>"
            )
        elif typ == "ol":
            out.append(
                "<ol>" + "".join(f"<li>{inline_fmt(x)}</li>" for x in content) + "</ol>"
            )
        elif typ == "table":
            rows = content
            out.append(
                '<table class="compare"><thead><tr>'
                + "".join(f"<th>{inline_fmt(c)}</th>" for c in rows[0])
                + "</tr></thead><tbody>"
            )
            for r in rows[1:]:
                out.append(
                    "<tr>" + "".join(f"<td>{inline_fmt(c)}</td>" for c in r) + "</tr>"
                )
            out.append("</tbody></table>")
        elif typ == "hr":
            out.append('<hr class="scene"/>')
    # close any open ol-insight naively: if odd opens, close at end
    html_s = "\n".join(out)
    if html_s.count('<div class="ol-insight">') > html_s.count("</div>"):
        html_s += "</div>"
    return html_s


def font_css() -> str:
    def url(name: str) -> str:
        return (FONTS / name).resolve().as_uri()

    return f"""
@font-face {{
  font-family: 'LiterataBook';
  src: url('{url("Literata-Regular.ttf")}') format('truetype');
  font-weight: 400; font-style: normal;
}}
@font-face {{
  font-family: 'LiterataBook';
  src: url('{url("Literata-Italic.ttf")}') format('truetype');
  font-weight: 400; font-style: italic;
}}
@font-face {{
  font-family: 'LiterataBook';
  src: url('{url("Literata-SemiBold.ttf")}') format('truetype');
  font-weight: 600; font-style: normal;
}}
@font-face {{
  font-family: 'LiterataBook';
  src: url('{url("Literata-Bold.ttf")}') format('truetype');
  font-weight: 700; font-style: normal;
}}
@font-face {{
  font-family: 'LiterataBook';
  src: url('{url("Literata-BoldItalic.ttf")}') format('truetype');
  font-weight: 700; font-style: italic;
}}
@font-face {{
  font-family: 'NotoSerifHebrew';
  src: url('{url("NotoSerifHebrew-Regular.ttf")}') format('truetype');
  font-weight: 400; font-style: normal;
}}
@font-face {{
  font-family: 'NotoSerifFallback';
  src: url('{url("NotoSerif-Regular.ttf")}') format('truetype');
  font-weight: 400; font-style: normal;
}}
@font-face {{
  font-family: 'NotoSerifFallback';
  src: url('{url("NotoSerif-Italic.ttf")}') format('truetype');
  font-weight: 400; font-style: italic;
}}
"""


def book_css() -> str:
    return font_css() + r"""
@page {
  size: 6in 9in;
  margin: 0.75in 0.80in 0.90in 0.90in;
}
@page :left {
  margin-left: 0.80in;
  margin-right: 0.90in;
}
@page :right {
  margin-left: 0.90in;
  margin-right: 0.80in;
}
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  color: #111;
  background: #fff;
  font-family: 'LiterataBook', 'NotoSerifFallback', 'Times New Roman', serif;
  font-size: 10.8pt;
  line-height: 1.48;
  hyphens: auto;
  -webkit-hyphens: auto;
  text-rendering: optimizeLegibility;
}
.page-break { page-break-before: always; break-before: page; }
.chapter {
  page-break-before: always;
}
.chapter-opener {
  padding-top: 1.55in;
}
.chapter.ch-06 .chapter-opener { padding-top: 1.9in; }
.chap-num {
  font-size: 10pt; letter-spacing: 0.14em; text-transform: uppercase;
  font-weight: 600; color: #333; margin: 0 0 0.55em; text-indent: 0;
}
.chapter-title {
  font-size: 17pt; font-weight: 600; line-height: 1.25;
  margin: 0 0 1.25em; max-width: 28em; text-indent: 0;
}
h2 {
  font-size: 11.2pt; font-weight: 600; margin: 1.3em 0 0.5em; line-height: 1.3;
  page-break-after: avoid;
}
h2.h2-furniture {
  font-variant: small-caps; letter-spacing: 0.045em; font-weight: 600;
  font-size: 10.2pt; color: #222;
}
h2.h2-return {
  font-variant: small-caps; font-weight: 600; font-size: 10pt;
  color: #333; margin-top: 1.7em;
}
h2.h2-monday { font-size: 11pt; }
h2.h2-g2r {
  font-size: 11pt; border-top: 0.4pt solid #999; padding-top: 0.5em;
}
h2.h2-frame { font-size: 11.2pt; }
h2.h2-question { font-size: 11.5pt; }
h2.h2-ol { font-size: 10.5pt; font-weight: 600; }
h3 { font-size: 10.4pt; font-weight: 600; margin: 1em 0 0.4em; page-break-after: avoid; }
p { margin: 0 0 0.65em; text-align: justify; text-indent: 1.15em; orphans: 2; widows: 2; }
p:first-of-type, h1+p, h2+p, h3+p, blockquote+p, .chapter-opener p,
.ital-alone, .lena-isolated, .note-sm, .chap-num, .chapter-title, .placeholder p, .front p {
  text-indent: 0;
}
.ital-alone { margin: 1em 0; }
blockquote.scripture {
  margin: 0.95em 0 1.1em 1.05em; padding: 0; border: none;
  font-style: normal; font-size: 10.15pt; line-height: 1.45;
  page-break-inside: avoid;
}
blockquote.scripture p { text-indent: 0; margin: 0 0 0.3em; text-align: left; }
blockquote.scripture cite {
  display: block; font-style: normal; font-size: 9pt; color: #333; margin-top: 0.15em;
}
blockquote.scripture-key {
  margin: 1.25em 0 1.35em 0.85em; padding: 0.5em 0 0.5em 0.7em;
  border-left: 0.6pt solid #666;
}
hr.scene { border: none; border-top: 0.4pt solid #bbb; width: 28%; margin: 1.3em auto; }
ul, ol { margin: 0.35em 0 0.85em 1.15em; padding: 0; }
li { margin: 0.22em 0; text-align: justify; }
table.compare {
  width: 100%; border-collapse: collapse; margin: 0.95em 0 1.1em; font-size: 9.4pt;
  page-break-inside: avoid;
}
table.compare th, table.compare td {
  border-top: 0.4pt solid #999; border-bottom: 0.4pt solid #ccc;
  padding: 0.32em 0.35em; vertical-align: top; text-align: left;
}
table.compare th { font-variant: small-caps; letter-spacing: 0.03em; font-weight: 600; }
.lena-isolated {
  margin: 1.55em 0 1.65em; padding: 0.3em 0; font-size: 11pt; line-height: 1.5;
}
.ol-insight {
  margin: 0.85em 0 1.1em; padding: 0.45em 0 0.45em 0.65em;
  border-left: 0.5pt solid #777;
}
.he {
  font-family: 'NotoSerifHebrew', 'LiterataBook', serif;
  font-size: 1.05em;
}
.el {
  font-family: 'LiterataBook', 'NotoSerifFallback', serif;
}
.front-half {
  page-break-after: always; padding-top: 2.7in; text-align: center;
}
.front-title {
  page-break-after: always; padding-top: 2.1in; text-align: center;
}
.front-title h1 { font-size: 20pt; margin: 0 0 0.4em; text-indent: 0; font-weight: 600; }
.toc { page-break-after: always; padding-top: 0.7in; }
.toc h2 { font-variant: small-caps; letter-spacing: 0.08em; }
.toc ul { list-style: none; margin-left: 0; }
.toc li { list-style: none; margin: 0.4em 0; text-indent: 0; text-align: left; }
.placeholder {
  border: 0.4pt dashed #999; padding: 1em; margin: 1em 0; color: #444; font-size: 10pt;
}
.final-quiet {
  page-break-before: always; padding-top: 2.2in; text-align: center;
}
.back-start { page-break-before: always; padding-top: 1.1in; color: #444; }
.note-sm { font-size: 8.5pt; color: #555; margin: 0.4em 0 0.9em; text-indent: 0; }
.badge {
  font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase;
  color: #666; text-indent: 0; margin: 0 0 0.8em;
}
"""


def front_matter_html(toc_items) -> str:
    items = "".join(f"<li>{esc(t)}</li>" for t in toc_items)
    return f"""
<section class="front-half front">
  <p style="letter-spacing:0.14em;text-transform:uppercase;font-size:10pt">BibleBuddy</p>
  <p style="margin-top:1.4em;font-size:13pt">[TITLE — FOUNDER DECISION]</p>
</section>
<section class="front-title front">
  <h1>[TITLE — FOUNDER DECISION]</h1>
  <p>[SUBTITLE — FOUNDER DECISION]</p>
  <div class="placeholder" style="margin-top:2em;text-align:left">
    <p>[COPYRIGHT / IMPRINT / ISBN — FOUNDER DECISION]</p>
    <p>[DEDICATION — OPTIONAL / FOUNDER DECISION]</p>
  </div>
</section>
<section class="toc">
  <h2>Contents</h2>
  <ul>{items}</ul>
  <p class="note-sm">Chapter 00 is the introduction experience.</p>
</section>
"""


def chapter_html(num: str, folder: str, short: str, md: str) -> str:
    blocks = md_to_blocks(md)
    title = short
    for typ, content in blocks:
        if typ == "h1":
            # Prefer full manuscript title when present
            title = content
            # strip leading "Introduction — " style duplication for display if needed
            break
    opener_blocks = []
    rest = []
    seen_h2 = False
    for b in blocks:
        if b[0] == "h1":
            continue
        if b[0] == "h2":
            seen_h2 = True
        (rest if seen_h2 else opener_blocks).append(b)
    # First story paras in opener (until enough text or hit length)
    opener_html = render_blocks(opener_blocks, num)
    rest_html = render_blocks(rest, num)
    quiet = " ch-06" if num == "06" else ""
    return f"""
<section class="chapter{quiet}" id="ch{num}">
  <div class="chapter-opener">
    <p class="chap-num">Chapter {esc(num)}</p>
    <h1 class="chapter-title">{inline_fmt(title)}</h1>
    {opener_html}
  </div>
  {rest_html}
</section>
"""


def wrap(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>{esc(title)}</title>
<style>{book_css()}</style>
</head>
<body>
<p class="badge">BookBuddy Volume 1 · Direction C + A governor · 6×9 reading proof · Literata OFL</p>
{body}
</body>
</html>"""


def chrome_pdf(html_path: Path, pdf_path: Path) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path.resolve()}",
        html_path.resolve().as_uri(),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not pdf_path.exists():
        raise RuntimeError(f"Chrome PDF failed: {r.stderr[-2000:]}")


def pdf_pages(pdf_path: Path) -> int:
    return len(re.findall(rb"/Type\s*/Page\b", pdf_path.read_bytes()))


def assemble_manifest() -> list[dict]:
    DERIVED.mkdir(parents=True, exist_ok=True)
    rows = []
    for order, (num, folder, short) in enumerate(CHAPTERS, start=1):
        src = MS_ROOT / folder / "04_FULL.md"
        data = src.read_bytes()
        dest = DERIVED / f"{num}_{folder}_DERIVED.md"
        dest.write_bytes(data)  # exact byte copy
        rows.append(
            {
                "order": order,
                "chapter": num,
                "folder": folder,
                "short_title": short,
                "source": str(src.relative_to(REPO)),
                "derived": str(dest.relative_to(REPO)),
                "sha256": sha256_bytes(data),
                "bytes": len(data),
            }
        )
    return rows


def build_book(chapter_filter: set[str] | None, out_html: Path, out_pdf: Path, label: str):
    toc = []
    parts = []
    selected = []
    for num, folder, short in CHAPTERS:
        if chapter_filter and num not in chapter_filter:
            continue
        selected.append((num, folder, short))
        md = (DERIVED / f"{num}_{folder}_DERIVED.md").read_text(encoding="utf-8")
        # title from first h1
        title = short
        m = re.match(r"^#\s+(.+)$", md, re.M)
        if m:
            title = m.group(1).strip()
        toc.append(f"{num} — {title}")
        parts.append(chapter_html(num, folder, short, md))

    body = front_matter_html(toc)
    body += "\n".join(parts)
    body += """
<section class="final-quiet">
  <p class="note-sm">[intentional quiet after literary ending]</p>
</section>
<section class="back-start">
  <h2>Back matter</h2>
  <div class="placeholder">
    <p>[Notes / source statements — FOUNDER DECISION]</p>
    <p>[Series note — after emotional ending only]</p>
    <p>No companion product grid. No invented About the Author. No endorsements.</p>
  </div>
</section>
"""
    out_html.write_text(wrap(label, body), encoding="utf-8")
    chrome_pdf(out_html, out_pdf)
    return selected, pdf_pages(out_pdf)


def main():
    PROOFS.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    print("Assembling derived sources + integrity manifest…")
    manifest = assemble_manifest()
    man_path = PROD / "Volume1_ManuscriptIntegrityManifest.md"
    lines = [
        "# Volume 1 — Manuscript Integrity Manifest",
        "",
        f"**Frozen baseline:** `b2d4e63208946e796244c6d5815fc2dba3769d6c`",
        f"**Sources:** exact byte copies into `derived/`",
        f"**Count:** {len(manifest)}",
        "",
        "| Order | Ch | Source | SHA-256 | Bytes |",
        "|---:|---|---|---|---:|",
    ]
    for r in manifest:
        lines.append(
            f"| {r['order']} | {r['chapter']} | `{r['source']}` | `{r['sha256']}` | {r['bytes']} |"
        )
    lines.append("")
    lines.append("**Integrity rule:** derived == frozen source bytes. No editorial cleanup.")
    man_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    (PROD / "config" / "integrity_manifest.json").parent.mkdir(parents=True, exist_ok=True)
    (PROD / "config" / "integrity_manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    # verify byte identity
    for r in manifest:
        src = REPO / r["source"]
        der = REPO / r["derived"]
        assert src.read_bytes() == der.read_bytes(), r["source"]

    print("Internal technical proof (ch00/06/08/12)…")
    proof_html = PROOFS / "Volume1_InternalTechnicalProof.html"
    proof_pdf = PROOFS / "Volume1_InternalTechnicalProof.pdf"
    _, proof_pages = build_book({"00", "06", "08", "12"}, proof_html, proof_pdf, "Internal Technical Proof")
    print(f"  proof pages={proof_pages}")

    # Quick glyph checks in HTML
    html_txt = proof_html.read_text(encoding="utf-8")
    checks = {
        "hebrew_script": "חֶסֶד" in html_txt,
        "hesed_latin": "ḥesed" in html_txt or "Ḥesed" in html_txt,
        "greek_sample": "φρουρήσει" in html_txt or "διανοίγω" in html_txt or "παρρησίας" in html_txt or "stoicheō" in html_txt or "μεταμορφοῦσθε" in html_txt,
        "lena_peak": LENA_PEAK in html_txt or LENA_PEAK_ALT in html_txt,
        "literata_face": "LiterataBook" in html_txt,
        "noto_hebrew_face": "NotoSerifHebrew" in html_txt,
    }
    print("  checks", checks)
    if not all([checks["hebrew_script"], checks["lena_peak"], checks["literata_face"]]):
        print("INTERNAL PROOF HARD FAIL", checks)
        sys.exit(2)

    print("Building COMPLETE Volume 1 reading proof…")
    full_html = OUTPUT / "BOOKBUDDY_VOLUME1_FULL_READING_PROOF.html"
    full_pdf = OUTPUT / "BOOKBUDDY_VOLUME1_FULL_READING_PROOF.pdf"
    selected, full_pages = build_book(None, full_html, full_pdf, "BookBuddy Volume 1 Full Reading Proof")
    print(f"  full pages={full_pages} chapters={len(selected)}")

    meta = {
        "tool": "HTML + headless Chrome (Phase 2 pipeline hardened)",
        "body_font": "Literata (OFL)",
        "hebrew_font": "Noto Serif Hebrew (OFL)",
        "greek_font": "Literata + Noto Serif fallback (OFL)",
        "trim": "6x9in",
        "margins": {"top": "0.75in", "bottom": "0.90in", "inside": "0.90in", "outside": "0.80in"},
        "proof_pages": proof_pages,
        "full_pages": full_pages,
        "chapters": [n for n, _, _ in selected],
        "checks": checks,
        "full_pdf": str(full_pdf),
        "mediabox_expected": [0, 0, 432, 648],
    }
    data = full_pdf.read_bytes()
    m = re.search(rb"/MediaBox\s*\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]", data)
    meta["mediabox"] = [g.decode() for g in m.groups()] if m else None
    meta["pdf_bytes"] = len(data)
    (OUTPUT / "build_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
