// Test RAG API directly
async function testRag() {
  console.log("=== KIỂM TRA MÔ HÌNH RAG VÀ CÁ NHÂN HOÁ THEO CHỈ SỐ THÔNG MINH ===");

  const testCases = [
    { name: "Học sinh củng cố (IQ 25)", score: 25, topic: "Số học cơ bản", level: 1 },
    { name: "Học sinh trung bình / khá (IQ 55)", score: 55, topic: "Phép cộng trừ trong phạm vi 100", level: 3 },
    { name: "Học sinh nâng cao / thử thách (IQ 85)", score: 85, topic: "Toán có lời văn và tư duy logic", level: 5 },
  ];

  for (const tc of testCases) {
    console.log(`\n--- Test: ${tc.name} ---`);
    const res = await fetch("http://localhost:3000/api/generate-rag-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: tc.topic,
        curriculumLevel: tc.level,
        difficulties: tc.score >= 75 ? ["C", "D", "E"] : tc.score >= 45 ? ["B", "C", "D"] : ["A", "B"],
        count: 5,
        intelligenceScore: tc.score,
        variationSeed: `test-${tc.score}-${Date.now()}`
      }),
    });

    if (!res.ok) {
      console.error(`Lỗi HTTP ${res.status}:`, await res.text());
      continue;
    }

    const data = await res.json();
    console.log(`Nguồn sinh: [${data.source.toUpperCase()}] | Số câu: ${data.questions?.length}`);
    for (const q of (data.questions || []).slice(0, 3)) {
      console.log(`  [Câu ${q.id}] (${q.difficulty} | ${q.skill}): ${q.prompt}`);
      console.log(`      Lựa chọn: ${q.options.join(" | ")}`);
      console.log(`      Đáp án: ${q.correctAnswer}`);
      console.log(`      Giải thích: ${q.explanation}`);
    }
  }
}

testRag().catch(console.error);
