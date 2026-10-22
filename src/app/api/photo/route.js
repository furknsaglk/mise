import { isGooglePhotoName } from "@/lib/providers/google";
import { rateLimit } from "@/lib/server/rateLimit";

// GOOGLE PLACE PHOTO PROXY
//   GET /api/photo?name=places/XXX/photos/YYY
// The API key stays on the server; the browser only receives the image.
export async function GET(request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const name = new URL(request.url).searchParams.get("name") ?? "";
  if (!apiKey || !isGooglePhotoName(name)) return new Response("Bulunamadı", { status: 404 });

  const limited = rateLimit(request, { key: "photo", limit: 120 });
  if (!limited.ok) return new Response("Çok fazla istek", { status: 429 });

  try {
    const res = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=480&key=${apiKey}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new Response("Fotoğraf alınamadı", { status: 502 });
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("Fotoğraf alınamadı", { status: 502 });
  }
}
