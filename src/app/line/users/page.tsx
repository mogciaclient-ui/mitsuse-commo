"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { firestore } from "@/lib/firebase/client";
import styles from "./page.module.css";

type SurveyResponse = { id: string; lineUserId?: string; lineDisplayName?: string; linePictureUrl?: string; storeGroup?: string; store?: string; birthDate?: string; message?: string; createdAt: Timestamp | null };
type LineUser = { id: string; lineUserId?: string; lineDisplayName?: string; linePictureUrl?: string; followed?: boolean; firstSeenAt?: Timestamp | null; lastSeenAt?: Timestamp | null };
type Customer = LineUser & { response?: SurveyResponse };

export default function LineUsersPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [lineUsers, setLineUsers] = useState<LineUser[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firestore) { setError("Firebaseの設定が完了していません。"); setLoadingResponses(false); setLoadingUsers(false); return; }
    const stopResponses = onSnapshot(query(collection(firestore, "surveyResponses"), orderBy("createdAt", "desc")), snapshot => {
      setResponses(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<SurveyResponse, "id">) }))); setLoadingResponses(false);
    }, cause => { console.error("Failed to load responses", cause); setError("顧客データを読み込めませんでした。"); setLoadingResponses(false); });
    const stopUsers = onSnapshot(query(collection(firestore, "lineUsers"), orderBy("lastSeenAt", "desc")), snapshot => {
      setLineUsers(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<LineUser, "id">) }))); setLoadingUsers(false);
    }, cause => { console.error("Failed to load LINE users", cause); setError("LINE顧客データを読み込めませんでした。Firestoreルールをご確認ください。"); setLoadingUsers(false); });
    return () => { stopResponses(); stopUsers(); };
  }, []);

  const allCustomers = useMemo(() => {
    const merged = new Map<string, Customer>();
    lineUsers.forEach(user => merged.set(user.lineUserId || user.id, user));
    responses.forEach(response => { const key = response.lineUserId || response.id; const user = merged.get(key); merged.set(key, { id: key, ...user, lineUserId: key, lineDisplayName: user?.lineDisplayName || response.lineDisplayName, linePictureUrl: user?.linePictureUrl || response.linePictureUrl, followed: user?.followed ?? true, response }); });
    return [...merged.values()];
  }, [lineUsers, responses]);
  const customers = useMemo(() => { const word = keyword.trim().toLocaleLowerCase("ja"); return allCustomers.filter(customer => !word || [customer.lineDisplayName, customer.response?.storeGroup, customer.response?.store, customer.response?.birthDate].some(value => value?.toLocaleLowerCase("ja").includes(word))); }, [allCustomers, keyword]);
  const loading = loadingResponses || loadingUsers;

  return <div className="customers-page"><header className="page-head"><div><h1>顧客一覧</h1><p>LINEで確認できたお友だちとアンケート回答状況を確認できます。</p></div><span className="data-pill"><Icon name="users" />登録顧客：{allCustomers.length.toLocaleString("ja-JP")}人</span></header><section className="card customer-panel">
    <div className="customer-toolbar"><label className="customer-search"><span>顧客を検索</span><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="表示名・購入店舗で検索" type="search" /></label><span className="customer-result">{customers.length.toLocaleString("ja-JP")}人を表示</span></div>
    {loading ? <p className="dashboard-status customer-status">顧客データを読み込んでいます…</p> : null}{error ? <p className="dashboard-error" role="alert">{error}</p> : null}
    {!loading && !error ? <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>LINEユーザー</th><th>アンケート</th><th>購入店舗</th><th>生年月日</th><th>登録・回答日</th><th>メッセージ</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.lineUserId || customer.id}>
      <td><span className="customer-profile">{customer.linePictureUrl ? <img src={customer.linePictureUrl} alt="" /> : <span className="customer-avatar">{customer.lineDisplayName?.slice(0, 1) || "L"}</span>}<span><b>{customer.lineDisplayName || "LINEユーザー"}</b><small>{customer.followed === false ? "ブロック・友だち解除" : "友だち"}</small></span></span></td>
      <td><span className={`${styles.answerBadge} ${customer.response ? styles.answered : styles.unanswered}`}>{customer.response ? "回答済み" : "未回答"}</span></td>
      <td><b className="customer-store">{customer.response?.store || "—"}</b><small className="customer-group">{customer.response?.storeGroup || ""}</small></td><td>{formatBirthDate(customer.response?.birthDate)}</td><td>{formatDate(customer.response?.createdAt || customer.firstSeenAt || null)}</td><td className="customer-message">{customer.response?.message || "—"}</td>
    </tr>)}</tbody></table>{!customers.length ? <p className="dashboard-empty">該当する顧客はいません。</p> : null}</div> : null}
  </section></div>;
}

function formatDate(value: Timestamp | null) { return value?.toDate().toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" }) ?? "—"; }
function formatBirthDate(value?: string) { if (!value) return "—"; const [year, month, day] = value.split("-"); return year && month && day ? `${year}年${Number(month)}月${Number(day)}日` : "—"; }
