import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RandomUserLike = {
    name: { first: string; last: string };
    picture: { thumbnail: string; medium: string; large: string };
};

function pick<T>(arr: T[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function makeAvatar(seed: string, size: number) {
    // guna dicebear (SVG) - tak perlu download, just URL
    // kalau internet pun block, at least URL masih valid untuk UI
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        seed
    )}&size=${size}`;
}

function generateFallbackUsers(count = 6): RandomUserLike[] {
    const firstNames = [
        "John",
        "Sarah",
        "Michael",
        "Emily",
        "David",
        "Lisa",
        "Aiman",
        "Siti",
        "Haziq",
        "Nurin",
        "Farah",
        "Hakim",
    ];
    const lastNames = [
        "Mitchell",
        "Anderson",
        "Chen",
        "Roberts",
        "Thompson",
        "Rodriguez",
        "Zulkifli",
        "Rahman",
        "Tan",
        "Lim",
        "Kaur",
        "Lee",
    ];

    return Array.from({ length: count }).map(() => {
        const first = pick(firstNames);
        const last = pick(lastNames);
        const seed = `${first}-${last}-${Math.random().toString(16).slice(2)}`;

        return {
            name: { first, last },
            picture: {
                thumbnail: makeAvatar(seed, 64),
                medium: makeAvatar(seed, 128),
                large: makeAvatar(seed, 256),
            },
        };
    });
}

export async function GET() {
    // 1) Try real randomuser.me
    try {
        const response = await fetch("https://randomuser.me/api/?results=6", {
            cache: "no-store",
            // kadang-kadang server perlukan UA supaya tak dianggap bot
            headers: { "user-agent": "Mozilla/5.0" },
        });

        if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data?.results) ? data.results : [];

            // kalau betul-betul dapat, return
            if (results.length > 0) {
                return NextResponse.json({ results });
            }
        }
    } catch {
        // ignore, jatuh ke fallback
    }

    // 2) Fallback: generate dummy users (so Day view confirm keluar)
    return NextResponse.json({
        results: generateFallbackUsers(6),
        fallback: true,
    });
}
