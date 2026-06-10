import { NextResponse } from "next/server";
import { buildReviewContext } from "@/lib/review";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const secret = process.env.REVIEW_API_SECRET;
  if (secret) {
    const header = request.headers.get("x-review-secret");
    if (header !== secret) return unauthorized();
  }

  const context = await buildReviewContext();
  return NextResponse.json(context);
}
