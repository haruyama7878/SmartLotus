async function benchmark() {
  const t0 = Date.now();
  console.log("Testing Ollama with format: 'json'...");
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5:1.5b",
      format: "json",
      stream: false,
      messages: [
        {
          role: "system",
          content: "Bạn là AI giáo dục tiểu học. Tạo 3 câu hỏi trắc nghiệm Toán lớp 1 tiếng Việt dạng JSON: {\"questions\": [{\"id\": 1, \"prompt\": \"...\", \"options\": [\"1\", \"2\", \"3\", \"4\"], \"correctAnswer\": \"1\", \"explanation\": \"...\", \"difficulty\": \"A\", \"skill\": \"...\"}]}"
        },
        {
          role: "user",
          content: "Chủ đề: Phép cộng trừ trong phạm vi 100. Chỉ số IQ học sinh: 70."
        }
      ]
    })
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`Response received in ${elapsed}s, status: ${res.status}`);
  const json = await res.json();
  console.log("Raw output:\n", json.message?.content);
}

benchmark().catch(console.error);
