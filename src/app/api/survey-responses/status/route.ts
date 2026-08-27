import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyLineIdToken } from "@/lib/line/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    const profile = await verifyLineIdToken(idToken);
    if (!profile) return NextResponse.json({ error: "LINEログインを確認できませんでした。" }, { status: 401 });

    const database = getAdminFirestore();
    if (!database) return NextResponse.json({ error: "回答確認の設定が完了していません。" }, { status: 503 });

    const canonicalResponse = await database.collection("surveyResponses").doc(profile.sub).get();
    if (canonicalResponse.exists) return NextResponse.json({ submitted: true });

    // 既にランダムIDで保存済みの過去回答も回答済みとして扱います。
    const previousResponses = await database.collection("surveyResponses")
      .where("lineUserId", "==", profile.sub)
      .limit(1)
      .get();
    return NextResponse.json({ submitted: !previousResponses.empty });
  } catch (cause) {
    console.error("Survey status API failed", cause);
    return NextResponse.json({ error: "回答状況を確認できませんでした。" }, { status: 500 });
  }
}
