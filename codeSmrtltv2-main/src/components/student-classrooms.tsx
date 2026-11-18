"use client";

import { useEffect, useState } from "react";
import type { Assignment } from "@/lib/assignment-data";
import { smartLotusApi, type ClassroomInvitation } from "@/lib/api";
import type { Classroom } from "@/lib/student-data";
import { Icon } from "./icons";

async function loadStudentClassroomData() {
  return Promise.all([
    smartLotusApi.getClassrooms(),
    smartLotusApi.getAssignments(),
    smartLotusApi.getStudentCode(),
    smartLotusApi.getClassroomInvitations(),
  ]);
}

export default function StudentClassrooms({ onStartAssignment }: { onStartAssignment: (assignment: Assignment) => void }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invitations, setInvitations] = useState<ClassroomInvitation[]>([]);
  const [studentCode, setStudentCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [classMembers, setClassMembers] = useState<{
    classInfo: {
      name: string;
      grade: string;
      code: string;
      schoolName: string;
      schoolCode: string;
      totalStudents: number;
    };
    students: Array<{
      id: string;
      studentCode?: string;
      name: string;
      avatar: string;
      avatarUrl?: string;
      lotusPoints?: number;
      currentStreak?: number;
      lastActive?: string;
    }>;
    teachers: Array<{ id: string; name: string; avatar: string; avatarUrl?: string; phone: string; email: string }>;
    otherClasses: Array<{ name: string; code: string; grade: string }>;
  } | null>(null);

  async function refresh() {
    try {
      const [classData, assignmentData, codeData, inviteData] = await loadStudentClassroomData();
      setClassrooms(classData.classrooms);
      setAssignments(assignmentData.assignments);
      setStudentCode(codeData.studentCode);
      setInvitations(inviteData.invitations);
      void smartLotusApi.getClassMembers().then(setClassMembers).catch(() => undefined);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lớp học và bài tập");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void loadStudentClassroomData().then(([classData, assignmentData, codeData, inviteData]) => {
      if (!active) return;
      setClassrooms(classData.classrooms);
      setAssignments(assignmentData.assignments);
      setStudentCode(codeData.studentCode);
      setInvitations(inviteData.invitations);
      void smartLotusApi.getClassMembers().then((res) => {
        if (active) setClassMembers(res);
      }).catch(() => undefined);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Không thể tải lớp học và bài tập");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function joinClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!joinCode.trim()) {
      setError("Nhập mã lớp do giáo viên chia sẻ.");
      return;
    }
    setJoining(true);
    setError("");
    try {
      await smartLotusApi.joinClassroom(joinCode.trim());
      setJoinCode("");
      setLoading(true);
      await refresh();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Không thể tham gia lớp học");
    } finally {
      setJoining(false);
    }
  }

  async function respondToInvite(invitation: ClassroomInvitation, decision: "accepted" | "declined") {
    setError("");
    try {
      await smartLotusApi.respondToClassroomInvitation(invitation.id, decision);
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      if (decision === "accepted") {
        setLoading(true);
        await refresh();
      }
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "Không thể phản hồi lời mời");
    }
  }

  async function copyStudentCode() {
    try {
      await navigator.clipboard.writeText(studentCode);
      setNotice("Đã sao chép mã ID. Hãy gửi mã này cho giáo viên.");
    } catch {
      setError("Không thể sao chép tự động. Hãy chọn và sao chép mã ID hiển thị.");
    }
  }

  const assignmentsByClass = new Map<string, Assignment[]>();
  for (const assignment of assignments) {
    const group = assignmentsByClass.get(assignment.classroomId ?? "") ?? [];
    group.push(assignment);
    assignmentsByClass.set(assignment.classroomId ?? "", group);
  }

  return (
    <div className="view-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow purple"><Icon name="school" size={16} /> LỚP HỌC CỦA TÔI</span>
          <h1>Lớp học</h1>
          <p>Tham gia lớp bằng mã giáo viên chia sẻ và làm các bài tập được giao.</p>
        </div>
      </section>

      <section className="card student-own-code">
        <div>
          <span className="section-kicker">MÃ ID HỌC SINH</span>
          <h2>{studentCode || "Đang tải mã..."}</h2>
          <p>Chia sẻ mã này với giáo viên để được mời vào lớp.</p>
        </div>
        <button className="secondary-button" onClick={() => void copyStudentCode()} disabled={!studentCode}>Sao chép mã</button>
      </section>
      {notice && <p className="classroom-invite-notice" role="status">{notice}</p>}

      {invitations.map((invitation) => (
        <section className="card classroom-invitation-notice" key={invitation.id} role="alert" aria-live="polite">
          <span className="student-class-empty-icon"><Icon name="bell" size={20} /></span>
          <div>
            <span className="section-kicker">LỜI MỜI VÀO LỚP</span>
            <h2>{invitation.teacherName} mời bạn vào {invitation.classroomName} ({invitation.classroomLabel})</h2>
            <p>Môn {invitation.subject}. Chấp nhận để xem lớp và các bài tập được giao.</p>
          </div>
          <div className="classroom-invitation-actions">
            <button className="secondary-button" onClick={() => void respondToInvite(invitation, "declined")}>Từ chối</button>
            <button className="primary-button" onClick={() => void respondToInvite(invitation, "accepted")}>Chấp nhận</button>
          </div>
        </section>
      ))}

      <form className="card student-class-join" onSubmit={(event) => void joinClass(event)}>
        <div>
          <span className="section-kicker">THAM GIA LỚP</span>
          <h2>Nhập mã lớp</h2>
        </div>
        <label>
          <span className="sr-only">Mã lớp</span>
          <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={12} placeholder="VD: A1B2C3D4E5" />
        </label>
        <button className="primary-button" type="submit" disabled={joining}>{joining ? "Đang tham gia..." : "Tham gia lớp"}</button>
      </form>
      {error && <p className="student-form-error" role="alert">{error}</p>}

      {loading ? <div className="card student-class-empty"><p>Đang tải lớp học...</p></div> : classrooms.length === 0 ? (
        <div className="card student-class-empty">
          <span className="student-class-empty-icon"><Icon name="school" size={22} /></span>
          <div><h2>Bạn chưa tham gia lớp nào</h2><p>Nhập mã lớp mà giáo viên gửi để xem lớp và bài tập.</p></div>
        </div>
      ) : (
        <section className="student-class-list">
          {classrooms.map((classroom) => {
            const currentSchoolCode = classroom.schoolCode || classMembers?.classInfo?.schoolCode || "";
            const currentClassCode = classroom.classCode || classMembers?.classInfo?.code || "";
            const totalMembers = classMembers?.students?.length ?? (classroom.studentCount ?? 0);

            return (
              <article className="card student-class-card" key={classroom.id}>
                <div className={`classroom-card-banner tone-${classroom.color}`}>
                  <span className="classroom-card-banner-title">{classroom.name}</span>
                  {currentClassCode && (
                    <span style={{ fontSize: "11px", background: "rgba(255, 255, 255, 0.25)", padding: "2px 8px", borderRadius: "12px", fontWeight: 700 }}>
                      Mã lớp: {currentClassCode}
                    </span>
                  )}
                </div>
                <div className="student-class-copy">
                  <h2>{classroom.name}</h2>
                  <p>{classroom.subject} · {classroom.teacherName ? `GV: ${classroom.teacherName}` : "Lớp của bạn"}</p>
                  <p>{classroom.description || "Chưa có mô tả"}</p>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "10px 0" }}>
                    {currentSchoolCode && (
                      <span style={{ fontSize: "11px", background: "#f3e8ff", color: "#6d28d9", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
                        Mã trường: <strong style={{ fontFamily: "monospace" }}>{currentSchoolCode}</strong>
                      </span>
                    )}
                    {currentClassCode && (
                      <span style={{ fontSize: "11px", background: "#ecfdf5", color: "#047857", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
                        Mã lớp: <strong style={{ fontFamily: "monospace" }}>{currentClassCode}</strong>
                      </span>
                    )}
                    {totalMembers > 0 && (
                      <span style={{ fontSize: "11px", background: "#eff6ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
                        {totalMembers} học sinh trong lớp
                      </span>
                    )}
                  </div>

                  {classMembers && classMembers.students && classMembers.students.length > 0 && (
                    <div style={{ margin: "12px 0", borderTop: "1px dashed #e2e8f0", paddingTop: "10px" }}>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", fontSize: "12px" }}
                        onClick={() => setShowRoster((prev) => !prev)}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Icon name="users" size={14} /> Bạn học cùng lớp ({classMembers.students.length} bạn có cùng thông tin lớp)
                        </span>
                        <span>{showRoster ? "▲ Thu gọn" : "▼ Xem danh sách"}</span>
                      </button>

                      {showRoster && (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto", background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          {classMembers.students.map((st) => (
                            <div key={st.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "#fff", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e0e7ff", color: "#4338ca", display: "grid", placeItems: "center", fontSize: "11px", fontWeight: 700 }}>
                                  {st.avatar || "HS"}
                                </div>
                                <div>
                                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{st.name}</div>
                                  <div style={{ fontSize: "10px", color: "#64748b" }}>ID: {st.studentCode || `HS-${st.id}`}</div>
                                </div>
                              </div>
                              <div style={{ textAlign: "right", fontSize: "11px", color: "#d97706", fontWeight: 700 }}>
                                🌸 {st.lotusPoints || 0} điểm
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {classMembers && classMembers.otherClasses && classMembers.otherClasses.length > 1 && (
                    <div style={{ margin: "10px 0", fontSize: "11px" }}>
                      <div style={{ color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>Các lớp khác cùng trường:</div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {classMembers.otherClasses
                          .filter((oc) => oc.code !== currentClassCode)
                          .map((oc) => (
                            <span key={oc.code} style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "4px", color: "#475569" }}>
                              Lớp {oc.name} (Mã: {oc.code})
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  <h3>Bài tập được giao</h3>
                  {(assignmentsByClass.get(classroom.id) ?? []).length === 0 ? (
                    <p>Chưa có bài tập.</p>
                  ) : (assignmentsByClass.get(classroom.id) ?? []).map((assignment) => (
                    <div className="student-assignment-row" key={assignment.id}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <strong>{assignment.title}</strong>
                          {assignment.isAdaptive && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                                color: "#6d28d9",
                                border: "1px solid #ddd6fe",
                                fontSize: "10px",
                                fontWeight: 750,
                                padding: "2px 7px",
                                borderRadius: "6px",
                              }}
                            >
                              <Icon name="sparkles" size={11} /> Đề cá nhân hóa AI
                            </span>
                          )}
                        </div>
                        <small>
                          {assignment.topic} · Hạn nộp {new Date(assignment.dueDate).toLocaleString("vi-VN")}
                          {assignment.personalizedTheme && ` · Đề theo sở thích: ${assignment.personalizedTheme}`}
                        </small>
                        {assignment.submission && <small>Đã nộp · {assignment.submission.correctAnswers}/{assignment.submission.totalQuestions} câu đúng</small>}
                      </div>
                      <button className="primary-button" disabled={Boolean(assignment.submission) || !assignment.questions?.length} onClick={() => onStartAssignment(assignment)}>
                        {assignment.submission ? "Đã nộp" : (assignment.isAdaptive ? "✨ Làm bài" : "Làm bài")}
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
