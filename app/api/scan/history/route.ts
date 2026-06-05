import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Fetch scan history for the user
    const { data: history, error: historyError } = await supabase
      .from("scan_history")
      .select("id, scan_id, filename, confidence_score, risk_summary, was_exported, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (historyError) {
      console.error("Failed to fetch scan history:", historyError.message);
      return NextResponse.json({ error: "Failed to fetch scan history." }, { status: 500 });
    }

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Error in scan history GET route:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
