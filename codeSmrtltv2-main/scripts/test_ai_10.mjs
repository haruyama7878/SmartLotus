async function test10() {
  console.log("=== KIỂM TRA SINH 10 CÂU BẰNG AI + RAG (mẫu.docx) VỚI IQ 85 ===");
  const t0 = Date.now();
  const res = await fetch("http://localhost:3000/api/generate-rag-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "Phép cộng trừ có nhớ trong phạm vi 100",
      curriculumLevel: 4,
      difficulties: ["C", "D", "E"],
      count: 10,
      intelligenceScore: 85,
      variationSeed: `test-10-${Date.now()}`
    }),
  });

  const data = await res.json();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\nThời gian phản hồi: ${elapsed} giây`);
  console.log(`Nguồn: [${data.source.toUpperCase()}] | Số lượng: ${data.questions?.length}`);
  data.questions.forEach((q, idx) => {
    console.log(`Câu ${idx + 1}: [${q.difficulty}] ${q.prompt.slice(0, 50)}... -> Đáp án: ${q.correctAnswer}`);
  });
}
test10().catch(console.error);
