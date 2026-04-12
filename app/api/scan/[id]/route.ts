import { NextResponse } from "next/server";

import { demoScan } from "@/lib/demo-scan";
import { getScanRecordById, getScanSetupMessage } from "@/lib/scans";
import { hasSupabaseServerConfig } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (params.id === demoScan.id) {
    return NextResponse.json({
      scan: demoScan,
    });
  }

  if (!hasSupabaseServerConfig()) {
    return NextResponse.json(
      {
        message: getScanSetupMessage(),
        scanId: params.id,
      },
      { status: 503 },
    );
  }

  try {
    const scan = await getScanRecordById(params.id);

    if (!scan) {
      return NextResponse.json(
        {
          message: "Scan not found.",
          scanId: params.id,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ scan });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load the scan record.",
        scanId: params.id,
      },
      { status: 500 },
    );
  }
}
