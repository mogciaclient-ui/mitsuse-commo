import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyLineIdToken } from "@/lib/line/server";
import { isValidStore, normalizeBirthDate } from "@/lib/survey";

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

    const profile = await verifyLineIdToken(idToken);
    if (!profile) return NextResponse.json({ error: "LINEログインを確認できませんでした。" }, { status: 401 });

    const database = getAdminFirestore();
    if (!database) return NextResponse.json({ error: "回答保存の設定が完了していません。" }, { status: 503 });
    const previousResponses = await database.collection("surveyResponses")
      .where("lineUserId", "==", profile.sub)
      .limit(1)
      .get();
    if (!previousResponses.empty) {
      return NextResponse.json({ error: "このアンケートには回答済みです。", alreadySubmitted: true }, { status: 409 });
    }

    try {
      await database.collection("surveyResponses").doc(profile.sub).create({
      storeGroup,
      store,
      birthDate,
      message,
      lineUserId: profile.sub,
      lineDisplayName: profile.name ?? "LINEユーザー",
      linePictureUrl: profile.picture ?? "",
      source: "line-liff-survey",
      surveyId: "customer-profile-2026-08",
      surveyTitle: "お客様アンケート",
      schemaVersion: 2,
      createdAt: FieldValue.serverTimestamp(),
      });
    } catch (cause) {
      const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : "";
      if (code === "6" || code === "already-exists") {
        return NextResponse.json({ error: "このアンケートには回答済みです。", alreadySubmitted: true }, { status: 409 });
      }
      throw cause;
    }
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error("Survey response API failed", cause);
    return NextResponse.json({ error: "送信処理に失敗しました。" }, { status: 500 });
  }
}
