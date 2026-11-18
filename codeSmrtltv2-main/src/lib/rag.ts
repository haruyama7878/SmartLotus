import "server-only";

import sampleQuestions from "@/data/sample-questions.json";
import rawRagBank from "@/data/rag-question-bank.json";
import { finalizeQuizSequence, type Difficulty, type QuizQuestion } from "./learning-data";

export type SampleQuestion = {
  deck: number;
  index: number;
  prompt: string;
  options: string[];
  complete: boolean;
};

export type RagKnowledgeQuestion = {
  deck: number;
  index: number;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  skill: string;
  difficulty: Difficulty;
  curriculumLevel: number;
  scoreMin: number;
  scoreMax: number;
  targetScore: number;
  isTextBased: boolean;
  tags: string[];
};

export type GenerateRagQuizInput = {
  topic: string;
  curriculumLevel: number;
  difficulties?: Difficulty[];
  count?: number;
  intelligenceScore?: number;
  variationSeed?: string;
  excludePrompts?: string[];
  /** Độ chính xác (% từ 0 đến 100) của học sinh */
  accuracy?: number;
  /** Điểm số của bài vừa làm (0 đến 100) */
  lastScore?: number;
  /** Trung bình điểm của 10 bài gần đây (0 đến 100) */
  averageScoreLast10?: number;
  /** Thời gian làm bài vừa qua tính bằng giây */
  durationSeconds?: number;
};

export type StudentLearnerArchetype =
  | "fast_inaccurate"   // Nhanh nhưng ẩu -> cần bẫy tư duy, dữ kiện thừa
  | "fast_accurate"     // Nhanh & chuẩn xác -> bài nâng cao, 2 bước, logic
  | "slow_struggling"   // Chậm & quá tải nhận thức -> đề ngắn gọn, trực diện, số nhỏ
  | "slow_careful"      // Chậm nhưng cẩn thận -> rèn phản xạ tính nhanh, quy luật số
  | "balanced";         // Tiến độ cân bằng

export type StudentPerformanceMomentum =
  | "breakthrough"        // Bài vừa làm tăng vọt so với TB 10 bài -> bứt phá
  | "drop_recovery"       // Bài vừa làm tụt sâu bất thường -> phục hồi tự tin
  | "consistent_mastery"  // Phong độ cao ổn định -> đa dạng hoá tối đa
  | "needs_foundation"    // Điểm thấp kéo dài -> củng cố nền tảng
  | "steady";             // Tiến độ đều đặn

export type StudentPerformanceProfile = {
  effectiveScore: number;
  pacingType: "fast" | "moderate" | "slow";
  secondsPerQuestion: number;
  learnerArchetype: StudentLearnerArchetype;
  momentum: StudentPerformanceMomentum;
  recommendedDifficulties: Difficulty[];
  adaptiveSummary: string;
  pedagogicalDirective: string;
  distractorTrapRequired: boolean;
  twoStepProblemRequired: boolean;
  simplifiedWordingRequired: boolean;
};

const ragBank: RagKnowledgeQuestion[] = rawRagBank as RagKnowledgeQuestion[];
const legacyBank: SampleQuestion[] = (sampleQuestions as SampleQuestion[]).filter((q) => q.complete);

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

function randIntSeeded(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Phân tích chuyên sâu hồ sơ học tập đa chiều dựa trên 4 chỉ số đầu vào:
 * 1. Độ chính xác (accuracy)
 * 2. Điểm của bài vừa làm (lastScore)
 * 3. Trung bình điểm 10 bài gần đây (averageScoreLast10)
 * 4. Thời gian làm bài (durationSeconds)
 */
export function analyzeStudentPerformanceProfile(input: GenerateRagQuizInput): StudentPerformanceProfile {
  const count = Math.max(1, input.count ?? 10);
  const baseIntel = Math.max(0, Math.min(100, input.intelligenceScore ?? 50));

  // 1. Phân tích nhịp độ (Pacing)
  const duration = typeof input.durationSeconds === "number" && input.durationSeconds > 0
    ? input.durationSeconds
    : count * 35;
  const secondsPerQuestion = Math.round((duration / count) * 10) / 10;
  const pacingType: "fast" | "moderate" | "slow" =
    secondsPerQuestion < 20 ? "fast" : secondsPerQuestion > 45 ? "slow" : "moderate";

  // 2. Điểm năng lực động (Effective Score) kết hợp 4 chỉ số
  let weighted = baseIntel * 0.35;
  let weightSum = 0.35;

  if (typeof input.lastScore === "number") {
    weighted += Math.max(0, Math.min(100, input.lastScore)) * 0.30;
    weightSum += 0.30;
  }
  if (typeof input.averageScoreLast10 === "number") {
    weighted += Math.max(0, Math.min(100, input.averageScoreLast10)) * 0.20;
    weightSum += 0.20;
  }
  if (typeof input.accuracy === "number") {
    weighted += Math.max(0, Math.min(100, input.accuracy)) * 0.15;
    weightSum += 0.15;
  }

  let effectiveScore = Math.round(weighted / weightSum);

  // Điều chỉnh điểm năng lực theo nhịp độ
  if (pacingType === "fast" && (input.accuracy ?? 100) < 65) {
    effectiveScore = Math.max(5, effectiveScore - 6); // Học sinh bấm vội, giảm để củng cố nền
  } else if (pacingType === "fast" && (input.accuracy ?? 0) >= 85 && (input.lastScore ?? 0) >= 80) {
    effectiveScore = Math.min(100, effectiveScore + 5); // Tốc độ nhanh và làm chuẩn, tăng thử thách
  }

  // 3. Động thái phong độ (Momentum)
  let momentum: StudentPerformanceMomentum = "steady";
  if (typeof input.lastScore === "number" && typeof input.averageScoreLast10 === "number") {
    const diff = input.lastScore - input.averageScoreLast10;
    if (diff >= 15) {
      momentum = "breakthrough";
    } else if (diff <= -18) {
      momentum = "drop_recovery";
    } else if (input.lastScore >= 80 && input.averageScoreLast10 >= 75) {
      momentum = "consistent_mastery";
    } else if (input.lastScore < 50 && input.averageScoreLast10 < 55) {
      momentum = "needs_foundation";
    }
  } else if (typeof input.lastScore === "number") {
    if (input.lastScore >= 85) momentum = "consistent_mastery";
    else if (input.lastScore < 45) momentum = "needs_foundation";
  }

  // 4. Nhận diện phong cách học sinh (Learner Archetype)
  const acc = typeof input.accuracy === "number"
    ? input.accuracy
    : (input.lastScore ?? baseIntel);
  const last = typeof input.lastScore === "number" ? input.lastScore : acc;

  let learnerArchetype: StudentLearnerArchetype = "balanced";
  let distractorTrapRequired = false;
  let twoStepProblemRequired = false;
  let simplifiedWordingRequired = false;

  if (pacingType === "fast" && (acc < 68 || last < 60)) {
    learnerArchetype = "fast_inaccurate";
    distractorTrapRequired = true;
  } else if (pacingType === "fast" && acc >= 80 && last >= 75) {
    learnerArchetype = "fast_accurate";
    twoStepProblemRequired = true;
  } else if (pacingType === "slow" && (acc < 60 || last < 55)) {
    learnerArchetype = "slow_struggling";
    simplifiedWordingRequired = true;
  } else if (pacingType === "slow" && acc >= 75 && last >= 70) {
    learnerArchetype = "slow_careful";
  }

  // 5. Tổng kết sư phạm & Chỉ thị thích ứng
  let adaptiveSummary = "";
  let pedagogicalDirective = "";

  switch (learnerArchetype) {
    case "fast_inaccurate":
      adaptiveSummary = `Học sinh làm nhanh (~${secondsPerQuestion}s/câu) nhưng độ chính xác chưa cao (${Math.round(acc)}%), có xu hướng đọc lướt hoặc vội vàng.`;
      pedagogicalDirective = "Cài cắm bẫy tư duy và dữ kiện thừa trong toán lời văn, yêu cầu đọc kỹ đề bài, đảo vị trí 'liền trước/liền sau' để rèn tính cẩn thận.";
      break;
    case "fast_accurate":
      adaptiveSummary = `Học sinh thao tác rất nhanh (~${secondsPerQuestion}s/câu) và đạt độ chính xác xuất sắc (${Math.round(acc)}%).`;
      pedagogicalDirective = "Tăng cường bài toán 2 bước tính, bất đẳng thức kép, suy luận quy luật và mở rộng phạm vi số để khai phóng tư duy.";
      break;
    case "slow_struggling":
      adaptiveSummary = `Học sinh suy nghĩ lâu (~${secondsPerQuestion}s/câu) và độ chính xác còn thấp (${Math.round(acc)}%), có dấu hiệu quá tải nhận thức.`;
      pedagogicalDirective = "Đề bài rút gọn trực diện, dùng số nhỏ trong phạm vi 20 hoặc số tròn chục, tăng bệ đỡ tư duy (gợi ý từng bước).";
      break;
    case "slow_careful":
      adaptiveSummary = `Học sinh làm bài cẩn trọng (~${secondsPerQuestion}s/câu) và đạt độ chính xác tốt (${Math.round(acc)}%).`;
      pedagogicalDirective = "Tập trung các câu rèn phản xạ tính nhanh, so sánh biểu thức và xem đồng hồ giúp tăng độ tự tin về tốc độ.";
      break;
    default:
      adaptiveSummary = `Học sinh đạt phong độ cân bằng (Độ chính xác ${Math.round(acc)}%, ~${secondsPerQuestion}s/câu).`;
      pedagogicalDirective = "Đa dạng hóa toàn diện các kỹ năng, cân bằng giữa bài tập củng cố và bài toán thử thách.";
      break;
  }

  if (momentum === "breakthrough") {
    adaptiveSummary += ` ĐẶC BIỆT: Bài vừa rồi đạt ${input.lastScore}đ, bứt phá mạnh mẽ so với điểm TB 10 bài (${input.averageScoreLast10}đ).`;
    twoStepProblemRequired = true;
  } else if (momentum === "drop_recovery") {
    adaptiveSummary += ` CHÚ Ý: Bài vừa rồi đạt ${input.lastScore}đ, tụt dốc so với điểm TB 10 bài (${input.averageScoreLast10}đ). Cần bài tập hồi phục phong độ.`;
  }

  // 6. Độ khó khuyến nghị
  const recommendedDifficulties = getRecommendedDifficulties(effectiveScore);
  if (momentum === "breakthrough" && !recommendedDifficulties.includes("E") && effectiveScore >= 60) {
    recommendedDifficulties.push("D");
  }

  return {
    effectiveScore,
    pacingType,
    secondsPerQuestion,
    learnerArchetype,
    momentum,
    recommendedDifficulties,
    adaptiveSummary,
    pedagogicalDirective,
    distractorTrapRequired,
    twoStepProblemRequired,
    simplifiedWordingRequired,
  };
}

/**
 * Xác định danh sách độ khó khuyến nghị dựa trên chỉ số thông minh (0 - 100)
 */
export function getRecommendedDifficulties(intelligenceScore: number): Difficulty[] {
  if (intelligenceScore < 25) return ["A"];
  if (intelligenceScore < 45) return ["A", "B"];
  if (intelligenceScore < 60) return ["A", "B", "C"];
  if (intelligenceScore < 75) return ["B", "C", "D"];
  if (intelligenceScore < 90) return ["C", "D", "E"];
  return ["D", "E"];
}

/**
 * Truy xuất ngữ cảnh RAG từ ngân hàng câu hỏi `library/mẫu.docx`
 * được cá nhân hoá đa chiều theo:
 * - Chủ đề (topic), cấp độ chương trình (curriculumLevel)
 * - Độ chính xác (accuracy)
 * - Điểm của bài vừa làm (lastScore)
 * - Trung bình điểm 10 bài gần đây (averageScoreLast10)
 * - Thời gian làm bài (durationSeconds)
 */
export function retrievePersonalizedContext(input: GenerateRagQuizInput): RagKnowledgeQuestion[] {
  const profile = analyzeStudentPerformanceProfile(input);
  const count = Math.max(1, Math.min(20, input.count ?? 10));
  const effectiveScore = profile.effectiveScore;

  const targetDiffs = new Set(
    input.difficulties && input.difficulties.length > 0
      ? input.difficulties
      : profile.recommendedDifficulties,
  );

  const topicKeywords = (input.topic || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const seenPrompts = new Set((input.excludePrompts ?? []).map((p) => p.trim().toLowerCase()));

  // Seed kết hợp cả 4 chỉ số để tạo sự phân kỳ đề thi rõ nét giữa các học sinh và giữa các lần làm bài
  const dynamicSeed =
    input.variationSeed ??
    `${Date.now()}-${effectiveScore}-${Math.round(profile.secondsPerQuestion)}-${input.lastScore ?? 0}-${Math.round(input.accuracy ?? 0)}`;
  const rng = seededRandom(dynamicSeed);

  // Tính điểm tương quan RAG thích ứng nâng cao
  const scored = ragBank
    .filter((q) => !seenPrompts.has(q.prompt.trim().toLowerCase()))
    .map((q) => {
      let score = 0;

      // 1. Độ tương đồng từ khoá với Topic (trọng số 2.8)
      const qText = `${q.prompt} ${q.topic} ${q.skill} ${q.tags.join(" ")}`.toLowerCase();
      let keywordHits = 0;
      for (const kw of topicKeywords) {
        if (qText.includes(kw)) keywordHits += 1;
      }
      if (topicKeywords.length > 0) {
        score += (keywordHits / topicKeywords.length) * 2.8;
      } else {
        score += 1.0;
      }

      // 2. Độ phù hợp với năng lực động (effectiveScore kết hợp 4 chỉ số) (trọng số 2.6)
      const scoreDiff = Math.abs(q.targetScore - effectiveScore);
      const intelCloseness = Math.max(0, 1 - scoreDiff / 80);
      score += intelCloseness * 2.6;

      // 3. Độ phù hợp với mức độ khó mục tiêu (trọng số 2.0)
      if (targetDiffs.has(q.difficulty)) {
        score += 2.0;
      }

      // 4. Độ phù hợp với Curriculum Level (trọng số 1.5)
      const levelDiff = Math.abs(q.curriculumLevel - input.curriculumLevel);
      score += Math.max(0, 1.5 - levelDiff * 0.4);

      // 5. Ưu tiên câu tự hoàn chỉnh dạng văn bản (text-based)
      if (q.isTextBased) {
        score += 0.5;
      }

      // 6. THƯỞNG ĐIỂM THEO PHONG CÁCH HỌC SINH (Learner Archetype Bonus)
      if (profile.learnerArchetype === "fast_inaccurate") {
        // Học sinh làm nhanh nhưng ẩu: Thưởng điểm cho câu đòi hỏi đọc kỹ, phân biệt từ ngữ
        if (
          q.skill.includes("liền trước") ||
          q.skill.includes("bé nhất") ||
          q.skill.includes("lớn nhất") ||
          q.skill.includes("lời văn") ||
          q.skill.includes("So sánh")
        ) {
          score += 1.8;
        }
      } else if (profile.learnerArchetype === "slow_struggling") {
        // Học sinh chậm và quá tải: Ưu tiên câu có độ khó A, B hoặc dạng tính toán trực quan ngắn gọn
        if (q.difficulty === "A" || q.difficulty === "B") {
          score += 1.6;
        }
      } else if (
        profile.learnerArchetype === "fast_accurate" ||
        profile.momentum === "breakthrough" ||
        profile.momentum === "consistent_mastery"
      ) {
        // Học sinh giỏi hoặc bứt phá: Ưu tiên câu thử thách C, D, E và bài toán logic nhiều bước
        if (["C", "D", "E"].includes(q.difficulty)) {
          score += 1.8;
        }
        if (
          q.skill.includes("Bất đẳng thức kép") ||
          q.skill.includes("kế tiếp") ||
          q.skill.includes("hai bước")
        ) {
          score += 1.5;
        }
      } else if (profile.learnerArchetype === "slow_careful") {
        // Học sinh chậm nhưng cẩn thận: Ưu tiên câu rèn phản xạ tính nhanh
        if (q.skill.includes("đồng hồ") || q.skill.includes("độ dài") || q.skill.includes("còn thiếu")) {
          score += 1.4;
        }
      }

      // Thêm jitter ngẫu nhiên hoá để tránh lặp đề giữa các lần thi
      const jitter = rng() * 0.5;
      score += jitter;

      return { question: q, score };
    });

  // Sắp xếp giảm dần theo điểm tương quan RAG
  scored.sort((a, b) => b.score - a.score);

  // Chọn top K câu đa dạng về kỹ năng (Skill Diversity)
  const selected: RagKnowledgeQuestion[] = [];
  const selectedSkills = new Set<string>();

  for (const item of scored) {
    if (selected.length >= count) break;
    // Bắt buộc phân tán kỹ năng để đề thi phong phú
    if (selectedSkills.has(item.question.skill) && selected.length < count * 0.8 && scored.length > count * 1.5) {
      continue;
    }
    selected.push(item.question);
    selectedSkills.add(item.question.skill);
  }

  // Nếu chưa đủ số lượng, lấy thêm các câu có điểm cao kế tiếp
  if (selected.length < count) {
    for (const item of scored) {
      if (selected.length >= count) break;
      if (!selected.some((s) => s.prompt === item.question.prompt)) {
        selected.push(item.question);
      }
    }
  }

  return selected.slice(0, count);
}

/**
 * Sinh đề toán cá nhân hoá tự động trực tiếp từ mẫu.docx
 * (Dùng cho cả offline mode và fallback khi LLM server không khả dụng)
 */
export function synthesizePersonalizedQuestions(
  templates: RagKnowledgeQuestion[],
  input: GenerateRagQuizInput,
): QuizQuestion[] {
  const profile = analyzeStudentPerformanceProfile(input);
  const intelligence = profile.effectiveScore;
  const rng = seededRandom(
    input.variationSeed ??
    `${Date.now()}-${intelligence}-${Math.round(profile.secondsPerQuestion)}-${input.lastScore ?? 0}-${Math.round(input.accuracy ?? 0)}`,
  );
  const targetDiffs = profile.recommendedDifficulties;

  const studentNames = ["An", "Bình", "Hoa", "Minh", "Lan", "Nga", "Đức", "Mai", "Tùng", "Tâm", "Hải", "Linh"];
  const itemNames = [
    { name: "quả táo", unit: "quả" },
    { name: "bông hoa", unit: "bông" },
    { name: "viên bi", unit: "viên" },
    { name: "chiếc nhãn vở", unit: "chiếc" },
    { name: "chiếc bút chì", unit: "chiếc" },
    { name: "quả cam", unit: "quả" },
    { name: "quyển sách", unit: "quyển" },
    { name: "con gà", unit: "con" },
  ];

  function makeDistractors(correct: number, count = 3, deltaRange = 3): string[] {
    const set = new Set<string>([String(correct)]);
    let guard = 0;
    while (set.size < count + 1 && guard < 50) {
      guard += 1;
      const offset = (rng() > 0.5 ? 1 : -1) * randIntSeeded(rng, 1, Math.max(2, deltaRange * 3));
      const cand = correct + offset;
      if (cand >= 0 && cand <= 999) {
        set.add(String(cand));
      }
    }
    const result = Array.from(set).filter((v) => v !== String(correct));
    return result.slice(0, count);
  }

  function makeOptionsArray(correctStr: string, wrongOptions: string[]): string[] {
    const opts = [correctStr, ...wrongOptions.filter((w) => w !== correctStr)].slice(0, 4);
    while (opts.length < 4) {
      opts.push(String(randIntSeeded(rng, 1, 99)));
    }
    return shuffleWithRng(opts, rng);
  }

  const generated: QuizQuestion[] = [];
  const count = Math.max(1, input.count ?? templates.length);
  const usedPrompts = new Set<string>((input.excludePrompts ?? []).map((p) => p.trim().toLowerCase()));
  const poolTemplates = templates.length >= count
    ? templates
    : [
        ...templates,
        ...ragBank.filter(
          (q) => !templates.some((t) => t.prompt === q.prompt) && targetDiffs.includes(q.difficulty),
        ),
        ...ragBank.filter((q) => !templates.some((t) => t.prompt === q.prompt)),
      ];

  for (let i = 0; i < count; i += 1) {
    const tpl = poolTemplates[i % poolTemplates.length];
    const questionId = i + 1;
    const isChallenge = i >= Math.ceil(count / 2);

    // Phân loại mẫu câu hỏi để tạo biến thể cá nhân hoá theo chỉ số thông minh
    const p = tpl.prompt.toLowerCase();

    // 1. Dạng Số liền trước / số liền sau
    if (p.includes("liền trước") && p.includes("liền sau")) {
      const baseNum = intelligence >= 75
        ? randIntSeeded(rng, 40, 89)
        : intelligence >= 45
          ? randIntSeeded(rng, 20, 49)
          : randIntSeeded(rng, 11, 25);
      const prevNum = baseNum - 1;
      const nextNum = baseNum + 1;

      if (profile.distractorTrapRequired) {
        const correct = `${nextNum} và ${prevNum}`;
        const wrong = [
          `${prevNum} và ${nextNum}`,
          `${prevNum - 1} và ${baseNum}`,
          `${baseNum} và ${nextNum + 1}`,
        ];
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: "C",
          skill: "Số liền sau - liền trước (rèn đọc kỹ)",
          prompt: `Số liền sau và số liền trước của số ${baseNum} lần lượt là:`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Đọc kỹ đề bài: câu hỏi hỏi số LIỀN SAU trước rồi mới đến số LIỀN TRƯỚC. Số liền sau của ${baseNum} là ${nextNum}, số liền trước của ${baseNum} là ${prevNum}. Đáp án đúng: ${nextNum} và ${prevNum}.`,
        });
      } else {
        const correct = `${prevNum} và ${nextNum}`;
        const wrong = [
          `${prevNum - 1} và ${baseNum}`,
          `${prevNum} và ${nextNum + 1}`,
          `${baseNum} và ${nextNum + 1}`,
        ];
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: baseNum > 20 ? "B" : "A",
          skill: "Số liền trước - liền sau",
          prompt: `Số liền trước và số liền sau của số ${baseNum} là:`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Số liền trước của ${baseNum} là ${prevNum} (${baseNum} - 1 = ${prevNum}), số liền sau của ${baseNum} là ${nextNum} (${baseNum} + 1 = ${nextNum}).`,
        });
      }
      continue;
    }

    // 2. Dạng Tìm số bé nhất / lớn nhất
    if (p.includes("bé nhất") || p.includes("lớn nhất")) {
      const isMin = p.includes("bé nhất");
      const baseRange = intelligence >= 70 ? [30, 99] : [10, 50];
      const numbers: number[] = [];
      if (profile.distractorTrapRequired) {
        const tens = randIntSeeded(rng, 2, 7);
        const units = randIntSeeded(rng, tens + 1, 9);
        numbers.push(tens * 10 + units, units * 10 + tens);
      }
      while (numbers.length < 4) {
        const n = randIntSeeded(rng, baseRange[0], baseRange[1]);
        if (!numbers.includes(n)) numbers.push(n);
      }
      const ansNum = isMin ? Math.min(...numbers) : Math.max(...numbers);
      const correct = String(ansNum);
      const wrong = numbers.filter((n) => n !== ansNum).map(String);
      generated.push({
        id: questionId,
        phase: isChallenge ? "challenge" : "normal",
        difficulty: profile.distractorTrapRequired ? "C" : (baseRange[1] > 50 ? "B" : "A"),
        skill: isMin ? "Tìm số bé nhất" : "Tìm số lớn nhất",
        prompt: `Tìm số ${isMin ? "bé nhất" : "lớn nhất"} trong các số sau: ${numbers.join("; ")}`,
        options: makeOptionsArray(correct, wrong),
        correctAnswer: correct,
        explanation: `So sánh hàng chục và hàng đơn vị của các số, ta thấy số ${correct} là số ${isMin ? "bé nhất" : "lớn nhất"}.`,
      });
      continue;
    }

    // 3. Dạng Sắp xếp thứ tự các số (từ bé đến lớn / từ lớn đến bé)
    if (p.includes("thứ tự") || p.includes("từ bé đến lớn")) {
      const isAsc = !p.includes("lớn đến bé");
      const numCount = intelligence >= 75 ? 6 : intelligence >= 45 ? 5 : 4;
      const numList: number[] = [];
      while (numList.length < numCount) {
        const val = randIntSeeded(rng, 11, 99);
        if (!numList.includes(val)) numList.push(val);
      }
      const sorted = [...numList].sort((a, b) => isAsc ? a - b : b - a);
      const correctStr = sorted.join(", ");
      const wrong1 = [...numList].sort((a, b) => isAsc ? b - a : a - b).join(", ");
      const wrong2 = shuffleWithRng([...sorted], rng).join(", ");
      const tempRev = [...sorted];
      if (tempRev.length >= 4) {
        [tempRev[1], tempRev[2]] = [tempRev[2], tempRev[1]];
      }
      const wrong3 = tempRev.join(", ");
      generated.push({
        id: questionId,
        phase: isChallenge ? "challenge" : "normal",
        difficulty: numCount >= 5 ? "C" : "B",
        skill: "Sắp xếp dãy số theo thứ tự",
        prompt: `Các số ${numList.join("; ")} viết theo thứ tự ${isAsc ? "từ bé đến lớn" : "từ lớn đến bé"} là:`,
        options: makeOptionsArray(correctStr, [wrong1, wrong2, wrong3]),
        correctAnswer: correctStr,
        explanation: `So sánh các chữ số hàng chục rồi đến hàng đơn vị, thứ tự đúng là: ${correctStr}.`,
      });
      continue;
    }

    // 4. Dạng Bất đẳng thức kép (vd: 66 - 44 > ... > 57 - 37)
    if (p.includes("> ... >") || (p.includes(">") && p.includes("chỗ chấm"))) {
      const midVal = intelligence >= 70 ? randIntSeeded(rng, 20, 50) : randIntSeeded(rng, 10, 25);
      const upperVal = midVal + 1;
      const lowerVal = midVal - 1;
      const a2 = randIntSeeded(rng, 10, 30);
      const a1 = upperVal + a2;
      const b2 = randIntSeeded(rng, 10, 30);
      const b1 = lowerVal + b2;
      const correct = String(midVal);
      const wrong = [String(upperVal), String(lowerVal), String(midVal + 2)];
      generated.push({
        id: questionId,
        phase: isChallenge ? "challenge" : "normal",
        difficulty: midVal >= 25 ? "E" : "D",
        skill: "Bất đẳng thức kép tìm số ở giữa",
        prompt: `Điền số thích hợp vào chỗ chấm: ${a1} – ${a2} > ... > ${b1} – ${b2}`,
        options: makeOptionsArray(correct, wrong),
        correctAnswer: correct,
        explanation: `Ta có: ${a1} – ${a2} = ${upperVal} và ${b1} – ${b2} = ${lowerVal}. Vì ${upperVal} > ... > ${lowerVal} nên số cần điền là ${correct}.`,
      });
      continue;
    }

    // 5. Dạng Lịch và ngày trong tuần (không ghi đè câu tính ngày ngược "tuần liền trước")
    if (
      p.includes("thứ") &&
      !p.includes("tuần liền trước") &&
      (p.includes("hôm qua") || p.includes("ngày mai") || p.includes("của một tuần"))
    ) {
      const days = ["thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy", "Chủ Nhật"];
      const dIdx = randIntSeeded(rng, 0, 6);
      const todayDay = randIntSeeded(rng, 8, 22);

      if (intelligence >= 70) {
        const targetWeekday = days[(dIdx + 1) % 7];
        const nextWeekDate = todayDay + 7 + 1;
        const correct = String(nextWeekDate);
        const wrong = [String(nextWeekDate - 1), String(nextWeekDate + 1), String(nextWeekDate - 2)];
        const startDayLabel = days[dIdx].charAt(0).toUpperCase() + days[dIdx].slice(1);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: "D",
          skill: "Tính ngày trong tuần kế tiếp",
          prompt: `${startDayLabel} của một tuần là ngày ${todayDay} trong tháng. Hỏi ${targetWeekday} của tuần liền sau là ngày nào trong tháng?`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `${startDayLabel} tuần liền sau là ngày ${todayDay + 7}. Kế tiếp là ${targetWeekday} nên là ngày ${nextWeekDate}.`,
        });
      } else {
        const isYesterday = rng() > 0.5;
        const targetD = isYesterday ? (dIdx + 6) % 7 : (dIdx + 1) % 7;
        const targetDate = isYesterday ? todayDay - 1 : todayDay + 1;
        const correct = `${days[targetD]} ngày ${targetDate}`;
        const wrong = [
          `${days[(targetD + 1) % 7]} ngày ${targetDate}`,
          `${days[targetD]} ngày ${targetDate + 1}`,
          `${days[(targetD + 6) % 7]} ngày ${targetDate - 1}`,
        ];
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: "B",
          skill: "Xác định thứ ngày trong tuần",
          prompt: `Hôm nay là ${days[dIdx]} ngày ${todayDay}. Hỏi ${isYesterday ? "hôm qua" : "ngày mai"} là thứ mấy ngày mấy?`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `${isYesterday ? "Trước" : "Sau"} ${days[dIdx]} là ${days[targetD]}, ${isYesterday ? "trước" : "sau"} ngày ${todayDay} là ngày ${targetDate}.`,
        });
      }
      continue;
    }

    // 6. Dạng Tìm số còn thiếu trong phép tính (... - a = b hoặc a + b + ... = c)
    if (p.includes("...") || p.includes("– 32 =") || p.includes("+ ... =") || p.includes("... –") || p.includes("... +")) {
      if (intelligence >= 65) {
        const x1 = randIntSeeded(rng, 10, 40);
        const x2 = randIntSeeded(rng, 10, 30);
        const missing = randIntSeeded(rng, 5, 25);
        const total = x1 + x2 + missing;
        const correct = String(missing);
        const wrong = makeDistractors(missing, 3, 2);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: "D",
          skill: "Tìm số hạng còn thiếu trong tổng ba số",
          prompt: `Điền số thích hợp vào chỗ chấm: ${x1} + ${x2} + ... = ${total}`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Ta có ${x1} + ${x2} = ${x1 + x2}. Số cần điền là: ${total} - ${x1 + x2} = ${missing}.`,
        });
      } else {
        const subVal = randIntSeeded(rng, 12, 45);
        const diffVal = randIntSeeded(rng, 10, 40);
        const targetVal = subVal + diffVal;
        const correct = String(targetVal);
        const wrong = makeDistractors(targetVal, 3, 3);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: "C",
          skill: "Tìm số bị trừ chưa biết",
          prompt: `Điền số thích hợp vào chỗ chấm: ... – ${subVal} = ${diffVal}`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Muốn tìm số bị trừ, ta lấy hiệu cộng với số trừ: ${diffVal} + ${subVal} = ${targetVal}.`,
        });
      }
      continue;
    }

    // 7. Dạng so sánh biểu thức (>, <, =)
    if (p.includes("điền dấu") && (p.includes("+") || p.includes("-") || p.includes("–"))) {
      const a = randIntSeeded(rng, 10, 50);
      const b = randIntSeeded(rng, 5, 30);
      const c = randIntSeeded(rng, 10, 50);
      const d = randIntSeeded(rng, 5, 30);
      const val1 = a + b;
      const val2 = c + d;
      const correct = val1 > val2 ? ">" : val1 < val2 ? "<" : "=";
      generated.push({
        id: questionId,
        phase: isChallenge ? "challenge" : "normal",
        difficulty: "C",
        skill: "So sánh giá trị biểu thức",
        prompt: `Điền dấu >, <, = thích hợp vào chỗ chấm: ${a} + ${b} ... ${c} + ${d}`,
        options: [">", "<", "=", "Đáp án khác"],
        correctAnswer: correct,
        explanation: `Ta có: ${a} + ${b} = ${val1} và ${c} + ${d} = ${val2}. Vì ${val1} ${correct} ${val2} nên điền dấu "${correct}".`,
      });
      continue;
    }

    // 8. Dạng Toán có lời văn cho - bớt - bán (không ghi đè các dạng đặc thù như tuổi, bắc cầu, lập số, hình học, xe buýt...)
    const isSpecialProblem =
      p.includes("tuổi") ||
      p.includes("ít hơn") ||
      p.includes("nhiều hơn") ||
      p.includes("bằng nhau") ||
      p.includes("hình") ||
      p.includes("tam giác") ||
      p.includes("chữ số") ||
      p.includes("sải tay") ||
      p.includes("cân") ||
      p.includes("chỗ ngồi") ||
      p.includes("xe buýt") ||
      p.includes("đôi đũa") ||
      p.includes("giờ") ||
      p.includes("cm");
    if (!isSpecialProblem && (p.includes("còn lại") || p.includes("bán") || p.includes("cho thêm") || p.includes("tặng"))) {
      const sName = studentNames[randIntSeeded(rng, 0, studentNames.length - 1)];
      const item = itemNames[randIntSeeded(rng, 0, itemNames.length - 1)];

      if (profile.distractorTrapRequired) {
        const initial = randIntSeeded(rng, 25, 55);
        const sub = randIntSeeded(rng, 5, 18);
        const extraItem = itemNames[(itemNames.indexOf(item) + 1) % itemNames.length];
        const extraCount = randIntSeeded(rng, 8, 20);
        const remain = initial - sub;
        const correct = `${remain} ${item.unit}`;
        const wrong = [
          `${remain + extraCount} ${item.unit}`,
          `${initial + extraCount - sub} ${item.unit}`,
          `${Math.max(1, remain - 3)} ${item.unit}`,
        ];
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: "D",
          skill: "Toán có lời văn bẫy dữ kiện thừa",
          prompt: `Bạn ${sName} có ${initial} ${item.name} và ${extraCount} ${extraItem.name}. ${sName} tặng em ${sub} ${item.unit}. Hỏi ${sName} còn lại bao nhiêu ${item.name}?`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Đọc kỹ đề bài: câu hỏi chỉ hỏi số ${item.name} còn lại nên số ${extraCount} ${extraItem.name} là thông tin thừa. Ta có: ${initial} - ${sub} = ${remain} (${item.unit}).`,
        });
      } else if (profile.simplifiedWordingRequired) {
        const initial = randIntSeeded(rng, 10, 20);
        const sub = randIntSeeded(rng, 2, 7);
        const remain = initial - sub;
        const correct = `${remain} ${item.unit}`;
        const wrong = makeDistractors(remain, 3, 2).map((w) => `${w} ${item.unit}`);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: "B",
          skill: "Toán có lời văn cơ bản",
          prompt: `Bạn ${sName} có ${initial} ${item.name}, ${sName} cho bạn ${sub} ${item.unit}. Hỏi ${sName} còn lại bao nhiêu ${item.name}?`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Số ${item.name} còn lại là: ${initial} - ${sub} = ${remain} (${item.unit}).`,
        });
      } else if (profile.twoStepProblemRequired || intelligence >= 65) {
        const initial = randIntSeeded(rng, 25, 60);
        const part1 = randIntSeeded(rng, 5, 15);
        const part2 = randIntSeeded(rng, 3, 10);
        const remain = initial - part1 - part2;
        const correct = `${remain} ${item.unit}`;
        const wrong = makeDistractors(remain, 3, 2).map((w) => `${w} ${item.unit}`);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: "D",
          skill: "Toán có lời văn hai bước tính",
          prompt: `Bạn ${sName} có ${initial} ${item.name}. ${sName} tặng em ${part1} ${item.unit}, sau đó tặng bạn ${part2} ${item.unit}. Hỏi ${sName} còn lại bao nhiêu ${item.name}?`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Sau lần tặng thứ nhất ${sName} còn: ${initial} - ${part1} = ${initial - part1} (${item.unit}). Sau lần tặng thứ hai còn: ${initial - part1} - ${part2} = ${remain} (${item.unit}).`,
        });
      } else {
        const initial = randIntSeeded(rng, 12, 35);
        const sub = randIntSeeded(rng, 3, initial - 2);
        const remain = initial - sub;
        const correct = `${remain} ${item.unit}`;
        const wrong = makeDistractors(remain, 3, 2).map((w) => `${w} ${item.unit}`);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: initial > 20 ? "C" : "B",
          skill: "Toán có lời văn phép trừ",
          prompt: `Bạn ${sName} có ${initial} ${item.name}, ${sName} cho bạn ${sub} ${item.unit}. Hỏi ${sName} còn lại bao nhiêu ${item.name}?`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Số ${item.name} còn lại là: ${initial} - ${sub} = ${remain} (${item.unit}).`,
        });
      }
      continue;
    }

    // 9. Dạng độ dài xăng-ti-mét (cm)
    if (p.includes("cm") || p.includes("xăng-ti-mét")) {
      const len1 = randIntSeeded(rng, 20, 60);
      const len2 = randIntSeeded(rng, 5, 25);
      const total = len1 + len2;
      const correct = `${total} cm`;
      const wrong = makeDistractors(total, 3, 4).map((w) => `${w} cm`);
      generated.push({
        id: questionId,
        phase: isChallenge ? "challenge" : "normal",
        difficulty: len1 >= 20 ? "C" : "B",
        skill: "Tính toán số đo độ dài xăng-ti-mét",
        prompt: `Tính: ${len1} cm + ${len2} cm = ... cm?`,
        options: makeOptionsArray(correct, wrong),
        correctAnswer: correct,
        explanation: `${len1} cm + ${len2} cm = ${total} cm.`,
      });
      continue;
    }

    // 10. Dạng thời gian - xem đồng hồ đúng
    if (p.includes("kim ngắn") || p.includes("đồng hồ")) {
      const hour = randIntSeeded(rng, 1, 11);
      const correct = `${hour} giờ`;
      const wrong = [`${hour + 1} giờ`, `${Math.max(1, hour - 1)} giờ`, `${(hour + 2) % 12 || 12} giờ`];
      generated.push({
        id: questionId,
        phase: isChallenge ? "challenge" : "normal",
        difficulty: "A",
        skill: "Xem giờ đúng trên đồng hồ",
        prompt: `Đồng hồ có kim ngắn chỉ số ${hour}, kim dài chỉ số 12. Hỏi đồng hồ chỉ mấy giờ?`,
        options: makeOptionsArray(correct, wrong),
        correctAnswer: correct,
        explanation: `Kim ngắn chỉ số ${hour}, kim dài chỉ số 12 là đúng ${hour} giờ.`,
      });
      continue;
    }

    // 11. Mẫu gốc đã được tinh chỉnh (giữ nguyên độ khó chuẩn của mẫu, tránh trùng đề)
    const fallbackTpl = usedPrompts.has(tpl.prompt.trim().toLowerCase())
      ? (ragBank.find((q) => !usedPrompts.has(q.prompt.trim().toLowerCase()) && targetDiffs.includes(q.difficulty))
        ?? ragBank.find((q) => !usedPrompts.has(q.prompt.trim().toLowerCase()))
        ?? tpl)
      : tpl;
    usedPrompts.add(fallbackTpl.prompt.trim().toLowerCase());
    generated.push({
      id: questionId,
      phase: isChallenge ? "challenge" : "normal",
      difficulty: fallbackTpl.difficulty,
      skill: fallbackTpl.skill,
      prompt: fallbackTpl.prompt,
      options: [...fallbackTpl.options],
      correctAnswer: fallbackTpl.correctAnswer,
      explanation: fallbackTpl.explanation,
    });
  }

  // Bảo đảm 100% câu hỏi trong một đề không bao giờ bị trùng đề bài
  const seenInBatch = new Set<string>();
  const deduped: QuizQuestion[] = [];
  for (const item of generated) {
    const key = item.prompt.trim().toLowerCase();
    if (!seenInBatch.has(key)) {
      seenInBatch.add(key);
      deduped.push(item);
    }
  }
  if (deduped.length < count) {
    const fillers = [
      ...ragBank.filter((q) => targetDiffs.includes(q.difficulty)),
      ...ragBank,
    ];
    for (const filler of fillers) {
      if (deduped.length >= count) break;
      const key = filler.prompt.trim().toLowerCase();
      if (seenInBatch.has(key) || usedPrompts.has(key)) continue;
      seenInBatch.add(key);
      deduped.push({
        id: deduped.length + 1,
        phase: "normal",
        difficulty: filler.difficulty,
        skill: filler.skill,
        prompt: filler.prompt,
        options: [...filler.options],
        correctAnswer: filler.correctAnswer,
        explanation: filler.explanation,
      });
    }
  }

  return finalizeQuizSequence(deduped, count);
}

/**
 * Hàm lấy context cũ (giữ tương thích ngược với mã nguồn trước đây)
 */
export function retrieveContext(count: number, seed?: string): SampleQuestion[] {
  const rng = seededRandom(seed ?? String(Date.now()));
  const arr = [...legacyBank];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.max(1, Math.min(count, arr.length)));
}
