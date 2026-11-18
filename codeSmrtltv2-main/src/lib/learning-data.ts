export type Difficulty = "A" | "B" | "C" | "D" | "E";
export type QuizPhase = "normal" | "challenge";
export type AnswerMode = "choice" | "type" | "line" | "complete" | "match" | "select" | "image-choice" | "image-select";
export type QuizImageAsset = { id: string; src: string; name: string };
export type QuizVisualElement = { assetId: string; x: number; y: number; size: number };

export type CurriculumLevel = {
  id: number;
  title: string;
  shortTitle: string;
  competency: string;
  lessons: string[];
  completed: number;
  total: number;
  color: string;
  icon: string;
};

export type QuizQuestion = {
  id: number;
  phase: QuizPhase;
  difficulty: Difficulty;
  skill: string;
  prompt: string;
  illustration?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  answerMode?: AnswerMode;
  imageAssets?: QuizImageAsset[];
  visualElements?: QuizVisualElement[];
  optionImageIds?: Array<string | null>;
};

export type SurveyQuestion = QuizQuestion & { level: number };

export function isAnswerModeCompatible(question: QuizQuestion, mode: AnswerMode): boolean {
  if (mode === "choice") return true;
  if (mode === "image-choice" || mode === "image-select") {
    if (question.options.length !== 4
      || !question.optionImageIds
      || question.optionImageIds.length !== question.options.length) return false;
    const assetIds = new Set((question.imageAssets ?? []).map((asset) => asset.id));
    if (question.optionImageIds.some((assetId) => !assetId || !assetIds.has(assetId))
      || new Set(question.optionImageIds).size !== question.optionImageIds.length) return false;
    const answers = mode === "image-select" ? question.correctAnswer.split("|") : [question.correctAnswer];
    return answers.length > 0
      && answers.every((answer) => question.options.includes(answer))
      && new Set(answers).size === answers.length;
  }

  const answer = Number(question.correctAnswer.trim());
  if (!Number.isSafeInteger(answer)) return false;
  if (mode === "type") return Math.abs(answer) <= 999999;
  if (answer < 0 || answer > 999) return false;
  if (mode === "select") {
    const arithmetic = question.prompt.match(/(\d+)\s*([+\-−×÷x*])\s*(\d+)/);
    if (!arithmetic) return false;
    const left = Number(arithmetic[1]);
    const right = Number(arithmetic[3]);
    const result = arithmetic[2] === "+" ? left + right
      : ["×", "x", "*"].includes(arithmetic[2]) ? left * right
        : arithmetic[2] === "÷" ? left / right
          : left - right;
    if (result !== answer) return false;
  }
  if (mode === "line") {
    const numericOptions = question.options
      .map((option) => Number(option.trim()))
      .filter((option) => Number.isFinite(option) && Math.abs(option) <= 999);
    return Math.max(5, answer, ...numericOptions) + 2 <= 20;
  }
  return true;
}

export const curriculum: CurriculumLevel[] = [
  {
    id: 1,
    title: "Làm quen với Toán học",
    shortTitle: "Làm quen với Toán",
    competency: "So sánh và làm quen với số",
    lessons: ["So sánh nhiều hơn – ít hơn", "So sánh bằng nhau", "So sánh số", "Thứ tự số", "Làm quen với số 1–5"],
    completed: 5,
    total: 5,
    color: "#ec4899",
    icon: "shapes",
  },
  {
    id: 2,
    title: "Các số từ 0 đến 10",
    shortTitle: "Các số từ 0–10",
    competency: "Đọc, viết, đếm và so sánh số ≤ 10",
    lessons: ["Số 0–5", "Số 6–10", "Đọc, viết số 0–10", "So sánh số", ">, <, =", "Sắp xếp số"],
    completed: 6,
    total: 6,
    color: "#8b5cf6",
    icon: "numbers",
  },
  {
    id: 3,
    title: "Cộng và trừ trong phạm vi 10",
    shortTitle: "Cộng trừ trong 10",
    competency: "Thực hiện phép cộng, trừ trong phạm vi 10",
    lessons: ["Ý nghĩa phép cộng", "Phép cộng ≤ 10", "Ý nghĩa phép trừ", "Phép trừ ≤ 10", "Quan hệ cộng – trừ", "Điền số còn thiếu", "Bài toán thực tế"],
    completed: 3,
    total: 7,
    color: "#f59e0b",
    icon: "math",
  },
  {
    id: 4,
    title: "Các số đến 100",
    shortTitle: "Các số đến 100",
    competency: "Hiểu cấu tạo và thứ tự số ≤ 100",
    lessons: ["Các số 11–20", "Chục và đơn vị", "Các số đến 50", "Các số đến 100", "So sánh số", "Sắp xếp số", "Số liền trước – liền sau"],
    completed: 0,
    total: 7,
    color: "#14b8a6",
    icon: "abacus",
  },
  {
    id: 5,
    title: "Cộng và trừ trong phạm vi 100",
    shortTitle: "Cộng trừ trong 100",
    competency: "Tính toán và vận dụng",
    lessons: ["Cộng không nhớ", "Trừ không nhớ", "Cộng với số có một chữ số", "Trừ với số có một chữ số", "Tính nhẩm", "Điền số", "Bài toán có lời văn"],
    completed: 0,
    total: 7,
    color: "#3b82f6",
    icon: "plus",
  },
  {
    id: 6,
    title: "Toán học trong cuộc sống",
    shortTitle: "Toán trong cuộc sống",
    competency: "Vận dụng kiến thức vào tình huống thực tế",
    lessons: ["Số tròn chục", "Độ dài", "Xăng-ti-mét", "Xem giờ", "Ngày và tuần", "Bài toán thực tế", "Ôn tập tổng hợp", "Thử thách cuối lớp 1"],
    completed: 0,
    total: 8,
    color: "#22c55e",
    icon: "clock",
  },
];

export const questions: QuizQuestion[] = [
  {
    id: 2,
    phase: "normal",
    difficulty: "A",
    skill: "So sánh",
    prompt: "Điền dấu thích hợp: 7  ☐  5",
    options: [">", "<", "=", "+"],
    correctAnswer: ">",
    explanation: "7 lớn hơn 5 nên ta điền dấu >.",
  },
  {
    id: 3,
    phase: "normal",
    difficulty: "A",
    skill: "Thứ tự số",
    prompt: "Số nào đứng ngay sau số 8?",
    options: ["6", "7", "9", "10"],
    correctAnswer: "9",
    explanation: "Dãy số tăng dần là 7, 8, 9 nên số sau 8 là 9.",
  },
  {
    id: 4,
    phase: "normal",
    difficulty: "B",
    skill: "Cơ bản",
    prompt: "3 + 2 bằng bao nhiêu?",
    options: ["4", "5", "6", "7"],
    correctAnswer: "5",
    explanation: "Có 3 quả táo, thêm 2 quả nên có tất cả 5 quả.",
  },
  {
    id: 5,
    phase: "normal",
    difficulty: "B",
    skill: "Cơ bản",
    prompt: "8 − 3 bằng bao nhiêu?",
    options: ["4", "5", "6", "7"],
    correctAnswer: "5",
    explanation: "Từ 8 bớt đi 3, ta còn 5.",
  },
  {
    id: 6,
    phase: "normal",
    difficulty: "B",
    skill: "Vận dụng",
    prompt: "Điền số còn thiếu: 4 + ☐ = 9",
    options: ["3", "4", "5", "6"],
    correctAnswer: "5",
    explanation: "Vì 9 − 4 = 5 nên số cần điền là 5.",
  },
  {
    id: 7,
    phase: "challenge",
    difficulty: "B",
    skill: "Giải quyết vấn đề",
    prompt: "Lan có 3 viên bi, mẹ cho thêm 4 viên. Lan có tất cả bao nhiêu viên bi?",
    options: ["6 viên", "7 viên", "8 viên", "9 viên"],
    correctAnswer: "7 viên",
    explanation: "Ta thực hiện phép cộng 3 + 4 = 7 viên bi.",
  },
  {
    id: 8,
    phase: "challenge",
    difficulty: "C",
    skill: "Vận dụng",
    prompt: "10 − ☐ = 4. Số thích hợp là số nào?",
    options: ["4", "5", "6", "7"],
    correctAnswer: "6",
    explanation: "Vì 10 − 6 = 4 nên số cần điền là 6.",
  },
  {
    id: 9,
    phase: "challenge",
    difficulty: "D",
    skill: "Tìm quy luật",
    prompt: "Chọn số tiếp theo của dãy: 2, 4, 6, ☐",
    options: ["7", "8", "9", "10"],
    correctAnswer: "8",
    explanation: "Mỗi số tăng thêm 2: 2, 4, 6, 8.",
  },
  {
    id: 10,
    phase: "challenge",
    difficulty: "D",
    skill: "Bài toán ngược",
    prompt: "Hoa có một số nhãn vở. Mẹ cho thêm 3 chiếc thì Hoa có 8 chiếc. Ban đầu Hoa có bao nhiêu nhãn vở?",
    options: ["3 chiếc", "4 chiếc", "5 chiếc", "6 chiếc"],
    correctAnswer: "5 chiếc",
    explanation: "Số nhãn vở ban đầu là 8 − 3 = 5 chiếc.",
  },
  {
    id: 11,
    phase: "challenge",
    difficulty: "E",
    skill: "Suy luận logic bắc cầu",
    prompt: "An có ít hơn Bình 3 viên bi, Bình có ít hơn Minh 2 viên bi. Biết An có 4 viên bi. Hỏi Minh có bao nhiêu viên bi?",
    options: ["7 viên", "8 viên", "9 viên", "10 viên"],
    correctAnswer: "9 viên",
    explanation: "Bình có: 4 + 3 = 7 viên bi. Minh có: 7 + 2 = 9 viên bi.",
  },
];

export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

/**
 * Chuẩn hóa độ khó thực tế của câu hỏi để tránh gán nhầm câu đơn giản thành Level E
 * hoặc câu suy luận nhiều bước thành Level A/B.
 */
export function calibrateQuestionDifficulty(question: QuizQuestion): Difficulty {
  const prompt = (question.prompt || "").trim();
  const skill = (question.skill || "").toLowerCase();
  const text = `${skill} ${prompt}`.toLowerCase();
  const current: Difficulty = (question.difficulty && DIFFICULTY_RANK[question.difficulty]) ? question.difficulty : "B";

  // 1. Dạng nâng cao thực sự (D hoặc E)
  const isDoubleInequality =
    prompt.includes("> ... >") ||
    prompt.includes("< ... <") ||
    (prompt.includes(">") && prompt.includes("☐") && /[+\-−]/.test(prompt));
  const isTransitiveLogic =
    text.includes("bắc cầu") ||
    /ít hơn.*ít hơn|nhiều hơn.*nhiều hơn|ít hơn.*nhiều hơn|nhiều hơn.*ít hơn/.test(text) ||
    /chữ số khác nhau|lập số|tính cả|thừa \d+ ghế|năm nữa|tuần liền sau|tuần liền trước|vô số|ngược từ cuối/.test(text);

  if (isDoubleInequality || isTransitiveLogic) {
    return DIFFICULTY_RANK[current] >= 4 ? current : "D";
  }

  const isTwoStepOrTrap =
    text.includes("hai bước") ||
    text.includes("bẫy") ||
    text.includes("dữ kiện thừa") ||
    /\d+\s*\+\s*\d+\s*\+\s*(?:\.\.\.|☐)/.test(prompt) ||
    /(sau đó|rồi lại|lên xe.*xuống xe|buổi sáng.*buổi chiều|tặng em.*tặng bạn|bán.*biếu)/.test(text);

  if (isTwoStepOrTrap) {
    return DIFFICULTY_RANK[current] >= 4 ? current : "D";
  }

  // 2. Dạng đơn giản tuyệt đối không bao giờ là D hoặc E
  const isBasicClock = (/kim ngắn/.test(text) && /kim dài/.test(text)) || skill.includes("xem đồng hồ đúng") || skill.includes("xem giờ đúng");
  const isReadNumber = /^số\s*\d+\s*đọc là/i.test(prompt) || /^\d+\s*đọc là/i.test(prompt) || /^số\s+.+\s+viết thế nào/i.test(prompt);
  const isSimpleCompareTwoNums = /^(?:điền dấu[^:]*:\s*)?\d+\s*[☐\.]+\s*\d+\s*$/i.test(prompt);
  const isCountSimple = /có tất cả bao nhiêu (quả|chấm tròn|con vật|bông hoa)/.test(text) && !text.includes("hơn");

  if (isBasicClock || isReadNumber || isSimpleCompareTwoNums || isCountSimple) {
    return current === "A" || current === "B" ? current : "A";
  }

  // Phép tính 1 bước trực tiếp: "3 + 4 = ?", "Tính: 8 - 3 = ?"
  const simpleExprMatch = prompt.match(/^(?:tính:\s*)?(\d+)\s*([+\-−])\s*(\d+)\s*(?:=\s*\?|\s+bằng bao nhiêu\??|\s*=\s*\.\.\.)?$/i);
  if (simpleExprMatch) {
    const n1 = Number(simpleExprMatch[1]);
    const n2 = Number(simpleExprMatch[3]);
    if (n1 <= 10 && n2 <= 10 && n1 + n2 <= 10) {
      return "B";
    }
    if (n1 <= 100 && n2 <= 100) {
      return DIFFICULTY_RANK[current] > 3 ? "C" : (current === "A" ? "B" : current);
    }
  }

  // Điền số thiếu 1 phép tính: "☐ − 3 = 6. Số ban đầu là?", "4 + ☐ = 9", "10 - ☐ = 4"
  const missingOneOpMatch = prompt.match(/^(?:điền số[^:]*:\s*)?(?:(\d+)\s*([+\-−])\s*(?:☐|\.\.\.)|(?:☐|\.\.\.)\s*([+\-−])\s*(\d+))\s*=\s*(\d+)/i);
  if (missingOneOpMatch) {
    const nums = [missingOneOpMatch[1], missingOneOpMatch[4], missingOneOpMatch[5]]
      .filter(Boolean)
      .map(Number);
    const maxNum = Math.max(...nums);
    const isLeftBlankSub = Boolean(missingOneOpMatch[3] && missingOneOpMatch[4]);
    if (maxNum <= 10) {
      return isLeftBlankSub ? "C" : "B";
    }
    if (maxNum <= 100) {
      return "C";
    }
  }

  if (/^số liền (trước|sau) (của )?(số )?\d+ là/i.test(prompt)) {
    const m = prompt.match(/\d+/);
    const n = m ? Number(m[0]) : 10;
    return n <= 20 ? "B" : "C";
  }

  if (/^(tìm )?số (lớn|bé) nhất trong/i.test(prompt) && !text.includes("khác nhau")) {
    return DIFFICULTY_RANK[current] >= 3 ? "B" : current;
  }

  return current;
}

/**
 * Sắp xếp bộ câu hỏi theo độ khó tăng dần (A -> B -> C -> D -> E),
 * đồng bộ phase ("normal" ở nửa đầu, "challenge" ở nửa sau) và đánh lại id.
 */
export function finalizeQuizSequence(list: QuizQuestion[], targetCount?: number): QuizQuestion[] {
  const sliced = typeof targetCount === "number" ? list.slice(0, targetCount) : [...list];
  if (sliced.length === 0) return [];
  const normalCount = Math.ceil(sliced.length / 2);

  const calibrated = sliced.map((q, origIdx) => ({
    question: {
      ...q,
      difficulty: calibrateQuestionDifficulty(q),
    },
    origIdx,
  }));

  calibrated.sort((a, b) => {
    const rankDiff = DIFFICULTY_RANK[a.question.difficulty] - DIFFICULTY_RANK[b.question.difficulty];
    return rankDiff !== 0 ? rankDiff : a.origIdx - b.origIdx;
  });

  return calibrated.map(({ question }, index) => ({
    ...question,
    id: index + 1,
    phase: index < normalCount ? "normal" : "challenge",
  }));
}

export const difficultyMeta: Record<Difficulty, { name: string; stars: number; color: string }> = {
  A: { name: "Nhận biết", stars: 1, color: "#22c55e" },
  B: { name: "Cơ bản", stars: 2, color: "#84cc16" },
  C: { name: "Vận dụng", stars: 3, color: "#f59e0b" },
  D: { name: "Giải quyết vấn đề", stars: 4, color: "#f97316" },
  E: { name: "Thử thách", stars: 5, color: "#ec4899" },
};

export type DefaultLessonRecord = {
  id: number;
  slug: string;
  curriculumLevel: number;
  title: string;
  topic: string;
  competency: string;
  questionCount: number;
};

export function slugifyTitle(value: string | undefined | null): string {
  const source = value ?? "bai-hoc";
  const slug = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "bai-hoc";
}

export function getDefaultLessons(): DefaultLessonRecord[] {
  let id = 1;
  const list: DefaultLessonRecord[] = [];
  for (const level of curriculum) {
    for (const title of level.lessons) {
      list.push({
        id: id++,
        slug: `level-${level.id}-${slugifyTitle(title)}`,
        curriculumLevel: level.id,
        title,
        topic: title,
        competency: level.competency,
        questionCount: 10,
      });
    }
  }
  return list;
}

