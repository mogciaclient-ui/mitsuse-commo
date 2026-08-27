"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { firestore } from "@/lib/firebase/client";

type SurveyResponse = {
  id: string;
  storeGroup: string;
  store: string;
  birthDate: string;
  message: string;
  lineDisplayName?: string;
  lineUserId?: string;
  linePictureUrl?: string;
  createdAt: Timestamp | null;
};

export default function AdminPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firestore) {
      setError("Firebaseの環境変数を設定すると回答データが表示されます。");
      setLoading(false);
      return;
    }
    const responsesQuery = query(collection(firestore, "surveyResponses"), orderBy("createdAt", "desc"));
    return onSnapshot(responsesQuery, snapshot => {
      setResponses(snapshot.docs.map(document => ({ id: document.id, ...(document.data() as Omit<SurveyResponse, "id">) })));
      setLoading(false);
      setError("");
    }, cause => {
      console.error("Failed to load survey responses", cause);
      setError("回答データを読み込めませんでした。Firestoreのルールをご確認ください。");
      setLoading(false);
    });
  }, []);

  const summary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = responses.filter(item => item.createdAt?.toDate() && item.createdAt.toDate() >= monthStart).length;
    const messages = responses.filter(item => item.message?.trim()).length;
    const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
    const birthdays = responses.filter(item => Number(item.birthDate?.slice(5, 7)) === nextMonth).length;
    const storeCounts = new Map<string, number>();
    responses.forEach(item => storeCounts.set(item.store, (storeCounts.get(item.store) ?? 0) + 1));
    const stores = [...storeCounts.entries()].sort((a, b) => b[1] - a[1]);
    return { thisMonth, messages, birthdays, stores, topStore: stores[0] };
  }, [responses]);

  return <>
    <header className="page-head"><div><h1>いいもの三瀬 LINE運用</h1><p>顧客とアンケートの状況をまとめて確認できます。</p></div></header>
    {loading ? <p className="dashboard-status">回答データを読み込んでいます…</p> : null}
    {error ? <p className="dashboard-error" role="alert">{error}</p> : null}

    <section className="kpi-grid">
      <Kpi icon="survey" label="総回答数" value={responses.length} unit="件" />
      <Kpi icon="chart" label="今月の回答" value={summary.thisMonth} unit="件" />
      <Kpi icon="users" label="来月がお誕生日" value={summary.birthdays} unit="人" />
      <Kpi icon="cursor" label="メッセージあり" value={summary.messages} unit="件" />
    </section>

    <section className="real-dashboard-grid">
      <section className="card panel"><div className="panel-title"><h2>購入店舗別の回答数</h2><span>{summary.stores.length}店舗</span></div><div className="store-ranking">{summary.stores.slice(0, 10).map(([store, count], index) => <div key={store}><b>{index + 1}</b><span>{store}</span><strong>{count}件</strong></div>)}{!summary.stores.length && !loading ? <Empty /> : null}</div></section>
      <section className="card panel"><div className="panel-title"><h2>最近のメッセージ</h2><span>{summary.messages}件</span></div><div className="message-list">{responses.filter(item => item.message?.trim()).slice(0, 5).map(item => <article key={item.id}><p>{item.message}</p><small>{item.store} ・ {formatDate(item.createdAt)}</small></article>)}{!summary.messages && !loading ? <Empty /> : null}</div></section>
    </section>

    <section className="card panel responses-panel"><div className="panel-title"><h2>最近の回答</h2><span>最新50件</span></div><div className="responses-table-wrap"><table className="responses-table"><thead><tr><th>回答日時</th><th>LINEユーザー</th><th>販売店</th><th>購入店舗</th><th>生年月日</th><th>ひとこと</th></tr></thead><tbody>{responses.slice(0, 50).map(item => <tr key={item.id}><td>{formatDate(item.createdAt)}</td><td><span className="line-user-cell">{item.linePictureUrl ? <img src={item.linePictureUrl} alt="" /> : null}<b>{item.lineDisplayName || "未連携"}</b></span></td><td>{item.storeGroup}</td><td>{item.store}</td><td>{formatBirthDate(item.birthDate)}</td><td className="response-message">{item.message || "—"}</td></tr>)}</tbody></table>{!responses.length && !loading ? <Empty /> : null}</div></section>
  </>;
}

function Kpi({ icon, label, value, unit }: { icon: "survey" | "chart" | "users" | "cursor"; label: string; value: number; unit: string }) {
  return <article className="card kpi"><span className="round-icon"><Icon name={icon} /></span><div><p>{label}</p><strong>{value.toLocaleString("ja-JP")}<small>{unit}</small></strong></div></article>;
}

function Empty() { return <p className="dashboard-empty">まだデータがありません。</p>; }
function formatDate(value: Timestamp | null) { return value?.toDate().toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) ?? "送信中"; }
function formatBirthDate(value: string) { const [year, month, day] = value.split("-"); return year && month && day ? `${year}年${Number(month)}月${Number(day)}日` : "—"; }
