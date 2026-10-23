import { db } from "@/db";
import { classes, schools, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function sanitizeClassName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function generateClassCode(schoolCode: string, className: string): string {
  const clean = className.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `${schoolCode}-${clean || "CLS"}`;
}

function getDefaultClassesForGrade(grade: string, schoolCode: string): Array<{ name: string; grade: string; code: string; studentCount: number }> {
  const match = grade.match(/\d+/);
  const num = match ? match[0] : "1";
  const letters = ["A", "B", "C", "D"];
  return letters.map((letter) => {
    const name = `${num}${letter}`;
    return {
      name,
      grade,
      code: generateClassCode(schoolCode, name),
      studentCount: 0,
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolCode = searchParams.get("schoolCode")?.trim() || "";
  const schoolName = searchParams.get("schoolName")?.trim() || "";
  const grade = searchParams.get("grade")?.trim() || "";

  if (!schoolCode && !schoolName) {
    return Response.json({ classes: [] });
  }

  try {
    let resolvedSchoolCode = schoolCode;
    let resolvedSchoolId: number | null = null;

    if (!resolvedSchoolCode && schoolName) {
      const [foundSchool] = await db
        .select({ id: schools.id, code: schools.code })
        .from(schools)
        .where(sql`LOWER(${schools.name}) = LOWER(${schoolName})`)
        .limit(1);
      if (foundSchool) {
        resolvedSchoolCode = foundSchool.code;
        resolvedSchoolId = foundSchool.id;
      }
    }

    if (!resolvedSchoolCode) {
      return Response.json({ classes: [] });
    }

    // 1. Lấy các lớp trong bảng classes
    const conditions = [eq(classes.schoolCode, resolvedSchoolCode)];
    if (grade) {
      conditions.push(eq(classes.grade, grade));
    }

    const dbClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        grade: classes.grade,
        code: classes.code,
      })
      .from(classes)
      .where(and(...conditions));

    // 2. Đếm số lượng học sinh trong từng lớp từ bảng users
    const studentCounts = await db
      .select({
        className: users.className,
        classCode: users.classCode,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(
        and(
          eq(users.schoolCode, resolvedSchoolCode),
          eq(users.role, "student"),
          sql`${users.className} IS NOT NULL AND TRIM(${users.className}) != ''`
        )
      )
      .groupBy(users.className, users.classCode);

    const countMap = new Map<string, number>();
    for (const sc of studentCounts) {
      if (sc.className) countMap.set(sc.className.trim().toUpperCase(), sc.count);
      if (sc.classCode) countMap.set(sc.classCode.trim().toUpperCase(), sc.count);
    }

    const classMap = new Map<string, { id?: number; name: string; grade: string; code: string; studentCount: number }>();

    for (const row of dbClasses) {
      const key = row.name.trim().toUpperCase();
      const count = countMap.get(key) || countMap.get(row.code.toUpperCase()) || 0;
      classMap.set(key, {
        id: row.id,
        name: row.name,
        grade: row.grade,
        code: row.code,
        studentCount: count,
      });
    }

    // 3. Kiểm tra xem có lớp nào trong users mà chưa có trong classes không
    for (const sc of studentCounts) {
      if (sc.className) {
        const key = sc.className.trim().toUpperCase();
        if (!classMap.has(key)) {
          const generatedCode = sc.classCode || generateClassCode(resolvedSchoolCode, sc.className);
          classMap.set(key, {
            name: sc.className.trim(),
            grade: grade || "Chung",
            code: generatedCode,
            studentCount: sc.count,
          });
        }
      }
    }

    // 4. Nếu chưa có lớp nào cho khối này, thêm danh sách gợi ý chuẩn
    if (classMap.size === 0 && grade) {
      const defaults = getDefaultClassesForGrade(grade, resolvedSchoolCode);
      defaults.forEach((def) => {
        classMap.set(def.name.toUpperCase(), def);
      });
    }

    const result = Array.from(classMap.values());
    result.sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true }));

    return Response.json({
      schoolCode: resolvedSchoolCode,
      classes: result,
    });
  } catch (error) {
    console.error("GET /api/classes error:", error);
    const fallback = grade ? getDefaultClassesForGrade(grade, schoolCode || "SCH-0001") : [];
    return Response.json({ schoolCode, classes: fallback });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const schoolCode = typeof body.schoolCode === "string" ? body.schoolCode.trim() : "";
    const schoolName = typeof body.schoolName === "string" ? body.schoolName.trim() : "";
    const grade = typeof body.grade === "string" ? body.grade.trim() : "Khối 1";
    const rawName = typeof body.name === "string" ? body.name.trim() : "";

    const name = sanitizeClassName(rawName);
    if (!name || name.length < 1) {
      return Response.json({ message: "Tên lớp không hợp lệ" }, { status: 400 });
    }

    let finalSchoolCode = schoolCode;
    let schoolId: number | null = null;

    if (!finalSchoolCode && schoolName) {
      const [s] = await db
        .select({ id: schools.id, code: schools.code })
        .from(schools)
        .where(sql`LOWER(${schools.name}) = LOWER(${schoolName})`)
        .limit(1);
      if (s) {
        finalSchoolCode = s.code;
        schoolId = s.id;
      }
    }

    if (!finalSchoolCode) {
      finalSchoolCode = "SCH-0001";
    }

    const code = generateClassCode(finalSchoolCode, name);

    // Kiểm tra xem trường đã có lớp này chưa
    const existing = await db
      .select({ id: classes.id, code: classes.code })
      .from(classes)
      .where(and(eq(classes.schoolCode, finalSchoolCode), sql`LOWER(${classes.name}) = LOWER(${name})`))
      .limit(1);

    if (existing.length > 0) {
      return Response.json({
        ok: true,
        class: {
          id: existing[0].id,
          name,
          grade,
          code: existing[0].code,
          schoolCode: finalSchoolCode,
        },
      });
    }

    const [created] = await db
      .insert(classes)
      .values({
        schoolId,
        schoolCode: finalSchoolCode,
        grade,
        name,
        code,
      })
      .returning();

    return Response.json({
      ok: true,
      class: {
        id: created.id,
        name: created.name,
        grade: created.grade,
        code: created.code,
        schoolCode: created.schoolCode,
      },
    });
  } catch (error) {
    console.error("POST /api/classes error:", error);
    return Response.json({ message: "Không thể thêm lớp học mới" }, { status: 500 });
  }
}
