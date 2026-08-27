import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CouponItem = { couponId: string; title: string };

async function authorize(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return false;
  try {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (!auth) return false;
    await auth.verifyIdToken(token);
    return true;
  } catch (cause) {
    console.error("Coupon API authorization failed", cause);
    return false;
  }
}

export async function GET(request: Request) {
  try {
    if (!await authorize(request)) return NextResponse.json({ error: "管理者認証を確認できませんでした。再ログインしてください。" }, { status: 401 });
    const { getAdminFirestore } = await import("@/lib/firebase/admin");
    const accessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    const database = getAdminFirestore();
    if (!accessToken || !database) return NextResponse.json({ error: "Messaging APIの設定が完了していません。" }, { status: 503 });
    const [couponResponse, setting] = await Promise.all([
      fetch("https://api.line.me/v2/bot/coupon?status=RUNNING&limit=100", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
      database.collection("appSettings").doc("surveyReward").get(),
    ]);
    if (!couponResponse.ok) return NextResponse.json({ error: "LINEクーポンを取得できませんでした。" }, { status: 502 });
    const coupons = await couponResponse.json() as { items?: CouponItem[] };
    return NextResponse.json({ coupons: coupons.items ?? [], setting: setting.exists ? setting.data() : null });
  } catch (cause) {
    console.error("Failed to load LINE coupons", cause);
    return NextResponse.json({ error: "クーポン設定を読み込めませんでした。" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!await authorize(request)) return NextResponse.json({ error: "管理者認証を確認できませんでした。再ログインしてください。" }, { status: 401 });
    const [{ getAdminFirestore }, { FieldValue }] = await Promise.all([import("@/lib/firebase/admin"), import("firebase-admin/firestore")]);
    const database = getAdminFirestore();
    const accessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    if (!database || !accessToken) return NextResponse.json({ error: "Messaging APIの設定が完了していません。" }, { status: 503 });
    const body = await request.json();
    const couponId = typeof body.couponId === "string" ? body.couponId : "";
    const couponTitle = typeof body.couponTitle === "string" ? body.couponTitle : "";
    const thankYouMessage = typeof body.thankYouMessage === "string" ? body.thankYouMessage.trim() : "";
    const enabled = body.enabled === true;
    if (!couponId || !couponTitle || !thankYouMessage || thankYouMessage.length > 5000) return NextResponse.json({ error: "設定内容をご確認ください。" }, { status: 400 });
    const couponResponse = await fetch(`https://api.line.me/v2/bot/coupon/${encodeURIComponent(couponId)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!couponResponse.ok) return NextResponse.json({ error: "選択したクーポンを確認できませんでした。" }, { status: 400 });
    await database.collection("appSettings").doc("surveyReward").set({ couponId, couponTitle, thankYouMessage, enabled, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error("Failed to save coupon setting", cause);
    return NextResponse.json({ error: "クーポン設定を保存できませんでした。" }, { status: 500 });
  }
}
