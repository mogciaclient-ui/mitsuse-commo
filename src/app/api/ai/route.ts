import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

type OpenAIResponse = { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

export async function POST(request: Request) {
  try {
    const auth = getAdminAuth();
    const database = getAdminFirestore();
    const authorization = request.headers.get("authorization") ?? "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!auth || !database || !idToken) return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
    await auth.verifyIdToken(idToken);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OpenAI APIキーが設定されていません。" }, { status: 503 });
    const body = await request.json();
    const action = body.action === "analyze" ? "analyze" : body.action === "compose" ? "compose" : "";
    if (!action) return NextResponse.json({ error: "処理内容が正しくありません。" }, { status: 400 });

    const format = action === "compose" ? composeSchema : analysisSchema;
    const input = action === "compose" ? await composeInput(body) : await analysisInput(database);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        store: false,
        instructions: action === "compose" ? composeInstructions : analysisInstructions,
        input: JSON.stringify(input),
        max_output_tokens: action === "compose" ? 500 : 1200,
        text: { format },
      }),
    });
    const raw = await response.text();
    if (!response.ok) {
      console.error("OpenAI API failed", response.status, raw.slice(0, 800));
      return NextResponse.json({ error: "AI処理に失敗しました。しばらくしてから再度お試しください。" }, { status: 502 });
    }
    const result = JSON.parse(raw) as OpenAIResponse;
    const output = result.output?.flatMap(item => item.content ?? []).find(item => item.type === "output_text")?.text;
    if (!output) return NextResponse.json({ error: "AIから回答を取得できませんでした。" }, { status: 502 });
    return NextResponse.json(JSON.parse(output));
  } catch (cause) {
    console.error("AI request failed", cause);
    return NextResponse.json({ error: "AI処理に失敗しました。" }, { status: 500 });
  }
}

async function composeInput(body: Record<string, unknown>) {
  const purpose = typeof body.purpose === "string" ? body.purpose.trim().slice(0, 500) : "";
  const target = typeof body.target === "string" ? body.target.slice(0, 200) : "all";
  if (!purpose) throw new Error("配信内容が入力されていません。");
  return { business: "佐賀県三瀬のれんこん商品を扱う『いいもの三瀬』", channel: "LINE公式アカウント", audience: targetLabel(target), purpose };
}

async function analysisInput(database: NonNullable<ReturnType<typeof getAdminFirestore>>) {
  const [usersSnapshot, responsesSnapshot, broadcastsSnapshot] = await Promise.all([
    database.collection("lineUsers").get(),
    database.collection("surveyResponses").orderBy("createdAt", "desc").limit(500).get(),
    database.collection("broadcasts").orderBy("createdAt", "desc").limit(50).get(),
  ]);
  const responses = responsesSnapshot.docs.map(doc => doc.data());
  const stores = new Map<string, number>();
  responses.forEach(item => { const store = typeof item.store === "string" ? item.store : "未設定"; stores.set(store, (stores.get(store) ?? 0) + 1); });
  return {
    friendCount: usersSnapshot.docs.filter(doc => doc.get("followed") !== false).length,
    responseCount: responses.length,
    storeCounts: [...stores].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([store, count]) => ({ store, count })),
    recentBroadcasts: broadcastsSnapshot.docs.map(doc => ({ target: doc.get("target") ?? "all", recipientCount: doc.get("recipientCount") ?? 0, status: doc.get("status") ?? "unknown" })),
  };
}

function targetLabel(target: string) {
  if (target === "answered") return "アンケート回答済みのお客様";
  if (target === "unanswered") return "アンケート未回答のお客様";
  if (target === "birthday-next") return "来月がお誕生日のお客様";
  if (target.startsWith("store:")) return `${target.slice(6)}で購入したお客様`;
  return "確認できるLINE友だち全員";
}

const composeInstructions = "あなたは『いいもの三瀬』のLINE配信担当です。高齢のお客様にも読みやすい、やさしく簡潔な日本語で配信文を1案作成してください。事実や特典を創作せず、入力にない価格・期限・URLを加えないでください。絵文字は0〜2個、本文は250文字以内にしてください。";
const analysisInstructions = "あなたは『いいもの三瀬』の販促分析担当です。渡された集計データだけを根拠に、経営者がすぐ理解できる簡潔な日本語で分析してください。因果関係を断定せず、データが少ない場合はその旨を明記してください。個人の特定やセンシティブな推測はしないでください。";

const composeSchema = { type: "json_schema", name: "line_message", strict: true, schema: { type: "object", properties: { message: { type: "string" }, note: { type: "string" } }, required: ["message", "note"], additionalProperties: false } };
const analysisSchema = { type: "json_schema", name: "business_analysis", strict: true, schema: { type: "object", properties: { summary: { type: "string" }, insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" } }, required: ["title", "detail"], additionalProperties: false } }, actions: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" } }, required: ["title", "detail"], additionalProperties: false } } }, required: ["summary", "insights", "actions"], additionalProperties: false } };
