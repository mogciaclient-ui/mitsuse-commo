import Link from "next/link";
import styles from "./segments-dashboard.module.css";

type Response = { lineUserId?: string; store?: string; birthDate?: string; message?: string };
type User = { id: string; lineUserId?: string; followed?: boolean };

export function SegmentsDashboard({ responses, users }: { responses: Response[]; users: User[] }) {
  const active = users.filter(user => user.followed !== false);
  const answeredIds = new Set(responses.map(response => response.lineUserId).filter(Boolean));
  const unanswered = active.filter(user => !answeredIds.has(user.lineUserId || user.id)).length;
  const currentMonth = new Date().getMonth() + 1;
  const birthdays = responses.filter(response => Number(response.birthDate?.slice(5, 7)) === currentMonth).length;
  const messages = responses.filter(response => response.message?.trim()).length;
  const storeCounts = new Map<string, number>();
  responses.forEach(response => { if (response.store) storeCounts.set(response.store, (storeCounts.get(response.store) ?? 0) + 1); });
  const stores = [...storeCounts].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxStore = stores[0]?.[1] ?? 1;
  const monthCounts = Array.from({ length: 12 }, (_, index) => responses.filter(response => Number(response.birthDate?.slice(5, 7)) === index + 1).length);
  const summaries = [
    { label: "確認できる友だち", count: active.length, note: "LINE連携ユーザー" },
    { label: "アンケート回答済み", count: answeredIds.size, note: ratio(answeredIds.size, active.length) },
    { label: "アンケート未回答", count: unanswered, note: ratio(unanswered, active.length) },
    { label: "今月がお誕生日", count: birthdays, note: `${currentMonth}月生まれ` },
  ];
  return <div className={styles.summary}>{summaries.map(item => <article className={`card ${styles.summaryCard}`} key={item.label}><span>{item.label}</span><strong>{item.count.toLocaleString("ja-JP")}人</strong><small>{item.note}</small></article>)}<section className={styles.mainGrid} style={{ gridColumn: "1 / -1" }}><article className={`card ${styles.panel}`}><div className={styles.panelHead}><h2>購入店舗別セグメント</h2><span>{stores.length}店舗</span></div>{stores.map(([store, count]) => <div className={styles.storeRow} key={store}><span>{store}</span><div className={styles.bar}><i style={{ width: `${count / maxStore * 100}%` }} /></div><b>{count}人</b></div>)}{!stores.length ? <p className={styles.empty}>店舗データはまだありません。</p> : null}</article><article className={`card ${styles.panel}`}><div className={styles.panelHead}><h2>配信に使える対象</h2></div><div className={styles.actions}><Action title="アンケート未回答" text={`${unanswered}人へ回答をご案内`} target="unanswered" /><Action title="アンケート回答済み" text={`${answeredIds.size}人へお礼や商品情報をご案内`} target="answered" /><Action title="メッセージをくれた方" text={`${messages}人のお客様の声を確認できます`} /></div></article></section><section className={`card ${styles.panel}`} style={{ gridColumn: "1 / -1" }}><div className={styles.panelHead}><h2>誕生月別セグメント</h2><span>誕生日配信の参考</span></div><div className={styles.monthGrid}>{monthCounts.map((count, index) => <div className={styles.month} key={index}><span>{index + 1}月</span><b>{count}人</b></div>)}</div></section></div>;
}

function Action({ title, text, target }: { title: string; text: string; target?: string }) { return <div className={styles.action}><div><strong>{title}</strong><p>{text}</p></div>{target ? <Link href={`/line/broadcasts/composer?target=${target}`}>配信を作成</Link> : <Link href="/line/surveys/current">回答を見る</Link>}</div>; }
function ratio(value: number, total: number) { return total ? `${Math.round(value / total * 100)}%` : "0%"; }
