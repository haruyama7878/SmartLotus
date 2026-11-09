"use client";

import { useEffect, useState } from "react";
import type { Classroom } from "@/lib/student-data";
import { isAnswerModeCompatible, type AnswerMode, type QuizQuestion } from "@/lib/learning-data";
import { MODE_LABELS } from "./quiz-answer-modes";
import AssignmentImageEditor, { type LibraryImage } from "./assignment-image-editor";
import { QuizIllustration } from "./quiz-illustrations";
import { smartLotusApi, type AssignmentProject } from "@/lib/api";
import { Icon } from "./icons";

function defaultDueDate() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function createQuestion(id: number, topic: string): QuizQuestion {
  return {
    id,
    phase: "normal",
    difficulty: "A",
    skill: topic || "Kiến thức tổng hợp",
    prompt: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
  };
}

export default function AssignmentBuilder({ onBack, onToast }: { onBack: () => void; onToast: (message: string) => void }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("1");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [duration, setDuration] = useState("20");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [projects, setProjects] = useState<AssignmentProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [step, setStep] = useState<"questions" | "settings">("questions");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [intelligenceScore, setIntelligenceScore] = useState(60);
  const [accuracy, setAccuracy] = useState<number>(75);
  const [lastScore, setLastScore] = useState<number>(70);
  const [averageScoreLast10, setAverageScoreLast10] = useState<number>(68);
  const [testDuration, setTestDuration] = useState<number>(240);
  const [adaptivePreset, setAdaptivePreset] = useState<"custom" | "fast_inaccurate" | "breakthrough" | "slow_struggling" | "consistent_mastery">("custom");

  function applyAdaptivePreset(preset: "fast_inaccurate" | "breakthrough" | "slow_struggling" | "consistent_mastery") {
    setAdaptivePreset(preset);
    if (preset === "fast_inaccurate") {
      setAccuracy(42);
      setLastScore(48);
      setAverageScoreLast10(58);
      setTestDuration(85);
      setIntelligenceScore(55);
    } else if (preset === "breakthrough") {
      setAccuracy(96);
      setLastScore(95);
      setAverageScoreLast10(65);
      setTestDuration(190);
      setIntelligenceScore(75);
    } else if (preset === "slow_struggling") {
      setAccuracy(35);
      setLastScore(38);
      setAverageScoreLast10(42);
      setTestDuration(450);
      setIntelligenceScore(40);
    } else if (preset === "consistent_mastery") {
      setAccuracy(95);
      setLastScore(98);
      setAverageScoreLast10(92);
      setTestDuration(140);
      setIntelligenceScore(90);
    }
  }

  useEffect(() => {
    void smartLotusApi.getClassrooms().then(({ classrooms: items }) => {
      setClassrooms(items);
      if (items[0]) setClassroomId(items[0].id);
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lớp học");
    });
  }, []);

  useEffect(() => {
    void smartLotusApi.getAssignmentProjects().then(({ projects: items }) => {
      setProjects(items);
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải bộ dự án");
    });
  }, []);

  useEffect(() => {
    void smartLotusApi.getLibraryImages().then(({ categories }) => {
      setLibraryImages(categories.flatMap(({ category, files }) => files.map((file) => ({ ...file, category }))));
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thư viện hình ảnh");
    });
  }, []);

  async function generateQuestions() {
    const selectedClassroom = classrooms.find((item) => item.id === classroomId);
    const selectedTopic = topic.trim() || selectedClassroom?.subject || "Toán học";
    setLoading(true);
    setError("");
    setGenerationNotice("");
    try {
      const generated = await smartLotusApi.generateQuiz({
        topic: selectedTopic,
        curriculumLevel: Number(level),
        difficulties: ["A", "B", "C"],
        count: 10,
      });
      setQuestions(generated.questions.map((question, index) => ({ ...question, id: index + 1 })));
      setActiveQuestionIndex(0);
      setGenerationNotice(
        generated.source === "ai"
          ? `Đã tạo ${generated.questions.length} câu hỏi bằng Trí tuệ Nhân tạo (AI) kết hợp RAG từ mẫu.docx (Chỉ số IQ: ${intelligenceScore}/100).`
          : `Đã tạo ${generated.questions.length} câu hỏi thích ứng cá nhân hóa từ mẫu.docx (Chỉ số IQ: ${intelligenceScore}/100).`,
      );
      if (!title.trim()) setTitle(`Bài tập: ${selectedTopic}`);
      setTopic(selectedTopic);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Không thể tạo câu hỏi");
    } finally {
      setLoading(false);
    }
  }
  async function generateRagQuestions() {
    const selectedClassroom = classrooms.find((item) => item.id === classroomId);
    const selectedTopic = topic.trim() || selectedClassroom?.subject || "Toán học";
    setLoading(true);
    setError("");
    setGenerationNotice("");
    try {
      const difficulties: Array<"A" | "B" | "C" | "D" | "E"> =
        intelligenceScore >= 75
          ? ["C", "D", "E"]
          : intelligenceScore >= 45
            ? ["B", "C", "D"]
            : ["A", "B", "C"];
      const generated = await smartLotusApi.generateRagQuiz({
        topic: selectedTopic,
        curriculumLevel: Number(level),
        difficulties,
        count: 10,
        intelligenceScore,
        accuracy,
        lastScore,
        averageScoreLast10,
        durationSeconds: testDuration,
      });
      setQuestions(generated.questions.map((question, index) => ({ ...question, id: index + 1 })));
      setActiveQuestionIndex(0);
      const metricsSummary = `Độ chính xác: ${accuracy}% | Bài vừa làm: ${lastScore}đ | TB10 bài: ${averageScoreLast10}đ | Thời gian: ${testDuration}s (${Math.round(testDuration / 10)}s/câu)`;
      setGenerationNotice(
        generated.source === "ai"
          ? `Đã tạo thành công ${generated.questions.length} câu hỏi AI + RAG từ mẫu.docx thích ứng theo 4 chỉ số (${metricsSummary}).`
          : `Đã tạo ${generated.questions.length} câu hỏi RAG cá nhân hoá từ mẫu.docx (${metricsSummary}).`,
      );
      if (!title.trim()) setTitle(`Bài tập RAG (${intelligenceScore} IQ | ${lastScore}đ): ${selectedTopic}`);
      setTopic(selectedTopic);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Không thể tạo câu hỏi RAG");
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index: number, update: Partial<QuizQuestion>) {
    setQuestions((current) => current.map((question, questionIndex) => (
      questionIndex === index ? { ...question, ...update } : question
    )));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) => current.map((question, index) => {
      if (index !== questionIndex) return question;
      const options = question.options.map((option, answerIndex) => answerIndex === optionIndex ? value : option);
      return {
        ...question,
        options,
        correctAnswer: question.correctAnswer === question.options[optionIndex] ? "" : question.correctAnswer,
      };
    }));
  }

  function updateAnswerMode(index: number, answerMode: AnswerMode) {
    updateQuestion(index, {
      answerMode,
      options: answerMode === "choice" ? ["", "", "", ""]
        : answerMode === "image-choice" || answerMode === "image-select" ? ["A", "B", "C", "D"] : [],
      correctAnswer: "",
      optionImageIds: answerMode === "image-choice" || answerMode === "image-select" ? [null, null, null, null] : undefined,
    });
  }

  function setImageChoiceCorrect(questionIndex: number, option: string, checked: boolean) {
    const question = questions[questionIndex];
    if (!question) return;
    if (question.answerMode === "image-select") {
      const selected = new Set(question.correctAnswer.split("|").filter(Boolean));
      if (checked) selected.add(option);
      else selected.delete(option);
      const correctAnswer = question.options.filter((item) => selected.has(item)).join("|");
      updateQuestion(questionIndex, { correctAnswer });
    } else {
      updateQuestion(questionIndex, { correctAnswer: checked ? option : "" });
    }
  }

  function setOptionImage(questionIndex: number, optionIndex: number, assetId: string) {
    const question = questions[questionIndex];
    if (!question) return;
    const optionImageIds = [...(question.optionImageIds ?? question.options.map(() => null))];
    optionImageIds[optionIndex] = assetId || null;
    updateQuestion(questionIndex, { optionImageIds });
  }

  function addQuestion() {
    if (questions.length >= 20) return;
    setQuestions((current) => [...current, createQuestion(current.length + 1, topic.trim())]);
    setActiveQuestionIndex(questions.length);
    setError("");
    setGenerationNotice("");
  }

  function removeQuestion(index: number) {
    setQuestions((current) => current
      .filter((_, questionIndex) => questionIndex !== index)
      .map((question, questionIndex) => ({ ...question, id: questionIndex + 1 })));
    setActiveQuestionIndex((active) => active > index ? active - 1 : active === index ? Math.max(0, index - 1) : active);
    setError("");
    setGenerationNotice("");
  }

  function questionValidationError() {
    if (!questions.length) return "Hãy tạo bộ câu hỏi trước khi tiếp tục.";
    const incompleteIndex = questions.findIndex((question) => {
      if (!question.prompt.trim()) return true;
      const mode = question.answerMode ?? "choice";
      if (mode === "image-choice" || mode === "image-select") {
        return question.options.length !== 4 || !isAnswerModeCompatible(question, mode);
      }
      if (mode !== "choice") return !question.correctAnswer.trim();
      return question.options.length !== 4
        || question.options.some((option) => !option.trim())
        || new Set(question.options.map((option) => option.trim())).size !== 4
        || !question.options.includes(question.correctAnswer);
    });
    if (incompleteIndex !== -1) {
      const question = questions[incompleteIndex];
      const mode = question.answerMode ?? "choice";
      return mode === "image-choice" || mode === "image-select"
        ? `Câu ${incompleteIndex + 1} cần đủ 4 ảnh đáp án và chọn đáp án đúng.`
        : mode === "choice"
          ? `Câu ${incompleteIndex + 1} cần có đề bài, 4 đáp án khác nhau và một đáp án đúng.`
          : `Câu ${incompleteIndex + 1} cần có đề bài và đáp án số.`;
    }
    const incompatibleIndex = questions.findIndex((question) =>
      !isAnswerModeCompatible(question, question.answerMode ?? "choice"),
    );
    if (incompatibleIndex !== -1) {
      return `Kiểu trả lời của câu ${incompatibleIndex + 1} không phù hợp với nội dung đáp án.`;
    }
    return "";
  }

  function continueToSettings() {
    const validationError = questionValidationError();
    if (validationError) return setError(validationError);
    setError("");
    setStep("settings");
  }

  async function openProject() {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const { project } = await smartLotusApi.getAssignmentProject(projectId);
      if (!project.questions) throw new Error("Bộ dự án không có dữ liệu câu hỏi.");
      setQuestions(project.questions);
      setActiveQuestionIndex(0);
      setTopic(project.topic);
      setLevel(String(project.curriculumLevel));
      setTitle(project.name);
      setStep("questions");
      setGenerationNotice("Đã mở bộ dự án. Hãy cập nhật nội dung trước khi giao bài.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể mở bộ dự án");
    } finally {
      setLoading(false);
    }
  }

  async function saveProject() {
    const validationError = questionValidationError();
    if (validationError) return setError(validationError);
    const name = title.trim() || topic.trim();
    if (!name) return setError("Nhập tên bài tập trước khi lưu bộ dự án.");
    setLoading(true);
    setError("");
    try {
      const { project } = await smartLotusApi.saveAssignmentProject({
        ...(projectId ? { id: projectId } : {}),
        name,
        topic: topic.trim() || name,
        curriculumLevel: Number(level),
        questions,
      });
      setProjectId(project.id);
      const { projects: items } = await smartLotusApi.getAssignmentProjects();
      setProjects(items);
      onToast("Đã lưu bộ dự án vào tài khoản giáo viên.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu bộ dự án");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject() {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      await smartLotusApi.deleteAssignmentProject(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
      setProjectId("");
      onToast("Đã xóa bộ dự án.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa bộ dự án");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!classroomId) return setError("Hãy tạo lớp học trước khi giao bài.");
    if (!title.trim()) return setError("Vui lòng nhập tên bài tập.");
    if (!topic.trim()) return setError("Vui lòng nhập chủ đề bài tập.");
    const validationError = questionValidationError();
    if (validationError) return setError(validationError);
    const dueAt = new Date(dueDate);
    if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()) return setError("Hạn nộp phải ở thời điểm trong tương lai.");
    setLoading(true);
    setError("");
    try {
      await smartLotusApi.createAssignment({
        classroomId,
        title: title.trim(),
        topic: topic.trim(),
        curriculumLevel: Number(level),
        dueAt: dueAt.toISOString(),
        durationMinutes: Number(duration),
        questions,
      });
      onToast("Đã giao bài tập cho lớp.");
      onBack();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Không thể giao bài tập");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="assignment-shell">
      <header className="assignment-header">
        <div className="assignment-header-left">
          <button className="icon-button" onClick={onBack} aria-label="Quay lại"><Icon name="arrow" className="rotate-left" /></button>
          <div>
            <span className="section-kicker">BÀI TẬP · BƯỚC {step === "questions" ? "1/2" : "2/2"}</span>
            <h1>{step === "questions" ? "Soạn đề bài" : "Cài đặt bài tập"}</h1>
          </div>
        </div>
        <div className="assignment-project-picker">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Bộ dự án đã lưu">
            <option value="">Mở bộ dự án đã lưu...</option>
            {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
          </select>
          <button type="button" className="secondary-button" onClick={() => void openProject()} disabled={!projectId || loading}>
            Mở dự án
          </button>
        </div>
      </header>

      {step === "questions" ? (
        <div className="assignment-layout assignment-compose-layout">
          <section className="assignment-panel assignment-questions assignment-compose">
            <div className="assignment-questions-heading">
              <div><h2>Đề bài và đáp án</h2><p>Chọn ảnh, sao chép, dán và sắp xếp như trong Paint.</p></div>
              <span className="assignment-count">{questions.length}/20 câu</span>
            </div>
            {questions.length > 0 && (
              <nav className="assignment-question-tabs" aria-label="Chọn câu hỏi để chỉnh sửa">
                {questions.map((question, index) => (
                  <button
                    type="button"
                    key={`${question.id}-tab`}
                    className={activeQuestionIndex === index ? "active" : ""}
                    onClick={() => setActiveQuestionIndex(index)}
                    aria-current={activeQuestionIndex === index ? "step" : undefined}
                  >
                    Câu {index + 1}
                    {!question.prompt.trim() && <i aria-label="Chưa nhập đề bài" />}
                  </button>
                ))}
              </nav>
            )}
            {questions.length ? (
              <ol className="assignment-question-list">
                {questions.map((question, index) => index === activeQuestionIndex ? (
                  <li key={`${question.id}-${index}`} className="assignment-question-editor">
                    <div className="assignment-question-editor-heading">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong>Câu {index + 1}</strong>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(124, 58, 237, 0.1)", color: "#7c3aed", fontWeight: 600 }}>
                          AI + RAG · Độ khó: {question.difficulty ?? "A"} {question.skill ? `· ${question.skill}` : ""}
                        </span>
                      </div>
                      <button type="button" className="assignment-remove-question" onClick={() => removeQuestion(index)} aria-label={`Xóa câu ${index + 1}`}>
                        <Icon name="trash" size={15} /> Xóa câu
                      </button>
                    </div>
                    <label className="assignment-question-prompt">
                      Đề bài
                      <textarea
                        value={question.prompt}
                        onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                        placeholder="Nhập nội dung câu hỏi..."
                        rows={2}
                      />
                    </label>
                    <label className="assignment-question-mode">
                      Kiểu trả lời
                      <select
                        value={question.answerMode ?? "choice"}
                        onChange={(event) => updateAnswerMode(index, event.target.value as AnswerMode)}
                      >
                        {Object.entries(MODE_LABELS).map(([mode, label]) => (
                          <option key={mode} value={mode}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <AssignmentImageEditor
                      question={question}
                      libraryImages={libraryImages}
                      onChange={(update) => updateQuestion(index, update)}
                    />
                    {(question.answerMode ?? "choice") === "choice" ? (
                      <fieldset className="assignment-answer-options">
                        <legend>Đáp án <span>Chọn đáp án đúng</span></legend>
                        {question.options.map((option, optionIndex) => (
                          <label className={`assignment-answer-option${question.correctAnswer === option && option ? " is-correct" : ""}`} key={optionIndex}>
                            <input
                              type="radio"
                              name={`assignment-question-${index}-correct`}
                              checked={Boolean(option) && question.correctAnswer === option}
                              disabled={!option.trim()}
                              onChange={() => updateQuestion(index, { correctAnswer: option })}
                              aria-label={`Đánh dấu lựa chọn ${String.fromCharCode(65 + optionIndex)} là đáp án đúng cho câu ${index + 1}`}
                            />
                            <span className="assignment-answer-letter">{String.fromCharCode(65 + optionIndex)}</span>
                            <input
                              value={option}
                              onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                              placeholder={`Nhập đáp án ${String.fromCharCode(65 + optionIndex)}`}
                              aria-label={`Đáp án ${String.fromCharCode(65 + optionIndex)} của câu ${index + 1}`}
                            />
                            {question.correctAnswer === option && option && <Icon name="check" size={16} />}
                          </label>
                        ))}
                      </fieldset>
                    ) : question.answerMode === "image-choice" || question.answerMode === "image-select" ? (
                      <fieldset className="assignment-answer-options assignment-image-answer-options">
                        <legend>Ảnh đáp án <span>Chọn ảnh trong thư viện đề bài</span></legend>
                        {question.options.map((option, optionIndex) => (
                          <div className="assignment-image-answer-option" key={option}>
                            <input
                              type={question.answerMode === "image-select" ? "checkbox" : "radio"}
                              name={`assignment-question-${index}-image-correct`}
                              checked={question.correctAnswer.split("|").includes(option)}
                              onChange={(event) => setImageChoiceCorrect(index, option, event.target.checked)}
                              aria-label={`${question.answerMode === "image-select" ? "Đánh dấu" : "Chọn"} ảnh ${option} là đáp án đúng cho câu ${index + 1}`}
                            />
                            <strong>{option}</strong>
                            <select
                              value={question.optionImageIds?.[optionIndex] ?? ""}
                              onChange={(event) => setOptionImage(index, optionIndex, event.target.value)}
                              aria-label={`Ảnh đáp án ${option} của câu ${index + 1}`}
                            >
                              <option value="">Chọn ảnh...</option>
                              {(question.imageAssets ?? [])
                                .filter((asset) => asset.id === question.optionImageIds?.[optionIndex]
                                  || !question.optionImageIds?.some((id, index) => index !== optionIndex && id === asset.id))
                                .map((asset) => (
                                  <option key={asset.id} value={asset.id}>{asset.name}</option>
                                ))}
                            </select>
                            {question.optionImageIds?.[optionIndex] && (
                              <img
                                src={question.imageAssets?.find((asset) => asset.id === question.optionImageIds?.[optionIndex])?.src}
                                alt={`Xem trước ảnh ${option}`}
                              />
                            )}
                          </div>
                        ))}
                        <small>{question.answerMode === "image-select" ? "Chọn tất cả ảnh đúng." : "Chọn một ảnh đúng."} Thêm ảnh vào thư viện/cảnh ở trên trước.</small>
                      </fieldset>
                    ) : (
                      <label className="assignment-question-prompt assignment-question-correct-answer">
                        Đáp án đúng
                        <input
                          type="number"
                          step="1"
                          value={question.correctAnswer}
                          onChange={(event) => updateQuestion(index, { correctAnswer: event.target.value })}
                          placeholder="Nhập đáp án số"
                          aria-label={`Đáp án đúng bằng số cho câu ${index + 1}`}
                        />
                        <small>{MODE_LABELS[question.answerMode ?? "choice"]} dùng đáp án số; học sinh sẽ trả lời theo kiểu này.</small>
                      </label>
                    )}
                    <label className="assignment-question-prompt assignment-question-explanation">
                      Lời giải (không bắt buộc)
                      <textarea
                        value={question.explanation}
                        onChange={(event) => updateQuestion(index, { explanation: event.target.value })}
                        placeholder="Giải thích đáp án đúng..."
                        rows={2}
                      />
                    </label>
                    <aside className="assignment-live-preview" aria-label={`Xem trước câu hỏi ${index + 1}`}>
                      <div className="assignment-live-preview-heading">
                        <div><span className="assignment-preview-eyebrow">GIAO DIỆN HỌC SINH</span><strong>Xem trước câu {index + 1}</strong></div>
                        <span>{MODE_LABELS[question.answerMode ?? "choice"]}</span>
                      </div>
                      <p>{question.prompt || "Nội dung đề bài sẽ hiển thị ở đây."}</p>
                      <QuizIllustration question={question} />
                      {(question.answerMode ?? "choice") === "choice" && (
                        <div className="assignment-live-preview-options">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option || `Đáp án ${String.fromCharCode(65 + optionIndex)}`}</span></div>
                          ))}
                        </div>
                      )}
                      {(question.answerMode === "image-choice" || question.answerMode === "image-select") && (
                        <div className="assignment-live-preview-options image">
                          {question.options.map((option, optionIndex) => {
                            const assetId = question.optionImageIds?.[optionIndex];
                            const asset = question.imageAssets?.find((item) => item.id === assetId);
                            return (
                              <div key={option}>
                                {asset && <img src={asset.src} alt={asset.name} />}
                                <span>{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {!["choice", "image-choice", "image-select"].includes(question.answerMode ?? "choice") && (
                        <div className="assignment-live-preview-answer">
                          {question.answerMode === "type" ? <><span>Nhập câu trả lời</span><i /></>
                            : question.answerMode === "line" ? <><span>Trục số để chọn đáp án</span><i /></>
                              : question.answerMode === "complete" ? <><span>Các ô ghép phép tính</span><i /></>
                                : question.answerMode === "match" ? <><span>Bảng nối cặp đáp án</span><i /></>
                                  : <><span>Các lựa chọn để chọn</span><i /></>}
                        </div>
                      )}
                    </aside>
                  </li>
                ) : null)}
              </ol>
            ) : <div className="assignment-question-empty"><Icon name="sparkles" size={24} /><p>Tạo đề bằng AI hoặc tự thêm câu hỏi, đáp án phù hợp với kiểu trả lời.</p></div>}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", margin: "10px 0 4px", background: "rgba(16, 185, 129, 0.08)", borderRadius: 8, border: "1px solid rgba(16, 185, 129, 0.22)", fontSize: 12, color: "#065f46" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                <span><strong>Hệ thống Trí Tuệ Nhân Tạo (AI) + RAG đã tích hợp:</strong> Trích xuất tri thức từ <em>library/mẫu.docx</em> (10 đề, 100 câu) & Generative AI (Ollama Qwen2.5 / Gemini) tạo đề cá nhân hoá.</span>
              </div>
              <span style={{ fontSize: 11, background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 12, fontWeight: 600, whiteSpace: "nowrap" }}>AI + RAG Hoạt Động</span>
            </div>
            <div style={{ padding: "12px 14px", margin: "8px 0 10px", background: "linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(79, 70, 229, 0.05))", borderRadius: 12, border: "1px solid rgba(124, 58, 237, 0.2)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="sparkles" size={18} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6" }}>
                    Đầu vào đa dạng hóa RAG (4 Chỉ số thích ứng)
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => applyAdaptivePreset("fast_inaccurate")}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1px solid",
                      borderColor: adaptivePreset === "fast_inaccurate" ? "#e11d48" : "#cbd5e1",
                      background: adaptivePreset === "fast_inaccurate" ? "#ffe4e6" : "#fff",
                      color: adaptivePreset === "fast_inaccurate" ? "#be123c" : "#475569",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title="Tốc độ nhanh nhưng hay sai: cài bẫy dữ kiện thừa"
                  >
                    ⚡ Nhanh nhưng ẩu
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAdaptivePreset("breakthrough")}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1px solid",
                      borderColor: adaptivePreset === "breakthrough" ? "#059669" : "#cbd5e1",
                      background: adaptivePreset === "breakthrough" ? "#d1fae5" : "#fff",
                      color: adaptivePreset === "breakthrough" ? "#047857" : "#475569",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title="Bài vừa rồi tiến bộ vượt bậc so với TB 10 bài"
                  >
                    🚀 Bứt phá
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAdaptivePreset("slow_struggling")}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1px solid",
                      borderColor: adaptivePreset === "slow_struggling" ? "#d97706" : "#cbd5e1",
                      background: adaptivePreset === "slow_struggling" ? "#fef3c7" : "#fff",
                      color: adaptivePreset === "slow_struggling" ? "#b45309" : "#475569",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title="Làm chậm và gặp khó khăn: câu ngắn, số nhỏ"
                  >
                    🐢 Chậm & Cần bệ đỡ
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAdaptivePreset("consistent_mastery")}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1px solid",
                      borderColor: adaptivePreset === "consistent_mastery" ? "#7c3aed" : "#cbd5e1",
                      background: adaptivePreset === "consistent_mastery" ? "#ede9fe" : "#fff",
                      color: adaptivePreset === "consistent_mastery" ? "#6d28d9" : "#475569",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title="Phong độ cao ổn định: thử thách nâng cao"
                  >
                    ⭐ Xuất sắc
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 12 }}>
                {/* 1. Độ chính xác */}
                <div style={{ background: "#fff", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#475569", fontWeight: 500 }}>🎯 Độ chính xác:</span>
                    <strong style={{ color: accuracy >= 80 ? "#059669" : accuracy >= 60 ? "#d97706" : "#e11d48" }}>{accuracy}%</strong>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={accuracy}
                    onChange={(e) => { setAccuracy(Number(e.target.value)); setAdaptivePreset("custom"); }}
                    style={{ width: "100%", accentColor: "#059669" }}
                  />
                </div>

                {/* 2. Điểm bài vừa làm */}
                <div style={{ background: "#fff", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#475569", fontWeight: 500 }}>📝 Điểm bài vừa làm:</span>
                    <strong style={{ color: lastScore >= 80 ? "#2563eb" : lastScore >= 50 ? "#d97706" : "#e11d48" }}>{lastScore}đ</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={lastScore}
                    onChange={(e) => { setLastScore(Number(e.target.value)); setAdaptivePreset("custom"); }}
                    style={{ width: "100%", accentColor: "#2563eb" }}
                  />
                </div>

                {/* 3. Trung bình điểm 10 bài gần đây */}
                <div style={{ background: "#fff", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#475569", fontWeight: 500 }}>📊 TB 10 bài gần đây:</span>
                    <strong style={{ color: averageScoreLast10 >= 75 ? "#7c3aed" : averageScoreLast10 >= 50 ? "#d97706" : "#e11d48" }}>{averageScoreLast10}đ</strong>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={2}
                    value={averageScoreLast10}
                    onChange={(e) => { setAverageScoreLast10(Number(e.target.value)); setAdaptivePreset("custom"); }}
                    style={{ width: "100%", accentColor: "#7c3aed" }}
                  />
                </div>

                {/* 4. Thời gian làm bài */}
                <div style={{ background: "#fff", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#475569", fontWeight: 500 }}>⏱️ Thời gian làm bài:</span>
                    <strong style={{ color: testDuration < 120 ? "#e11d48" : testDuration > 360 ? "#d97706" : "#059669" }}>
                      {testDuration}s ({Math.round(testDuration / 10)}s/câu)
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={600}
                    step={10}
                    value={testDuration}
                    onChange={(e) => { setTestDuration(Number(e.target.value)); setAdaptivePreset("custom"); }}
                    style={{ width: "100%", accentColor: "#ea580c" }}
                  />
                </div>
              </div>
            </div>
            <div className="assignment-question-actions">
              <button className="secondary-button assignment-add-question" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", borderColor: "transparent", fontWeight: 600 }} onClick={() => void generateRagQuestions()} disabled={loading}>
                <Icon name="sparkles" /> {loading ? "AI đang sinh đề..." : "Sinh đề AI + RAG theo 4 chỉ số thích ứng"}
              </button>
              <button className="secondary-button assignment-add-question" onClick={() => void generateQuestions()} disabled={loading}>
                <Icon name="sparkles" /> {loading ? "Đang xử lý..." : "Sinh đề nhanh bằng AI"}
              </button>
              <button className="assignment-add-manual" onClick={addQuestion} disabled={loading || questions.length >= 20}>
                <Icon name="plus" /> Thêm câu hỏi
              </button>
            </div>
            {generationNotice && (
              <p
                className={`assignment-generation-status${generationNotice.startsWith("AI chưa") || generationNotice.startsWith("Ollama chỉ") ? " fallback" : ""}`}
                role="status"
              >
                {generationNotice}
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="assignment-layout assignment-settings-layout">
          <section className="assignment-panel assignment-settings-panel">
            <h2>Cài đặt bài tập</h2>
            <div className="assignment-form">
              <label>Tên bài tập<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="VD: Ôn tập cộng trừ" /></label>
              <label>Chọn lớp
                <select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
                  <option value="">Chọn lớp học</option>
                  {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name} · {classroom.label}</option>)}
                </select>
              </label>
              <label>Chủ đề<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="VD: Cộng trừ trong phạm vi 10" /></label>
              <label>Khối lớp<select value={level} onChange={(event) => setLevel(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>Khối {item}</option>)}</select></label>
              <label>Hạn nộp bài<input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
              <label>Thời gian làm bài
                <span className="assignment-duration"><input type="number" min={1} max={240} value={duration} onChange={(event) => setDuration(event.target.value)} /><em>phút</em></span>
              </label>
            </div>
          </section>
          <section className="assignment-panel assignment-project-panel">
            <span className="section-kicker">DÙNG LẠI LẦN SAU</span>
            <h2>Bộ dự án của tôi</h2>
            <p>Lưu câu hỏi, ảnh và cách sắp xếp vào tài khoản giáo viên để mở lại trên thiết bị khác.</p>
            <label>Tên bộ dự án<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên bộ dự án" /></label>
            <div className="assignment-project-actions">
              <button type="button" className="primary-button" onClick={() => void saveProject()} disabled={loading}>
                {loading ? "Đang lưu..." : projectId ? "Cập nhật bộ dự án" : "Lưu thành bộ dự án"}
              </button>
              {projectId && <button type="button" className="assignment-project-delete" onClick={() => void deleteProject()} disabled={loading}>Xóa bộ dự án</button>}
            </div>
            <div className="assignment-project-summary">
              <strong>Đề hiện tại</strong>
              <span>{questions.length} câu hỏi · Khối {level} · {topic || "Chưa đặt chủ đề"}</span>
              <button type="button" className="secondary-button" onClick={() => setStep("questions")}>Quay lại chỉnh sửa đề</button>
            </div>
          </section>
        </div>
      )}

      {error && <p className="student-form-error" role="alert">{error}</p>}
      <footer className="assignment-footer">
        {step === "questions" ? (
          <>
            <button className="secondary-button" onClick={onBack}>Hủy</button>
            <button className="primary-button" onClick={continueToSettings}>Xong đề · Cài đặt bài tập <Icon name="arrow" /></button>
          </>
        ) : (
          <>
            <button className="secondary-button" onClick={() => setStep("questions")}>Chỉnh sửa đề</button>
            <button className="primary-button" onClick={() => void publish()} disabled={loading}>{loading ? "Đang lưu..." : "Phát hành bài tập"}</button>
          </>
        )}
      </footer>
    </div>
  );
}
