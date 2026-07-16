import { NextRequest, NextResponse } from "next/server";

/**
 * Triggered by a Vercel Cron job (see vercel.json). Rebuilds are cheap at this
 * site's scale (~600 static pages), so this just forwards to the deploy hook
 * unconditionally rather than diffing against the dataset's last-modified time.
 */
export async function GET(request: NextRequest) {
  // Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>` when
  // the CRON_SECRET env var is set — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!deployHookUrl) {
    return NextResponse.json({ error: "VERCEL_DEPLOY_HOOK_URL is not configured" }, { status: 500 });
  }

  const res = await fetch(deployHookUrl, { method: "POST" });
  if (!res.ok) {
    return NextResponse.json({ error: `Deploy hook failed: ${res.status}` }, { status: 502 });
  }

  return NextResponse.json({ triggered: true });
}
