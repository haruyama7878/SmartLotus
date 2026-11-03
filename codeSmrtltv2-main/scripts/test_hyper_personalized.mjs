const exercise = {
  "adaptive_reasoning": "Học sinh Minh Anh có tốc độ làm bài nhanh nhưng hay ẩu và yếu đọc hiểu, do đó đề bài cài cắm dữ kiện thừa (3 quyển vở vẽ) trong bối cảnh lớp học cùng bạn Gia Hân để rèn khả năng chắt lọc thông tin và đọc kỹ đề.",
  "interaction_mode": "MultipleChoice",
  "situational_context": "Hoạt động chia sẻ dụng cụ học tập trong lớp học",
  "problem_statement": "Trong giờ học Mỹ thuật ở lớp 1A, bạn Minh Anh có 16 cây bút sáp màu và 3 quyển vở vẽ. Minh Anh cho bạn Gia Hân mượn 7 cây bút sáp màu. Hỏi bạn Minh Anh còn lại bao nhiêu cây bút sáp màu?",
  "options": [
    {
      "value": "A",
      "text": "9 cây bút sáp màu",
      "is_correct": true,
      "distractor_logic": "Đáp án đúng: Thực hiện phép trừ 16 - 7 = 9"
    },
    {
      "value": "B",
      "text": "12 cây bút sáp màu",
      "is_correct": false,
      "distractor_logic": "Lý do sai: Đọc ẩu lấy kết quả cộng thêm số quyển vở thừa (9 + 3 = 12)"
    },
    {
      "value": "C",
      "text": "11 cây bút sáp màu",
      "is_correct": false,
      "distractor_logic": "Lý do sai: Trừ qua 10 quên bớt hàng chục, tính nhầm 16 - 7 = 11"
    },
    {
      "value": "D",
      "text": "6 cây bút sáp màu",
      "is_correct": false,
      "distractor_logic": "Lý do sai: Lấy tất cả các số trong đề trừ liên tiếp do đọc lướt (16 - 7 - 3 = 6)"
    }
  ],
  "correct_answer": "9 cây bút sáp màu",
  "scaffolded_hint": "Trước tiên, con hãy đọc kỹ câu hỏi xem đề bài hỏi về số 'bút sáp màu' hay 'quyển vở' nhé? Con chỉ cần lấy số bút sáp ban đầu trừ đi số bút đã cho bạn mượn thôi!",
  "step_by_step_solution": "Bước 1: Đề bài hỏi số bút sáp màu còn lại của Minh Anh, nên dữ kiện '3 quyển vở vẽ' là thông tin thừa, không cần tính.\nBước 2: Ban đầu Minh Anh có 16 cây bút sáp màu, cho bạn Gia Hân mượn 7 cây bút sáp màu.\nBước 3: Ta thực hiện phép tính trừ: 16 - 7 = 9 (cây bút sáp màu).\nĐáp số: 9 cây bút sáp màu.",
  "validation_equation": "16 - 7 = 9"
};

// Verification tests
console.log("=== KIỂM TRA ĐỊNH DẠNG VÀ RÀNG BUỘC SƯ PHẠM ===");
console.log("1. Kiểm tra JSON hợp lệ:", typeof JSON.parse(JSON.stringify(exercise)) === "object");

const requiredKeys = [
  "adaptive_reasoning",
  "interaction_mode",
  "situational_context",
  "problem_statement",
  "options",
  "correct_answer",
  "scaffolded_hint",
  "step_by_step_solution",
  "validation_equation"
];
const missing = requiredKeys.filter(k => !(k in exercise));
console.log("2. Kiểm tra đủ các khóa bắt buộc:", missing.length === 0 ? "PASS" : "FAIL: " + missing.join(", "));

console.log("3. Kiểm tra số lượng options:", exercise.options.length === 4 ? "PASS (4 options)" : "FAIL");
const correctOptions = exercise.options.filter(o => o.is_correct);
console.log("4. Kiểm tra đúng 1 đáp án chính xác:", correctOptions.length === 1 ? "PASS" : "FAIL");
console.log("5. Khớp correct_answer với is_correct:", correctOptions[0].text === exercise.correct_answer ? "PASS" : "FAIL");

const [lhs, rhs] = exercise.validation_equation.split("=").map(s => s.trim());
const calc = Function('"use strict"; return (' + lhs + ')')();
console.log(`6. Kiểm tra tính đúng đắn toán học (${lhs} = ${rhs}):`, calc === Number(rhs) ? "PASS" : "FAIL");

console.log("\nJSON Stringified Preview:\n" + JSON.stringify(exercise, null, 2));

