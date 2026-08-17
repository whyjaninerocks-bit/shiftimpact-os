// POST /api/client-report-recipients
// Adds an additional report recipient for a client.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { client_id, name, email, recipient_type } = await req.json();

    if (!client_id || !email) {
      return NextResponse.json(
        { error: "client_id and email are required." },
        { status: 400 }
      );
    }

    const validTypes = ["brand_contact", "agency_partner", "agency_client"];
    const type = validTypes.includes(recipient_type) ? recipient_type : "brand_contact";

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("client_report_recipients")
      .insert({ client_id, name: name || null, email, recipient_type: type })
      .select("id, name, email, recipient_type, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
