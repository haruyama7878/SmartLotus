import json
p = r"D:\Games\codeSmrtltv2-main\codeSmrtltv2-main\src\data\sample-questions.json"
d = json.load(open(p, encoding="utf-8"))
for q in d:
    if q["deck"] == 10 and q["index"] == 2:
        q["prompt"] = "Số lớn nhất trong các số: 15; 78; 40; 59 là:"
        q["options"] = ["15", "78", "40", "59"]
        q["complete"] = True
json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("done")
