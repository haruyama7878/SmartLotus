import json, re

with open("src/data/sample-questions.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

print(f"Total questions: {len(questions)}")
for i, q in enumerate(questions[:20]):
    print(f"[{i+1}] (Deck {q['deck']} - Q{q['index']}): {q['prompt']}")
    print(f"    Options: {q['options']}")
