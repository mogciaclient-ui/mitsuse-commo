"use client";

import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import { SurveyOverview } from "@/components/survey-overview";
import { SurveyCatalog } from "@/components/survey-catalog";
import { CouponSettings } from "@/components/coupon-settings";
import { SegmentsDashboard } from "@/components/segments-dashboard";
import styles from "./line-admin-pages.module.css";

type Response = { id: string; lineUserId?: string; lineDisplayName?: string; purchaseExperience?: string; storeGroup?: string; store?: string; birthDate?: string; message?: string; createdAt?: Timestamp | null };
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
  if (section === "surveys/current") return <Surveys />;
  if (section === "surveys") return <SurveyList />;
  if (section === "segments") return <Segments />;
  if (section === "broadcasts/composer") return <Broadcasts composer />;
  if (section === "broadcasts") return <Broadcasts />;
  if (section === "analytics") return <AnalysisWorkspace />;
  if (section === "ai-suggestions") return <Suggestions />;
  if (section === "settings") return <Settings />;
  return <NotFound />;
}

function Header({ title, description }: { title: string; description: string }) { return <header className="page-head"><div><h1>{title}</h1><p>{description}</p></div></header>; }

function SurveyList() {
  const { responses } = useAdminData();
  return <div className={styles.stack}><Header title="アンケート一覧" description="現在公開中のアンケートと、過去のアンケートを確認できます。" /><SurveyCatalog responseCount={responses.length} /></div>;
}

function Surveys() {
  const { responses, loading } = useAdminData(); const [word, setWord] = useState(""); const [store, setStore] = useState("");
  const stores = useMemo(() => [...new Set(responses.map(item => item.store).filter(Boolean) as string[])].sort(), [responses]);
  const filtered = responses.filter(item => (!store || item.store === store) && (!word || [item.lineDisplayName, item.store, item.message].some(value => value?.includes(word))));
  return <div className={styles.stack}><Header title="アンケート" description="公開中のアンケート内容と、お客様から届いた回答を確認できます。" /><SurveyOverview responseCount={responses.length} /><CouponSettings /><section className={`card ${styles.panel}`}><div className={styles.toolbar}><input className={styles.input} value={word} onChange={e => setWord(e.target.value)} placeholder="表示名・メッセージで検索" /><select className={styles.select} value={store} onChange={e => setStore(e.target.value)}><option value="">すべての店舗</option>{stores.map(name => <option key={name}>{name}</option>)}</select></div>{loading ? <p className={styles.empty}>読み込んでいます…</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>回答日</th><th>LINEユーザー</th><th>購入経験</th><th>購入店舗</th><th>生年月日</th><th>メッセージ</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td>{date(item.createdAt)}</td><td>{item.lineDisplayName || "LINEユーザー"}</td><td>{purchaseLabel(item.purchaseExperience)}</td><td>{item.store || "—"}</td><td>{birth(item.birthDate)}</td><td className={styles.message}>{item.message || "—"}</td></tr>)}</tbody></table>{!filtered.length ? <p className={styles.empty}>回答がありません。</p> : null}</div>}</section></div>;
}

function Segments() {
  const { responses, users } = useAdminData();
  return <div className={styles.stack}><Header title="セグメント" description="顧客を条件ごとに分けて、配信対象を見つけられます。" /><SegmentsDashboard responses={responses} users={users} /></div>;
}

function Broadcasts({ composer = false }: { composer?: boolean }) {
  const { broadcasts, responses } = useAdminData(true); const [target, setTarget] = useState("all"); const [message, setMessage] = useState(""); const [purpose, setPurpose] = useState(""); const [sending, setSending] = useState(false); const [generating, setGenerating] = useState(false); const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null); const [view, setView] = useState<"compose" | "history" | "survey">(composer ? "compose" : "compose");
  useEffect(() => { const params = new URLSearchParams(window.location.search); const selected = params.get("target"); const selectedView = params.get("view"); if (selected && (["answered", "unanswered", "birthday-next"].includes(selected) || selected.startsWith("store:"))) setTarget(selected); if (selectedView === "history" || selectedView === "survey") setView(selectedView); }, []);
  function changeView(next: typeof view) { setView(next); window.history.replaceState(null, "", `/line/broadcasts?view=${next}`); }
  async function generate() { const user = firebaseAuth?.currentUser; if (!user || !purpose.trim()) return; setGenerating(true); setResult(null); try { const token = await user.getIdToken(); const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "compose", target, purpose }) }); const body = await readJson(response); if (!response.ok) throw new Error(body.error || "配信文を作成できませんでした。"); setMessage(body.message ?? ""); } catch (cause) { setResult({ ok: false, text: cause instanceof Error ? cause.message : "配信文を作成できませんでした。" }); } finally { setGenerating(false); } }
  async function send() { if (!message.trim() || !window.confirm("選択した顧客へ、このメッセージを配信します。よろしいですか？")) return; const user = firebaseAuth?.currentUser; if (!user) return; setSending(true); setResult(null); try { const token = await user.getIdToken(); const response = await fetch("/api/line/broadcasts", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ target, message }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setResult({ ok: true, text: `${body.recipientCount}人へ配信しました。` }); setMessage(""); } catch (cause) { setResult({ ok: false, text: cause instanceof Error ? cause.message : "配信に失敗しました。" }); } finally { setSending(false); } }
  const composerPanel = <section className={`card ${styles.panel}`}><div className={styles.composer}><label>配信対象<select className={styles.select} value={target} onChange={e => setTarget(e.target.value)}><option value="all">確認できる友だち全員</option><option value="answered">アンケート回答済み</option><option value="unanswered">アンケート未回答</option><option value="birthday-next">来月がお誕生日</option>{target.startsWith("store:") ? <option value={target}>{targetLabel(target)}</option> : null}</select></label><div className={styles.aiComposer}><label>AIに伝える内容<input className={styles.input} value={purpose} onChange={e => setPurpose(e.target.value)} maxLength={500} placeholder="例：来月誕生日の方へ、次回100円引きのお知らせ" /></label><button className={styles.aiButton} disabled={generating || !purpose.trim()} onClick={generate}>{generating ? "作成しています…" : "AIで配信文を作る"}</button></div><label>メッセージ<textarea className={styles.textarea} value={message} onChange={e => setMessage(e.target.value)} maxLength={5000} placeholder="配信するメッセージを入力" /></label>{result ? <p className={result.ok ? styles.success : styles.error}>{result.text}</p> : null}<button className={styles.button} disabled={sending || !message.trim()} onClick={send}>{sending ? "配信しています…" : "確認して配信する"}</button></div></section>;
  return <div className={styles.stack}><Header title="配信ワークスペース" description="配信文の作成から結果確認、アンケート特典まで一か所で管理できます。" /><nav className={styles.workspaceTabs}><button className={view === "compose" ? styles.activeTab : ""} onClick={() => changeView("compose")}>配信を作成</button><button className={view === "history" ? styles.activeTab : ""} onClick={() => changeView("history")}>配信履歴 <span>{broadcasts.length}</span></button><button className={view === "survey" ? styles.activeTab : ""} onClick={() => changeView("survey")}>アンケート設定</button></nav>{view === "compose" ? composerPanel : view === "history" ? <section className={`card ${styles.panel}`}><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>配信日時</th><th>対象</th><th>人数</th><th>状態</th><th>内容</th></tr></thead><tbody>{broadcasts.map(item => <tr key={item.id}><td>{date(item.sentAt || item.createdAt)}</td><td>{targetLabel(item.target)}</td><td>{item.recipientCount ?? 0}人</td><td>{item.status === "sent" ? "配信済み" : item.status === "failed" ? "失敗" : "処理中"}</td><td className={styles.message}>{item.message}</td></tr>)}</tbody></table>{!broadcasts.length ? <p className={styles.empty}>配信履歴はまだありません。</p> : null}</div></section> : <><SurveyOverview responseCount={responses.length} /><CouponSettings /></>}</div>;
}

function AnalysisWorkspace() {
  return <div className={styles.stack}><Analytics /><Suggestions embedded /></div>;
}

function Analytics({ data }: { data?: { responses: Response[]; users: User[] } } = {}) {
  const loaded = useAdminData(); const { responses, users } = data ?? loaded; const active = users.filter(u => u.followed !== false).length; const rate = active ? Math.min(100, Math.round(responses.length / active * 100)) : 0; const counts = new Map<string, number>(); responses.forEach(r => counts.set(r.store || "未設定", (counts.get(r.store || "未設定") || 0) + 1)); const ranking = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 10); const max = ranking[0]?.[1] || 1;
  return <div className={styles.stack}>{!data ? <Header title="全体分析" description="LINE顧客とアンケートの状況をまとめて確認できます。" /> : null}<div className={styles.grid}><Metric name="確認できる友だち" value={`${active}人`} /><Metric name="アンケート回答" value={`${responses.length}件`} /><Metric name="回答率" value={`${rate}%`} /></div><section className={`card ${styles.panel}`}><h2>購入店舗別の回答数</h2>{ranking.map(([name, count]) => <div className={styles.barRow} key={name}><span>{name}</span><div className={styles.bar}><i style={{ width: `${count / max * 100}%` }} /></div><b>{count}</b></div>)}{!ranking.length ? <p className={styles.empty}>集計データがありません。</p> : null}</section></div>;
}

function Suggestions({ embedded = false }: { embedded?: boolean } = {}) {
  const [analysis, setAnalysis] = useState<{ summary: string; insights: { title: string; detail: string }[]; actions: { title: string; detail: string }[] } | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function analyze() { const user = firebaseAuth?.currentUser; if (!user) return; setLoading(true); setError(""); try { const token = await user.getIdToken(); const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "analyze" }) }); const body = await readJson(response); if (!response.ok) throw new Error(body.error || "分析できませんでした。"); setAnalysis(body); } catch (cause) { setError(cause instanceof Error ? cause.message : "分析できませんでした。"); } finally { setLoading(false); } }
  return <div className={styles.stack}>{embedded ? <div className={styles.inlineHead}><div><h2>AIによる分析</h2><p>集計と自由記述から次の施策を提案します。</p></div><button className={styles.aiButton} disabled={loading} onClick={analyze}>{loading ? "分析しています…" : analysis ? "もう一度分析" : "AIで分析する"}</button></div> : <header className="page-head"><div><h1>AI提案</h1><p>アンケート回答や配信状況をAIが読み取り、傾向と次の施策を提案します。</p></div><button className="primary" disabled={loading} onClick={analyze}>{loading ? "分析しています…" : analysis ? "もう一度分析" : "AIで分析する"}</button></header>}{error ? <p className={styles.error}>{error}</p> : null}{!analysis ? <section className={`card ${styles.aiEmpty}`}><strong>最新データをまとめて分析</strong><p>店舗別の回答数、自由記述、配信人数をもとに、注目点と次に試す施策を提案します。</p></section> : <><section className={`card ${styles.analysisSummary}`}><small>AIによる要約</small><p>{analysis.summary}</p></section><div className={styles.grid}>{analysis.insights.map(item => <article className={`card ${styles.suggestion}`} key={item.title}><small>注目ポイント</small><h2>{item.title}</h2><p>{item.detail}</p></article>)}</div><section className={`card ${styles.panel}`}><h2>次に試す施策</h2><div className={styles.actionList}>{analysis.actions.map((item, index) => <div key={item.title}><b>{index + 1}. {item.title}</b><p>{item.detail}</p></div>)}</div></section></>}</div>;
}

function Settings() { const settings = [{ name: "LIFFアンケート", text: "LINEログインとアンケート回答の連携", value: process.env.NEXT_PUBLIC_LIFF_ID ? "設定済み" : "未設定" }, { name: "Webhook URL", text: "LINE Developersに設定する受信先", value: "/api/line/webhook" }, { name: "顧客データ", text: "LINEイベントとアンケート回答を統合", value: "有効" }, { name: "管理者認証", text: "Firebase Authenticationによる管理画面保護", value: firebaseAuth ? "有効" : "未設定" }]; return <div className={styles.stack}><Header title="設定" description="LINE連携と管理画面の設定状況を確認できます。" /><section className={styles.settings}>{settings.map(item => <div className={styles.setting} key={item.name}><div><b>{item.name}</b><small>{item.text}</small></div><span className={styles.status}>{item.value}</span></div>)}</section></div>; }
function Metric({ name, value }: { name: string; value: string }) { return <article className={`card ${styles.metric}`}><span>{name}</span><strong>{value}</strong></article>; }
function NotFound() { return <><Header title="管理画面" description="ページが見つかりません。" /></>; }
function date(value?: Timestamp | null) { return value?.toDate().toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) || "—"; }
function birth(value?: string) { if (!value) return "—"; const [y, m, d] = value.split("-"); return `${y}年${Number(m)}月${Number(d)}日`; }
function purchaseLabel(value?: string) { return value === "yes" ? "はい" : value === "no" ? "いいえ" : value === "unknown" ? "わからない" : "未回答（項目追加前）"; }
function targetLabel(value?: string) { return value === "answered" ? "回答済み" : value === "unanswered" ? "未回答" : value === "birthday-next" ? "来月がお誕生日" : value?.startsWith("store:") ? `購入店舗：${value.slice(6)}` : "全員"; }
async function readJson(response: globalThis.Response) { const text = await response.text(); if (!text) return {}; try { return JSON.parse(text); } catch { return {}; } }
