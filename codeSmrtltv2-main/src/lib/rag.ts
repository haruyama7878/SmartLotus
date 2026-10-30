import "server-only";

import sampleQuestions from "@/data/sample-questions.json";
import rawRagBank from "@/data/rag-question-bank.json";
import type { Difficulty, QuizPhase, QuizQuestion } from "./learning-data";

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
 * được cá nhân hoá theo chủ đề (topic), cấp độ (level) và chỉ số thông minh (intelligenceScore).
 */
export function retrievePersonalizedContext(input: GenerateRagQuizInput): RagKnowledgeQuestion[] {
  const count = Math.max(1, Math.min(20, input.count ?? 10));
  const intelligence = Math.max(0, Math.min(100, input.intelligenceScore ?? 50));
  const targetDiffs = new Set(input.difficulties && input.difficulties.length > 0
    ? input.difficulties
    : getRecommendedDifficulties(intelligence));

  const topicKeywords = (input.topic || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const seenPrompts = new Set((input.excludePrompts ?? []).map((p) => p.trim().toLowerCase()));
  const rng = seededRandom(input.variationSeed ?? `${Date.now()}-${intelligence}`);

  // Tính điểm độ tương quan (Relevance Scoring) cho từng câu trong mẫu.docx
  const scored = ragBank
    .filter((q) => !seenPrompts.has(q.prompt.trim().toLowerCase()))
    .map((q) => {
      let score = 0;

      // 1. Độ tương đồng từ khoá với Topic (trọng số 3.0)
      const qText = `${q.prompt} ${q.topic} ${q.skill} ${q.tags.join(" ")}`.toLowerCase();
      let keywordHits = 0;
      for (const kw of topicKeywords) {
        if (qText.includes(kw)) keywordHits += 1;
      }
      if (topicKeywords.length > 0) {
        score += (keywordHits / topicKeywords.length) * 3.0;
      } else {
        score += 1.0;
      }

      // 2. Độ phù hợp với chỉ số thông minh của học sinh (trọng số 2.5)
      // Càng gần khoảng targetScore của học sinh điểm càng cao
      const scoreDiff = Math.abs(q.targetScore - intelligence);
      const intelCloseness = Math.max(0, 1 - scoreDiff / 80);
      score += intelCloseness * 2.5;

      // 3. Độ phù hợp với mức độ khó (trọng số 2.0)
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

      // Thêm chút ngẫu nhiên nhỏ dựa trên seed để đa dạng đề giữa các lần sinh
      const jitter = rng() * 0.4;
      score += jitter;

      return { question: q, score };
    });

  // Sắp xếp giảm dần theo điểm tương quan RAG
  scored.sort((a, b) => b.score - a.score);

  // Chọn top K câu đa dạng về kỹ năng
  const selected: RagKnowledgeQuestion[] = [];
  const selectedSkills = new Set<string>();

  for (const item of scored) {
    if (selected.length >= count) break;
    // Cố gắng đa dạng hoá kỹ năng
    if (selectedSkills.has(item.question.skill) && selected.length < count * 0.7 && scored.length > count * 1.5) {
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
  const intelligence = Math.max(0, Math.min(100, input.intelligenceScore ?? 50));
  const rng = seededRandom(input.variationSeed ?? `${Date.now()}-${intelligence}`);
  const targetDiffs = getRecommendedDifficulties(intelligence);

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

  for (let i = 0; i < count; i += 1) {
    const tpl = templates[i % templates.length];
    const questionId = i + 1;
    const isChallenge = i >= Math.ceil(count / 2);
    const assignedDiff: Difficulty = isChallenge
      ? targetDiffs[targetDiffs.length - 1] ?? "C"
      : targetDiffs[0] ?? "A";

    // Phân loại mẫu câu hỏi để tạo biến thể cá nhân hoá theo chỉ số thông minh
    const p = tpl.prompt.toLowerCase();

    // 1. Dạng Số liền trước / số liền sau
    if (p.includes("liền trước") && p.includes("liền sau")) {
      // Điều chỉnh dải số theo IQ
      const baseNum = intelligence >= 75
        ? randIntSeeded(rng, 40, 89)
        : intelligence >= 45
          ? randIntSeeded(rng, 20, 49)
          : randIntSeeded(rng, 11, 25);
      const prevNum = baseNum - 1;
      const nextNum = baseNum + 1;
      const correct = `${prevNum} và ${nextNum}`;
      const wrong = [
        `${prevNum - 1} và ${baseNum}`,
        `${prevNum} và ${nextNum + 1}`,
        `${baseNum} và ${nextNum + 1}`,
      ];
      generated.push({
        id: questionId,
        phase: isChallenge ? "challenge" : "normal",
        difficulty: assignedDiff,
        skill: "Số liền trước - liền sau",
        prompt: `Số liền trước và số liền sau của số ${baseNum} là:`,
        options: makeOptionsArray(correct, wrong),
        correctAnswer: correct,
        explanation: `Số liền trước của ${baseNum} là ${prevNum} (${baseNum} - 1 = ${prevNum}), số liền sau của ${baseNum} là ${nextNum} (${baseNum} + 1 = ${nextNum}).`,
      });
      continue;
    }

    // 2. Dạng Tìm số bé nhất / lớn nhất
    if (p.includes("bé nhất") || p.includes("lớn nhất")) {
      const isMin = p.includes("bé nhất");
      const baseRange = intelligence >= 70 ? [30, 99] : [10, 50];
      const numbers: number[] = [];
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
        difficulty: assignedDiff,
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
        difficulty: assignedDiff,
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
        difficulty: assignedDiff,
        skill: "Bất đẳng thức kép tìm số ở giữa",
        prompt: `Điền số thích hợp vào chỗ chấm: ${a1} – ${a2} > ... > ${b1} – ${b2}`,
        options: makeOptionsArray(correct, wrong),
        correctAnswer: correct,
        explanation: `Ta có: ${a1} – ${a2} = ${upperVal} và ${b1} – ${b2} = ${lowerVal}. Vì ${upperVal} > ... > ${lowerVal} nên số cần điền là ${correct}.`,
      });
      continue;
    }

    // 5. Dạng Lịch và ngày trong tuần
    if (p.includes("thứ") && (p.includes("hôm qua") || p.includes("ngày mai") || p.includes("tuần"))) {
      const days = ["thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy", "Chủ Nhật"];
      const dIdx = randIntSeeded(rng, 0, 6);
      const todayDay = randIntSeeded(rng, 8, 22);

      if (intelligence >= 70) {
        // Tuần sau hoặc tuần trước
        const targetWeekday = days[(dIdx + 1) % 7];
        const nextWeekDate = todayDay + 7 + 1;
        const correct = String(nextWeekDate);
        const wrong = [String(nextWeekDate - 1), String(nextWeekDate + 1), String(nextWeekDate - 2)];
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: assignedDiff,
          skill: "Tính ngày trong tuần kế tiếp",
          prompt: `${days[dIdx]} của một tuần là ngày ${todayDay} trong tháng. Hỏi ${targetWeekday} của tuần liền sau là ngày nào trong tháng?`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `${days[dIdx]} tuần liền sau là ngày ${todayDay + 7}. Kế tiếp là ${targetWeekday} nên là ngày ${nextWeekDate}.`,
        });
      } else {
        // Hôm qua / ngày mai đơn giản
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
          difficulty: assignedDiff,
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
        // Ba số hạng: a + b + ... = c
        const x1 = randIntSeeded(rng, 10, 40);
        const x2 = randIntSeeded(rng, 10, 30);
        const missing = randIntSeeded(rng, 5, 25);
        const total = x1 + x2 + missing;
        const correct = String(missing);
        const wrong = makeDistractors(missing, 3, 2);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: assignedDiff,
          skill: "Tìm số hạng còn thiếu trong tổng ba số",
          prompt: `Điền số thích hợp vào chỗ chấm: ${x1} + ${x2} + ... = ${total}`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Ta có ${x1} + ${x2} = ${x1 + x2}. Số cần điền là: ${total} - ${x1 + x2} = ${missing}.`,
        });
      } else {
        // Tìm số bị trừ: ... - a = b
        const subVal = randIntSeeded(rng, 12, 45);
        const diffVal = randIntSeeded(rng, 10, 40);
        const targetVal = subVal + diffVal;
        const correct = String(targetVal);
        const wrong = makeDistractors(targetVal, 3, 3);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: assignedDiff,
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
        difficulty: assignedDiff,
        skill: "So sánh giá trị biểu thức",
        prompt: `Điền dấu >, <, = thích hợp vào chỗ chấm: ${a} + ${b} ... ${c} + ${d}`,
        options: [">", "<", "=", "Đáp án khác"],
        correctAnswer: correct,
        explanation: `Ta có: ${a} + ${b} = ${val1} và ${c} + ${d} = ${val2}. Vì ${val1} ${correct} ${val2} nên điền dấu "${correct}".`,
      });
      continue;
    }

    // 8. Dạng Toán có lời văn (1 bước hoặc 2 bước tuỳ IQ)
    if (p.includes("hỏi") || p.includes("bán") || p.includes("cho") || p.includes("mua") || p.includes("học sinh")) {
      const sName = studentNames[randIntSeeded(rng, 0, studentNames.length - 1)];
      const item = itemNames[randIntSeeded(rng, 0, itemNames.length - 1)];

      if (intelligence >= 65) {
        // Toán lời văn 2 bước tính (nâng cao)
        const initial = randIntSeeded(rng, 25, 60);
        const part1 = randIntSeeded(rng, 5, 15);
        const part2 = randIntSeeded(rng, 3, 10);
        const remain = initial - part1 - part2;
        const correct = `${remain} ${item.unit}`;
        const wrong = makeDistractors(remain, 3, 2).map((w) => `${w} ${item.unit}`);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: assignedDiff,
          skill: "Toán có lời văn hai bước tính",
          prompt: `Bạn ${sName} có ${initial} ${item.name}. ${sName} tặng em ${part1} ${item.unit}, sau đó tặng bạn ${part2} ${item.unit}. Hỏi ${sName} còn lại bao nhiêu ${item.name}?`,
          options: makeOptionsArray(correct, wrong),
          correctAnswer: correct,
          explanation: `Sau lần tặng thứ nhất ${sName} còn: ${initial} - ${part1} = ${initial - part1} (${item.unit}). Sau lần tặng thứ hai còn: ${initial - part1} - ${part2} = ${remain} (${item.unit}).`,
        });
      } else {
        // Toán lời văn 1 bước tính (cơ bản / trung bình)
        const initial = randIntSeeded(rng, 12, 35);
        const sub = randIntSeeded(rng, 3, initial - 2);
        const remain = initial - sub;
        const correct = `${remain} ${item.unit}`;
        const wrong = makeDistractors(remain, 3, 2).map((w) => `${w} ${item.unit}`);
        generated.push({
          id: questionId,
          phase: isChallenge ? "challenge" : "normal",
          difficulty: assignedDiff,
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
        difficulty: assignedDiff,
        skill: "Tính toán số đo độ dài xăng-ti-mét",
        prompt: `Tính: ${len1} cm + ${len2} cm = ... cm?`,
        options: makeOptionsArray(correct, wrong),
        correctAnswer: correct,
        explanation: `${len1} cm + ${len2} cm = ${total} cm.`,
      });
      continue;
    }

    // 10. Dạng thời gian - xem đồng hồ đúng
    if (p.includes("giờ") || p.includes("đồng hồ")) {
      const hour = randIntSeeded(rng, 1, 11);
      const correct = `${hour} giờ`;
      const wrong = [`${hour + 1} giờ`, `${Math.max(1, hour - 1)} giờ`, `${(hour + 2) % 12 || 12} giờ`];
      generated.push({
        id: questionId,
        phase: isChallenge ? "challenge" : "normal",
        difficulty: assignedDiff,
        skill: "Xem giờ đúng trên đồng hồ",
        prompt: `Đồng hồ có kim ngắn chỉ số ${hour}, kim dài chỉ số 12. Hỏi đồng hồ chỉ mấy giờ?`,
        options: makeOptionsArray(correct, wrong),
        correctAnswer: correct,
        explanation: `Kim ngắn chỉ số ${hour}, kim dài chỉ số 12 là đúng ${hour} giờ.`,
      });
      continue;
    }

    // 11. Mẫu gốc đã được tinh chỉnh (tự động điều chỉnh theo template của mẫu.docx)
    generated.push({
      id: questionId,
      phase: isChallenge ? "challenge" : "normal",
      difficulty: assignedDiff,
      skill: tpl.skill,
      prompt: tpl.prompt,
      options: [...tpl.options],
      correctAnswer: tpl.correctAnswer,
      explanation: tpl.explanation,
    });
  }

  return generated;
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
