import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { getAuthenticatedSupabaseUser } from "@/lib/server-user";
import { getDefaultLessons } from "@/lib/learning-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser(request);
    if (authUser) {
      const publishedLessons = await db
        .select({
          id: lessons.id,
          slug: lessons.slug,
          curriculumLevel: lessons.curriculumLevel,
          title: lessons.title,
          topic: lessons.topic,
          competency: lessons.competency,
          questionCount: lessons.questionCount,
        })
        .from(lessons)
        .where(eq(lessons.published, true))
        .orderBy(asc(lessons.curriculumLevel), asc(lessons.id));

      if (publishedLessons && publishedLessons.length > 0) {
        return Response.json({ lessons: publishedLessons });
      }
    }
  } catch (error) {
    console.warn("Lessons DB query failed, falling back to static curriculum", error);
  }

  // Luôn trả về danh sách bài học chuẩn từ chương trình lớp 1 nếu DB/Auth chưa sẵn sàng
  return Response.json({ lessons: getDefaultLessons() });
}
