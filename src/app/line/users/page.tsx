"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { firestore } from "@/lib/firebase/client";

type SurveyResponse = { id: string; lineUserId?: string; lineDisplayName?: string; linePictureUrl?: string; createdAt: Timestamp | null };
type LineUser = { id: string; lineUserId?: string; lineDisplayName?: string; linePictureUrl?: string; followed?: boolean; firstSeenAt?: Timestamp | null; lastSeenAt?: Timestamp | null };
type Customer = LineUser & { fallbackDate?: Timestamp | null };

export default function LineUsersPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [lineUsers, setLineUsers] = useState<LineUser[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firestore) { setError("Firebaseの設定が完了していません。"); setLoadingResponses(false); setLoadingUsers(false); return; }
    const stopResponses = onSnapshot(query(collection(firestore, "surveyResponses"), orderBy("createdAt", "desc")), snapshot => { setResponses(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<SurveyResponse, "id">) }))); setLoadingResponses(false); }, cause => { console.error("Failed to load responses", cause); setError("顧客データを読み込めませんでした。"); setLoadingResponses(false); });
    const stopUsers = onSnapshot(query(collection(firestore, "lineUsers"), orderBy("lastSeenAt", "desc")), snapshot => { setLineUsers(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<LineUser, "id">) }))); setLoadingUsers(false); }, cause => { console.error("Failed to load LINE users", cause); setError("LINE顧客データを読み込めませんでした。設定をご確認ください。"); setLoadingUsers(false); });
    return () => { stopResponses(); stopUsers(); };
  }, []);

  const allCustomers = useMemo(() => {
    const merged = new Map<string, Customer>();
    lineUsers.forEach(user => merged.set(user.lineUserId || user.id, user));
    responses.forEach(response => { const key = response.lineUserId || response.id; const user = merged.get(key); merged.set(key, { id: key, ...user, lineUserId: key, lineDisplayName: user?.lineDisplayName || response.lineDisplayName, linePictureUrl: user?.linePictureUrl || response.linePictureUrl, followed: user?.followed ?? true, fallbackDate: response.createdAt }); });
    return [...merged.values()];
  }, [lineUsers, responses]);
  const customers = useMemo(() => { const word = keyword.trim().toLocaleLowerCase("ja"); return allCustomers.filter(customer => !word || customer.lineDisplayName?.toLocaleLowerCase("ja").includes(word)); }, [allCustomers, keyword]);
  const loading = loadingResponses || loadingUsers;

  return <div className="customers-page"><header className="page-head"><div><h1>顧客一覧</h1><p>LINEで確認できた顧客の基本情報を確認できます。</p></div><span className="data-pill"><Icon name="users" />登録顧客：{allCustomers.length.toLocaleString("ja-JP")}人</span></header><section className="card customer-panel">
    <div className="customer-toolbar"><label className="customer-search"><span>顧客を検索</span><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="LINE表示名で検索" type="search" /></label><span className="customer-result">{customers.length.toLocaleString("ja-JP")}人を表示</span></div>
    {loading ? <p className="dashboard-status customer-status">顧客データを読み込んでいます…</p> : null}{error ? <p className="dashboard-error" role="alert">{error}</p> : null}
    {!loading && !error ? <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>LINEユーザー</th><th>友だち状態</th><th>登録日</th><th>最終確認日</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.lineUserId || customer.id}>
      <td><span className="customer-profile">{customer.linePictureUrl ? <img src={customer.linePictureUrl} alt="" /> : <span className="customer-avatar">{customer.lineDisplayName?.slice(0, 1) || "L"}</span>}<span><b>{customer.lineDisplayName || "LINEユーザー"}</b><small>LINE連携ユーザー</small></span></span></td>
      <td>{customer.followed === false ? "ブロック・友だち解除" : "友だち"}</td><td>{formatDate(customer.firstSeenAt || customer.fallbackDate || null)}</td><td>{formatDate(customer.lastSeenAt || customer.fallbackDate || null)}</td>
    </tr>)}</tbody></table>{!customers.length ? <p className="dashboard-empty">該当する顧客はいません。</p> : null}</div> : null}
  </section></div>;
}

function formatDate(value: Timestamp | null) { return value?.toDate().toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" }) ?? "—"; }
