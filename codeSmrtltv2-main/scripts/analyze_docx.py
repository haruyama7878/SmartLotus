import json, os, re
from docx import Document

docx_path = r"d:\Games\codeSmrtltv2-main\codeSmrtltv2-main\library\mẫu.docx"
json_path = r"d:\Games\codeSmrtltv2-main\codeSmrtltv2-main\src\data\sample-questions.json"

with open(json_path, "r", encoding="utf-8") as f:
    questions = json.load(f)

print(f"Loaded {len(questions)} questions.")

# Let's see unique prompt patterns
categories = {
    "lien_truoc_sau": 0,
    "so_sanh": 0,
    "phep_tinh": 0,
    "toan_loi_van": 0,
    "thoi_gian": 0,
    "hinh_hoc": 0,
    "do_dai": 0,
    "doc_viet_so": 0,
    "logic_khac": 0
}

for q in questions:
    p = q["prompt"].lower()
    if "liền trước" in p or "liền sau" in p:
        categories["lien_truoc_sau"] += 1
    elif "so sánh" in p or "bé nhất" in p or "lớn nhất" in p or "thứ tự" in p or ">" in p or "<" in p:
        categories["so_sanh"] += 1
    elif "đồng hồ" in p or "giờ" in p or "ngày" in p or "tuần" in p:
        categories["thoi_gian"] += 1
    elif "cm" in p or "xăng-ti-mét" in p or "dài" in p:
        categories["do_dai"] += 1
    elif "đoạn thẳng" in p or "tam giác" in p or "hình" in p or "chấm tròn" in p:
        categories["hinh_hoc"] += 1
    elif "đọc là" in p or "chữ số" in p:
        categories["doc_viet_so"] += 1
    elif "hỏi" in p and ("còn" in p or "tất cả" in p or "bao nhiêu" in p):
        categories["toan_loi_van"] += 1
    elif "tính" in p or "+" in p or "–" in p or "-" in p:
        categories["phep_tinh"] += 1
    else:
        categories["logic_khac"] += 1

print("Categories count:")
for k, v in categories.items():
    print(f"  {k}: {v}")
