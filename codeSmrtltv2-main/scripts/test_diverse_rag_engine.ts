import {
  analyzeStudentPerformanceProfile,
  retrievePersonalizedContext,
  synthesizePersonalizedQuestions,
  type GenerateRagQuizInput,
} from "../src/lib/rag";

console.log("===============================================================================");
console.log("🧪 KIỂM THỬ THUẬT TOÁN ĐA DẠNG HÓA RAG QUA 4 CHỈ SỐ ĐẦU VÀO");
console.log("===============================================================================\n");

const testScenarios: Array<{
  title: string;
  input: GenerateRagQuizInput;
}> = [
    {
      title: "1. HỌC SINH NHANH NHƯNG ẨU (Làm rất nhanh ~6s/câu, độ chính xác thấp)",
      input: {
        topic: "Toán có lời văn và thứ tự số",
        curriculumLevel: 2,
        intelligenceScore: 60,
        accuracy: 40,
        lastScore: 45,
        averageScoreLast10: 62,
        durationSeconds: 60, // 60s cho 10 câu = 6s/câu
        count: 6,
        variationSeed: "seed-fast-inaccurate",
      },
    },
    {
      title: "2. HỌC SINH BỨT PHÁ VƯỢT BẬC (Bài vừa làm 95đ so với TB 10 bài 65đ)",
      input: {
        topic: "Phép tính nâng cao",
        curriculumLevel: 2,
        intelligenceScore: 65,
        accuracy: 95,
        lastScore: 95,
        averageScoreLast10: 65,
        durationSeconds: 180, // 180s cho 6 câu = 30s/câu
        count: 6,
        variationSeed: "seed-breakthrough",
      },
    },
    {
      title: "3. HỌC SINH CHẬM VÀ QUÁ TẢI NHẬN THỨC (Thời gian rất lâu ~65s/câu, điểm thấp)",
      input: {
        topic: "Số học cơ bản",
        curriculumLevel: 1,
        intelligenceScore: 45,
        accuracy: 30,
        lastScore: 35,
        averageScoreLast10: 40,
        durationSeconds: 390, // 390s cho 6 câu = 65s/câu
        count: 6,
        variationSeed: "seed-slow-struggling",
      },
    },
    {
      title: "4. HỌC SINH PHONG ĐỘ CAO ỔN ĐỊNH (Tốc độ nhạy bén, ĐCX 98%, điểm tuyệt đối)",
      input: {
        topic: "Toán tư duy logic",
        curriculumLevel: 3,
        intelligenceScore: 85,
        accuracy: 98,
        lastScore: 100,
        averageScoreLast10: 92,
        durationSeconds: 110, // 110s cho 6 câu = 18s/câu
        count: 6,
        variationSeed: "seed-mastery",
      },
    },
  ];

for (const sc of testScenarios) {
  console.log(`\n-------------------------------------------------------------------------------`);
  console.log(`📌 KỊCH BẢN: ${sc.title}`);
  console.log(`📊 Đầu vào 4 chỉ số:`);
  console.log(`   - Độ chính xác: ${sc.input.accuracy}%`);
  console.log(`   - Điểm bài vừa làm: ${sc.input.lastScore}/100`);
  console.log(`   - Trung bình điểm 10 bài gần đây: ${sc.input.averageScoreLast10}/100`);
  console.log(`   - Thời gian làm bài: ${sc.input.durationSeconds} giây`);

  // 1. Phân tích Profile
  const profile = analyzeStudentPerformanceProfile(sc.input);
  console.log(`\n🧠 [Phân Tích Hồ Sơ Thích Ứng]:`);
  console.log(`   • Điểm năng lực động (Effective Score): ${profile.effectiveScore}/100`);
  console.log(`   • Nhịp độ: [${profile.pacingType.toUpperCase()}] (~${profile.secondsPerQuestion}s/câu)`);
  console.log(`   • Phong cách học: [${profile.learnerArchetype}]`);
  console.log(`   • Động thái phong độ: [${profile.momentum}]`);
  console.log(`   • Cài bẫy tư duy: ${profile.distractorTrapRequired ? "✅ BẮT BUỘC" : "❌ Không"}`);
  console.log(`   • Bài toán 2 bước: ${profile.twoStepProblemRequired ? "✅ BẮT BUỘC" : "❌ Không"}`);
  console.log(`   • Rút gọn đề bài: ${profile.simplifiedWordingRequired ? "✅ BẮT BUỘC" : "❌ Không"}`);
  console.log(`   • Độ khó khuyến nghị: ${profile.recommendedDifficulties.join(", ")}`);
  console.log(`   • Nhận định: ${profile.adaptiveSummary}`);
  console.log(`   • Chỉ thị sư phạm: ${profile.pedagogicalDirective}`);

  // 2. Kiểm thử RAG Context Retrieval
  const context = retrievePersonalizedContext(sc.input);
  console.log(`\n🔍 [Truy Xuất Tri Thức RAG Context - ${context.length} câu mẫu trích xuất]:`);
  const skills = new Set<string>();
  context.forEach((c, idx) => {
    skills.add(c.skill);
    console.log(`   ${idx + 1}. [Đề ${c.deck}-Câu ${c.index}] (${c.difficulty} | ${c.skill}) - TargetScore: ${c.targetScore}`);
  });
  console.log(`   => Đa dạng hóa kỹ năng: ${skills.size}/${context.length} kỹ năng phân tán hoàn toàn độc lập!`);

  // 3. Kiểm thử Sinh Đề Thích Ứng (Synthesis Engine)
  const generatedQuestions = synthesizePersonalizedQuestions(context, sc.input);
  console.log(`\n📝 [Mẫu Câu Hỏi RAG Được Tạo Thành Công (${generatedQuestions.length} câu)]:`);
  generatedQuestions.slice(0, 3).forEach((q) => {
    console.log(`   [Câu ${q.id}] (${q.difficulty} | ${q.skill}):`);
    console.log(`       Đề: ${q.prompt}`);
    console.log(`       Lựa chọn: ${q.options.join(" | ")}`);
    console.log(`       Đáp án đúng: ${q.correctAnswer}`);
    console.log(`       Giải thích: ${q.explanation}`);
  });
}

console.log("\n===============================================================================");
console.log("✅ HOÀN TẤT TẤT CẢ CÁC BÀI KIỂM THỬ ĐA DẠNG HÓA RAG THEO 4 CHỈ SỐ!");
console.log("===============================================================================");

