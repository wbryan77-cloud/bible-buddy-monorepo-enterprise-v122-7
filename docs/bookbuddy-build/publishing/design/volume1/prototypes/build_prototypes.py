#!/usr/bin/env python3
"""Phase 2 prototype builder — derived sources only; does not touch 04_FULL.md."""
from __future__ import annotations

import html
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "source"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def esc(s: str) -> str:
    return html.escape(s)


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


def inline_fmt(s: str) -> str:
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    return s


def render_blocks(blocks, extras=None):
    extras = extras or {}
    out = []
    for typ, content in blocks:
        if typ == "h1":
            out.append(f'<h1 class="chapter-title">{inline_fmt(content)}</h1>')
        elif typ == "h2":
            cls = "h2"
            low = content.lower()
            if "you’ve probably heard" in low or "you've probably heard" in low:
                cls += " h2-furniture"
            elif "story return" in low:
                cls += " h2-return"
            elif "monday morning" in low:
                cls += " h2-monday"
            elif "line upon line" in low:
                cls += " h2-g2r"
            elif "what this does not mean" in low:
                cls += " h2-furniture"
            elif "named frame" in low:
                cls += " h2-frame"
            elif low.startswith("what are you really asking") or low.startswith(
                "what this book"
            ):
                cls += " h2-question"
            out.append(f'<h2 class="{cls}">{inline_fmt(content)}</h2>')
        elif typ == "h3":
            out.append(f"<h3>{inline_fmt(content)}</h3>")
        elif typ == "p":
            peak = (
                "I’m still here. It’s still hard. God is still God." in content
                or "I'm still here. It's still hard. God is still God." in content
            )
            if peak:
                treatment = extras.get("lena", "option1")
                cls = "lena-isolated" if treatment == "option2" else "lena-inline"
                out.append(f'<p class="{cls}">{inline_fmt(content)}</p>')
            elif content.startswith("*") and content.endswith("*") and content.count("*") == 2:
                out.append(f'<p class="ital-alone"><em>{esc(content.strip("*"))}</em></p>')
            else:
                out.append(f"<p>{inline_fmt(content)}</p>")
        elif typ == "quote":
            m = re.search(r"\(([^)]+, KJV)\)\s*$", content)
            if m:
                body = content[: m.start()].strip().strip('"').strip("“”")
                cite = m.group(1)
                out.append(
                    f'<blockquote class="scripture"><p>{inline_fmt(body)}</p>'
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
    return "\n".join(out)


def slice_lines(path: Path, start: int, end: int) -> str:
    lines = read(path).splitlines()
    return "\n".join(lines[start - 1 : end])


CSS_COMMON = r"""
@page {
  size: 6in 9in;
  margin: 0.75in 0.8in 0.9in 0.9in;
}
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  color: #111;
  background: #fff;
  hyphens: auto;
  -webkit-hyphens: auto;
}
.page-break { page-break-before: always; break-before: page; }
.chapter-opener { padding-top: 1.7in; page-break-before: always; }
.chapter-opener .chap-num {
  font-size: 11pt; letter-spacing: 0.12em; text-transform: uppercase;
  margin: 0 0 0.6em; color: #333; text-indent: 0;
}
.chapter-opener .chapter-title {
  font-size: 17.5pt; font-weight: 600; line-height: 1.25;
  margin: 0 0 1.35em; max-width: 28em;
}
h1.chapter-title { font-size: 17.5pt; line-height: 1.25; margin: 0 0 1em; }
h2 { font-size: 11.5pt; font-weight: 600; margin: 1.35em 0 0.55em; line-height: 1.3; }
h2.h2-furniture {
  font-variant: small-caps; letter-spacing: 0.04em; font-weight: 500;
  font-size: 10.5pt; color: #222;
}
h2.h2-return {
  font-variant: small-caps; font-weight: 500; font-size: 10pt;
  color: #333; margin-top: 1.8em;
}
h2.h2-monday { font-size: 11pt; }
h2.h2-g2r {
  font-size: 11pt; border-top: 0.4pt solid #999; padding-top: 0.55em;
}
h2.h2-frame { font-size: 11.5pt; }
h2.h2-question { font-size: 12pt; }
h3 { font-size: 10.5pt; font-weight: 600; margin: 1.1em 0 0.4em; }
p { margin: 0 0 0.68em; text-align: justify; text-indent: 1.15em; }
p:first-of-type, h1+p, h2+p, h3+p, blockquote+p, .chapter-opener p,
.ital-alone, .lena-isolated, .lena-inline, .reflection p, .key-idea p, .note-sm, .proof-label, .chap-num {
  text-indent: 0;
}
.ital-alone { margin: 1.1em 0; font-size: 1.02em; }
blockquote.scripture {
  margin: 1em 0 1.15em 1.1em; padding: 0; border: none;
  font-style: normal; font-size: 10.2pt; line-height: 1.45;
}
blockquote.scripture p { text-indent: 0; margin: 0 0 0.35em; text-align: left; }
blockquote.scripture cite {
  display: block; font-style: normal; font-size: 9pt; color: #333; margin-top: 0.2em;
}
blockquote.scripture-key {
  margin: 1.35em 0 1.45em 0.9em; padding: 0.55em 0 0.55em 0.75em;
  border-left: 0.6pt solid #666;
}
hr.scene { border: none; border-top: 0.4pt solid #bbb; width: 30%; margin: 1.4em auto; }
ul, ol { margin: 0.4em 0 0.9em 1.2em; padding: 0; }
li { margin: 0.25em 0; text-align: justify; }
table.compare {
  width: 100%; border-collapse: collapse; margin: 1em 0 1.2em; font-size: 9.5pt;
  page-break-inside: avoid;
}
table.compare th, table.compare td {
  border-top: 0.4pt solid #999; border-bottom: 0.4pt solid #ccc;
  padding: 0.35em 0.4em; vertical-align: top; text-align: left;
}
table.compare th { font-variant: small-caps; letter-spacing: 0.03em; font-weight: 600; }
.placeholder {
  border: 0.4pt dashed #999; padding: 1.2em; margin: 1em 0; color: #444; font-size: 10pt;
}
.front-half { padding-top: 2.8in; text-align: center; page-break-after: always; }
.front-title { padding-top: 2.2in; text-align: center; page-break-after: always; }
.front-title h1 { font-size: 22pt; margin: 0 0 0.4em; text-indent: 0; }
.toc { page-break-after: always; padding-top: 0.8in; }
.toc ul { list-style: none; margin-left: 0; }
.toc li { list-style: none; margin: 0.45em 0; text-indent: 0; text-align: left; }
.final-quiet { page-break-before: always; padding-top: 1.8in; }
.back-start { page-break-before: always; padding-top: 1.2in; color: #444; }
.proof-label {
  font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase; color: #555;
  margin: 0 0 0.8em; border-bottom: 0.4pt solid #ccc; padding-bottom: 0.3em;
}
.lena-isolated {
  margin: 1.6em 0 1.7em; padding: 0.35em 0; font-size: 11pt; line-height: 1.5;
}
.lena-inline { margin: 0.9em 0; }
.ol-insight {
  margin: 1em 0 1.2em; padding: 0.55em 0 0.55em 0.7em;
  border-left: 0.5pt solid #777; font-size: 10.2pt;
}
.reflection { margin: 1.3em 0 1.4em; }
.reflection .q { font-style: italic; margin: 0.8em 0; }
.reflection .lab, .key-idea .lab, .ol-insight .lab {
  font-variant: small-caps; letter-spacing: 0.06em; font-size: 9pt;
  color: #333; margin: 0 0 0.35em; text-indent: 0;
}
.reflection.rule { border-top: 0.4pt solid #aaa; padding-top: 0.55em; margin-top: 1.4em; }
.key-idea {
  margin: 1.2em 0 1.35em; padding: 0.65em 0.75em;
  border-top: 0.5pt solid #666; border-bottom: 0.5pt solid #666;
}
.he, .el { font-family: "Arial Unicode MS", "NewPeninimMT", "Times New Roman", serif; }
.note-sm { font-size: 8.5pt; color: #444; margin: 0.5em 0 1em; }
.typo-sample { margin-bottom: 1.1em; page-break-inside: avoid; }
.typo-sample h3 { font-size: 10pt; color: #444; font-weight: 500; }
.direction-badge {
  font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase;
  color: #666; text-indent: 0; margin: 0 0 1em;
}
"""

CSS_A = (
    CSS_COMMON
    + """
body {
  font-family: "Baskerville", "Iowan Old Style", "Palatino", "Times New Roman", serif;
  font-size: 11pt; line-height: 1.48;
}
.chapter-opener { padding-top: 2.05in; }
.key-idea { border-top: 0.4pt solid #888; border-bottom: 0.4pt solid #888; padding: 0.5em 0; }
"""
)

CSS_C = (
    CSS_COMMON
    + """
body {
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 10.8pt; line-height: 1.46;
}
.chapter-opener .chap-num { font-variant: small-caps; }
.key-idea { background: #f6f6f6; }
"""
)

CSS_C_ACCENT = (
    CSS_C
    + """
:root { --accent: #3d4f3f; }
.chapter-opener .chap-num { color: var(--accent); }
h2.h2-g2r { border-top-color: var(--accent); }
.key-idea .lab { color: var(--accent); }
"""
)


def wrap_html(title: str, css: str, body: str, direction_name: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>{esc(title)}</title>
<style>{css}</style>
</head>
<body>
<p class="direction-badge">{esc(direction_name)} · Volume 1 Phase 2 Prototype · 6×9 · Grayscale-primary</p>
{body}
</body>
</html>"""


def chapter_opener(num: str, title: str, first_html: str) -> str:
    return f"""
<section class="chapter-opener">
  <p class="chap-num">Chapter {esc(num)}</p>
  <h1 class="chapter-title">{inline_fmt(title)}</h1>
  {first_html}
</section>"""


def split_opener(blocks):
    opener, rest, seen = [], [], False
    for b in blocks:
        if b[0] == "h1":
            continue
        if b[0] == "h2":
            seen = True
        (rest if seen else opener).append(b)
    return opener, rest


def build_body(direction: str, lena_opt: str, ol_mode: str, excerpts: dict) -> str:
    extras = {"lena": lena_opt}
    parts = []

    parts.append(
        """
<section class="front-half">
  <p style="text-indent:0;letter-spacing:0.14em;text-transform:uppercase;font-size:10pt">BibleBuddy</p>
  <p style="text-indent:0;margin-top:1.5em;font-size:14pt">[TITLE — FOUNDER DECISION]</p>
</section>
<section class="front-title">
  <h1>[TITLE — FOUNDER DECISION]</h1>
  <p style="text-indent:0">[SUBTITLE — FOUNDER DECISION]</p>
  <p class="note-sm" style="margin-top:2em">Working reference only · not final packaging</p>
</section>
<section class="toc">
  <h2>Contents (concept)</h2>
  <ul>
    <li>Introduction — Maya</li>
    <li>…</li>
    <li>When the pain does not resolve on schedule</li>
    <li>What God is like from Genesis to Revelation</li>
    <li>…</li>
    <li>Beginning again on Monday morning</li>
  </ul>
  <p class="note-sm">Thin front matter. The introduction experience is Chapter 00.</p>
</section>
"""
    )

    parts.append(
        """
<section class="page-break">
  <p class="proof-label">Typography proof sheet</p>
  <div class="typo-sample">
    <h3>Body narrative</h3>
    <p>Maya sat in the car outside the grocery store for nine minutes with the engine off. It was not a crisis in the movie sense.</p>
  </div>
  <div class="typo-sample">
    <h3>Italic</h3>
    <p class="ital-alone"><em>Is there a way to be a real person—and still know the God of the Bible?</em></p>
  </div>
  <div class="typo-sample">
    <h3>Heading</h3>
    <h2 class="h2-furniture">You’ve probably heard this before</h2>
  </div>
  <div class="typo-sample">
    <h3>Scripture</h3>
    <blockquote class="scripture"><p>It is of the Lord’s mercies that we are not consumed, because his compassions fail not.</p><cite>Lamentations 3:22, KJV</cite></blockquote>
  </div>
  <div class="typo-sample">
    <h3>Greek</h3>
    <p>Nestle 1904: <span class="el">φρουρήσει</span> from <em>phroureō</em> — to mount guard.</p>
  </div>
  <div class="typo-sample">
    <h3>Hebrew</h3>
    <p>OSHB: <span class="he">חֶסֶד</span> (<em>ḥesed</em>) — covenant loyalty.</p>
  </div>
  <div class="typo-sample">
    <h3>Reflection</h3>
    <div class="reflection"><p class="q">What is loneliness trying to make me sign tonight?</p></div>
  </div>
</section>
"""
    )

    parts.append(
        """
<section class="page-break">
  <p class="proof-label">Scripture treatment proof</p>
  <p><strong>Inline reference.</strong> She later read Romans 8 slowly (Romans 8:18–39).</p>
  <p><strong>Short quotation.</strong> An uncle said, “Romans 8:28,” as if the citation had closed the case.</p>
  <p><strong>Full verse / multi-verse block.</strong></p>
  <blockquote class="scripture"><p>For I reckon that the sufferings of this present time are not worthy to be compared with the glory which shall be revealed in us.</p><cite>Romans 8:18, KJV</cite></blockquote>
  <p><strong>Key discovery (hairline, not a box).</strong></p>
  <blockquote class="scripture scripture-key"><p>And the Lord passed by before him, and proclaimed, The Lord, The Lord God, merciful and gracious, longsuffering, and abundant in goodness and truth…</p><cite>Exodus 34:6–7, KJV</cite></blockquote>
  <p><strong>Scripture in story</strong> remains in narrative voice—no sudden liturgical costume mid-scene.</p>
  <p><strong>Genesis→Revelation sequence</strong> uses spaced landmarks in prose, not a timeline poster.</p>
</section>
"""
    )

    parts.append(
        """
<section class="page-break">
  <p class="proof-label">Reflection treatments (max three behaviors)</p>
  <div class="reflection">
    <p class="note-sm">1 · Pure space + question</p>
    <p class="q">Is there a way to be a real person—with real bills, real loneliness, real hope—and still know the God of the Bible without becoming fake, panicked, or preached at?</p>
  </div>
  <div class="reflection rule">
    <p class="lab">Consider</p>
    <p>What would honest hope sound like in one breath this week—without performing resilience?</p>
  </div>
  <div class="reflection rule">
    <p class="lab">Try this</p>
    <p>Change one false label on your phone. Begin again under mercy—not reinvention theater.</p>
  </div>
</section>
"""
    )

    ch00_title = "You are not crazy for wanting a life that works and a God who is real"
    ch06_title = "When the pain does not resolve on schedule"
    ch08_title = "What God is like from Genesis to Revelation"
    ch12_title = "Beginning again on Monday morning"

    # ch00
    opener, rest = split_opener(md_to_blocks(excerpts["ch00_open"]))
    parts.append(chapter_opener("00", ch00_title, render_blocks(opener, extras)))
    parts.append(render_blocks(rest, extras))
    parts.append(render_blocks(md_to_blocks(excerpts["ch00_mid"]), extras))
    if direction == "C":
        parts.append(
            """
<div class="key-idea"><p class="lab">Key idea</p>
<p>Story comes first in the reading experience. Scripture remains first in authority.</p></div>
"""
        )
    parts.append(
        """
<div class="reflection rule">
  <p class="lab">Try this</p>
  <p>Before the week ends: open one ordinary place in your life honestly before God—without performing.</p>
</div>
"""
    )

    # ch06
    opener, rest = split_opener(md_to_blocks(excerpts["ch06_open"]))
    parts.append(chapter_opener("06", ch06_title, render_blocks(opener, extras)))
    parts.append(render_blocks(rest, extras))
    parts.append(render_blocks(md_to_blocks(excerpts["ch06_scripture"]), extras))
    parts.append(f'<p class="proof-label">Lena line treatment · {esc(lena_opt)}</p>')
    parts.append(render_blocks(md_to_blocks(excerpts["ch06_frame"]), extras))
    parts.append(
        '<p class="note-sm">Design note: Chapter 06 uses space, not callout chrome.</p>'
    )

    # ch08
    b08 = [b for b in md_to_blocks(excerpts["ch08_night"]) if b[0] != "h1"]
    parts.append(chapter_opener("08", ch08_title, render_blocks(b08[:4], extras)))
    parts.append(render_blocks(b08[4:], extras))
    hesed_html = render_blocks(md_to_blocks(excerpts["ch08_hesed"]), extras)
    if ol_mode == "B" and direction == "C":
        parts.append('<p class="proof-label">Original-language treatment · OL_TREATMENT_B</p>')
        parts.append(
            '<div class="ol-insight"><p class="lab">Original-language insight</p>'
            + hesed_html
            + "</div>"
        )
    else:
        parts.append(
            '<p class="proof-label">Original-language treatment · OL_TREATMENT_A (inline literary)</p>'
        )
        parts.append(hesed_html)
    parts.append(render_blocks(md_to_blocks(excerpts["ch08_g2r"]), extras))

    # ch12
    opener, rest = split_opener(md_to_blocks(excerpts["ch12_open"]))
    parts.append(chapter_opener("12", ch12_title, render_blocks(opener, extras)))
    parts.append(render_blocks(rest, extras))
    if direction == "C":
        parts.append(
            """
<div class="key-idea"><p class="lab">Key idea · Monday Mercy</p>
<p>Begin again under God’s morning compassions with a keepable walk—without reinvention theater.</p></div>
"""
        )
    parts.append(render_blocks(md_to_blocks(excerpts["ch12_mercy"]), extras))
    parts.append(render_blocks(md_to_blocks(excerpts["ch12_end"]), extras))

    parts.append(
        """
<section class="final-quiet">
  <p class="note-sm" style="text-align:center">[intentional quiet after literary ending]</p>
</section>
<section class="back-start">
  <h2>Back matter begins</h2>
  <div class="placeholder">
    <p style="text-indent:0">[Notes / source statements — FOUNDER DECISION]</p>
    <p style="text-indent:0">[Series note — after emotional ending only]</p>
    <p style="text-indent:0">No companion product grid. No invented About the Author. No endorsements.</p>
  </div>
</section>
"""
    )
    return "\n".join(parts)


def chrome_pdf(html_path: Path, pdf_path: Path) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    uri = html_path.resolve().as_uri()
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path.resolve()}",
        uri,
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)


def pdf_page_count(pdf_path: Path) -> int:
    data = pdf_path.read_bytes()
    # Count /Type /Page entries that are not /Pages
    return len(re.findall(rb"/Type\s*/Page\b", data))


def main():
    excerpts = {
        "ch00_open": slice_lines(SRC / "ch00_introduction_DERIVED.md", 1, 100),
        "ch00_mid": slice_lines(SRC / "ch00_introduction_DERIVED.md", 101, 180),
        "ch06_open": slice_lines(SRC / "ch06_when_life_hurts_DERIVED.md", 1, 80),
        "ch06_scripture": slice_lines(SRC / "ch06_when_life_hurts_DERIVED.md", 110, 180),
        "ch06_frame": slice_lines(SRC / "ch06_when_life_hurts_DERIVED.md", 152, 220),
        "ch08_night": slice_lines(SRC / "ch08_what_god_is_like_DERIVED.md", 37, 90),
        "ch08_hesed": slice_lines(SRC / "ch08_what_god_is_like_DERIVED.md", 110, 180),
        "ch08_g2r": slice_lines(SRC / "ch08_what_god_is_like_DERIVED.md", 200, 245),
        "ch12_open": slice_lines(SRC / "ch12_monday_morning_DERIVED.md", 1, 110),
        "ch12_mercy": slice_lines(SRC / "ch12_monday_morning_DERIVED.md", 160, 220),
        "ch12_end": slice_lines(SRC / "ch12_monday_morning_DERIVED.md", 230, 300),
    }
    ex_dir = SRC / "excerpts"
    ex_dir.mkdir(parents=True, exist_ok=True)
    for k, v in excerpts.items():
        (ex_dir / f"{k}.md").write_text(v, encoding="utf-8")

    out_a = ROOT / "direction-a-quiet-literary" / "rendered"
    out_c = ROOT / "direction-c-bookbuddy-signature" / "rendered"
    out_a.mkdir(parents=True, exist_ok=True)
    out_c.mkdir(parents=True, exist_ok=True)

    body_a = build_body("A", "option1", "A", excerpts)
    body_a += """
<section class="page-break">
  <p class="proof-label">Lena OPTION 2 · subtly isolated (comparison)</p>
  <p class="lena-isolated">One afternoon a coworker asked how she was “holding up.” Lena said, “I’m still here. It’s still hard. God is still God.” It was not eloquent. It was honest hope in one breath.</p>
  <p class="note-sm">Option 1 appears in-chapter above (normal narrative + space). Founder chooses.</p>
</section>
<section class="page-break">
  <p class="proof-label">OL_TREATMENT_B sample (restrained insight) · comparison</p>
  <div class="ol-insight">
    <p class="lab">Original-language insight</p>
    <p>In Exodus 34:6–7 the Hebrew text (OSHB) carries <span class="he">חֶסֶד</span> (<em>ḥesed</em>, H2617). <em>Ḥesed</em> is not a mood. It is covenant loyalty—steadfast love that keeps faith with His people.</p>
  </div>
</section>
"""
    html_a_path = out_a / "Volume1_DirectionA_Prototype.html"
    html_a_path.write_text(
        wrap_html(
            "Direction A — Quiet Literary",
            CSS_A,
            body_a,
            "DIRECTION A — QUIET LITERARY · Body: Baskerville",
        ),
        encoding="utf-8",
    )

    body_c = build_body("C", "option2", "B", excerpts)
    body_c += """
<section class="page-break">
  <p class="proof-label">Lena OPTION 1 · narrative + space (comparison)</p>
  <p class="lena-inline">One afternoon a coworker asked how she was “holding up.” Lena said, “I’m still here. It’s still hard. God is still God.” It was not eloquent. It was honest hope in one breath.</p>
</section>
"""
    html_c_path = out_c / "Volume1_DirectionC_Prototype.html"
    html_c_path.write_text(
        wrap_html(
            "Direction C — BookBuddy Signature Hybrid",
            CSS_C,
            body_c,
            "DIRECTION C — BOOKBUDDY SIGNATURE HYBRID · Body: Georgia",
        ),
        encoding="utf-8",
    )

    html_acc = out_c / "Volume1_DirectionC_AccentSample.html"
    html_acc.write_text(
        wrap_html(
            "Direction C Accent Sample",
            CSS_C_ACCENT,
            """
<section class="chapter-opener">
<p class="chap-num">Chapter 00</p>
<h1 class="chapter-title">Accent sample only</h1>
<p>Body text remains black. Accent appears on number and key-idea label only.</p>
<div class="key-idea"><p class="lab">Key idea</p><p>Restrained olive/iron accent — not emotional coloring of Scripture.</p></div>
<blockquote class="scripture"><p>Scripture stays black.</p><cite>Sample, KJV</cite></blockquote>
</section>
""",
            "DIRECTION C · SECONDARY ACCENT SAMPLE",
        ),
        encoding="utf-8",
    )

    pdf_a = out_a / "Volume1_DirectionA_Prototype.pdf"
    pdf_c = out_c / "Volume1_DirectionC_Prototype.pdf"
    pdf_acc = out_c / "Volume1_DirectionC_AccentSample.pdf"

    chrome_pdf(html_a_path, pdf_a)
    chrome_pdf(html_c_path, pdf_c)
    chrome_pdf(html_acc, pdf_acc)

    meta = {
        "margins": {
            "TOP": "0.75in",
            "BOTTOM": "0.90in",
            "INSIDE": "0.90in",
            "OUTSIDE": "0.80in",
            "note": "Inside 0.90in models safe zone for ~280–340pp (above KDP 301–500 min 0.625in). Not locked for final.",
        },
        "body_candidates": ["Baskerville (Direction A)", "Georgia (Direction C)"],
        "heading_companions": [
            "Baskerville small-caps furniture (A)",
            "Georgia/Charter small-caps cues (C)",
        ],
        "ol_fonts": ["Arial Unicode MS", "NewPeninimMT"],
        "trim": "6x9in",
        "pdf_a_pages": pdf_page_count(pdf_a),
        "pdf_c_pages": pdf_page_count(pdf_c),
        "pdf_a": str(pdf_a.relative_to(ROOT.parent.parent.parent.parent.parent)),
        "pdf_c": str(pdf_c.relative_to(ROOT.parent.parent.parent.parent.parent)),
    }
    # fix relative paths simply
    meta["pdf_a"] = str(pdf_a)
    meta["pdf_c"] = str(pdf_c)
    meta["pdf_accent"] = str(pdf_acc)
    (ROOT / "qa" / "prototype_build_meta.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
