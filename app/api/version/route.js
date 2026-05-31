// Alpha 0.48.0 - Endpoint pour vérifier la version actuelle du bundle
// Lu par <VersionCheck /> qui compare avec celle stockée en localStorage.
//
// Renvoie aussi le build timestamp (depuis NEXT_BUILD_ID si dispo)
// pour distinguer 2 builds de même version semver.

import { NextResponse } from "next/server";
import pkg from "../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    version: pkg.version,
    buildId: process.env.NEXT_BUILD_ID || null,
    timestamp: Date.now(),
  });
}
