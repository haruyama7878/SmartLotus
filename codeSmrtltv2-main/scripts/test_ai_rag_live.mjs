// Test Live AI + RAG generation
async function testLiveAiRag() {
  console.log("=== KIỂM TRA SINH ĐỀ TRỰC TIẾP BẰNG AI (OLLAMA QWEN2.5) + RAG (mẫu.docx) ===");
  const t0 = Date.now();

  const payload = {
    topic: "Phép cộng trừ trong phạm vi 100",
    curriculumLevel: 3,
    difficulties: ["B", "C", "D"],
    count: 3,
    intelligenceScore: 70,
    variationSeed: `live-ai-rag-${Date.now()}`
  };

  console.log(`Gửi yêu cầu tới /api/generate-rag-quiz:`, payload);
  const res = await fetch("http://localhost:3000/api/generate-rag-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`HTTP error ${res.status}:`, await res.text());
    return;
  }

  const data = await res.json();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\nKết quả trả về sau ${elapsed} giây:`);
  console.log(`Nguồn sinh đề: [${data.source.toUpperCase()}] | Tổng số câu: ${data.questions?.length}`);

  for (const [i, q] of (data.questions || []).entries()) {
    console.log(`\n[Câu ${i + 1}] (${q.difficulty} - ${q.skill})`);
    console.log(`   Đề bài: ${q.prompt}`);
    console.log(`   Lựa chọn: ${q.options.join(" | ")}`);
    console.log(`   Đáp án đúng: ${q.correctAnswer}`);
    console.log(`   Giải thích: ${q.explanation}`);
  }
}

testLiveAiRag().catch(console.error);
