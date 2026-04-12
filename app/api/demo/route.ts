import { NextResponse } from "next/server";

import { demoScan } from "@/lib/demo-scan";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "demo",
    scan: demoScan,
  });
}
