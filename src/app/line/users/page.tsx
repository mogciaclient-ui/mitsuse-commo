"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { SegmentsDashboard } from "@/components/segments-dashboard";
import { firestore } from "@/lib/firebase/client";
import styles from "./customer-workspace.module.css";

type SurveyResponse = { id: string; lineUserId?: string; lineDisplayName?: string; linePictureUrl?: string; store?: string; storeGroup?: string; birthDate?: string; message?: string; createdAt: Timestamp | null };
type LineUser = { id: string; lineUserId?: string; lineDisplayName?: string; linePictureUrl?: string; followed?: boolean; firstSeenAt?: Timestamp | null; lastSeenAt?: Timestamp | null };
type Customer = LineUser & { fallbackDate?: Timestamp | null };

export default function LineUsersPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [lineUsers, setLineUsers] = useState<LineUser[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"customers" | "responses" | "segments">("customers");

  useEffect(() => { const selected = new URLSearchParams(window.location.search).get("view"); if (selected === "responses" || selected === "segments") setView(selected); }, []);

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

  function changeView(next: typeof view) { setView(next); window.history.replaceState(null, "", next === "customers" ? "/line/users" : `/line/users?view=${next}`); }

  return <div className="customers-page"><header className="page-head"><div><h1>顧客・アンケート</h1><p>顧客情報、アンケート回答、配信セグメントをまとめて確認できます。</p></div><span className="data-pill"><Icon name="users" />登録顧客：{allCustomers.length.toLocaleString("ja-JP")}人</span></header><nav className={styles.tabs}><button className={view === "customers" ? styles.active : ""} onClick={() => changeView("customers")}>顧客一覧</button><button className={view === "responses" ? styles.active : ""} onClick={() => changeView("responses")}>アンケート回答 <span>{responses.length}</span></button><button className={view === "segments" ? styles.active : ""} onClick={() => changeView("segments")}>セグメント配信</button></nav>{view === "customers" ? <section className="card customer-panel">
    <div className="customer-toolbar"><label className="customer-search"><span>顧客を検索</span><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="LINE表示名で検索" type="search" /></label><span className="customer-result">{customers.length.toLocaleString("ja-JP")}人を表示</span></div>
    {loading ? <p className="dashboard-status customer-status">顧客データを読み込んでいます…</p> : null}{error ? <p className="dashboard-error" role="alert">{error}</p> : null}
    {!loading && !error ? <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>LINEユーザー</th><th>友だち状態</th><th>登録日</th><th>最終確認日</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.lineUserId || customer.id}>
      <td><span className="customer-profile">{customer.linePictureUrl ? <img src={customer.linePictureUrl} alt="" /> : <span className="customer-avatar">{customer.lineDisplayName?.slice(0, 1) || "L"}</span>}<span><b>{customer.lineDisplayName || "LINEユーザー"}</b><small>LINE連携ユーザー</small></span></span></td>
      <td>{customer.followed === false ? "ブロック・友だち解除" : "友だち"}</td><td>{formatDate(customer.firstSeenAt || customer.fallbackDate || null)}</td><td>{formatDate(customer.lastSeenAt || customer.fallbackDate || null)}</td>
    </tr>)}</tbody></table>{!customers.length ? <p className="dashboard-empty">該当する顧客はいません。</p> : null}</div> : null}
  </section> : view === "responses" ? <section className={`card ${styles.responsePanel}`}><div className={styles.sectionHead}><div><h2>アンケート回答</h2><p>現在公開中のアンケートへ届いた回答です。</p></div><a href="/survey" target="_blank" rel="noreferrer">公開ページを確認</a></div>{loading ? <p className="dashboard-status">回答データを読み込んでいます…</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>回答日</th><th>LINEユーザー</th><th>購入店舗</th><th>生年月日</th><th>自由記述</th></tr></thead><tbody>{responses.map(response => <tr key={response.id}><td>{formatDate(response.createdAt)}</td><td>{response.lineDisplayName || "LINEユーザー"}</td><td>{response.store || "—"}</td><td>{formatBirthDate(response.birthDate)}</td><td className={styles.message}>{response.message || "—"}</td></tr>)}</tbody></table>{!responses.length ? <p className="dashboard-empty">回答はまだありません。</p> : null}</div>}</section> : <SegmentsDashboard responses={responses} users={lineUsers} />}</div>;
}

function formatDate(value: Timestamp | null) { return value?.toDate().toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" }) ?? "—"; }
function formatBirthDate(value?: string) { if (!value) return "—"; const [year, month, day] = value.split("-"); return year && month && day ? `${year}年${Number(month)}月${Number(day)}日` : "—"; }
