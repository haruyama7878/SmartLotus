async function testTopics() {
  const cases = [
    { topic: "Thời gian và ngày trong tuần", level: 3, score: 75 },
    { topic: "Sắp xếp thứ tự các số từ bé đến lớn", level: 2, score: 60 },
    { topic: "Độ dài xăng-ti-mét", level: 3, score: 50 },
    { topic: "Bất đẳng thức và so sánh số", level: 4, score: 80 }
  ];

  for (const c of cases) {
    console.log(`\n=== CHỦ ĐỀ: ${c.topic} (IQ: ${c.score}) ===`);
    const res = await fetch("http://localhost:3000/api/generate-rag-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: c.topic,
        curriculumLevel: c.level,
        difficulties: ["A", "B", "C", "D", "E"],
        count: 3,
        intelligenceScore: c.score,
        variationSeed: `topic-test-${c.score}-${Date.now()}`
      }),
    });
    const data = await res.json();
    for (const q of data.questions) {
      console.log(`[${q.skill}]: ${q.prompt}`);
      console.log(`   Đáp án: ${q.correctAnswer}`);
    }
  }
}

testTopics().catch(console.error);
