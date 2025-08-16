import { NextResponse } from "next/server";
import { spawnSync } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (process.platform !== "darwin") {
    return NextResponse.json({
      ok: false,
      message: "Chrome activation only supported on macOS"
    });
  }

  try {
    // AppleScript to bring Chrome to front
    const script = `tell application "Google Chrome" to activate`;
    const result = spawnSync("/usr/bin/osascript", ["-e", script], { 
      stdio: "pipe", 
      encoding: "utf8" 
    });
    
    if (result.status === 0) {
      console.log("[activate] ✅ Chrome brought to front");
      return NextResponse.json({
        ok: true,
        message: "Chrome activated"
      });
    } else {
      console.log(`[activate] ❌ Failed to activate Chrome, status: ${result.status}`);
      return NextResponse.json({
        ok: false,
        message: "Failed to activate Chrome"
      });
    }
  } catch (error: any) {
    console.error("[activate] ❌ Error:", error.message);
    return NextResponse.json({
      ok: false,
      message: `Error: ${error.message}`
    });
  }
}