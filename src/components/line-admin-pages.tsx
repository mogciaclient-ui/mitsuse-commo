"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import { SurveyOverview } from "@/components/survey-overview";
import styles from "./line-admin-pages.module.css";

type Response = { id: string; lineUserId?: string; lineDisplayName?: string; storeGroup?: string; store?: string; birthDate?: string; message?: string; createdAt?: Timestamp | null };
type User = { id: string; lineUserId?: string; lineDisplayName?: string; followed?: boolean };
type Broadcast = { id: string; message?: string; target?: string; recipientCount?: number; status?: string; createdAt?: Timestamp | null; sentAt?: Timestamp | null };

function useAdminData(includeBroadcasts = false) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!firestore) { setLoading(false); return; }
    let responseReady = false; let userReady = false;
    const done = () => { if (responseReady && userReady) setLoading(false); };
    const stops = [
      onSnapshot(query(collection(firestore, "surveyResponses"), orderBy("createdAt", "desc")), snap => { setResponses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Response))); responseReady = true; done(); }),
      onSnapshot(collection(firestore, "lineUsers"), snap => { setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))); userReady = true; done(); }),
    ];
    if (includeBroadcasts) stops.push(onSnapshot(query(collection(firestore, "broadcasts"), orderBy("createdAt", "desc")), snap => setBroadcasts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast))), cause => console.error("Failed to load broadcasts", cause)));
    return () => stops.forEach(stop => stop());
  }, [includeBroadcasts]);
  return { responses, users, broadcasts, loading };
}

export function LineAdminPage({ section }: { section: string }) {
  if (section === "surveys") return <Surveys />;
  if (section === "segments") return <Segments />;
  if (section === "broadcasts") return <Broadcasts />;
  if (section === "analytics") return <Analytics />;
  if (section === "ai-suggestions") return <Suggestions />;
  if (section === "settings") return <Settings />;
  return <NotFound />;
}

function Header({ title, description }: { title: string; description: string }) { return <header className="page-head"><div><h1>{title}</h1><p>{description}</p></div></header>; }

function Surveys() {
  const { responses, loading } = useAdminData(); const [word, setWord] = useState(""); const [store, setStore] = useState("");
  const stores = useMemo(() => [...new Set(responses.map(item => item.store).filter(Boolean) as string[])].sort(), [responses]);
  const filtered = responses.filter(item => (!store || item.store === store) && (!word || [item.lineDisplayName, item.store, item.message].some(value => value?.includes(word))));
  return <div className={styles.stack}><Header title="アンケート" description="公開中のアンケート内容と、お客様から届いた回答を確認できます。" /><SurveyOverview responseCount={responses.length} /><section className={`card ${styles.panel}`}><div className={styles.toolbar}><input className={styles.input} value={word} onChange={e => setWord(e.target.value)} placeholder="表示名・メッセージで検索" /><select className={styles.select} value={store} onChange={e => setStore(e.target.value)}><option value="">すべての店舗</option>{stores.map(name => <option key={name}>{name}</option>)}</select></div>{loading ? <p className={styles.empty}>読み込んでいます…</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>回答日</th><th>LINEユーザー</th><th>購入店舗</th><th>生年月日</th><th>メッセージ</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td>{date(item.createdAt)}</td><td>{item.lineDisplayName || "LINEユーザー"}</td><td>{item.store || "—"}</td><td>{birth(item.birthDate)}</td><td className={styles.message}>{item.message || "—"}</td></tr>)}</tbody></table>{!filtered.length ? <p className={styles.empty}>回答がありません。</p> : null}</div>}</section></div>;
}

function Segments() {
  const { responses, users } = useAdminData(); const answered = new Set(responses.map(r => r.lineUserId).filter(Boolean)); const active = users.filter(u => u.followed !== false); const nowMonth = new Date().getMonth() + 1;
  const values = [{ name: "アンケート回答済み", count: answered.size, text: "回答内容を使ったご案内ができます" }, { name: "アンケート未回答", count: active.filter(u => !answered.has(u.lineUserId || u.id)).length, text: "アンケートへの回答を促す対象です" }, { name: "今月がお誕生日", count: responses.filter(r => Number(r.birthDate?.slice(5, 7)) === nowMonth).length, text: "誕生日のお知らせに利用できます" }, { name: "現在確認できる友だち", count: active.length, text: "Webhookで確認できたユーザーです" }];
  return <div className={styles.stack}><Header title="セグメント" description="顧客を条件ごとに分けて確認できます。" /><div className={styles.segments}>{values.map(item => <article className={`card ${styles.segment}`} key={item.name}><span>{item.name}</span><strong>{item.count.toLocaleString("ja-JP")}人</strong><p>{item.text}</p></article>)}</div><p className={styles.notice}>未認証アカウントのため、友だち数はWebhook設定後に反応があったユーザーを基準にしています。</p></div>;
}

function Broadcasts() {
  const { broadcasts } = useAdminData(true); const [target, setTarget] = useState("all"); const [message, setMessage] = useState(""); const [sending, setSending] = useState(false); const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  async function send() { if (!message.trim() || !window.confirm("選択した顧客へ、このメッセージを配信します。よろしいですか？")) return; const user = firebaseAuth?.currentUser; if (!user) return; setSending(true); setResult(null); try { const token = await user.getIdToken(); const response = await fetch("/api/line/broadcasts", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ target, message }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setResult({ ok: true, text: `${body.recipientCount}人へ配信しました。` }); setMessage(""); } catch (cause) { setResult({ ok: false, text: cause instanceof Error ? cause.message : "配信に失敗しました。" }); } finally { setSending(false); } }
  return <div className={styles.stack}><Header title="配信" description="Webhookで確認できたLINEのお友だちへメッセージを配信します。" /><section id="composer" className={`card ${styles.panel}`}><h2>新しい配信</h2><div className={styles.composer}><label>配信対象<select className={styles.select} value={target} onChange={e => setTarget(e.target.value)}><option value="all">確認できる友だち全員</option><option value="answered">アンケート回答済み</option><option value="unanswered">アンケート未回答</option></select></label><label>メッセージ<textarea className={styles.textarea} value={message} onChange={e => setMessage(e.target.value)} maxLength={5000} placeholder="配信するメッセージを入力" /></label>{result ? <p className={result.ok ? styles.success : styles.error}>{result.text}</p> : null}<button className={styles.button} disabled={sending || !message.trim()} onClick={send}>{sending ? "配信しています…" : "確認して配信する"}</button></div></section><section className={`card ${styles.panel}`}><h2>配信履歴</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>配信日時</th><th>対象</th><th>人数</th><th>状態</th><th>内容</th></tr></thead><tbody>{broadcasts.map(item => <tr key={item.id}><td>{date(item.sentAt || item.createdAt)}</td><td>{targetLabel(item.target)}</td><td>{item.recipientCount ?? 0}人</td><td>{item.status === "sent" ? "配信済み" : item.status === "failed" ? "失敗" : "処理中"}</td><td className={styles.message}>{item.message}</td></tr>)}</tbody></table>{!broadcasts.length ? <p className={styles.empty}>配信履歴はまだありません。</p> : null}</div></section></div>;
}

function Analytics() {
  const { responses, users } = useAdminData(); const active = users.filter(u => u.followed !== false).length; const rate = active ? Math.min(100, Math.round(responses.length / active * 100)) : 0; const counts = new Map<string, number>(); responses.forEach(r => counts.set(r.store || "未設定", (counts.get(r.store || "未設定") || 0) + 1)); const ranking = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 10); const max = ranking[0]?.[1] || 1;
  return <div className={styles.stack}><Header title="全体分析" description="LINE顧客とアンケートの状況をまとめて確認できます。" /><div className={styles.grid}><Metric name="確認できる友だち" value={`${active}人`} /><Metric name="アンケート回答" value={`${responses.length}件`} /><Metric name="回答率" value={`${rate}%`} /></div><section className={`card ${styles.panel}`}><h2>購入店舗別の回答数</h2>{ranking.map(([name, count]) => <div className={styles.barRow} key={name}><span>{name}</span><div className={styles.bar}><i style={{ width: `${count / max * 100}%` }} /></div><b>{count}</b></div>)}{!ranking.length ? <p className={styles.empty}>集計データがありません。</p> : null}</section></div>;
}

function Suggestions() {
  const { responses, users } = useAdminData(); const unanswered = Math.max(0, users.filter(u => u.followed !== false).length - new Set(responses.map(r => r.lineUserId)).size); const messages = responses.filter(r => r.message?.trim()).length;
  const suggestions = [{ label: "回答促進", title: `未回答の${unanswered}人へアンケートをご案内`, text: "短い案内文とLIFF URLを配信すると、回答者を増やせます。" }, { label: "お客様の声", title: `${messages}件のメッセージを店舗改善に活用`, text: "寄せられたご意見を定期的に確認し、店舗ごとの改善につなげましょう。" }, { label: "継続配信", title: "購入店舗に合わせたお知らせ", text: "購入店舗別に商品情報やキャンペーンを案内すると、内容を身近に感じてもらえます。" }];
  return <div className={styles.stack}><Header title="AI提案" description="現在の顧客・回答状況をもとに次のアクションを提案します。" /><div className={styles.grid}>{suggestions.map(item => <article className={`card ${styles.suggestion}`} key={item.title}><small>{item.label}</small><h2>{item.title}</h2><p>{item.text}</p></article>)}</div></div>;
}

function Settings() { const settings = [{ name: "LIFFアンケート", text: "LINEログインとアンケート回答の連携", value: process.env.NEXT_PUBLIC_LIFF_ID ? "設定済み" : "未設定" }, { name: "Webhook URL", text: "LINE Developersに設定する受信先", value: "/api/line/webhook" }, { name: "顧客データ", text: "LINEイベントとアンケート回答を統合", value: "有効" }, { name: "管理者認証", text: "Firebase Authenticationによる管理画面保護", value: firebaseAuth ? "有効" : "未設定" }]; return <div className={styles.stack}><Header title="設定" description="LINE連携と管理画面の設定状況を確認できます。" /><section className={styles.settings}>{settings.map(item => <div className={styles.setting} key={item.name}><div><b>{item.name}</b><small>{item.text}</small></div><span className={styles.status}>{item.value}</span></div>)}</section><p className={styles.notice}>秘密情報は管理画面に表示しません。Messaging APIのChannel secretとアクセストークンはVercelの環境変数で管理してください。</p></div>; }
function Metric({ name, value }: { name: string; value: string }) { return <article className={`card ${styles.metric}`}><span>{name}</span><strong>{value}</strong></article>; }
function NotFound() { return <><Header title="管理画面" description="ページが見つかりません。" /></>; }
function date(value?: Timestamp | null) { return value?.toDate().toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) || "—"; }
function birth(value?: string) { if (!value) return "—"; const [y, m, d] = value.split("-"); return `${y}年${Number(m)}月${Number(d)}日`; }
function targetLabel(value?: string) { return value === "answered" ? "回答済み" : value === "unanswered" ? "未回答" : "全員"; }
