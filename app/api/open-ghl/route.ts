import { NextResponse } from "next/server";
import { spawn, spawnSync, execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { prisma } from '@/lib/db';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSettingsFromDb() {
  try {
    const settings = await prisma.setting.findUnique({
      where: { id: 'singleton' }
    });
    return {
      ghlUrl: settings?.ghlOppsUrl || null,
      chromeProfile: settings?.chromeProfileDir || null
    };
  } catch (e) {
    console.log('[open-ghl] Could not fetch settings from DB:', e);
    return { ghlUrl: null, chromeProfile: null };
  }
}

function getChromeProfile(dbProfile: string | null): string {
  return dbProfile || process.env.CHROME_PROFILE_DIR?.trim() || "Default"; // e.g. "Default", "Profile 1"
}

function getGhlUrl(dbUrl: string | null): string {
  return (
    dbUrl ||
    process.env.GHL_OPPS_URL?.trim() ||
    "https://app.gohighlevel.com/v2/location/NNo96bNDoBnBlHRQwsf4/opportunities/list"
  );
}

// Log available profile dirs to help the user pick the right one
function listChromeProfiles(): string[] {
  try {
    const base = path.join(os.homedir(), "Library/Application Support/Google/Chrome");
    if (!fs.existsSync(base)) return [];
    return fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && (d.name === "Default" || d.name.startsWith("Profile ")))
      .map((d) => d.name);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  // Check if a URL was provided in the request body
  let customUrl: string | null = null;
  try {
    const body = await request.json();
    customUrl = body.url || null;
  } catch {
    // No body or invalid JSON, continue with default
  }

  // Get settings from database first, then fall back to env vars
  const dbSettings = await getSettingsFromDb();
  const url = customUrl || getGhlUrl(dbSettings.ghlUrl);
  const profile = getChromeProfile(dbSettings.chromeProfile);
  const profiles = listChromeProfiles();

  console.log('[open-ghl] Attempting to open:', {
    url: url.substring(0, 50) + '...',
    profile,
    availableProfiles: profiles,
    platform: process.platform
  });

  if (process.platform !== "darwin") {
    console.warn("[open-ghl] Non-macOS platform; returning url for client window.open");
    return NextResponse.json({ ok: false, fallback: "client-open", url, profile, profiles });
  }

  // Try strategies in order; return on first success
  const strategies: Array<{ cmd: string; args: string[]; label: string }> = [
    // Preferred: open Chrome with profile arg
    {
      cmd: "/usr/bin/open",
      args: ['-a', 'Google Chrome', '--args', `--profile-directory=${profile}`, url],
      label: "open -a Google Chrome --args --profile-directory=…",
    },
    // Fallback: open Chrome without profile (user's default)
    {
      cmd: "/usr/bin/open",
      args: ['-a', 'Google Chrome', url],
      label: "open -a Google Chrome <url>",
    },
    // Fallback: Chrome Canary (some machines only)
    {
      cmd: "/usr/bin/open",
      args: ['-a', 'Google Chrome Canary', url],
      label: "open -a Google Chrome Canary <url>",
    },
    // Last resort: AppleScript to default Chrome
    {
      cmd: "/usr/bin/osascript",
      args: ['-e', `tell application "Google Chrome" to open location "${url.replaceAll('"', '\\"')}"`],
      label: 'osascript tell Chrome open location',
    },
  ];

  for (const s of strategies) {
    try {
      const res = spawnSync(s.cmd, s.args, { stdio: "ignore" });
      if (res.status === 0) {
        console.info("[open-ghl] success via:", s.label, "profile:", profile);
        return NextResponse.json({ ok: true, url, profile, via: s.label, profiles });
      } else {
        console.warn("[open-ghl] failed:", s.label, "status:", res.status);
      }
    } catch (e: any) {
      console.error("[open-ghl] error:", s.label, e?.message || e);
    }
  }

  // Couldn't spawn anything; instruct client to window.open as a last resort.
  console.warn("[open-ghl] All spawn strategies failed, falling back to client-side window.open");
  return NextResponse.json(
    { ok: false, fallback: "client-open", url, profile, profiles, reason: "spawn-failed" },
    { status: 200 },
  );
}