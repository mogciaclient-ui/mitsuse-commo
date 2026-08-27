"use client";

import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import styles from "./coupon-settings.module.css";

type Coupon = { couponId: string; title: string };
const defaultMessage = "アンケートへのご回答ありがとうございます！\n感謝の気持ちとして、次回のお買い物で使える100円引きクーポンをお届けします。\nご利用の際は、会計前にこの画面を店員へお見せください。";

export function CouponSettings() {
  const [coupons, setCoupons] = useState<Coupon[]>([]); const [couponId, setCouponId] = useState(""); const [message, setMessage] = useState(defaultMessage); const [enabled, setEnabled] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const user = firebaseAuth?.currentUser; if (!user) { setResult({ ok: false, text: "管理者ログインを確認できませんでした。" }); setLoading(false); return; }
    try { const token = await user.getIdToken(); const response = await fetch("/api/line/coupons", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setCoupons(body.coupons ?? []); if (body.setting) { setCouponId(body.setting.couponId ?? ""); setMessage(body.setting.thankYouMessage ?? defaultMessage); setEnabled(body.setting.enabled === true); } }
    catch (cause) { setResult({ ok: false, text: cause instanceof Error ? cause.message : "クーポンを読み込めませんでした。" }); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    const user = firebaseAuth?.currentUser; const coupon = coupons.find(item => item.couponId === couponId); if (!user || !coupon) { setResult({ ok: false, text: "クーポンを選択してください。" }); return; }
    setSaving(true); setResult(null);
    try { const token = await user.getIdToken(); const response = await fetch("/api/line/coupons", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ couponId, couponTitle: coupon.title, thankYouMessage: message, enabled }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setResult({ ok: true, text: "アンケート回答特典を保存しました。" }); }
    catch (cause) { setResult({ ok: false, text: cause instanceof Error ? cause.message : "保存できませんでした。" }); } finally { setSaving(false); }
  }
  return <section className={`card ${styles.panel}`}><h2>アンケート回答特典</h2><p className={styles.lead}>回答後にLINEトークへ送る、お礼メッセージとクーポンを設定します。</p>{loading ? <p className={styles.loading}>LINEクーポンを読み込んでいます…</p> : <div className={styles.form}><label className={styles.label}>送信するクーポン<select className={styles.select} value={couponId} onChange={event => setCouponId(event.target.value)}><option value="">クーポンを選択</option>{coupons.map(coupon => <option key={coupon.couponId} value={coupon.couponId}>{coupon.title}</option>)}</select></label>{!coupons.length ? <p className={styles.hint}>利用可能なクーポンがありません。LINE公式アカウント側でクーポンが公開中になっているかご確認ください。</p> : null}<label className={styles.label}>お礼メッセージ<textarea className={styles.textarea} value={message} onChange={event => setMessage(event.target.value)} maxLength={5000} /></label><label className={styles.toggle}><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />アンケート回答後に自動送信する</label>{result ? <p className={result.ok ? styles.success : styles.error}>{result.text}</p> : null}<button className={styles.button} type="button" onClick={save} disabled={saving || !couponId || !message.trim()}>{saving ? "保存しています…" : "設定を保存"}</button></div>}</section>;
}
