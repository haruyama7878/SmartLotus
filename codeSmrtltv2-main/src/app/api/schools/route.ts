import { db } from "@/db";
import { schools, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function cleanLocalityName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Phường|Xã|Thị trấn)\s+/i, "")
    .trim();
}

function generateDefaultSchools(province: string, district: string, level: string): string[] {
  const cleanDistrict = cleanLocalityName(district);
  const cleanProvince = cleanLocalityName(province);
  const nameBase = cleanDistrict || cleanProvince || "Mẫu";

  switch (level) {
    case "primary":
      return [
        `Trường Tiểu học ${nameBase}`,
        `Trường Tiểu học ${nameBase} 1`,
        `Trường Tiểu học ${nameBase} 2`,
        `Trường Tiểu học Chu Văn An`,
        `Trường Tiểu học Lê Quý Đôn`,
      ];
    case "lowerSecondary":
      return [
        `Trường THCS ${nameBase}`,
        `Trường THCS ${nameBase} 1`,
        `Trường THCS Chu Văn An`,
        `Trường THCS Nguyễn Du`,
      ];
    case "upperSecondary":
      return [
        `Trường THPT ${nameBase}`,
        `Trường THPT Chuyên ${cleanProvince || nameBase}`,
        `Trường THPT Chu Văn An`,
      ];
    case "integrated":
      return [
        `Trường Tiểu học & THCS ${nameBase}`,
        `Trường Liên cấp Vinschool ${cleanProvince || nameBase}`,
        `Trường Phổ thông Liên cấp ${nameBase}`,
      ];
    default:
      return [
        `Trường Tiểu học ${nameBase}`,
        `Trường THCS ${nameBase}`,
        `Trường THPT ${nameBase}`,
      ];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get("province")?.trim() || "";
  const district = searchParams.get("district")?.trim() || "";
  const schoolLevel = searchParams.get("schoolLevel")?.trim() || "";

  try {
    const conditions = [];
    if (province) conditions.push(eq(schools.province, province));
    if (district) conditions.push(eq(schools.district, district));
    if (schoolLevel) conditions.push(eq(schools.schoolLevel, schoolLevel));

    const dbSchools = await db
      .select({ id: schools.id, name: schools.name, code: schools.code })
      .from(schools)
      .where(conditions.length ? and(...conditions) : undefined);

    const userConditions = [];
    if (province) userConditions.push(eq(users.province, province));
    if (district) userConditions.push(eq(users.district, district));
    if (schoolLevel) userConditions.push(eq(users.schoolLevel, schoolLevel));

    const userSchools = await db
      .select({ name: users.school, code: users.schoolCode })
      .from(users)
      .where(
        userConditions.length
          ? and(...userConditions, sql`${users.school} IS NOT NULL AND TRIM(${users.school}) != ''`)
          : sql`${users.school} IS NOT NULL AND TRIM(${users.school}) != ''`
      );

    const schoolMap = new Map<string, { name: string; code: string }>();
    const normalize = (str: string) => str.trim().toLowerCase();

    const addSchoolItem = (name: string | null | undefined, code?: string | null) => {
      if (!name) return;
      const trimmed = name.trim();
      const norm = normalize(trimmed);
      if (trimmed.length >= 2 && !schoolMap.has(norm)) {
        // Nếu chưa có mã trường, tạo mã ngắn gọn dựa trên tên hoặc mã chuẩn
        const assignedCode = code && code.trim() ? code.trim() : `SCH-${Math.abs(norm.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0) % 9000 + 1000)}`;
        schoolMap.set(norm, { name: trimmed, code: assignedCode });
      }
    };

    // 1. Thêm các trường đã được lưu trong DB
    dbSchools.forEach((s) => addSchoolItem(s.name, s.code));
    userSchools.forEach((s) => addSchoolItem(s.name, s.code));

    // 2. Thêm các trường mặc định tương ứng với địa bàn và cấp học
    if (district || province || schoolLevel) {
      const generated = generateDefaultSchools(province, district, schoolLevel);
      generated.forEach((name, idx) => {
        addSchoolItem(name, `SCH-${String(900 + idx)}`);
      });
    }

    const schoolItems = Array.from(schoolMap.values());
    const schoolNames = schoolItems.map((item) => item.name);

    return Response.json({
      schools: schoolNames,
      schoolItems,
    });
  } catch (error) {
    console.error("GET /api/schools error:", error);
    // Fallback: sinh danh sách trường chuẩn
    const fallbackSchools = generateDefaultSchools(province, district, schoolLevel);
    const fallbackItems = fallbackSchools.map((name, idx) => ({
      name,
      code: `SCH-${String(900 + idx)}`,
    }));
    return Response.json({
      schools: fallbackSchools,
      schoolItems: fallbackItems,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const province = typeof body.province === "string" ? body.province.trim() : "";
    const district = typeof body.district === "string" ? body.district.trim() : "";
    const schoolLevel = typeof body.schoolLevel === "string" ? body.schoolLevel.trim() : "primary";

    if (!name || name.length < 2) {
      return Response.json({ message: "Tên trường không hợp lệ" }, { status: 400 });
    }

    // Kiểm tra đã có trường này chưa
    const existing = await db
      .select({ id: schools.id, code: schools.code })
      .from(schools)
      .where(
        and(
          sql`LOWER(${schools.name}) = LOWER(${name})`,
          eq(schools.province, province),
          eq(schools.district, district),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return Response.json({ ok: true, school: name, code: existing[0].code });
    }

    // Lấy ID lớn nhất để tạo mã trường SCH-XXXX
    const maxRow = await db
      .select({ maxId: sql<number>`COALESCE(MAX(${schools.id}), 0)` })
      .from(schools);
    const nextId = (Number(maxRow[0]?.maxId) || 0) + 1;
    const generatedCode = `SCH-${String(nextId).padStart(4, "0")}`;

    const [created] = await db
      .insert(schools)
      .values({
        name,
        code: generatedCode,
        schoolLevel,
        province,
        district,
      })
      .returning();

    return Response.json({ ok: true, school: name, code: created.code });
  } catch (error) {
    console.error("POST /api/schools error:", error);
    return Response.json({ message: "Không thể thêm trường mới" }, { status: 500 });
  }
}
