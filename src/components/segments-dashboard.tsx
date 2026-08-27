"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./segments-dashboard.module.css";
import builder from "./segment-builder.module.css";

type Response = { lineUserId?: string; store?: string; birthDate?: string; message?: string };
type User = { id: string; lineUserId?: string; followed?: boolean };
type SegmentType = "unanswered" | "answered" | "birthday-next" | "store";

export function SegmentsDashboard({ responses, users }: { responses: Response[]; users: User[] }) {
  const [segmentType, setSegmentType] = useState<SegmentType>("unanswered");
  const [selectedStore, setSelectedStore] = useState("");
  const active = users.filter(user => user.followed !== false);
  const answeredIds = new Set(responses.map(response => response.lineUserId).filter(Boolean));
  const unanswered = active.filter(user => !answeredIds.has(user.lineUserId || user.id)).length;
  const nextMonth = new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2;
  const birthdays = responses.filter(response => Number(response.birthDate?.slice(5, 7)) === nextMonth).length;
  const messages = responses.filter(response => response.message?.trim()).length;
  const storeCounts = new Map<string, number>();
  responses.forEach(response => { if (response.store) storeCounts.set(response.store, (storeCounts.get(response.store) ?? 0) + 1); });
  const allStores = useMemo(() => [...storeCounts].sort((a, b) => b[1] - a[1]), [responses]);
  const stores = allStores.slice(0, 8); const maxStore = stores[0]?.[1] ?? 1;
  const monthCounts = Array.from({ length: 12 }, (_, index) => responses.filter(response => Number(response.birthDate?.slice(5, 7)) === index + 1).length);
  const target = segmentType === "store" ? `store:${selectedStore}` : segmentType;
  const selectedCount = segmentType === "unanswered" ? unanswered : segmentType === "answered" ? answeredIds.size : segmentType === "birthday-next" ? birthdays : storeCounts.get(selectedStore) ?? 0;
  const summaries = [{ label: "確認できる友だち", count: active.length, note: "LINE連携ユーザー" }, { label: "アンケート回答済み", count: answeredIds.size, note: ratio(answeredIds.size, active.length) }, { label: "アンケート未回答", count: unanswered, note: ratio(unanswered, active.length) }, { label: "来月がお誕生日", count: birthdays, note: `${nextMonth}月生まれ` }];

  return <div className={styles.summary}>{summaries.map(item => <article className={`card ${styles.summaryCard}`} key={item.label}><span>{item.label}</span><strong>{item.count.toLocaleString("ja-JP")}人</strong><small>{item.note}</small></article>)}
    <section className={`card ${builder.builder}`}><h2>配信対象を絞り込む</h2><p>条件を選んで対象人数を確認し、そのまま配信を作成できます。</p><div className={builder.fields}><label className={builder.field}>条件<select className={builder.select} value={segmentType} onChange={event => setSegmentType(event.target.value as SegmentType)}><option value="unanswered">アンケート未回答</option><option value="answered">アンケート回答済み</option><option value="birthday-next">来月がお誕生日</option><option value="store">購入店舗</option></select></label>{segmentType === "store" ? <label className={builder.field}>店舗<select className={builder.select} value={selectedStore} onChange={event => setSelectedStore(event.target.value)}><option value="">店舗を選択</option>{allStores.map(([store]) => <option key={store}>{store}</option>)}</select></label> : <div />}<div className={builder.result}><span>配信対象</span><strong>{selectedCount.toLocaleString("ja-JP")}人</strong></div></div><Link className={`${builder.send} ${!selectedCount || (segmentType === "store" && !selectedStore) ? builder.disabled : ""}`} href={`/line/broadcasts?view=compose&target=${encodeURIComponent(target)}`}>このセグメントに配信</Link></section>
    <section className={styles.mainGrid} style={{ gridColumn: "1 / -1" }}><article className={`card ${styles.panel}`}><div className={styles.panelHead}><h2>購入店舗別セグメント</h2><span>{allStores.length}店舗</span></div>{stores.map(([store, count]) => <div className={styles.storeRow} key={store}><span>{store}</span><div className={styles.bar}><i style={{ width: `${count / maxStore * 100}%` }} /></div><b>{count}人</b></div>)}{!stores.length ? <p className={styles.empty}>店舗データはまだありません。</p> : null}</article><article className={`card ${styles.panel}`}><div className={styles.panelHead}><h2>すぐに使える対象</h2></div><div className={styles.actions}><Action title="アンケート未回答" text={`${unanswered}人へ回答をご案内`} target="unanswered" /><Action title="来月がお誕生日" text={`${birthdays}人へ誕生日のお知らせ`} target="birthday-next" /><Action title="メッセージをくれた方" text={`${messages}人のお客様の声を確認できます`} /></div></article></section>
    <section className={`card ${styles.panel}`} style={{ gridColumn: "1 / -1" }}><div className={styles.panelHead}><h2>誕生月別セグメント</h2><span>誕生日配信の参考</span></div><div className={styles.monthGrid}>{monthCounts.map((count, index) => <div className={styles.month} key={index}><span>{index + 1}月</span><b>{count}人</b></div>)}</div></section>
  </div>;
}

function Action({ title, text, target }: { title: string; text: string; target?: string }) { return <div className={styles.action}><div><strong>{title}</strong><p>{text}</p></div>{target ? <Link href={`/line/broadcasts?view=compose&target=${target}`}>配信を作成</Link> : <Link href="/line/users?view=responses">回答を見る</Link>}</div>; }
function ratio(value: number, total: number) { return total ? `${Math.round(value / total * 100)}%` : "0%"; }
