# Build LCCB Academix Chapters 1-3 in DOCX following the MIRANDA_CANA paper layout.
# Times New Roman 12, 1.5 spacing, justified body, centered chapter/section titles,
# Grid tables, embedded figures (CFD SVG capture + rendered DFD/Gantt).
import re, os
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ROOT = r"C:\Users\PC\Downloads\lccb-academix-main\lccb-academix-main"
SRC = os.path.join(ROOT, "docs", "Chapter-1-3.md")
OUT = os.path.join(ROOT, "docs", "LCCB-Academix-Chapters-1-3.docx")
FIGS = os.path.join(ROOT, "docs", "figures")

doc = Document()

# ---------- base styles ----------
normal = doc.styles["Normal"]
normal.font.name = "Times New Roman"
normal.font.size = Pt(12)
normal.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
pf = normal.paragraph_format
pf.line_spacing = 1.5
pf.space_after = Pt(6)

def set_margins(doc):
    for s in doc.sections:
        s.top_margin = Inches(1)
        s.bottom_margin = Inches(1)
        s.left_margin = Inches(1)
        s.right_margin = Inches(1)
set_margins(doc)

# ---------- page number footer ----------
def add_page_number(section):
    footer_p = section.footer.paragraphs[0]
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer_p.add_run()
    for kind, val in (("begin", None), (None, "PAGE"), ("end", None)):
        if kind:
            el = OxmlElement("w:fldChar"); el.set(qn("w:fldCharType"), kind); run._r.append(el)
        else:
            instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve"); instr.text = val; run._r.append(instr)
    run.font.name = "Times New Roman"; run.font.size = Pt(11)
for s in doc.sections:
    add_page_number(s)

# ---------- helpers ----------
def add_runs(par, text, base_bold=False, base_italic=False, size=None):
    tokens = re.split(r"(\*\*[^*]+?\*\*|\*[^*]+?\*)", text)
    for t in tokens:
        if not t:
            continue
        if t.startswith("**") and t.endswith("**"):
            r = par.add_run(t[2:-2]); r.bold = True
        elif t.startswith("*") and t.endswith("*") and len(t) > 2:
            r = par.add_run(t[1:-1]); r.italic = True
        else:
            r = par.add_run(t)
        r.bold = r.bold or base_bold
        r.italic = r.italic or base_italic
        if size:
            r.font.size = Pt(size)

def para(text="", align=None, bold=False, italic=False, size=None, space_after=None, indent=None):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    if space_after is not None:
        p.paragraph_format.space_after = Pt(space_after)
    if indent is not None:
        p.paragraph_format.left_indent = Inches(indent)
    if text:
        add_runs(p, text, base_bold=bold, base_italic=italic, size=size)
    return p

CENTER = WD_ALIGN_PARAGRAPH.CENTER
JUST = WD_ALIGN_PARAGRAPH.JUSTIFY

def caption(text):
    para(text, align=CENTER, bold=True, space_after=10)

def add_fig(png, width):
    p = para(align=CENTER, space_after=4)
    p.add_run().add_picture(os.path.join(FIGS, png), width=Inches(width))

def flush_table(rows):
    if not rows:
        return
    ncol = max(len(r) for r in rows)
    t = doc.add_table(rows=len(rows), cols=ncol)
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(rows):
        for j in range(ncol):
            cell = t.cell(i, j)
            cell.paragraphs[0].text = ""
            txt = row[j] if j < len(row) else ""
            add_runs(cell.paragraphs[0], txt, base_bold=(i == 0))
            cell.paragraphs[0].alignment = CENTER if i == 0 else (LEFT if len(txt) > 40 else CENTER)
            cell.paragraphs[0].paragraph_format.space_after = Pt(2)
            cell.paragraphs[0].paragraph_format.line_spacing = 1.15
    para(space_after=6)
LEFT = WD_ALIGN_PARAGRAPH.LEFT

# ---------- read source ----------
with open(SRC, encoding="utf-8") as f:
    lines = f.read().split("\n")

# split title block (up to first standalone ---)
first_hr = next(i for i, l in enumerate(lines) if l.strip() == "---")
title_lines, lines = lines[:first_hr], lines[first_hr + 1:]

# ---------- title page ----------
for l in title_lines:
    s = l.rstrip()
    if not s:
        continue
    if s.startswith("# "):
        para(s[2:].upper(), align=CENTER, bold=True, size=16, space_after=4)
    elif s.startswith("## "):
        para(s[3:], align=CENTER, bold=True, size=13, space_after=14)
    elif s.startswith("|"):
        cells = [c.strip() for c in s.strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cells):
            continue
        merged = "        ".join(cells)
        is_role = "Project" in merged
        para(merged, align=CENTER, bold=False, italic=True if "[Researcher" in merged else False, size=12, space_after=2)
    else:
        para(s, align=CENTER, space_after=2)

para(align=CENTER)
doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

# ---------- body ----------
mermaid_seen = 0
table_buf = []
NO_PAGE_BREAK = False

def flush_table_check():
    global table_buf
    if table_buf:
        flush_table(table_buf); table_buf = []

i = 0
while i < len(lines):
    raw = lines[i]
    line = raw.rstrip()
    s = line.strip()

    if s.startswith("|"):
        if s.startswith("|---") or s.startswith("| ---") or set(s) <= set("|-: "):
            i += 1; continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        table_buf.append(cells); i += 1; continue
    else:
        flush_table_check()

    if not s:
        i += 1; continue

    if s == "---":
        i += 1; continue  # soft divider; no page break inside body

    if s.startswith("```"):
        if "mermaid" in s:
            mermaid_seen += 1
            # skip until closing fence
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                i += 1
            if mermaid_seen == 1:
                add_fig("fig2.png", 6.5)
            elif mermaid_seen == 2:
                add_fig("fig3.png", 6.5)
            i += 1; continue
        else:
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                i += 1
            i += 1; continue

    if s.startswith("!["):
        add_fig("fig1.png", 6.0)
        i += 1; continue

    if s.startswith("> "):
        para(s[2:], italic=True, size=11, space_after=4)
        i += 1; continue

    if s.startswith("\\*"):
        para(s[1:], italic=True, size=11, space_after=4)
        i += 1; continue

    # headings
    m = re.match(r"^(#{1,3})\s+(.*)$", s)
    if m:
        lvl, txt = len(m.group(1)), m.group(2)
        if lvl == 1:
            para(txt, align=CENTER, bold=True, size=14, space_after=10)
        elif lvl == 2:
            para(txt, align=CENTER, bold=True, size=12, space_after=10)
        else:
            para(txt, align=LEFT, bold=True, size=12, space_after=8)
        i += 1; continue

    # figure caption
    if re.match(r"^\*\*(Figure|Table)\s*\d", s):
        # caption above/below figure
        if "Development Cost" in s or "Operating Cost" in s or "Cost–Benefit" in s:
            para(s, align=LEFT, bold=True, space_after=6)
        else:
            caption(s)
        i += 1; continue

    # definition-of-terms / conceptual-operational lines
    if s.startswith("*Conceptual:*") or s.startswith("*Operational:*"):
        para(s, align=JUST, italic=False, indent=0.4, space_after=4)
        i += 1; continue

    # bullet list
    if s.startswith("- "):
        p = para("•  " + s[2:], align=JUST, indent=0.3, space_after=4)
        i += 1; continue

    # numbered list (top-level or nested)
    m = re.match(r"^(\s*)(\d+)[\.\)]\s+(.*)$", raw)
    if m:
        nested = len(m.group(1)) > 0
        text = f"{m.group(2)}. {m.group(3)}"
        para(text, align=JUST, indent=(0.7 if nested else 0.3), space_after=4)
        i += 1; continue
    m = re.match(r"^(\s*)([a-d])[\.\)]\s+(.*)$", raw)
    if m:
        para(f"{m.group(2)}. {m.group(3)}", align=JUST, indent=0.7, space_after=4)
        i += 1; continue

    # bold-only line (term names, section subtitles)
    if re.match(r"^\*\*[^*]+\*\*$", s):
        para(s, align=LEFT, space_after=4)
        i += 1; continue

    # default paragraph justified
    para(s, align=JUST)
    i += 1; continue

flush_table_check()
doc.save(OUT)
print("saved", OUT, os.path.getsize(OUT), "bytes")
