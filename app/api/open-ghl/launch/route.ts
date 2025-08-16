import { NextResponse } from "next/server";
import { spawnSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
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
    console.log('[launch] Could not fetch settings from DB:', e);
    return { ghlUrl: null, chromeProfile: null };
  }
}

function getChromeProfiles(): string[] {
  try {
    const base = path.join(os.homedir(), "Library/Application Support/Google/Chrome");
    if (!fs.existsSync(base)) return [];
    return fs.readdirSync(base, { withFileTypes: true })
      .filter(d => d.isDirectory() && (d.name === "Default" || d.name.startsWith("Profile ")))
      .map(d => d.name)
      .sort((a, b) => {
        // Sort Default first, then Profile 1, Profile 2, etc.
        if (a === "Default") return -1;
        if (b === "Default") return 1;
        return a.localeCompare(b, undefined, { numeric: true });
      });
  } catch { 
    return []; 
  }
}

async function getUrlAndProfile() {
  const dbSettings = await getSettingsFromDb();
  const url = dbSettings.ghlUrl || 
    (process.env.GHL_OPPS_URL || "").trim() ||
    "https://app.gohighlevel.com/v2/location/NNo96bNDoBnBlHRQwsf4/opportunities/list";
  const profile = dbSettings.chromeProfile || 
    (process.env.CHROME_PROFILE_DIR || "").trim() || 
    "Default";
  return { url, profile };
}

export async function POST() {
  const { url, profile } = await getUrlAndProfile();
  const profiles = getChromeProfiles();

  console.log('[launch] Starting Chrome launch attempt:', {
    url: url.substring(0, 50) + '...',
    profile,
    availableProfiles: profiles,
    platform: process.platform
  });

  if (process.platform !== "darwin") {
    return NextResponse.json({
      ok: false, 
      fallback: "client-open", 
      url, 
      profile, 
      profiles,
      message: "Non-macOS platform—client tab opened."
    });
  }

  // Check if the requested profile exists
  const profileExists = profiles.includes(profile);
  if (!profileExists && profiles.length > 0) {
    console.warn(`[launch] Profile "${profile}" not found. Available: ${profiles.join(", ")}`);
  }

  const attempts: Array<{label: string; cmd: string; args: string[]}> = [
    // Strategy 1: Open new Chrome instance with profile
    { 
      label: "open -na Chrome with profile", 
      cmd: "/usr/bin/open",
      args: ["-na", "Google Chrome", "--args", `--profile-directory=${profile}`, url] 
    },
    // Strategy 2: Open existing Chrome instance with profile
    { 
      label: "open -a Chrome with profile", 
      cmd: "/usr/bin/open",
      args: ["-a", "Google Chrome", "--args", `--profile-directory=${profile}`, url] 
    },
    // Strategy 3: Open Chrome without profile specification
    { 
      label: "open -a Chrome (no profile)", 
      cmd: "/usr/bin/open",
      args: ["-a", "Google Chrome", url] 
    },
  ];

  // Try each strategy
  for (const a of attempts) {
    try {
      console.log(`[launch] Trying: ${a.label}`);
      const r = spawnSync(a.cmd, a.args, { stdio: "pipe", encoding: "utf8" });
      
      if (r.status === 0) {
        console.log(`[launch] ✅ Success via: ${a.label}`);
        return NextResponse.json({ 
          ok: true, 
          via: a.label, 
          profile, 
          profiles,
          message: profileExists ? undefined : `Note: Profile "${profile}" may not exist. Available: ${profiles.join(", ")}`
        });
      } else {
        console.log(`[launch] ❌ Failed: ${a.label}, status: ${r.status}, stderr: ${r.stderr || 'none'}`);
      }
    } catch (e: any) {
      console.error(`[launch] ❌ Error with ${a.label}:`, e.message);
    }
  }

  // Strategy 4: AppleScript - new tab + activate
  try {
    console.log("[launch] Trying: AppleScript new tab + activate");
    const script = `
      tell application "Google Chrome"
        if (count of windows) = 0 then 
          make new window
        end if
        tell window 1 
          make new tab with properties {URL:"${url.replaceAll('"','\\"')}"}
        end tell
        activate
      end tell`;
    
    const r = spawnSync("/usr/bin/osascript", ["-e", script], { stdio: "pipe", encoding: "utf8" });
    
    if (r.status === 0) {
      console.log("[launch] ✅ Success via: AppleScript");
      return NextResponse.json({ 
        ok: true, 
        via: "AppleScript new tab + activate", 
        profile, 
        profiles,
        message: "Opened in Chrome's active profile"
      });
    } else {
      console.log(`[launch] ❌ AppleScript failed, status: ${r.status}, stderr: ${r.stderr || 'none'}`);
    }
  } catch (e: any) {
    console.error("[launch] ❌ AppleScript error:", e.message);
  }

  // Strategy 5: Chrome Canary fallback
  try {
    console.log("[launch] Trying: Chrome Canary");
    const r = spawnSync("/usr/bin/open", ["-a", "Google Chrome Canary", url], { stdio: "pipe", encoding: "utf8" });
    
    if (r.status === 0) {
      console.log("[launch] ✅ Success via: Chrome Canary");
      return NextResponse.json({ 
        ok: true, 
        via: "open -a Chrome Canary", 
        profile: "Canary", 
        profiles,
        message: "Opened in Chrome Canary"
      });
    } else {
      console.log(`[launch] ❌ Chrome Canary failed, status: ${r.status}`);
    }
  } catch (e: any) {
    console.error("[launch] ❌ Chrome Canary error:", e.message);
  }

  // All strategies failed
  const message = profiles.length
    ? `Couldn't open Chrome with profile "${profile}". Available profiles: ${profiles.join(", ")}. Update in Settings → Chrome Profile Directory.`
    : "Couldn't launch Chrome from server. The URL has been opened in a new tab.";

  console.warn(`[launch] ⚠️ All strategies failed. ${message}`);

  return NextResponse.json({
    ok: false, 
    fallback: "client-open", 
    url, 
    profile, 
    profiles,
    message,
    reason: "all-strategies-failed"
  });
}