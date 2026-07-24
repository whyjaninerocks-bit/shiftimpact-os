import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclude static assets, images, and short-link routes from auth middleware
    "/((?!_next/static|_next/image|favicon.ico|s/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
