import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const auth = getAdminAuth();
    const database = getAdminFirestore();
    const authorization = request.headers.get("authorization") ?? "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!auth || !database || !idToken) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
    await auth.verifyIdToken(idToken);
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const target = ["all", "answered", "unanswered"].includes(body.target) ? body.target as string : "";
    if (!message || message.length > 5000 || !target) return NextResponse.json({ error: "配信内容をご確認ください。" }, { status: 400 });
    const accessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ error: "Messaging APIのアクセストークンが設定されていません。" }, { status: 503 });
    const [usersSnapshot, responsesSnapshot] = await Promise.all([database.collection("lineUsers").where("followed", "==", true).get(), database.collection("surveyResponses").get()]);
    const answeredIds = new Set(responsesSnapshot.docs.map(doc => doc.get("lineUserId")).filter((id): id is string => typeof id === "string"));
    const webhookIds = usersSnapshot.docs.map(doc => doc.get("lineUserId") || doc.id).filter((id): id is string => typeof id === "string");
    const knownIds = [...new Set([...webhookIds, ...answeredIds])];
    const recipients = knownIds.filter(id => target === "all" || (target === "answered" ? answeredIds.has(id) : !answeredIds.has(id)));
    if (!recipients.length) return NextResponse.json({ error: "配信対象の顧客がいません。" }, { status: 400 });
    const record = await database.collection("broadcasts").add({ message, target, recipientCount: recipients.length, status: "sending", createdAt: FieldValue.serverTimestamp() });
    for (let index = 0; index < recipients.length; index += 500) {
      const response = await fetch("https://api.line.me/v2/bot/message/multicast", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ to: recipients.slice(index, index + 500), messages: [{ type: "text", text: message }] }) });
      if (!response.ok) { const detail = await response.text(); await record.update({ status: "failed", error: detail.slice(0, 500), updatedAt: FieldValue.serverTimestamp() }); return NextResponse.json({ error: "LINEへの配信に失敗しました。" }, { status: 502 }); }
    }
    await record.update({ status: "sent", sentAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true, recipientCount: recipients.length });
  } catch (cause) {
    console.error("LINE broadcast failed", cause);
    return NextResponse.json({ error: "配信処理に失敗しました。" }, { status: 500 });
  }
}
