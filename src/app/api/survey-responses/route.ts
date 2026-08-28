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
    const purchaseExperience = typeof body.purchaseExperience === "string" ? body.purchaseExperience : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const birthDate = normalizeBirthDate(Number(body.birthYear), Number(body.birthMonth), Number(body.birthDay));
    if (!idToken) return NextResponse.json({ error: "LINEログイン情報がありません。" }, { status: 401 });
    const hasValidExperience = ["yes", "no", "unknown"].includes(purchaseExperience);
    const hasValidStore = purchaseExperience !== "yes" || isValidStore(storeGroup, store);
    if (!hasValidExperience || !hasValidStore || !birthDate || message.length > 1000) return NextResponse.json({ error: "入力内容をご確認ください。" }, { status: 400 });

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

    const responseReference = database.collection("surveyResponses").doc(profile.sub);
    try {
      await responseReference.create({
      purchaseExperience,
      storeGroup: purchaseExperience === "yes" ? storeGroup : "",
      store: purchaseExperience === "yes" ? store : "",
      birthDate,
      message,
      lineUserId: profile.sub,
      lineDisplayName: profile.name ?? "LINEユーザー",
      linePictureUrl: profile.picture ?? "",
      source: "line-liff-survey",
      surveyId: "customer-profile-2026-08",
      surveyTitle: "お客様アンケート",
      schemaVersion: 3,
      createdAt: FieldValue.serverTimestamp(),
      });
    } catch (cause) {
      const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : "";
      if (code === "6" || code === "already-exists") {
        return NextResponse.json({ error: "このアンケートには回答済みです。", alreadySubmitted: true }, { status: 409 });
      }
      throw cause;
    }
    const rewardSent = await sendSurveyReward(database, profile.sub, responseReference);
    return NextResponse.json({ ok: true, rewardSent });
  } catch (cause) {
    console.error("Survey response API failed", cause);
    return NextResponse.json({ error: "送信処理に失敗しました。" }, { status: 500 });
  }
}

async function sendSurveyReward(database: NonNullable<ReturnType<typeof getAdminFirestore>>, lineUserId: string, responseReference: FirebaseFirestore.DocumentReference) {
  try {
    const [settingSnapshot, accessToken] = await Promise.all([
      database.collection("appSettings").doc("surveyReward").get(),
      Promise.resolve(process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN),
    ]);
    const setting = settingSnapshot.data();
    if (!settingSnapshot.exists || setting?.enabled !== true || !setting?.couponId || !setting?.thankYouMessage || !accessToken) return false;
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: lineUserId, messages: [{ type: "text", text: setting.thankYouMessage }, { type: "coupon", couponId: setting.couponId }] }),
    });
    if (!response.ok) {
      const detail = await response.text();
      await responseReference.update({ rewardDeliveryStatus: "failed", rewardDeliveryError: detail.slice(0, 500), rewardDeliveryUpdatedAt: FieldValue.serverTimestamp() });
      return false;
    }
    await responseReference.update({ rewardDeliveryStatus: "sent", rewardCouponId: setting.couponId, rewardCouponTitle: setting.couponTitle ?? "", rewardSentAt: FieldValue.serverTimestamp() });
    return true;
  } catch (cause) {
    console.error("Survey reward delivery failed", cause);
    try { await responseReference.update({ rewardDeliveryStatus: "failed", rewardDeliveryUpdatedAt: FieldValue.serverTimestamp() }); } catch { /* 回答保存は成功扱いにする */ }
    return false;
  }
}
