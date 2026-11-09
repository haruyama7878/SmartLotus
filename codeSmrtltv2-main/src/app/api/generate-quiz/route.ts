import { generateQuiz, type GenerateQuizInput } from "@/lib/ai-api";

export const dynamic = "force-dynamic";

/** Cho phép app UI chạy ở cổng khác (Vite) gọi trực tiếp API sinh đề. */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GenerateQuizInput>;
    if (
      typeof body.topic !== "string" ||
      typeof body.curriculumLevel !== "number" ||
      !Array.isArray(body.difficulties)
    ) {
      return Response.json({ message: "Yêu cầu sinh câu hỏi không hợp lệ" }, { status: 400, headers: corsHeaders });
    }

    const quiz = await generateQuiz({
      topic: body.topic,
      curriculumLevel: Math.max(1, Math.min(6, body.curriculumLevel)),
      difficulties: body.difficulties,
      count: body.count,
      intelligenceScore: typeof body.intelligenceScore === "number" ? body.intelligenceScore : undefined,
      variationSeed: typeof body.variationSeed === "string" ? body.variationSeed.slice(0, 100) : undefined,
      accuracy: typeof body.accuracy === "number" ? Math.max(0, Math.min(100, body.accuracy)) : undefined,
      lastScore: typeof body.lastScore === "number" ? Math.max(0, Math.min(100, body.lastScore)) : undefined,
      averageScoreLast10: typeof body.averageScoreLast10 === "number" ? Math.max(0, Math.min(100, body.averageScoreLast10)) : undefined,
      durationSeconds: typeof body.durationSeconds === "number" ? Math.max(1, Math.min(7200, body.durationSeconds)) : undefined,
      excludePrompts: Array.isArray(body.excludePrompts)
        ? body.excludePrompts
            .filter((prompt): prompt is string => typeof prompt === "string")
            .slice(-40)
            .map((prompt) => prompt.slice(0, 200))
        : undefined,
    });

    return Response.json(quiz, { headers: corsHeaders });
  } catch (error) {
    console.error("Generate quiz API error", error);
    return Response.json({ message: "Không thể tạo bộ câu hỏi" }, { status: 500, headers: corsHeaders });
  }
}
