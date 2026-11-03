"""
math_rag_generator.py
Hệ thống RAG siêu cá nhân hóa bài tập toán tiểu học (Smart Lotus Hyper-Personalized Math Engine).
Tích hợp: ChromaDB (100 câu hỏi chuẩn từ ngân hàng mẫu.docx), LangChain, Ollama (nomic-embed-text & qwen2.5).
"""

import json
import os
import re
import sys
import argparse
from typing import Dict, Any, List

# Đảm bảo UTF-8 cho console Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage

try:
    from langchain_chroma import Chroma
except ImportError:
    try:
        from langchain_community.vectorstores import Chroma
    except ImportError:
        Chroma = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "chroma_math_db")
RAG_BANK_JSON = os.path.join(BASE_DIR, "src", "data", "rag-question-bank.json")

# Khởi tạo embedding model nomic-embed-text qua Ollama
embeddings = OllamaEmbeddings(model="nomic-embed-text")


def load_knowledge_base() -> List[Dict[str, Any]]:
    """Tải toàn bộ ngân hàng câu hỏi chuẩn từ src/data/rag-question-bank.json."""
    if os.path.exists(RAG_BANK_JSON):
        try:
            with open(RAG_BANK_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    print(f"📚 [Knowledge Base] Đã tìm thấy {len(data)} bài toán chuẩn từ {RAG_BANK_JSON}")
                    return data
        except Exception as e:
            print(f"⚠️ [Knowledge Base] Lỗi đọc file JSON: {e}")

    # Fallback 3 bài toán mẫu lớp 2 cơ bản nếu không tìm thấy file
    return [
        {
            "prompt": "Nam có 15 quyển vở. Nam tặng bạn Bình 7 quyển vở. Hỏi Nam còn lại bao nhiêu quyển vở?",
            "options": ["8 quyển", "7 quyển", "9 quyển", "22 quyển"],
            "correctAnswer": "8 quyển",
            "explanation": "Ta thực hiện phép tính trừ: 15 - 7 = 8 (quyển vở).",
            "topic": "Số học và phép tính",
            "skill": "Phép trừ có nhớ trong phạm vi 20",
            "difficulty": "B"
        },
        {
            "prompt": "Lớp 2A có 28 bạn tham gia vẽ tranh và 15 bạn tham gia đá cầu. Hỏi lớp 2A có tất cả bao nhiêu bạn?",
            "options": ["43 bạn", "42 bạn", "33 bạn", "13 bạn"],
            "correctAnswer": "43 bạn",
            "explanation": "Ta thực hiện phép tính cộng: 28 + 15 = 43 (bạn).",
            "topic": "Toán có lời văn",
            "skill": "Phép cộng có nhớ trong phạm vi 100",
            "difficulty": "C"
        },
        {
            "prompt": "Cửa hàng có 42 hộp bút màu, buổi sáng bán được 18 hộp bút màu. Hỏi cửa hàng còn lại bao nhiêu hộp bút màu?",
            "options": ["24 hộp", "34 hộp", "26 hộp", "60 hộp"],
            "correctAnswer": "24 hộp",
            "explanation": "Ta thực hiện phép tính trừ: 42 - 18 = 24 (hộp bút màu).",
            "topic": "Toán có lời văn",
            "skill": "Phép trừ có nhớ trong phạm vi 100",
            "difficulty": "C"
        }
    ]


def init_chroma_db():
    """Khởi tạo ChromaDB và nạp ngân hàng câu hỏi vào cơ sở dữ liệu vector."""
    print("🔹 [ChromaDB] Đang kết nối cơ sở dữ liệu vector ChromaDB...")
    
    vectorstore = Chroma(
        collection_name="smart_lotus_rag_bank",
        embedding_function=embeddings,
        persist_directory=DB_DIR
    )
    
    current_count = vectorstore._collection.count()
    if current_count == 0:
        raw_items = load_knowledge_base()
        texts = []
        metadatas = []
        for item in raw_items:
            options_str = " | ".join(item.get("options", []))
            doc_text = (
                f"Đề bài: {item.get('prompt', '')}\n"
                f"Lựa chọn: {options_str}\n"
                f"Đáp án đúng: {item.get('correctAnswer', '')}\n"
                f"Giải thích: {item.get('explanation', '')}"
            )
            texts.append(doc_text)
            metadatas.append({
                "topic": item.get("topic", "Toán học"),
                "skill": item.get("skill", "Kỹ năng tính"),
                "difficulty": item.get("difficulty", "B")
            })
            
        print(f"📥 [ChromaDB] Đang nhúng (embedding) {len(texts)} bài toán vào ChromaDB qua model 'nomic-embed-text'...")
        # Thêm theo batch để tối ưu
        batch_size = 25
        for i in range(0, len(texts), batch_size):
            vectorstore.add_texts(texts=texts[i:i+batch_size], metadatas=metadatas[i:i+batch_size])
        print(f"✅ [ChromaDB] Nạp hoàn tất! Tổng số bài toán trong vector database: {vectorstore._collection.count()}")
    else:
        print(f"ℹ️ [ChromaDB] Cơ sở dữ liệu đã sẵn sàng với {current_count} bài toán mẫu.")
        
    return vectorstore


def retrieve_samples(vectorstore, query: str, k: int = 2) -> str:
    """Truy xuất các câu hỏi mẫu tương đồng ngữ nghĩa nhất từ ChromaDB."""
    docs = vectorstore.similarity_search(query, k=k)
    retrieved_content = []
    for i, doc in enumerate(docs, 1):
        retrieved_content.append(f"--- BÀI MẪU THAM KHẢO {i} ---\n{doc.page_content}")
    return "\n\n".join(retrieved_content)


def generate_hyper_personalized_exercise(
    student_profile: dict,
    rag_context: str,
    model_name: str = "qwen2.5:7b"
) -> dict:
    """Sinh bài toán siêu cá nhân hóa theo định dạng JSON chuẩn sư phạm."""
    
    llm = ChatOllama(
        model=model_name,
        format="json",
        temperature=0.6
    )
    
    system_prompt = f"""Bạn là Chuyên gia Sư phạm Toán Tiểu học kiêm Hệ thống AI Siêu cá nhân hóa bài học Smart Lotus.

NHIỆM VỤ CỐT LÕI:
Sinh ra DUY NHẤT 1 bài tập toán học trắc nghiệm, được siêu cá nhân hóa (Hyper-Personalized) cho học sinh {student_profile.get('name', 'học sinh')} dựa trên Hồ sơ học tập và Ngữ cảnh RAG chuẩn.

CÁC QUY TẮC SƯ PHẠM NGHIÊM NGẶT:
1. Ràng buộc Toán học:
   - TUYỆT ĐỐI KHÔNG sinh ra kết quả số âm, số thập phân hoặc phân số.
   - Các phép tính phải nằm chính xác trong phạm vi của bài học (Phép cộng trừ có nhớ trong phạm vi 20 đến 100 lớp 1 và lớp 2).
   - LUÔN LUÔN tạo ra đúng 4 phương án (A, B, C, D) với 1 đáp án đúng và 3 phương án nhiễu (distractors) có lý do sai tư duy thực tế (nhầm nhớ, trừ ngược hàng đơn vị, nhầm phép tính...).

2. Quy tắc Đề bài & Bảo toàn Đố vui (BẢO VỆ ĐỀ BÀI):
   - Đề bài trong "problem_statement" TUYỆT ĐỐI CHỈ CHỨA câu hỏi tình huống cho học sinh đọc và tự làm.
   - TUYỆT ĐỐI KHÔNG để lộ "Phép tính: ...", "Lời giải: ..." hay đáp án trong "problem_statement".
   - Phép tính kiểm tra BẮT BUỘC chỉ được xuất hiện ở trường "validation_equation" và "step_by_step_solution".

3. Cá nhân hóa theo Ngữ cảnh thực tế:
   - BẮT BUỘC sử dụng tên học sinh ({student_profile.get('name')}) lồng ghép vào bối cảnh đời sống gần gũi (chia kẹo, mua dụng cụ học tập, vẽ tranh, hoạt động cùng bạn bè trong lớp).

4. Thích ứng theo Tốc độ & Lỗ hổng Micro-skills:
   - Nếu học sinh [NHANH NHƯNG ẨU]: Cố tình cài cắm "Bẫy tư duy" bằng cách đưa thêm 1 thông tin/con số thừa không liên quan vào đề bài (ví dụ: có thêm số quyển vở hoặc số cái hộp không dùng đến) để rèn sự cẩn thận và kỹ năng lọc dữ kiện.
   - Nếu học sinh [CHẬM / QUÁ TẢI NHẬN THỨC / YẾU ĐỌC HIỂU]: Đề bài phải cực kỳ ngắn gọn, câu từ trực diện, chia nhỏ thành các câu đơn giản, không dùng câu phức gây rối.

5. Bệ đỡ tư duy (Dynamic Scaffolding):
   - Trường "scaffolded_hint" là một gợi ý bắc cầu định hướng: KHÔNG được đưa ra đáp án, chỉ là một câu hỏi phụ hoặc bước trung gian giúp học sinh tự suy nghĩ.

6. ĐỊNH DẠNG ĐẦU RA (JSON ONLY):
   - BẮT BUỘC CHỈ TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ.
   - TUYỆT ĐỐI KHÔNG bọc trong markdown code block (không dùng ```json hoặc ```).
   - TUYỆT ĐỐI KHÔNG in lời chào hay bất kỳ văn bản nào ngoài JSON.

Cấu trúc JSON:
{{
  "adaptive_reasoning": "Phân tích ngắn gọn (1 câu): Tại sao dạng bài, văn phong và độ dài này phù hợp với Tốc độ và Lỗ hổng của học sinh?",
  "interaction_mode": "MultipleChoice",
  "situational_context": "Bối cảnh sử dụng ngắn gọn",
  "problem_statement": "Nội dung câu hỏi đề bài dành cho học sinh (KHÔNG chứa phép tính giải)",
  "options": [
    {{ "value": "A", "text": "...", "is_correct": true, "distractor_logic": "Đáp án đúng" }},
    {{ "value": "B", "text": "...", "is_correct": false, "distractor_logic": "Lý do sai cụ thể" }},
    {{ "value": "C", "text": "...", "is_correct": false, "distractor_logic": "Lý do sai cụ thể" }},
    {{ "value": "D", "text": "...", "is_correct": false, "distractor_logic": "Lý do sai cụ thể" }}
  ],
  "correct_answer": "Nội dung đáp án đúng (khớp với text của phương án is_correct: true)",
  "scaffolded_hint": "Gợi ý bắc cầu cho học sinh tự suy luận",
  "step_by_step_solution": "Lời giải chi tiết từng bước bằng văn phong nhẹ nhàng, dễ hiểu",
  "validation_equation": "Biểu thức toán học thuần túy (ví dụ: 54 - 27 = 27) để backend đối chiếu tự động"
}}"""

    human_prompt = f"""HỒ SƠ HỌC SINH (STUDENT PROFILE):
- Tên học sinh: {student_profile.get('name', 'Học sinh')}
- Điểm Mastery tổng: {student_profile.get('mastery_score', 60)}/100
- Tốc độ làm bài: {student_profile.get('pacing', 'Bình thường')}
- Lỗ hổng Micro-skills: {student_profile.get('micro_skills_gap', 'Cần củng cố')}
- Mức độ bài học: {student_profile.get('grade_level', 'Lớp 2 - Phép cộng trừ có nhớ trong phạm vi 100')}

NGỮ CẢNH RAG (CÁC BÀI TOÁN MẪU THAM KHẢO TỪ GIÁO TRÌNH):
{rag_context}

Hãy sinh ra bài toán siêu cá nhân hóa cho học sinh {student_profile.get('name')} theo đúng yêu cầu JSON."""

    print(f"🤖 [LLM] Đang gọi Ollama ({model_name}) sinh bài toán...")
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ])
    
    raw_content = response.content.strip()
    # Loại bỏ codeblock markdown nếu có
    if raw_content.startswith("```json"):
        raw_content = raw_content[7:]
    elif raw_content.startswith("```"):
        raw_content = raw_content[3:]
    if raw_content.endswith("```"):
        raw_content = raw_content[:-3]
    raw_content = raw_content.strip()
    
    parsed_json = json.loads(raw_content)
    
    # === HẬU XỬ LÝ (POST-PROCESSING) ĐẢM BẢO CHẤT LƯỢNG SƯ PHẠM ===
    # 1. Bảo vệ problem_statement: Cắt bỏ hoàn toàn nếu LLM vô tình ghi "Phép tính: ..." vào đề bài
    raw_prob = parsed_json.get("problem_statement", "")
    cleaned_prob = re.split(r'(?i)\s*(?:Phép tính|Lời giải|Đáp số|Đáp án)[:\s]', raw_prob)[0].strip()
    parsed_json["problem_statement"] = cleaned_prob
    
    # 2. Đồng bộ hóa correct_answer với text của phương án đúng
    options = parsed_json.get("options", [])
    correct_opt = next((o for o in options if o.get("is_correct")), None)
    if correct_opt:
        opt_text = str(correct_opt.get("text", "")).strip()
        # Nếu model trả về chữ cái A/B/C/D thay vì text
        if str(parsed_json.get("correct_answer")).strip().upper() in ["A", "B", "C", "D"]:
            parsed_json["correct_answer"] = opt_text
            
    return parsed_json


def validate_exercise(exercise: dict) -> dict:
    """Kiểm tra tính đúng đắn toán học và cấu trúc dữ liệu của bài tập."""
    report = {"is_valid": True, "errors": [], "warnings": []}
    
    # 1. Kiểm tra trường bắt buộc
    required_keys = [
        "adaptive_reasoning", "interaction_mode", "situational_context",
        "problem_statement", "options", "correct_answer",
        "scaffolded_hint", "step_by_step_solution", "validation_equation"
    ]
    for key in required_keys:
        if key not in exercise or not str(exercise[key]).strip():
            report["errors"].append(f"Thiếu hoặc rỗng trường bắt buộc: '{key}'")
            report["is_valid"] = False

    # 2. Kiểm tra options
    options = exercise.get("options", [])
    if len(options) != 4:
        report["errors"].append(f"Phải có đúng 4 phương án, thực tế có {len(options)}")
        report["is_valid"] = False

    correct_options = [o for o in options if o.get("is_correct") is True]
    if len(correct_options) != 1:
        report["errors"].append(f"Phải có đúng 1 phương án is_correct=True, thực tế có {len(correct_options)}")
        report["is_valid"] = False

    # 3. Kiểm tra tính đúng đắn toán học của validation_equation
    eq = exercise.get("validation_equation", "")
    if "=" in eq:
        try:
            lhs, rhs = eq.split("=", 1)
            # Chuẩn hóa biểu thức số học
            norm_lhs = lhs.replace("x", "*").replace("×", "*").replace(":", "/").replace("−", "-").strip()
            norm_lhs = re.sub(r'[^\d+\-*/().\s]', '', norm_lhs)
            norm_rhs = re.sub(r'[^\d.]', '', rhs.strip())
            
            calc_val = eval(norm_lhs, {"__builtins__": None}, {})
            target_val = float(norm_rhs) if norm_rhs else None
            
            if target_val is not None and abs(calc_val - target_val) > 1e-4:
                report["warnings"].append(f"Toán học không khớp: {lhs} = {calc_val} != {rhs}")
            else:
                report["math_check"] = f"Hợp lệ ({lhs} = {rhs})"
        except Exception as e:
            report["warnings"].append(f"Không thể kiểm tra biểu thức: '{eq}' ({e})")

    return report


def run_pipeline_test(profile: dict, query_topic: str, model_name: str, run_id: int):
    """Chạy một lượt kiểm thử tổng quát cho một hồ sơ học sinh cụ thể."""
    print("\n" + "=" * 70)
    print(f"🧪 [TEST RUN {run_id}] HỒ SƠ HỌC SINH: {profile.get('name').upper()}")
    print("=" * 70)
    print(f"👤 Học sinh: {profile.get('name')} | Điểm: {profile.get('mastery_score')}/100")
    print(f"⚡ Tốc độ: {profile.get('pacing')}")
    print(f"🎯 Lỗ hổng: {profile.get('micro_skills_gap')}")
    print(f"📖 Mức độ: {profile.get('grade_level')}")
    
    # 1. Khởi tạo ChromaDB
    vectorstore = init_chroma_db()
    
    # 2. Truy xuất RAG
    print(f"\n🔍 [Retrieval] Đang tìm kiếm tri thức RAG cho chủ đề: '{query_topic}'...")
    rag_context = retrieve_samples(vectorstore, query=query_topic, k=2)
    print("📄 [Ngữ cảnh RAG trích xuất]:")
    print(rag_context[:300] + "...\n(đã trích xuất đầy đủ)")
    
    # 3. Sinh bài tập với LLM
    exercise = generate_hyper_personalized_exercise(profile, rag_context, model_name=model_name)
    
    # 4. Kiểm định chất lượng
    val_report = validate_exercise(exercise)
    
    print("\n" + "-" * 70)
    print(f"📊 KẾT QUẢ KIỂM ĐỊNH TEST RUN {run_id}:")
    print(f"  - Cấu trúc JSON: {'✅ ĐẠT CHUẨN' if val_report['is_valid'] else '❌ LỖI: ' + ', '.join(val_report['errors'])}")
    if "math_check" in val_report:
        print(f"  - Đối chiếu biểu thức toán học: ✅ {val_report['math_check']}")
    if val_report["warnings"]:
        for w in val_report["warnings"]:
            print(f"  - ⚠️ Chú ý: {w}")
            
    print("\n📝 NỘI DUNG BÀI TOÁN SINH RA:")
    print(f"  • Đề bài: {exercise.get('problem_statement')}")
    print(f"  • Các phương án:")
    for opt in exercise.get("options", []):
        mark = "✓ [ĐÚNG]" if opt.get("is_correct") else "✗ [SAI]"
        print(f"    [{opt.get('value')}] {opt.get('text')} -> {mark} ({opt.get('distractor_logic')})")
    print(f"  • Đáp án chuẩn: {exercise.get('correct_answer')}")
    print(f"  • Gợi ý bắc cầu (Scaffolded Hint): {exercise.get('scaffolded_hint')}")
    print(f"  • Biểu thức xác thực: {exercise.get('validation_equation')}")
    print(f"  • Phân tích thích ứng: {exercise.get('adaptive_reasoning')}")
    
    return exercise, val_report


def main():
    parser = argparse.ArgumentParser(description="Smart Lotus RAG Math Exercise Generator")
    parser.add_argument("--model", type=str, default="qwen2.5:7b", help="Tên mô hình Ollama (ví dụ: qwen2.5:7b hoặc qwen2.5:1.5b)")
    parser.add_argument("--runs", type=int, default=2, help="Số lần kiểm thử tổng quát")
    args = parser.parse_args()

    print("=" * 70)
    print("🚀 SMART LOTUS - RAG HYPER-PERSONALIZED MATH ENGINE V2.0")
    print(f"🔧 Model đang sử dụng: {args.model}")
    print("=" * 70)

    # Hồ sơ 1: Học sinh Nhanh nhưng Ẩu (Cần cài bẫy tư duy, dữ kiện thừa)
    profile_1 = {
        "name": "Vương Xuân Sơn",
        "mastery_score": 65,
        "pacing": "Nhanh nhưng ẩu",
        "micro_skills_gap": "Yếu phần đọc hiểu, hay đọc lướt bỏ sót dữ kiện, dễ bị phân tâm",
        "grade_level": "Lớp 2 - Phép cộng trừ có nhớ trong phạm vi 100"
    }

    # Hồ sơ 2: Học sinh Chậm / Quá tải nhận thức (Cần câu ngắn, trực diện, gợi ý bắc cầu)
    profile_2 = {
        "name": "Lê Minh Anh",
        "mastery_score": 40,
        "pacing": "Chậm, suy nghĩ lâu, dễ bị quá tải khi gặp câu dài",
        "micro_skills_gap": "Yếu tính toán có nhớ, gặp khó khăn khi trừ qua 10",
        "grade_level": "Lớp 1 - Phép trừ trong phạm vi 20"
    }

    test_profiles = [
        (profile_1, "phép trừ có nhớ trong phạm vi 100 toán có lời văn thực tế"),
        (profile_2, "phép trừ trong phạm vi 20 đơn giản trực diện")
    ]

    all_results = []
    
    for i in range(min(args.runs, len(test_profiles))):
        prof, topic = test_profiles[i]
        exercise, report = run_pipeline_test(prof, topic, model_name=args.model, run_id=i + 1)
        all_results.append({
            "run": i + 1,
            "student": prof["name"],
            "exercise": exercise,
            "report": report
        })

    # Lưu kết quả tổng hợp ra file
    output_path = os.path.join(BASE_DIR, "rag_2_runs_result.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
        
    print("\n" + "=" * 70)
    print(f"🎉 HOÀN THÀNH 2 LẦN KIỂM THỬ TỔNG QUÁT! KẾT QUẢ ĐÃ LƯU TẠI: {output_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()
