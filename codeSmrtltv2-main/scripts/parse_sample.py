import re, json, os
from docx import Document

path = r"D:\Games\codeSmrtltv2-main\codeSmrtltv2-main\library\mẫu.docx"
d = Document(path)

decks = []
cur_deck = None
cur_q = None
lines_buf = []

def flush_q():
    global cur_q
    if cur_q is None:
        return
    text = "\n".join(lines_buf).strip()
    lines_buf.clear()
    t = text.replace("\t", "  ")
    m = re.search(r'(?:^|\s)(A\.\s)', t)
    if m:
        prompt_part = t[:m.start()].strip()
        opts_part = t[m.start():].strip()
    else:
        prompt_part = t
        opts_part = ""
    options = []
    if opts_part:
        segs = re.findall(r'([ABCD])\.\s*(.*?)(?=\s+[ABCD]\.\s|$)', opts_part, re.S)
        opt_map = {}
        for label, val in segs:
            opt_map[label] = val.strip()
        for label in ["A", "B", "C", "D"]:
            if label in opt_map:
                options.append(opt_map[label])
    cur_q["prompt"] = re.sub(r'\s+', ' ', prompt_part).strip()
    cur_q["options"] = [re.sub(r'\s+', ' ', o).strip() for o in options]
    decks[-1]["questions"].append(cur_q)
    cur_q = None

for p in d.paragraphs:
    line = p.text.strip()
    if not line:
        continue
    mdeck = re.match(r'^ĐỀ\s*(\d+)', line, re.I)
    if mdeck:
        if cur_q is not None:
            flush_q()
        cur_deck = {"deck": int(mdeck.group(1)), "title": line, "questions": []}
        decks.append(cur_deck)
        cur_q = None
        lines_buf = []
        continue
    mq = re.match(r'^Câu\s*(\d+)\.\s*(.*)', line, re.I)
    if mq:
        if cur_q is not None:
            flush_q()
        cur_q = {"index": int(mq.group(1))}
        rest = mq.group(2).strip()
        lines_buf = [rest] if rest else []
        continue
    if cur_q is not None:
        lines_buf.append(line)

if cur_q is not None:
    flush_q()

out = []
for deck in decks:
    for q in deck["questions"]:
        opts = q["options"]
        out.append({
            "deck": deck["deck"],
            "index": q["index"],
            "prompt": q["prompt"],
            "options": opts,
            "complete": len(opts) == 4 and all(opts),
        })

outdir = r"D:\Games\codeSmrtltv2-main\codeSmrtltv2-main\src\data"
os.makedirs(outdir, exist_ok=True)
with open(os.path.join(outdir, "sample-questions.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("decks", len(decks))
print("total", len(out))
print("complete", sum(1 for q in out if q["complete"]))
for q in out[:3]:
    print(q["deck"], q["index"], "|", q["prompt"][:90], "|", q["options"])
