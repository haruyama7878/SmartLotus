// Test RAG API directly with 4 adaptive performance metrics
async function testRag() {
  console.log("======================================================================");
  console.log("=== KIỂM TRA MÔ HÌNH RAG ĐA DẠNG HÓA DỰA TRÊN 4 CHỈ SỐ ĐẦU VÀO ===");
  console.log("=== 1. Độ chính xác (%) | 2. Điểm bài vừa làm | 3. TB 10 bài | 4. Thời gian ===");
  console.log("======================================================================\n");

  const testCases = [
    {
      name: "1. Học sinh Nhanh nhưng ẩu (Fast & Inaccurate)",
      topic: "Toán có lời văn và so sánh",
      level: 2,
      score: 55,
      accuracy: 42,
      lastScore: 48,
      averageScoreLast10: 60,
      durationSeconds: 70, // ~14s/câu (Rất nhanh)
      expectedBehavior: "Cài cắm bẫy tư duy, dữ kiện thừa, đảo thứ tự liền trước/sau"
    },
    {
      name: "2. Học sinh Bứt phá Vượt bậc (Breakthrough Momentum)",
      topic: "Phép tính và tư duy logic",
      level: 3,
      score: 70,
      accuracy: 95,
      lastScore: 95,
      averageScoreLast10: 65,
      durationSeconds: 160, // ~32s/câu (Vừa vặn)
      expectedBehavior: "Tăng độ khó, toán 2 bước tính, bất đẳng thức kép"
    },
    {
      name: "3. Học sinh Chậm & Quá tải (Slow & Struggling)",
      topic: "Số học cơ bản",
      level: 1,
      score: 35,
      accuracy: 35,
      lastScore: 35,
      averageScoreLast10: 40,
      durationSeconds: 420, // ~84s/câu (Rất chậm)
      expectedBehavior: "Đề bài rút gọn trực diện, số nhỏ <= 20, lời giải rõ ràng"
    },
    {
      name: "4. Học sinh Xuất sắc Toàn diện (Consistent Mastery)",
      topic: "Toán tư duy nâng cao",
      level: 4,
      score: 90,
      accuracy: 96,
      lastScore: 98,
      averageScoreLast10: 92,
      durationSeconds: 120, // ~24s/câu (Nhanh & chính xác)
      expectedBehavior: "Đa dạng hóa tối đa kỹ năng, độ khó C, D, E"
    },
  ];

  for (const tc of testCases) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`🎯 TEST CASE: ${tc.name}`);
    console.log(`📊 Chỉ số: ĐCX ${tc.accuracy}% | Bài vừa làm: ${tc.lastScore}đ | TB10: ${tc.averageScoreLast10}đ | Thời gian: ${tc.durationSeconds}s`);
    console.log(`💡 Dự kiến hành vi: ${tc.expectedBehavior}`);
    console.log(`----------------------------------------------------------------------`);

    const res = await fetch("http://localhost:3000/api/generate-rag-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: tc.topic,
        curriculumLevel: tc.level,
        difficulties: tc.score >= 75 ? ["C", "D", "E"] : tc.score >= 45 ? ["B", "C", "D"] : ["A", "B"],
        count: 5,
        intelligenceScore: tc.score,
        accuracy: tc.accuracy,
        lastScore: tc.lastScore,
        averageScoreLast10: tc.averageScoreLast10,
        durationSeconds: tc.durationSeconds,
        variationSeed: `test-${tc.lastScore}-${tc.accuracy}-${Date.now()}`
      }),
    });

    if (!res.ok) {
      console.error(`❌ Lỗi HTTP ${res.status}:`, await res.text());
      continue;
    }

    const data = await res.json();
    console.log(`✅ Nguồn sinh: [${data.source.toUpperCase()}] | Số câu trả về: ${data.questions?.length}`);
    for (const q of (data.questions || []).slice(0, 3)) {
      console.log(`  [Câu ${q.id}] (${q.difficulty} | Kỹ năng: ${q.skill})`);
      console.log(`      Đề: ${q.prompt}`);
      console.log(`      Lựa chọn: ${q.options.join(" | ")}`);
      console.log(`      Đáp án đúng: ${q.correctAnswer}`);
      console.log(`      Hướng dẫn: ${q.explanation}`);
    }
  }
}

testRag().catch(console.error);
