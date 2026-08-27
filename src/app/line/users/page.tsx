"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { firestore } from "@/lib/firebase/client";

type Customer = { id: string; lineUserId?: string; lineDisplayName?: string; linePictureUrl?: string; storeGroup?: string; store?: string; birthDate?: string; message?: string; createdAt: Timestamp | null };

export default function LineUsersPage() {
  const [responses, setResponses] = useState<Customer[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firestore) { setError("Firebaseの設定が完了していません。"); setLoading(false); return; }
    const responsesQuery = query(collection(firestore, "surveyResponses"), orderBy("createdAt", "desc"));
    return onSnapshot(responsesQuery, snapshot => {
      setResponses(snapshot.docs.map(document => ({ id: document.id, ...(document.data() as Omit<Customer, "id">) })));
      setLoading(false); setError("");
    }, cause => { console.error("Failed to load LINE customers", cause); setError("顧客データを読み込めませんでした。"); setLoading(false); });
  }, []);

  const allCustomers = useMemo(() => {
    const unique = new Map<string, Customer>();
    responses.forEach(response => { const key = response.lineUserId || response.id; if (!unique.has(key)) unique.set(key, response); });
    return [...unique.values()];
  }, [responses]);
  const customers = useMemo(() => {
    const word = keyword.trim().toLocaleLowerCase("ja");
    return allCustomers.filter(customer => !word || [customer.lineDisplayName, customer.storeGroup, customer.store, customer.birthDate].some(value => value?.toLocaleLowerCase("ja").includes(word)));
  }, [allCustomers, keyword]);

  return <div className="customers-page">
    <header className="page-head"><div><h1>顧客一覧</h1><p>アンケートに回答したLINEのお友だちを確認できます。</p></div><span className="data-pill"><Icon name="users" />登録顧客：{allCustomers.length.toLocaleString("ja-JP")}人</span></header>
    <section className="card customer-panel">
      <div className="customer-toolbar"><label className="customer-search"><span>顧客を検索</span><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="表示名・購入店舗で検索" type="search" /></label><span className="customer-result">{customers.length.toLocaleString("ja-JP")}人を表示</span></div>
      {loading ? <p className="dashboard-status customer-status">顧客データを読み込んでいます…</p> : null}
      {error ? <p className="dashboard-error" role="alert">{error}</p> : null}
      {!loading && !error ? <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>LINEユーザー</th><th>購入店舗</th><th>生年月日</th><th>回答日</th><th>メッセージ</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.lineUserId || customer.id}>
        <td><span className="customer-profile">{customer.linePictureUrl ? <img src={customer.linePictureUrl} alt="" /> : <span className="customer-avatar">{customer.lineDisplayName?.slice(0, 1) || "L"}</span>}<span><b>{customer.lineDisplayName || "LINEユーザー"}</b><small>LINE連携済み</small></span></span></td>
        <td><b className="customer-store">{customer.store || "—"}</b><small className="customer-group">{customer.storeGroup || ""}</small></td><td>{formatBirthDate(customer.birthDate)}</td><td>{formatDate(customer.createdAt)}</td><td className="customer-message">{customer.message || "—"}</td>
      </tr>)}</tbody></table>{!customers.length ? <p className="dashboard-empty">該当する顧客はいません。</p> : null}</div> : null}
    </section>
  </div>;
}

function formatDate(value: Timestamp | null) { return value?.toDate().toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" }) ?? "送信中"; }
function formatBirthDate(value?: string) { if (!value) return "—"; const [year, month, day] = value.split("-"); return year && month && day ? `${year}年${Number(month)}月${Number(day)}日` : "—"; }
