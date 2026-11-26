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
  const [expandedRosterId, setExpandedRosterId] = useState<string | null>(null);
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
            const matchesPrimaryRoster = Boolean(
              classMembers && (
                (classroom.classCode && classroom.classCode === classMembers.classInfo?.code) ||
                classroom.label === classMembers.classInfo?.name ||
                classroom.name === `Lớp ${classMembers.classInfo?.name}`
              )
            );
            const currentSchoolCode = classroom.schoolCode || (matchesPrimaryRoster ? classMembers?.classInfo?.schoolCode : "") || "";
            const currentClassCode = classroom.classCode || classroom.joinCode || (matchesPrimaryRoster ? classMembers?.classInfo?.code : "") || "";
            const totalMembers = matchesPrimaryRoster
              ? (classMembers?.students?.length ?? (classroom.studentCount ?? 0))
              : (classroom.studentCount ?? 0);
            const classAssignments = assignmentsByClass.get(classroom.id) ?? [];
            const teacherName = classroom.teacherName || "Giáo viên bộ môn";
            const isRosterOpen = expandedRosterId === classroom.id;

            return (
              <article className="student-class-card" key={classroom.id}>
                <div className={`classroom-card-banner student-class-banner tone-${classroom.color || "purple"}`}>
                  <div className="student-class-banner-top">
                    <span className="student-class-subject">{classroom.subject || "Toán"}</span>
                    {currentClassCode && (
                      <span className="student-class-code-text">Mã: {currentClassCode}</span>
                    )}
                  </div>
                  <h2 className="student-class-banner-title">{classroom.name}</h2>
                </div>

                <div className="student-class-copy">
                  <div className="student-class-teacher">
                    <span className="student-class-teacher-text">
                      Giáo viên: <strong>{teacherName}</strong>
                    </span>
                    {totalMembers > 0 && (
                      <span className="student-class-member-count">{totalMembers} học sinh</span>
                    )}
                  </div>

                  {classroom.description?.trim() && (
                    <p className="student-class-desc">{classroom.description.trim()}</p>
                  )}

                  {(currentSchoolCode || currentClassCode) && (
                    <div className="student-class-meta">
                      {currentSchoolCode && <span>Mã trường: <strong>{currentSchoolCode}</strong></span>}
                      {currentClassCode && <span>Mã lớp: <strong>{currentClassCode}</strong></span>}
                    </div>
                  )}

                  {matchesPrimaryRoster && classMembers && classMembers.students && classMembers.students.length > 0 && (
                    <div className="student-roster-box">
                      <button
                        type="button"
                        className="student-roster-toggle"
                        onClick={() => setExpandedRosterId((prev) => (prev === classroom.id ? null : classroom.id))}
                      >
                        <span>Bạn cùng lớp ({classMembers.students.length})</span>
                        <span>{isRosterOpen ? "Thu gọn" : "Xem danh sách"}</span>
                      </button>

                      {isRosterOpen && (
                        <div className="student-roster-list">
                          {classMembers.students.map((st) => (
                            <div className="student-roster-item" key={st.id}>
                              <div className="student-roster-item-left">
                                <strong>{st.name}</strong>
                                <small>ID: {st.studentCode || `HS-${st.id}`}</small>
                              </div>
                              <span className="student-roster-points">{st.lotusPoints || 0} điểm</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {matchesPrimaryRoster && classMembers && classMembers.otherClasses && classMembers.otherClasses.length > 1 && (
                    <div className="student-other-classes">
                      <span>Các lớp khác cùng trường: </span>
                      {classMembers.otherClasses
                        .filter((oc) => oc.code !== currentClassCode)
                        .map((oc) => `Lớp ${oc.name} (${oc.code})`)
                        .join(", ")}
                    </div>
                  )}

                  <div className="student-class-assignments">
                    <div className="student-class-assignments-head">
                      <h3>Bài tập được giao</h3>
                      <span className="student-assignment-count">{classAssignments.length} bài</span>
                    </div>

                    {classAssignments.length === 0 ? (
                      <p className="student-assignment-empty">Chưa có bài tập nào được giao.</p>
                    ) : classAssignments.map((assignment) => (
                      <div className="student-assignment-row" key={assignment.id}>
                        <div>
                          <div className="student-assignment-title-row">
                            <strong>{assignment.title}</strong>
                            {assignment.isAdaptive && (
                              <span className="student-adaptive-tag">Cá nhân hóa AI</span>
                            )}
                          </div>
                          <small>
                            {assignment.topic} · Hạn {new Date(assignment.dueDate).toLocaleString("vi-VN")}
                            {assignment.personalizedTheme && ` · Chủ đề: ${assignment.personalizedTheme}`}
                          </small>
                          {assignment.submission && (
                            <small className="student-assignment-done">
                              Đã nộp: {assignment.submission.correctAnswers}/{assignment.submission.totalQuestions} câu đúng
                            </small>
                          )}
                        </div>
                        <button
                          className="primary-button"
                          disabled={Boolean(assignment.submission) || !assignment.questions?.length}
                          onClick={() => onStartAssignment(assignment)}
                        >
                          {assignment.submission ? "Đã nộp" : "Làm bài"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
