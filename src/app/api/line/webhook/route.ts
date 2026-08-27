import { createHmac, timingSafeEqual } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";

type LineWebhookEvent = { type?: string; source?: { type?: string; userId?: string } };
type LineProfile = { displayName?: string; pictureUrl?: string; statusMessage?: string };

export async function POST(request: Request) {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhookの設定が完了していません。" }, { status: 503 });
  const body = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";
  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const valid = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  try {
    const payload = JSON.parse(body) as { events?: LineWebhookEvent[] };
    const database = getAdminFirestore();
    if (!database) return NextResponse.json({ error: "Firestoreの設定が完了していません。" }, { status: 503 });
    await Promise.all((payload.events ?? []).map(async event => {
      const userId = event.source?.type === "user" ? event.source.userId : undefined;
      if (!userId) return;
      const reference = database.collection("lineUsers").doc(userId);
      if (event.type === "unfollow") {
        await reference.set({ lineUserId: userId, followed: false, unfollowedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return;
      }
      const profile = await getLineProfile(userId);
      await reference.set({ lineUserId: userId, lineDisplayName: profile?.displayName ?? "LINEユーザー", linePictureUrl: profile?.pictureUrl ?? "", statusMessage: profile?.statusMessage ?? "", followed: true, firstSeenAt: FieldValue.serverTimestamp(), lastEventType: event.type ?? "unknown", lastSeenAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }));
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error("LINE webhook failed", cause);
    return NextResponse.json({ error: "Webhookの処理に失敗しました。" }, { status: 500 });
  }
}

async function getLineProfile(userId: string): Promise<LineProfile | null> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  return response.ok ? response.json() as Promise<LineProfile> : null;
}
