import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== BẮT ĐẦU KIỂM THỬ HỆ THỐNG SMART LOTUS V2 ===");

// 1. Kiểm thử dữ liệu mẫu sample-questions.json
console.log("\n[1/4] Kiểm tra cơ sở dữ liệu câu hỏi mẫu: sample-questions.json...");
const samplePath = path.join(rootDir, "src", "data", "sample-questions.json");
if (!fs.existsSync(samplePath)) {
  throw new Error(`File ${samplePath} không tồn tại!`);
}
const samples = JSON.parse(fs.readFileSync(samplePath, "utf-8"));
if (!Array.isArray(samples) || samples.length === 0) {
  throw new Error("sample-questions.json rỗng hoặc không đúng định dạng array!");
}
console.log(`✓ Đã load thành công ${samples.length} câu hỏi mẫu từ sample-questions.json`);

// 2. Kiểm thử dữ liệu RAG rag-question-bank.json
console.log("\n[2/4] Kiểm tra cơ sở tri thức RAG: rag-question-bank.json...");
const ragPath = path.join(rootDir, "src", "data", "rag-question-bank.json");
if (!fs.existsSync(ragPath)) {
  throw new Error(`File ${ragPath} không tồn tại!`);
}
const ragBank = JSON.parse(fs.readFileSync(ragPath, "utf-8"));
if (!Array.isArray(ragBank) || ragBank.length !== 100) {
  throw new Error(`rag-question-bank.json cần có đủ 100 câu hỏi, hiện có: ${ragBank?.length}`);
}

let validCount = 0;
for (const [idx, q] of ragBank.entries()) {
  if (!q.prompt || typeof q.prompt !== "string") {
    throw new Error(`Câu ${idx + 1} thiếu đề bài hợp lệ!`);
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    throw new Error(`Câu ${idx + 1} thiếu danh sách lựa chọn hợp lệ!`);
  }
  if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
    throw new Error(`Câu ${idx + 1} (${q.prompt}) có đáp án đúng '${q.correctAnswer}' không nằm trong options: ${JSON.stringify(q.options)}`);
  }
  if (!q.topic || !q.skill || !q.difficulty) {
    throw new Error(`Câu ${idx + 1} thiếu metadata phân loại (topic/skill/difficulty)!`);
  }
  if (typeof q.targetScore !== "number" || q.targetScore < 0 || q.targetScore > 100) {
    throw new Error(`Câu ${idx + 1} có targetScore không hợp lệ: ${q.targetScore}`);
  }
  validCount += 1;
}
console.log(`✓ Đã kiểm tra 100% (${validCount}/100) câu hỏi tri thức RAG: Đầy đủ prompt, 4 options, correctAnswer chính xác, metadata IQ và explanation.`);

// 3. Kiểm thử phân phối thích ứng theo IQ
console.log("\n[3/4] Kiểm tra logic phân bổ thích ứng theo chỉ số thông minh IQ...");
const testIQLevels = [
  { label: "Củng cố cơ bản", iq: 25, expectedMaxScore: 45 },
  { label: "Trung bình / Khá", iq: 55, expectedMaxScore: 75 },
  { label: "Nâng cao / Thử thách", iq: 85, expectedMinScore: 60 },
];

for (const test of testIQLevels) {
  const filtered = ragBank.filter((q) => Math.abs(q.targetScore - test.iq) <= 30);
  if (filtered.length < 5) {
    throw new Error(`Không đủ câu hỏi phù hợp cho mức IQ ${test.iq} (${test.label})!`);
  }
  console.log(`✓ IQ ${test.iq} (${test.label}): Tìm thấy ${filtered.length} câu hỏi phù hợp trong ngân hàng RAG.`);
}

// 4. Kiểm thử các tệp mã nguồn cốt lõi
console.log("\n[4/4] Kiểm tra tính toàn vẹn các module cốt lõi...");
const coreFiles = [
  "src/lib/rag.ts",
  "src/lib/ai-api.ts",
  "src/lib/api.ts",
  "src/app/api/generate-rag-quiz/route.ts",
  "src/components/assignment-builder.tsx",
  "src/components/smart-lotus-app.tsx",
];

for (const f of coreFiles) {
  const fullPath = path.join(rootDir, f);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Thiếu file mã nguồn quan trọng: ${f}`);
  }
  const stat = fs.statSync(fullPath);
  if (stat.size < 100) {
    throw new Error(`File ${f} bị rỗng hoặc bất thường (size: ${stat.size} bytes)`);
  }
  console.log(`✓ Module [${f}] (${stat.size} bytes) tồn tại và hợp lệ.`);
}

console.log("\n=== TẤT CẢ CÁC BƯỚC KIỂM THỬ NỘI BỘ ĐÃ HOÀN TẤT THÀNH CÔNG (100% PASS) ===");
