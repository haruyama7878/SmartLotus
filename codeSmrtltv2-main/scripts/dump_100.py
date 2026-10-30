import json, sys

sys.stdout.reconfigure(encoding="utf-8")

with open("src/data/sample-questions.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

with open("scripts/all_100_questions.txt", "w", encoding="utf-8") as out:
    for i, q in enumerate(questions):
        out.write(f"ID {i+1} | Đề {q['deck']} - Câu {q['index']}\n")
        out.write(f"Đề bài: {q['prompt']}\n")
        out.write(f"Lựa chọn: {', '.join(q['options'])}\n\n")

print(f"Dumped {len(questions)} questions to scripts/all_100_questions.txt")
