"use client";

import { useEffect, useMemo, useState } from "react";
import type { Assignment } from "@/lib/assignment-data";
import { smartLotusApi, type ClassroomInvitation } from "@/lib/api";
import type { Classroom } from "@/lib/student-data";
import { Icon } from "./icons";

type CardThemeKey = "violet" | "blue" | "purple" | "emerald" | "rose" | "amber";

interface ThemeStyle {
  gradient: string;
  avatarBg: string;
  avatarText: string;
  buttonBg: string;
  ringHover: string;
}

const THEME_STYLES: Record<CardThemeKey, ThemeStyle> = {
  violet: {
    gradient: "from-[#6D4AFF] via-[#8358FF] to-[#A46BFF]",
    avatarBg: "bg-violet-100",
    avatarText: "text-violet-700",
    buttonBg: "bg-[#7340FF] hover:bg-[#5F2EEB]",
    ringHover: "hover:border-violet-200/90",
  },
  blue: {
    gradient: "from-[#1662F3] via-[#2777FF] to-[#3B95FF]",
    avatarBg: "bg-blue-100",
    avatarText: "text-blue-700",
    buttonBg: "bg-[#1D6BF3] hover:bg-[#1558D6]",
    ringHover: "hover:border-blue-200/90",
  },
  purple: {
    gradient: "from-[#5B3DF5] via-[#7A44FF] to-[#A14EFF]",
    avatarBg: "bg-purple-100",
    avatarText: "text-purple-700",
    buttonBg: "bg-[#7038FF] hover:bg-[#5B27E5]",
    ringHover: "hover:border-purple-200/90",
  },
  emerald: {
    gradient: "from-[#058E6E] via-[#0FA886] to-[#1EC7A0]",
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-700",
    buttonBg: "bg-[#099877] hover:bg-[#077F63]",
    ringHover: "hover:border-emerald-200/90",
  },
  rose: {
    gradient: "from-[#E11D74] via-[#F43F8E] to-[#FB7185]",
    avatarBg: "bg-rose-100",
    avatarText: "text-rose-700",
    buttonBg: "bg-[#E11D74] hover:bg-[#BE125D]",
    ringHover: "hover:border-rose-200/90",
  },
  amber: {
    gradient: "from-[#D97706] via-[#F59E0B] to-[#FBBF24]",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-700",
    buttonBg: "bg-[#D97706] hover:bg-[#B45309]",
    ringHover: "hover:border-amber-200/90",
  },
};

function resolveTheme(color?: string): ThemeStyle {
  switch (color) {
    case "blue":
      return THEME_STYLES.blue;
    case "teal":
    case "green":
    case "emerald":
      return THEME_STYLES.emerald;
    case "pink":
    case "rose":
      return THEME_STYLES.rose;
    case "amber":
      return THEME_STYLES.amber;
    case "purple":
      return THEME_STYLES.purple;
    default:
      return THEME_STYLES.violet;
  }
}

function getTeacherInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "GV"
  );
}

function formatDueDate(dueDate: string) {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return dueDate;
  return date.toLocaleString("vi-VN");
}

type ClassMembersPayload = {
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
  teachers: Array<{
    id: string;
    name: string;
    avatar: string;
    avatarUrl?: string;
    phone: string;
    email: string;
  }>;
  otherClasses: Array<{ name: string; code: string; grade: string }>;
};

interface EnrichedClassCard {
  classroom: Classroom;
  theme: ThemeStyle;
  teacherName: string;
  teacherInitials: string;
  description: string;
  currentClassCode: string;
  currentSchoolCode: string;
  totalMembers: number;
  assignments: Assignment[];
  pendingCount: number;
  matchesPrimaryRoster: boolean;
}

async function loadStudentClassroomData() {
  return Promise.all([
    smartLotusApi.getClassrooms(),
    smartLotusApi.getAssignments(),
    smartLotusApi.getStudentCode(),
    smartLotusApi.getClassroomInvitations(),
  ]);
}

export default function StudentClassrooms({
  onStartAssignment,
}: {
  onStartAssignment: (assignment: Assignment) => void;
}) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invitations, setInvitations] = useState<ClassroomInvitation[]>([]);
  const [studentCode, setStudentCode] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "hasAssignments">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailClassId, setDetailClassId] = useState<string | null>(null);
  const [classMembers, setClassMembers] = useState<ClassMembersPayload | null>(null);

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
    void loadStudentClassroomData()
      .then(([classData, assignmentData, codeData, inviteData]) => {
        if (!active) return;
        setClassrooms(classData.classrooms);
        setAssignments(assignmentData.assignments);
        setStudentCode(codeData.studentCode);
        setInvitations(inviteData.invitations);
        void smartLotusApi
          .getClassMembers()
          .then((res) => {
            if (active) setClassMembers(res);
          })
          .catch(() => undefined);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Không thể tải lớp học và bài tập");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function joinClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!joinCode.trim()) {
      setError("Nhập mã lớp do giáo viên chia sẻ.");
      return;
    }
    setJoining(true);
    setError("");
    setNotice("");
    try {
      await smartLotusApi.joinClassroom(joinCode.trim());
      setJoinCode("");
      setLoading(true);
      await refresh();
      setNotice("Đã tham gia lớp học mới thành công.");
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
    if (!studentCode) return;
    try {
      await navigator.clipboard.writeText(studentCode);
      setCopiedId(true);
      setNotice("Đã sao chép mã ID. Hãy gửi mã này cho giáo viên.");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setError("Không thể sao chép tự động. Hãy chọn và sao chép mã ID hiển thị.");
    }
  }

  const enrichedClasses = useMemo<EnrichedClassCard[]>(() => {
    const assignmentsByClass = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      const group = assignmentsByClass.get(assignment.classroomId ?? "") ?? [];
      group.push(assignment);
      assignmentsByClass.set(assignment.classroomId ?? "", group);
    }

    return classrooms.map((classroom) => {
      const matchesPrimaryRoster = Boolean(
        classMembers &&
          ((classroom.classCode && classroom.classCode === classMembers.classInfo?.code) ||
            classroom.label === classMembers.classInfo?.name ||
            classroom.name === `Lớp ${classMembers.classInfo?.name}`)
      );
      const currentSchoolCode =
        classroom.schoolCode || (matchesPrimaryRoster ? classMembers?.classInfo?.schoolCode : "") || "";
      const currentClassCode =
        classroom.classCode || classroom.joinCode || (matchesPrimaryRoster ? classMembers?.classInfo?.code : "") || "";
      const totalMembers = matchesPrimaryRoster
        ? classMembers?.students?.length ?? classroom.studentCount ?? 0
        : classroom.studentCount ?? 0;
      const classAssignments = assignmentsByClass.get(classroom.id) ?? [];
      const pendingCount = classAssignments.filter((item) => !item.submission).length;
      const teacherName = classroom.teacherName || "Giáo viên bộ môn";

      return {
        classroom,
        theme: resolveTheme(classroom.color),
        teacherName,
        teacherInitials: getTeacherInitials(teacherName),
        description:
          classroom.description?.trim() || "Lớp học đồng hành cùng chương trình Toán tư duy Smart Lotus.",
        currentClassCode,
        currentSchoolCode,
        totalMembers,
        assignments: classAssignments,
        pendingCount,
        matchesPrimaryRoster,
      };
    });
  }, [assignments, classMembers, classrooms]);

  const totalPendingAssignments = useMemo(
    () => enrichedClasses.reduce((sum, item) => sum + item.pendingCount, 0),
    [enrichedClasses]
  );

  const classesWithAssignmentsCount = useMemo(
    () => enrichedClasses.filter((item) => item.assignments.length > 0).length,
    [enrichedClasses]
  );

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedClasses.filter((item) => {
      if (filterMode === "hasAssignments" && item.assignments.length === 0) {
        return false;
      }
      if (!q) return true;
      return (
        item.classroom.name.toLowerCase().includes(q) ||
        item.teacherName.toLowerCase().includes(q) ||
        (item.classroom.subject || "").toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.currentClassCode.toLowerCase().includes(q)
      );
    });
  }, [enrichedClasses, filterMode, searchQuery]);

  const detailCard = useMemo(
    () => enrichedClasses.find((item) => item.classroom.id === detailClassId) ?? null,
    [detailClassId, enrichedClasses]
  );

  return (
    <div className="space-y-5">
      {/* Header Banner Card */}
      <section className="relative rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] px-6 py-6 overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gradient-to-br from-violet-100/70 to-pink-100/40 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-violet-700">
              <Icon name="school" size={16} />
              <span>Lớp học của tôi</span>
            </div>
            <h1 className="mt-1.5 text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
              Lớp học
            </h1>
            <p className="mt-1 text-[13.5px] text-slate-500">
              Tham gia lớp bằng mã giáo viên chia sẻ và làm các bài tập được giao.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl bg-violet-50/80 border border-violet-100 px-4 py-2.5 text-center">
              <div className="text-[11px] font-semibold text-violet-600">Đang theo học</div>
              <div className="text-lg font-extrabold text-violet-900">{classrooms.length} lớp</div>
            </div>
            <div className="rounded-2xl bg-amber-50/80 border border-amber-100 px-4 py-2.5 text-center">
              <div className="text-[11px] font-semibold text-amber-600">Bài cần làm</div>
              <div className="text-lg font-extrabold text-amber-900">{totalPendingAssignments} bài</div>
            </div>
          </div>
        </div>
      </section>

      {/* Invitations */}
      {invitations.map((invitation) => (
        <section
          className="rounded-3xl border border-violet-200 bg-gradient-to-r from-white to-violet-50/70 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
          key={invitation.id}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Icon name="bell" size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-violet-600">
                Lời mời vào lớp
              </div>
              <div className="text-sm font-bold text-slate-800">
                {invitation.teacherName} mời bạn vào {invitation.classroomName} ({invitation.classroomLabel})
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Môn {invitation.subject}. Chấp nhận để xem lớp và các bài tập được giao.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50"
              onClick={() => void respondToInvite(invitation, "declined")}
            >
              Từ chối
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs"
              onClick={() => void respondToInvite(invitation, "accepted")}
            >
              Chấp nhận
            </button>
          </div>
        </section>
      ))}

      {/* Student ID & Join Class Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.04)] px-6 py-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Mã ID học sinh
            </div>
            <div className="mt-1 text-[18px] font-extrabold tracking-wide text-slate-900 font-mono truncate">
              {studentCode || "Đang tải mã..."}
            </div>
            <div className="mt-0.5 text-[12px] text-slate-400">
              Chia sẻ mã này với giáo viên để được mời vào lớp.
            </div>
          </div>
          <button
            type="button"
            disabled={!studentCode}
            onClick={() => void copyStudentCode()}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border text-[13px] font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 ${
              copiedId
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            {copiedId ? (
              <>
                <Icon name="check" size={16} />
                <span>Đã sao chép</span>
              </>
            ) : (
              <>
                <Icon name="copy" size={16} className="text-slate-400" />
                <span>Sao chép mã</span>
              </>
            )}
          </button>
        </div>

        <form
          onSubmit={(event) => void joinClass(event)}
          className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.04)] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
        >
          <div className="shrink-0">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Tham gia lớp
            </div>
            <div className="mt-0.5 text-[16px] font-bold text-slate-900">Nhập mã lớp</div>
            {error ? (
              <div className="text-[11.5px] text-rose-500 font-medium mt-0.5" role="alert">
                {error}
              </div>
            ) : notice ? (
              <div className="text-[11.5px] text-emerald-600 font-medium mt-0.5" role="status">
                {notice}
              </div>
            ) : (
              <div className="text-[11.5px] text-slate-400 mt-0.5">Nhập mã do giáo viên cung cấp</div>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-1 sm:max-w-md justify-end">
            <label className="w-full">
              <span className="sr-only">Mã lớp</span>
              <input
                type="text"
                value={joinCode}
                onChange={(event) => {
                  setJoinCode(event.target.value.toUpperCase());
                  if (error) setError("");
                }}
                maxLength={12}
                placeholder="VD: A1B2C3D4E5"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none text-[13.5px] font-medium text-slate-800 placeholder:text-slate-400 uppercase transition-all"
              />
            </label>
            <button
              type="submit"
              disabled={joining}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#7340FF] to-[#8C4DFF] hover:from-[#622FF0] hover:to-[#7B3DF2] text-white text-[13.5px] font-bold shadow-sm hover:shadow transition-all shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Icon name="plus" size={16} />
              <span>{joining ? "Đang tham gia..." : "Tham gia lớp"}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Toolbar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            Tất cả lớp ({enrichedClasses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("hasAssignments")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
              filterMode === "hasAssignments"
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            <Icon name="sparkles" size={14} />
            <span>Có bài tập ({classesWithAssignmentsCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Icon
              name="search"
              size={16}
              className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm lớp học, giáo viên..."
              className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none text-[13px] text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="inline-flex items-center p-1 rounded-2xl bg-white border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Hiển thị dạng thẻ lưới"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-violet-100 text-violet-700"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Icon name="grid" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="Hiển thị dạng danh sách"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-violet-100 text-violet-700"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Icon name="list" size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Class Cards Grid / List */}
      {loading ? (
        <div className="rounded-3xl bg-white border border-slate-200/80 p-10 text-center text-sm text-slate-500">
          Đang tải lớp học...
        </div>
      ) : enrichedClasses.length === 0 ? (
        <div className="rounded-3xl bg-white border border-dashed border-slate-200 p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3">
            <Icon name="school" size={22} />
          </div>
          <div className="text-base font-bold text-slate-800">Bạn chưa tham gia lớp nào</div>
          <p className="text-sm text-slate-400 mt-1">
            Nhập mã lớp mà giáo viên gửi để xem lớp và bài tập.
          </p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="rounded-3xl bg-white border border-dashed border-slate-200 p-12 text-center">
          <div className="text-base font-bold text-slate-700">Không tìm thấy lớp học phù hợp</div>
          <p className="text-sm text-slate-400 mt-1">Thử xóa bộ lọc hoặc nhập từ khóa khác nhé.</p>
          <button
            type="button"
            onClick={() => {
              setFilterMode("all");
              setSearchQuery("");
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100"
          >
            Xem tất cả lớp học
          </button>
        </div>
      ) : (
        <section
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 items-stretch"
              : "flex flex-col gap-4"
          }
        >
          {filteredClasses.map((item) => {
            const {
              classroom,
              theme,
              teacherName,
              teacherInitials,
              description,
              currentClassCode,
              totalMembers,
              assignments: classAssignments,
              pendingCount,
            } = item;
            const totalCount = classAssignments.length;

            if (viewMode === "list") {
              return (
                <article
                  key={classroom.id}
                  className={`group rounded-3xl bg-white border border-slate-200/80 ${theme.ringHover} shadow-[0_2px_14px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_28px_-8px_rgba(91,61,245,0.14)] transition-all duration-300 overflow-hidden flex flex-col md:flex-row`}
                >
                  {/* Left Colored Banner */}
                  <div
                    onClick={() => setDetailClassId(classroom.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setDetailClassId(classroom.id);
                    }}
                    className={`relative cursor-pointer md:w-72 shrink-0 bg-gradient-to-br ${theme.gradient} p-5 text-white flex flex-col justify-between overflow-hidden`}
                  >
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                    <div className="absolute -right-3 bottom-0 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11.5px] font-semibold">
                        <Icon name="book" size={14} />
                        {classroom.subject || "Toán"}
                      </span>
                      {currentClassCode && (
                        <span className="text-[11px] font-medium text-white/90 bg-black/15 px-2 py-0.5 rounded-full">
                          {currentClassCode}
                        </span>
                      )}
                    </div>

                    <div className="relative z-10 mt-5">
                      <h3 className="text-lg font-extrabold leading-snug tracking-tight group-hover:underline decoration-white/60 underline-offset-4">
                        {classroom.name}
                      </h3>
                      {totalMembers > 0 && (
                        <div className="mt-2 flex items-center gap-3 text-[11.5px] text-white/85 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <Icon name="users" size={14} />
                            {totalMembers} học sinh
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Info */}
                  <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl ${theme.avatarBg} ${theme.avatarText} font-bold text-xs flex items-center justify-center shrink-0`}
                        >
                          {teacherInitials}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Giáo viên phụ trách
                          </div>
                          <div className="text-sm font-bold text-slate-800">{teacherName}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDetailClassId(classroom.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors cursor-pointer"
                      >
                        <Icon name="eye" size={14} />
                        Chi tiết lớp
                      </button>
                    </div>

                    <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2 bg-slate-50/80 rounded-2xl px-3.5 py-2.5 border border-slate-100">
                      {description}
                    </p>
                  </div>

                  {/* Right Assignments */}
                  <div className="md:w-[340px] shrink-0 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/40 p-5 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Icon name="target" size={15} className="text-violet-600" />
                        Bài tập được giao
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          pendingCount > 0
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-200/70 text-slate-500"
                        }`}
                      >
                        {totalCount} bài
                      </span>
                    </div>

                    {totalCount > 0 ? (
                      <div className="space-y-2">
                        {classAssignments.map((assign) => (
                          <div
                            key={assign.id}
                            className="flex items-center justify-between gap-2.5 rounded-2xl bg-white border border-slate-200/80 p-2.5 shadow-2xs"
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-bold text-slate-800 truncate">
                                {assign.title}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {assign.topic || "Bài tập"} · Hạn {formatDueDate(assign.dueDate)}
                              </div>
                            </div>
                            {assign.submission ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold shrink-0">
                                <Icon name="check" size={14} />
                                Đã nộp
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!assign.questions?.length}
                                onClick={() => onStartAssignment(assign)}
                                className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold ${theme.buttonBg} shadow-sm transition-all shrink-0 cursor-pointer disabled:opacity-50`}
                              >
                                Làm bài
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 py-4 px-3 text-center text-xs text-slate-400">
                        ✨ Chưa có bài tập nào được giao.
                      </div>
                    )}
                  </div>
                </article>
              );
            }

            return (
              <article
                key={classroom.id}
                className={`group flex flex-col h-full rounded-3xl bg-white border border-slate-200/85 ${theme.ringHover} shadow-[0_4px_20px_-6px_rgba(15,23,42,0.07)] hover:shadow-[0_18px_36px_-10px_rgba(91,61,245,0.18)] hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
              >
                {/* Top Gradient Banner */}
                <div
                  onClick={() => setDetailClassId(classroom.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setDetailClassId(classroom.id);
                  }}
                  className={`relative cursor-pointer bg-gradient-to-br ${theme.gradient} px-5 pt-4 pb-5 text-white overflow-hidden select-none`}
                >
                  <div className="absolute -right-7 -top-8 w-32 h-32 rounded-full bg-white/12 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute right-6 -bottom-10 w-24 h-24 rounded-full bg-white/10 pointer-events-none transition-transform duration-500 group-hover:translate-x-1" />
                  <div
                    className="absolute inset-0 opacity-[0.07] pointer-events-none"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 20% 25%, white 1px, transparent 1px), radial-gradient(circle at 80% 75%, white 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />

                  {/* Top Badges Row */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[11.5px] font-semibold tracking-wide">
                      <Icon name="book" size={14} />
                      {classroom.subject || "Toán"}
                    </span>

                    {pendingCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-violet-700 text-[11px] font-bold shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        {pendingCount} bài cần làm
                      </span>
                    ) : totalMembers > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/15 text-white/90 text-[11px] font-medium">
                        <Icon name="users" size={12} />
                        {totalMembers} HS
                      </span>
                    ) : currentClassCode ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/15 text-white/90 text-[11px] font-medium font-mono">
                        {currentClassCode}
                      </span>
                    ) : null}
                  </div>

                  {/* Title area with consistent vertical rhythm */}
                  <div className="relative z-10 mt-4 min-h-[48px] flex items-end justify-between gap-2">
                    <h3 className="text-[17.5px] font-extrabold leading-snug tracking-tight line-clamp-2 drop-shadow-2xs">
                      {classroom.name}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex-1 flex flex-col p-5">
                  {/* Teacher Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl ${theme.avatarBg} ${theme.avatarText} text-xs font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white shadow-xs`}
                      >
                        {teacherInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold tracking-[0.06em] uppercase text-slate-400">
                          Giáo viên
                        </div>
                        <div className="text-[14px] font-bold text-slate-800 truncate">
                          {teacherName}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailClassId(classroom.id)}
                      title="Xem chi tiết lớp"
                      className="w-8 h-8 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    >
                      <Icon name="eye" size={16} />
                    </button>
                  </div>

                  {/* Editorial Description */}
                  <div className="mt-3.5">
                    <p className="text-[13px] leading-relaxed text-slate-500 line-clamp-2 min-h-[40px]">
                      {description}
                    </p>
                  </div>

                  {/* Divider + Assignments anchored cleanly at bottom */}
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-slate-700">
                        <Icon name="target" size={16} className="text-violet-600" />
                        Bài tập được giao
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          pendingCount > 0
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {totalCount} bài
                      </span>
                    </div>

                    {totalCount > 0 ? (
                      <div className="space-y-2.5">
                        {classAssignments.map((assign) => (
                          <div
                            key={assign.id}
                            className="group/item rounded-2xl bg-slate-50/90 hover:bg-violet-50/60 border border-slate-200/75 hover:border-violet-200/90 p-3 flex items-center justify-between gap-2.5 transition-all"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    assign.submission ? "bg-emerald-500" : "bg-violet-500"
                                  }`}
                                />
                                <span className="text-[13.5px] font-bold text-slate-800 truncate">
                                  {assign.title}
                                </span>
                                {assign.isAdaptive && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold shrink-0">
                                    AI
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 pl-3.5">
                                <span className="font-semibold text-slate-600 shrink-0">
                                  {assign.topic || "Bài tập"}
                                </span>
                                <span>·</span>
                                <Icon name="clock" size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">{formatDueDate(assign.dueDate)}</span>
                              </div>
                              {assign.submission && (
                                <div className="mt-1 pl-3.5 text-[11px] font-semibold text-emerald-700">
                                  Đúng {assign.submission.correctAnswers}/{assign.submission.totalQuestions} câu
                                </div>
                              )}
                            </div>

                            {assign.submission ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100/80 text-emerald-700 text-[11.5px] font-bold shrink-0">
                                <Icon name="check" size={14} />
                                Đã nộp
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!assign.questions?.length}
                                onClick={() => onStartAssignment(assign)}
                                className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-white text-[12px] font-bold ${theme.buttonBg} shadow-sm hover:shadow transition-all shrink-0 cursor-pointer disabled:opacity-50`}
                              >
                                <span>Làm bài</span>
                                <Icon
                                  name="arrow"
                                  size={14}
                                  className="transition-transform group-hover/item:translate-x-0.5"
                                />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-slate-50/75 border border-dashed border-slate-200/90 py-4 px-3 flex flex-col items-center justify-center text-center gap-1 min-h-[82px]">
                        <div className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-400">
                          <Icon name="sparkles" size={14} className="text-amber-400" />
                          <span>Chưa có bài tập nào được giao.</span>
                        </div>
                        <span className="text-[11px] text-slate-400/80">
                          Thầy cô sẽ cập nhật sớm nhé!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Class Detail Modal */}
      {detailCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs"
          onClick={() => setDetailClassId(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`relative bg-gradient-to-br ${detailCard.theme.gradient} p-6 text-white`}>
              <button
                type="button"
                onClick={() => setDetailClassId(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <Icon name="close" size={16} />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                <Icon name="book" size={14} />
                {detailCard.classroom.subject || "Toán"}
              </div>
              <h3 className="mt-3 text-xl font-extrabold leading-snug pr-8">
                {detailCard.classroom.name}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/85 font-medium">
                {detailCard.totalMembers > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="users" size={14} />
                    {detailCard.totalMembers} học sinh
                  </span>
                )}
                {detailCard.currentClassCode && (
                  <span>Mã lớp: {detailCard.currentClassCode}</span>
                )}
                {detailCard.currentSchoolCode && (
                  <span>Mã trường: {detailCard.currentSchoolCode}</span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl ${detailCard.theme.avatarBg} ${detailCard.theme.avatarText} font-extrabold text-sm flex items-center justify-center`}
                >
                  {detailCard.teacherInitials}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Giáo viên giảng dạy
                  </div>
                  <div className="text-base font-bold text-slate-800">{detailCard.teacherName}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mô tả lớp học
                </div>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  {detailCard.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Danh sách bài tập ({detailCard.assignments.length})
                  </span>
                </div>
                {detailCard.assignments.length > 0 ? (
                  <div className="space-y-2">
                    {detailCard.assignments.map((assign) => (
                      <div
                        key={assign.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 p-3 bg-slate-50/60"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">{assign.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{assign.topic || "Bài tập"}</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Icon name="clock" size={13} />
                              {formatDueDate(assign.dueDate)}
                            </span>
                          </div>
                        </div>
                        {assign.submission ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">
                            <Icon name="check" size={14} />
                            Đã nộp
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!assign.questions?.length}
                            onClick={() => {
                              setDetailClassId(null);
                              onStartAssignment(assign);
                            }}
                            className={`px-4 py-2 rounded-xl text-white text-xs font-bold ${detailCard.theme.buttonBg} shrink-0 cursor-pointer disabled:opacity-50`}
                          >
                            Làm bài
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    ✨ Lớp học này hiện chưa có bài tập nào được giao.
                  </div>
                )}
              </div>

              {detailCard.matchesPrimaryRoster &&
                classMembers &&
                classMembers.students &&
                classMembers.students.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Bạn cùng lớp ({classMembers.students.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {classMembers.students.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/75 bg-slate-50/70 px-3 py-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                              {st.avatar || "HS"}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{st.name}</div>
                              <div className="text-[10.5px] text-slate-400 font-mono">
                                {st.studentCode || `HS-${st.id}`}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-amber-600 shrink-0">
                            🌸 {st.lotusPoints || 0} điểm
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
