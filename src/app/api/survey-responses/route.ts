import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isValidStore, normalizeBirthDate } from "@/lib/survey";

type VerifiedLineProfile = { sub?: string; name?: string; picture?: string; aud?: string };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    const storeGroup = typeof body.storeGroup === "string" ? body.storeGroup : "";
    const store = typeof body.store === "string" ? body.store : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const birthDate = normalizeBirthDate(Number(body.birthYear), Number(body.birthMonth), Number(body.birthDay));
    if (!idToken) return NextResponse.json({ error: "LINEログイン情報がありません。" }, { status: 401 });
    if (!isValidStore(storeGroup, store) || !birthDate || message.length > 1000) return NextResponse.json({ error: "入力内容をご確認ください。" }, { status: 400 });

    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    if (!channelId) return NextResponse.json({ error: "LINE連携の設定が完了していません。" }, { status: 503 });
    const verifyResponse = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
      cache: "no-store",
    });
    if (!verifyResponse.ok) return NextResponse.json({ error: "LINEログインを確認できませんでした。" }, { status: 401 });
    const profile = await verifyResponse.json() as VerifiedLineProfile;
    if (!profile.sub || profile.aud !== channelId) return NextResponse.json({ error: "LINEユーザーを確認できませんでした。" }, { status: 401 });

    const database = getAdminFirestore();
    if (!database) return NextResponse.json({ error: "回答保存の設定が完了していません。" }, { status: 503 });
    await database.collection("surveyResponses").add({
      storeGroup,
      store,
      birthDate,
      message,
      lineUserId: profile.sub,
      lineDisplayName: profile.name ?? "LINEユーザー",
      linePictureUrl: profile.picture ?? "",
      source: "line-liff-survey",
      schemaVersion: 2,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error("Survey response API failed", cause);
    return NextResponse.json({ error: "送信処理に失敗しました。" }, { status: 500 });
  }
}
