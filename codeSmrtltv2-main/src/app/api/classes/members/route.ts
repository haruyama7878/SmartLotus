import { db } from "@/db";
import { classes, schools, users } from "@/db/schema";
import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";
import { formatStudentCode } from "@/lib/student-code";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let classCode = searchParams.get("classCode")?.trim() || "";
  let schoolCode = searchParams.get("schoolCode")?.trim() || "";
  let className = searchParams.get("className")?.trim() || "";

  let authAppUser: typeof users.$inferSelect | null = null;
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (authUser) {
    try {
      authAppUser = await getOrCreateAppUser(authUser);
      if (!classCode && authAppUser.classCode) {
        classCode = authAppUser.classCode;
      }
      if (!schoolCode && authAppUser.schoolCode) {
        schoolCode = authAppUser.schoolCode;
      }
      if (!className && authAppUser.className) {
        className = authAppUser.className;
      }
    } catch {
      // ignore
    }
  }

  if (!classCode && (!schoolCode || !className)) {
    return Response.json({ message: "Thiếu mã lớp hoặc thông tin trường/lớp" }, { status: 400 });
  }

  try {
    // 1. Tìm thông tin lớp
    const classConditions: Array<SQL<unknown>> = [];
    if (classCode) {
      classConditions.push(eq(classes.code, classCode));
    }
    if (schoolCode && className) {
      const matchCond = and(eq(classes.schoolCode, schoolCode), sql`LOWER(${classes.name}) = LOWER(${className})`);
      if (matchCond) classConditions.push(matchCond);
    }

    const [classRecord] = classConditions.length > 0
      ? await db
          .select()
          .from(classes)
          .where(or(...classConditions))
          .limit(1)
      : [];

    const resolvedSchoolCode = classRecord?.schoolCode || schoolCode;
    const resolvedClassName = classRecord?.name || className;
    const resolvedClassCode = classRecord?.code || classCode || `${resolvedSchoolCode}-${resolvedClassName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
    const resolvedGrade = classRecord?.grade || authAppUser?.grade || "Chung";

    // 2. Tìm thông tin trường
    let schoolName = authAppUser?.school || "";
    if (resolvedSchoolCode) {
      const [s] = await db
        .select({ name: schools.name, code: schools.code })
        .from(schools)
        .where(eq(schools.code, resolvedSchoolCode))
        .limit(1);
      if (s) {
        schoolName = s.name;
      }
    }

    // 3. Tìm tất cả học sinh và giáo viên cùng mã trường & mã lớp (hoặc cùng schoolCode + className)
    const memberConditions: Array<SQL<unknown>> = [
      eq(users.classCode, resolvedClassCode),
    ];
    if (resolvedSchoolCode && resolvedClassName) {
      const matchMember = and(
        eq(users.schoolCode, resolvedSchoolCode),
        sql`LOWER(${users.className}) = LOWER(${resolvedClassName})`
      );
      if (matchMember) memberConditions.push(matchMember);
    }

    const members = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
        avatar: users.avatar,
        avatarUrl: users.avatarUrl,
        lotusPoints: users.lotusPoints,
        currentStreak: users.currentStreak,
        lastActiveAt: users.lastActiveAt,
        phone: users.phone,
        email: users.email,
        className: users.className,
      })
      .from(users)
      .where(or(...memberConditions))
      .orderBy(desc(users.lotusPoints));

    const students = members
      .filter((m) => m.role === "student")
      .map((m) => ({
        id: String(m.id),
        studentCode: formatStudentCode(m.id),
        name: m.displayName,
        avatar: m.avatar,
        avatarUrl: m.avatarUrl,
        lotusPoints: m.lotusPoints,
        currentStreak: m.currentStreak,
        lastActive: m.lastActiveAt.toISOString().slice(0, 10),
      }));

    const teachers = members
      .filter((m) => m.role === "teacher" || m.role === "admin")
      .map((m) => ({
        id: String(m.id),
        name: m.displayName,
        avatar: m.avatar,
        avatarUrl: m.avatarUrl,
        phone: m.phone || "Chưa cập nhật",
        email: m.email,
      }));

    // 4. Lấy các lớp khác trong cùng trường
    let otherClasses: Array<{ name: string; code: string; grade: string }> = [];
    if (resolvedSchoolCode) {
      const scList = await db
        .select({
          name: classes.name,
          code: classes.code,
          grade: classes.grade,
        })
        .from(classes)
        .where(eq(classes.schoolCode, resolvedSchoolCode))
        .limit(20);
      otherClasses = scList;
    }

    return Response.json({
      classInfo: {
        name: resolvedClassName,
        grade: resolvedGrade,
        code: resolvedClassCode,
        schoolName,
        schoolCode: resolvedSchoolCode,
        totalStudents: students.length,
      },
      students,
      teachers,
      otherClasses,
    });
  } catch (error) {
    console.error("GET /api/classes/members error:", error);
    return Response.json({ message: "Không thể tải thông tin thành viên lớp" }, { status: 500 });
  }
}
