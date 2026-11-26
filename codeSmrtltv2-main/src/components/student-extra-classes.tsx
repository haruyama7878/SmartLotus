"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icons";
import { smartLotusApi, type ExtraClassTeacher, type ExtraClassroom } from "@/lib/api";

type FilterTab = "all" | "joined" | "toan" | "tieng-viet" | "tieng-anh" | "stem";

const AVATAR_GRADIENTS = [
  "from-violet-600 to-indigo-600",
  "from-purple-600 to-fuchsia-600",
  "from-blue-600 to-cyan-600",
  "from-emerald-600 to-teal-600",
  "from-rose-600 to-pink-600",
  "from-amber-500 to-orange-600",
];

function avatarGradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "GV"
  );
}

function getSubjectBadgeStyle(subject: string) {
  const normalized = subject.toLowerCase();
  if (normalized.includes("nâng cao")) return "bg-indigo-100 text-indigo-800 border-indigo-200";
  if (normalized.includes("tư duy")) return "bg-purple-100 text-purple-800 border-purple-200";
  if (normalized.includes("toán")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (normalized.includes("tiếng việt") || normalized.includes("văn")) {
    return "bg-rose-100 text-rose-800 border-rose-200";
  }
  if (normalized.includes("anh") || normalized.includes("english")) {
    return "bg-sky-100 text-sky-800 border-sky-200";
  }
  if (normalized.includes("stem") || normalized.includes("robot") || normalized.includes("khoa")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function getBannerGradientForColor(color?: string) {
  switch (color) {
    case "blue":
      return "from-blue-600 via-blue-700 to-indigo-700";
    case "teal":
    case "green":
      return "from-emerald-600 via-teal-600 to-emerald-700";
    case "pink":
      return "from-rose-600 via-pink-600 to-fuchsia-700";
    case "amber":
      return "from-amber-500 via-orange-500 to-amber-600";
    default:
      return "from-violet-700 via-purple-700 to-indigo-800";
  }
}

export default function StudentExtraClasses({ onToast }: { onToast: (msg: string) => void }) {
  const [teachers, setTeachers] = useState<ExtraClassTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [requestingClassId, setRequestingClassId] = useState<string | null>(null);

  const [detailTarget, setDetailTarget] = useState<{
    teacher: ExtraClassTeacher;
    cls: ExtraClassroom;
  } | null>(null);
  const [teacherProfileTarget, setTeacherProfileTarget] = useState<ExtraClassTeacher | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  async function refreshExtraClasses() {
    const data = await smartLotusApi.getExtraClasses();
    setTeachers(data.teachers);
    setError("");
  }

  useEffect(() => {
    let active = true;
    void smartLotusApi
      .getExtraClasses()
      .then((data) => {
        if (!active) return;
        setTeachers(data.teachers);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải danh sách lớp học thêm");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleRequestJoin(teacherName: string, classroomId: string, classroomName: string) {
    setRequestingClassId(classroomId);
    try {
      const res = await smartLotusApi.requestToJoinExtraClass(classroomId);
      onToast(res.message || `Đã gửi yêu cầu vào lớp ${classroomName} của ${teacherName}!`);
      setTeachers((curr) =>
        curr.map((t) => ({
          ...t,
          classrooms: t.classrooms.map((c) =>
            c.id === classroomId ? { ...c, requestStatus: "pending" as const } : c
          ),
        }))
      );
      setDetailTarget((curr) =>
        curr && curr.cls.id === classroomId
          ? { ...curr, cls: { ...curr.cls, requestStatus: "pending" } }
          : curr
      );
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Không thể gửi yêu cầu xin vào lớp");
    } finally {
      setRequestingClassId(null);
    }
  }

  async function handleJoinByCode(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = inviteCode.trim().toUpperCase();
    if (!cleaned) {
      setCodeError("Vui lòng nhập mã lớp do thầy cô cung cấp.");
      return;
    }
    setJoiningByCode(true);
    setCodeError("");
    try {
      const res = await smartLotusApi.joinClassroom(cleaned);
      setInviteCode("");
      setIsCodeModalOpen(false);
      onToast(`Đã tham gia lớp ${res.classroom.name} thành công!`);
      await refreshExtraClasses();
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : "Không tìm thấy mã lớp hợp lệ");
    } finally {
      setJoiningByCode(false);
    }
  }

  const schoolsList = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      const school = t.school?.trim();
      if (school) set.add(school);
    });
    return Array.from(set);
  }, [teachers]);

  const totalClassesCount = useMemo(
    () => teachers.reduce((sum, t) => sum + t.classrooms.length, 0),
    [teachers]
  );

  const joinedClassesCount = useMemo(
    () =>
      teachers.reduce(
        (sum, t) => sum + t.classrooms.filter((c) => c.membershipStatus === "joined").length,
        0
      ),
    [teachers]
  );

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teachers
      .map((teacher) => {
        const schoolMatches = selectedSchool === "all" || (teacher.school || "").trim() === selectedSchool;
        if (!schoolMatches) {
          return { ...teacher, classrooms: [] as ExtraClassroom[], include: false };
        }

        const matchingClasses = teacher.classrooms.filter((cls) => {
          if (activeFilter === "joined" && cls.membershipStatus !== "joined") return false;
          const subj = cls.subject.toLowerCase();
          if (activeFilter === "toan" && !subj.includes("toán")) return false;
          if (activeFilter === "tieng-viet" && !subj.includes("tiếng việt") && !subj.includes("văn")) {
            return false;
          }
          if (activeFilter === "tieng-anh" && !subj.includes("anh") && !subj.includes("english")) {
            return false;
          }
          if (
            activeFilter === "stem" &&
            !subj.includes("stem") &&
            !subj.includes("robot") &&
            !subj.includes("khoa")
          ) {
            return false;
          }

          if (!query) return true;
          return (
            cls.name.toLowerCase().includes(query) ||
            cls.label.toLowerCase().includes(query) ||
            cls.subject.toLowerCase().includes(query) ||
            (cls.description || "").toLowerCase().includes(query) ||
            teacher.displayName.toLowerCase().includes(query) ||
            teacher.email.toLowerCase().includes(query) ||
            (teacher.school || "").toLowerCase().includes(query)
          );
        });

        const teacherTextMatch =
          !query ||
          teacher.displayName.toLowerCase().includes(query) ||
          teacher.email.toLowerCase().includes(query) ||
          (teacher.school || "").toLowerCase().includes(query);

        const include =
          matchingClasses.length > 0 ||
          (teacher.classrooms.length === 0 && teacherTextMatch && activeFilter === "all");

        return {
          ...teacher,
          classrooms: matchingClasses,
          include,
        };
      })
      .filter((t) => t.include);
  }, [activeFilter, search, selectedSchool, teachers]);

  const totalResultsCount = useMemo(
    () => filteredTeachers.reduce((sum, t) => sum + t.classrooms.length, 0),
    [filteredTeachers]
  );

  const filterPills: Array<{ id: FilterTab; label: string; icon: "sparkles" | "check" | "target" | "book" }> = [
    { id: "all", label: "Tất cả lớp", icon: "sparkles" },
    { id: "joined", label: "Lớp của tôi", icon: "check" },
    { id: "toan", label: "Toán tư duy & Nâng cao", icon: "target" },
    { id: "tieng-viet", label: "Tiếng Việt & Chữ đẹp", icon: "book" },
    { id: "tieng-anh", label: "Tiếng Anh", icon: "book" },
    { id: "stem", label: "STEM & Khoa học", icon: "sparkles" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-lg shadow-violet-200/50">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-40 -bottom-16 h-60 w-60 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="pointer-events-none absolute left-1/3 top-0 h-40 w-40 rounded-full bg-amber-400/10 blur-xl" />

        <div className="pointer-events-none absolute right-6 bottom-4 opacity-10 hidden sm:block">
          <svg width="170" height="170" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C9 7 4 9 4 14a8 8 0 0 0 16 0c0-5-5-7-8-12z" />
            <path d="M12 22a8 8 0 0 1-8-8c0-3.5 2-6 5-8" />
            <path d="M12 22a8 8 0 0 0 8-8c0-3.5-2-6-5-8" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 text-violet-100 shadow-xs">
              <Icon name="sparkles" size={14} className="text-amber-300" />
              <span>KHÁM PHÁ LỚP HỌC THÊM</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-xs">
              Lớp học thêm &amp; Thầy cô giáo
            </h1>

            <p className="text-sm sm:text-base text-violet-100/90 leading-relaxed max-w-2xl font-normal">
              Tìm kiếm giáo viên trong trường, xem danh sách các lớp học thêm bồi dưỡng tư duy và gửi yêu cầu xin tham gia lớp để nhận bài tập đặc biệt!
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-semibold">
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-xs border border-white/15">
                <Icon name="book" size={15} className="text-emerald-300" />
                <span>{totalClassesCount} lớp đang mở</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-xs border border-white/15">
                <Icon name="users" size={15} className="text-sky-300" />
                <span>{teachers.length} thầy cô đồng hành</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveFilter((prev) => (prev === "joined" ? "all" : "joined"))}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400/20 px-3 py-1.5 backdrop-blur-xs border border-amber-300/30 text-amber-200 hover:bg-amber-400/30 transition-colors cursor-pointer"
              >
                <Icon name="trophy" size={15} className="text-amber-300" />
                <span>{joinedClassesCount} lớp bạn đã tham gia</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 lg:flex-col lg:items-end">
            <button
              type="button"
              onClick={() => {
                setCodeError("");
                setIsCodeModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-md transition-all hover:bg-violet-50 hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <Icon name="key" size={16} className="text-violet-600" />
              <span>Nhập mã mời lớp học</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHowItWorksOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md border border-white/20 transition-all hover:bg-white/25 active:scale-95 cursor-pointer"
            >
              <Icon name="help" size={15} className="text-violet-200" />
              <span>Hướng dẫn xin vào lớp</span>
            </button>
          </div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-violet-500">
              <Icon name="search" size={18} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên thầy cô, tên lớp học, môn học hoặc trường..."
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-3.5 pl-11 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {schoolsList.length > 0 && (
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                aria-label="Lọc theo trường"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 pr-8 text-xs font-semibold text-slate-700 shadow-sm transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
              >
                <option value="all">Tất cả các trường</option>
                {schoolsList.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            )}

            <div className="hidden sm:flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-violet-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Lưới
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "compact"
                    ? "bg-violet-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Thu gọn
              </button>
            </div>
          </div>
        </div>

        {/* Filter pills row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filterPills.map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveFilter(pill.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-2xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-violet-700 text-white shadow-sm shadow-violet-200 ring-2 ring-violet-700/20"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-violet-50/50 hover:text-violet-700 hover:border-violet-200"
                }`}
              >
                <Icon
                  name={pill.icon}
                  size={14}
                  className={isActive ? "text-white" : "text-violet-500"}
                />
                <span>{pill.label}</span>
              </button>
            );
          })}

          <div className="ml-auto hidden text-xs font-medium text-slate-400 md:block shrink-0 pl-2">
            Tìm thấy <span className="font-bold text-violet-700">{totalResultsCount}</span> lớp học
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700" role="alert">
          {error}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white px-6 py-14 text-center text-slate-500">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <Icon name="sparkles" size={22} />
          </div>
          <p className="text-sm font-semibold">Đang tải danh sách giáo viên &amp; lớp học thêm...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-500 mb-4">
            <Icon name="school" size={30} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {search || activeFilter !== "all" || selectedSchool !== "all"
              ? "Không tìm thấy lớp học hoặc thầy cô phù hợp"
              : "Chưa có giáo viên nào mở lớp"}
          </h3>
          <p className="max-w-md text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed">
            {search || activeFilter !== "all" || selectedSchool !== "all"
              ? "Hãy thử xóa bớt bộ lọc tìm kiếm hoặc gõ tên thầy cô khác nhé!"
              : "Danh sách giáo viên đăng ký tài khoản trên hệ thống sẽ xuất hiện tại đây."}
          </p>
          {(search || activeFilter !== "all" || selectedSchool !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveFilter("all");
                setSelectedSchool("all");
              }}
              className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700 active:scale-95 transition-all cursor-pointer"
            >
              <span>Đặt lại tất cả bộ lọc</span>
              <Icon name="arrow" size={15} />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTeachers.map((teacher) => {
            const avatarGradient = avatarGradientFor(teacher.id);
            const openClassesCount = teacher.classrooms.length;

            return (
              <section
                key={teacher.id}
                className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all hover:border-slate-300"
              >
                {/* Teacher Profile Header */}
                <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 via-purple-50/20 to-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="relative shrink-0">
                      {teacher.avatarUrl ? (
                        <img
                          src={teacher.avatarUrl}
                          alt={teacher.displayName}
                          className="h-14 w-14 rounded-2xl object-cover ring-2 ring-violet-200 shadow-sm"
                        />
                      ) : (
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient} text-lg font-black text-white shadow-md ring-2 ring-violet-200`}
                        >
                          {teacher.avatar || getInitials(teacher.displayName)}
                        </div>
                      )}
                      <span
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-white"
                        title="Giáo viên Smart Lotus"
                      >
                        <Icon name="check" size={11} />
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTeacherProfileTarget(teacher)}
                          className="text-lg font-bold text-slate-900 hover:text-violet-700 transition-colors text-left cursor-pointer"
                        >
                          {teacher.displayName}
                        </button>

                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200/60">
                          <Icon name="sparkles" size={12} className="text-violet-500" />
                          Giáo viên Smart Lotus
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 hover:text-slate-700">
                          <Icon name="mail" size={14} className="text-slate-400 shrink-0" />
                          <span>{teacher.email}</span>
                        </span>

                        {teacher.school && (
                          <>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <span className="flex items-center gap-1 hover:text-slate-700">
                              <Icon name="school" size={14} className="text-slate-400 shrink-0" />
                              <span>{teacher.school}</span>
                            </span>
                          </>
                        )}

                        {teacher.province && (
                          <>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <span className="flex items-center gap-1 hover:text-slate-700">
                              <Icon name="mapPin" size={14} className="text-slate-400 shrink-0" />
                              <span>{teacher.province}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0">
                    <div className="rounded-2xl bg-white border border-slate-200/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                      <span className="text-violet-700 font-extrabold mr-1">{openClassesCount}</span>
                      <span>lớp đang mở</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTeacherProfileTarget(teacher)}
                      className="flex items-center gap-1 rounded-2xl border border-violet-200 bg-violet-50/60 hover:bg-violet-100 px-3.5 py-1.5 text-xs font-bold text-violet-700 transition-colors cursor-pointer"
                    >
                      <span>Xem hồ sơ</span>
                      <Icon name="arrow" size={14} />
                    </button>
                  </div>
                </div>

                {/* Class list or Empty state */}
                <div className="p-5 sm:p-6 bg-slate-50/40">
                  {openClassesCount > 0 ? (
                    <div
                      className={`grid gap-4 sm:gap-5 ${
                        viewMode === "compact"
                          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      }`}
                    >
                      {teacher.classrooms.map((cls) => {
                        const isJoined = cls.membershipStatus === "joined";
                        const isPending = cls.requestStatus === "pending";
                        const isDeclined = cls.requestStatus === "declined";
                        const isRequesting = requestingClassId === cls.id;
                        const estimatedCapacity = Math.max(cls.studentCount + 5, 30);
                        const fillRatio = Math.min(
                          100,
                          Math.round((cls.studentCount / estimatedCapacity) * 100)
                        );

                        return (
                          <div
                            key={cls.id}
                            className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 ${
                              isJoined
                                ? "border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 via-white to-white shadow-xs hover:border-emerald-300 hover:shadow-md"
                                : isPending
                                  ? "border-amber-200 bg-amber-50/20 shadow-xs hover:shadow-md"
                                  : "border-slate-200/90 bg-white shadow-xs hover:-translate-y-1 hover:border-violet-300 hover:shadow-md"
                            } p-5`}
                          >
                            <div>
                              {/* Top meta tags */}
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold tracking-tight shadow-2xs ${getSubjectBadgeStyle(
                                      cls.subject
                                    )}`}
                                  >
                                    {cls.subject}
                                  </span>
                                  {cls.label && (
                                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200/60">
                                      Lớp {cls.label}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Title */}
                              <h3
                                onClick={() => setDetailTarget({ teacher, cls })}
                                className="text-base font-bold text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-2 cursor-pointer leading-snug mb-2"
                              >
                                {cls.name}
                              </h3>

                              {/* Description */}
                              <p
                                className={`text-xs text-slate-500 leading-relaxed mb-4 ${
                                  viewMode === "compact" ? "line-clamp-2" : "line-clamp-3"
                                }`}
                              >
                                {cls.description?.trim() ||
                                  "Lớp bồi dưỡng kiến thức và rèn luyện kỹ năng cùng giáo viên Smart Lotus."}
                              </p>

                              {/* Capacity */}
                              <div className="space-y-2 mb-4 text-xs font-medium text-slate-600">
                                <div className="pt-1">
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <Icon name="users" size={14} className="text-slate-400" />
                                      Sĩ số: <b className="text-slate-800">{cls.studentCount}</b> học sinh
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setDetailTarget({ teacher, cls })}
                                      className="font-semibold text-violet-600 hover:underline cursor-pointer"
                                    >
                                      Chi tiết
                                    </button>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isJoined ? "bg-emerald-500" : "bg-violet-500"
                                      }`}
                                      style={{ width: `${Math.max(12, fillRatio)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Footer */}
                            <div className="pt-2 border-t border-slate-100/80">
                              {isJoined ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setDetailTarget({ teacher, cls })}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100/80 hover:bg-emerald-200/80 text-emerald-800 py-2.5 px-3 text-xs font-bold transition-all shadow-xs cursor-pointer"
                                  >
                                    <Icon name="check" size={15} className="text-emerald-600" />
                                    <span>Đã tham gia lớp</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDetailTarget({ teacher, cls })}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                                    title="Xem thông tin lớp"
                                  >
                                    <Icon name="arrow" size={15} />
                                  </button>
                                </div>
                              ) : isPending ? (
                                <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 border border-amber-200">
                                  <span className="flex items-center gap-1.5">
                                    <Icon name="hourglass" size={14} className="text-amber-600" />
                                    <span>Đã gửi yêu cầu · Chờ duyệt</span>
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isRequesting}
                                  onClick={() => void handleRequestJoin(teacher.displayName, cls.id, cls.name)}
                                  className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-sm shadow-violet-200 transition-all hover:from-violet-700 hover:to-indigo-700 hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                                >
                                  <Icon name="plus" size={15} />
                                  <span>
                                    {isRequesting
                                      ? "Đang gửi..."
                                      : isDeclined
                                        ? "Gửi lại yêu cầu xin vào"
                                        : "Xin vào lớp"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 py-10 px-4 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 mb-3">
                        <Icon name="sparkles" size={22} className="text-violet-400" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 mb-1">
                        Thầy/Cô hiện tại chưa tạo lớp học nào
                      </h4>
                      <p className="max-w-md text-xs text-slate-500 leading-relaxed">
                        Danh sách lớp học mới sẽ hiển thị ngay tại đây khi Thầy/Cô mở lớp trên Smart Lotus.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Teacher Profile Modal */}
      {teacherProfileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setTeacherProfileTarget(null)}
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 z-10 max-h-[85vh] flex flex-col">
            <div className="relative bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-6 text-white shrink-0">
              <button
                type="button"
                onClick={() => setTeacherProfileTarget(null)}
                className="absolute top-4 right-4 rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <Icon name="close" size={18} />
              </button>

              <div className="flex items-center gap-4">
                {teacherProfileTarget.avatarUrl ? (
                  <img
                    src={teacherProfileTarget.avatarUrl}
                    alt={teacherProfileTarget.displayName}
                    className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/30 shadow-md"
                  />
                ) : (
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradientFor(
                      teacherProfileTarget.id
                    )} text-xl font-black text-white shadow-md ring-4 ring-white/30`}
                  >
                    {teacherProfileTarget.avatar || getInitials(teacherProfileTarget.displayName)}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white">{teacherProfileTarget.displayName}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      Giáo viên Smart Lotus
                    </span>
                    <span className="text-xs font-semibold text-violet-100">
                      {teacherProfileTarget.classrooms.length} lớp đang mở
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600">
              <div className="space-y-2 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                {teacherProfileTarget.school && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Icon name="school" size={16} className="text-violet-600 shrink-0" />
                    <span>
                      Đơn vị: <b>{teacherProfileTarget.school}</b>
                    </span>
                  </div>
                )}
                {teacherProfileTarget.province && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Icon name="mapPin" size={16} className="text-violet-600 shrink-0" />
                    <span>
                      Khu vực: <b>{teacherProfileTarget.province}</b>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-700">
                  <Icon name="mail" size={16} className="text-violet-600 shrink-0" />
                  <span>
                    Email: <b>{teacherProfileTarget.email}</b>
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Các lớp học do Thầy/Cô phụ trách ({teacherProfileTarget.classrooms.length})
                </h4>

                {teacherProfileTarget.classrooms.length > 0 ? (
                  <div className="space-y-2">
                    {teacherProfileTarget.classrooms.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          const target = teacherProfileTarget;
                          setTeacherProfileTarget(null);
                          setDetailTarget({ teacher: target, cls: c });
                        }}
                        className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-violet-300 hover:bg-violet-50/40 cursor-pointer transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md">
                              {c.subject}
                            </span>
                            <h5 className="font-bold text-slate-800 text-xs">{c.name}</h5>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            Sĩ số: {c.studentCount} học sinh
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-violet-600">Xem chi tiết →</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Thầy/Cô hiện tại chưa mở lớp mới.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-4 shrink-0">
              <button
                type="button"
                onClick={() => setTeacherProfileTarget(null)}
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setDetailTarget(null)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 z-10 max-h-[90vh] flex flex-col">
            <div
              className={`bg-gradient-to-r ${getBannerGradientForColor(
                detailTarget.cls.color
              )} p-6 text-white shrink-0`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-lg bg-white/20 backdrop-blur-xs px-2.5 py-0.5 text-xs font-bold text-white border border-white/20">
                      {detailTarget.cls.subject}
                    </span>
                    {detailTarget.cls.label && (
                      <span className="rounded-lg bg-amber-400/20 backdrop-blur-xs px-2 py-0.5 text-xs font-semibold text-amber-100 border border-amber-300/30">
                        Lớp {detailTarget.cls.label}
                      </span>
                    )}
                    {detailTarget.cls.membershipStatus === "joined" && (
                      <span className="flex items-center gap-1 rounded-lg bg-emerald-500/25 px-2.5 py-0.5 text-xs font-bold text-emerald-100 border border-emerald-300/30">
                        <Icon name="check" size={13} />
                        Đã là thành viên
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold leading-tight text-white mb-1">
                    {detailTarget.cls.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/85">
                    <span className="font-semibold text-white">
                      Giáo viên: {detailTarget.teacher.displayName}
                    </span>
                    <span>•</span>
                    <span>{detailTarget.cls.studentCount} học sinh</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                  aria-label="Đóng"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mô tả lớp học
                </div>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  {detailTarget.cls.description?.trim() ||
                    "Lớp bồi dưỡng kiến thức và rèn luyện kỹ năng cùng giáo viên Smart Lotus."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800">Thông tin giáo viên</div>
                <div>Thầy/Cô: {detailTarget.teacher.displayName}</div>
                <div>Email: {detailTarget.teacher.email}</div>
                {detailTarget.teacher.school && <div>Trường: {detailTarget.teacher.school}</div>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>
                {detailTarget.cls.membershipStatus === "joined" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                    <Icon name="check" size={14} />
                    Đã tham gia lớp
                  </span>
                ) : detailTarget.cls.requestStatus === "pending" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800">
                    <Icon name="hourglass" size={14} />
                    Đã gửi yêu cầu · Chờ duyệt
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={requestingClassId === detailTarget.cls.id}
                    onClick={() =>
                      void handleRequestJoin(
                        detailTarget.teacher.displayName,
                        detailTarget.cls.id,
                        detailTarget.cls.name
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-violet-700 hover:to-indigo-700 cursor-pointer disabled:opacity-60"
                  >
                    <Icon name="plus" size={14} />
                    <span>
                      {requestingClassId === detailTarget.cls.id
                        ? "Đang gửi..."
                        : detailTarget.cls.requestStatus === "declined"
                          ? "Gửi lại yêu cầu xin vào"
                          : "Xin vào lớp"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enter Invite Code Modal */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsCodeModalOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 z-10">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="absolute top-4 right-4 rounded-xl p-1 text-white/80 hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <Icon name="close" size={18} />
              </button>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md mb-2 shadow-inner ring-2 ring-white/30">
                <Icon name="key" size={26} className="text-white" />
              </div>
              <h3 className="text-lg font-bold">Nhập mã mời lớp học</h3>
              <p className="mt-1 text-xs text-violet-100">
                Nhập mã do Thầy/Cô cung cấp để tham gia lớp ngay lập tức!
              </p>
            </div>

            <form onSubmit={(e) => void handleJoinByCode(e)} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mã lớp học</label>
                <input
                  type="text"
                  autoFocus
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setCodeError("");
                  }}
                  maxLength={12}
                  placeholder="VD: A1B2C3D4E5"
                  className="w-full rounded-2xl border border-slate-300 py-3 px-4 text-center text-lg font-extrabold uppercase tracking-widest text-violet-700 placeholder-slate-300 focus:border-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                />
                {codeError && <p className="text-xs text-rose-500 font-medium">{codeError}</p>}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(false)}
                  className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={joiningByCode}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <span>{joiningByCode ? "Đang tham gia..." : "Vào lớp ngay"}</span>
                  <Icon name="arrow" size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {isHowItWorksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsHowItWorksOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 z-10 text-slate-700">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(false)}
                className="absolute top-4 right-4 rounded-xl p-1 text-white/80 hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <Icon name="close" size={18} />
              </button>

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md mb-2">
                <Icon name="sparkles" size={24} className="text-amber-300" />
              </div>
              <h3 className="text-xl font-bold">Quy trình tham gia lớp học thêm</h3>
              <p className="mt-1 text-xs text-violet-100">
                Dễ dàng kết nối cùng thầy cô giáo và bắt đầu học tập chỉ qua 4 bước đơn giản!
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                {[
                  {
                    step: "1",
                    icon: "search" as const,
                    title: "Tìm kiếm lớp & Thầy cô giáo",
                    desc: "Tìm theo tên thầy cô dạy tại trường hoặc theo môn học Toán, Tiếng Việt, Tiếng Anh, STEM.",
                  },
                  {
                    step: "2",
                    icon: "plus" as const,
                    title: "Gửi yêu cầu xin vào lớp",
                    desc: 'Nhấn nút "Xin vào lớp" trên thẻ lớp học thêm để gửi yêu cầu xét duyệt tới thầy cô.',
                  },
                  {
                    step: "3",
                    icon: "check" as const,
                    title: "Nhận thông báo được duyệt",
                    desc: 'Sau khi thầy cô xác nhận, trạng thái lớp chuyển thành "Đã tham gia lớp".',
                  },
                  {
                    step: "4",
                    icon: "book" as const,
                    title: "Nhận bài tập & Học tập",
                    desc: "Toàn bộ bài tập của lớp sẽ xuất hiện trong mục Lớp học để bạn bắt đầu rèn luyện.",
                  },
                ].map((st) => (
                  <div
                    key={st.step}
                    className="flex items-start gap-3.5 rounded-2xl bg-slate-50 p-3.5 border border-slate-100"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-bold shrink-0 shadow-xs">
                      <Icon name={st.icon} size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Bước {st.step}: {st.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(false)}
                className="w-full rounded-2xl bg-violet-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-violet-700 active:scale-95 transition-all cursor-pointer"
              >
                Đã hiểu, bắt đầu khám phá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
