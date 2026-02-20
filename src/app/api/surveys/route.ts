import { NextResponse } from "next/server";

const BASE = process.env.UPSTREAM_BASE;
const TOKEN = process.env.UPSTREAM_TOKEN;

async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const text = await res.text();
  return { detail: text || `Upstream returned non-JSON (${res.status})` };
}

export async function GET(req: Request) {
  try {
    if (!BASE || !TOKEN) {
      return NextResponse.json(
        { detail: "Missing UPSTREAM_BASE or UPSTREAM_TOKEN in .env.local" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ?? "1";

    const upstream = await fetch(`${BASE}/api/survey/surveys/?page=${page}`, {
      headers: { Authorization: TOKEN },
      cache: "no-store",
    });

    const data = await safeJson(upstream);
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!BASE || !TOKEN) {
      return NextResponse.json(
        { detail: "Missing UPSTREAM_BASE or UPSTREAM_TOKEN in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const upstream = await fetch(`${BASE}/api/survey/surveys/`, {
      method: "POST",
      headers: {
        Authorization: TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await safeJson(upstream);
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
