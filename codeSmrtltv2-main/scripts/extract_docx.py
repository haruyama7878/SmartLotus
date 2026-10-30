import sys
from docx import Document
path = r"D:\Games\codeSmrtltv2-main\codeSmrtltv2-main\library\mẫu.docx"
d = Document(path)
out = []
out.append(f"PARAGRAPHS: {len(d.paragraphs)}")
out.append(f"TABLES: {len(d.tables)}")
for i, p in enumerate(d.paragraphs):
    if p.text.strip():
        out.append(f"[{i}][{p.style.name}] {p.text}")
for ti, t in enumerate(d.tables):
    out.append(f"=== TABLE {ti} rows={len(t.rows)} cols={len(t.columns)} ===")
    for r in t.rows:
        out.append(" | ".join(c.text.strip() for c in r.cells))
with open(r"D:\Games\codeSmrtltv2-main\codeSmrtltv2-main\docx_dump.txt","w",encoding="utf-8") as f:
    f.write("\n".join(out))
print("done", len(out))
sys.exit(0)
