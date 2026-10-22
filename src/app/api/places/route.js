import { NextResponse } from "next/server";
import { searchVenues } from "@/lib/providers";
import { rateLimit } from "@/lib/server/rateLimit";

// GET /api/places?lat=38.72&lng=-9.14&radius=4
// API keys live here, on the server; they are never sent to the browser.
export async function GET(request) {
  const limited = rateLimit(request, { key: "places", limit: 40 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok hızlı arama yapıldı; birkaç saniye sonra tekrar dene." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Math.min(Number(searchParams.get("radius")) || 4, 15);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Geçersiz konum" }, { status: 400 });
  }

  // Live data on every request; browsers and intermediaries must not store the response.
  const data = await searchVenues({ lat, lng, radiusKm });
  return NextResponse.json({ ...data, fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
