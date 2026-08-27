"use client";

import liff from "@line/liff";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidStore, normalizeBirthDate, storeGroups } from "@/lib/survey";

export default function SurveyPage() {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lineReady, setLineReady] = useState(false);
  const [lineDisplayName, setLineDisplayName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setError("LINE連携の準備中です。しばらくしてからお試しください。");
      return;
    }
    let active = true;
    void liff.init({ liffId }).then(async () => {
      if (!active) return;
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }
      const profile = await liff.getProfile();
      const idToken = liff.getIDToken();
      if (!idToken) throw new Error("LINE ID token is missing");
      const statusResponse = await fetch("/api/survey-responses/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const status = await statusResponse.json();
      if (!statusResponse.ok) throw new Error(status.error || "回答状況を確認できませんでした。");
      if (status.submitted) {
        router.replace("/survey/thanks");
        return;
      }
      if (active) {
        setLineDisplayName(profile.displayName);
        setLineReady(true);
        setError("");
      }
    }).catch(cause => {
      console.error("LIFF initialization failed", cause);
      if (active) setError("LINEログインを確認できませんでした。LINEからもう一度開いてください。");
    });
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const storeGroup = String(data.get("storeGroup") ?? "");
    const store = String(data.get("store") ?? "");
    const year = Number(data.get("birthYear"));
    const month = Number(data.get("birthMonth"));
    const day = Number(data.get("birthDay"));
    const message = String(data.get("message") ?? "").trim();
    const birthDate = normalizeBirthDate(year, month, day);

    if (!isValidStore(storeGroup, store)) {
      setError("購入店舗を選択してください。");
      return;
    }
    if (!birthDate) {
      setError("生年月日を正しく入力してください。");
      return;
    }

    const idToken = liff.getIDToken();
    if (!lineReady || !idToken) { setError("LINEログインを確認できませんでした。LINEからもう一度開いてください。"); return; }
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/survey-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, storeGroup, store, birthYear: year, birthMonth: month, birthDay: day, message }),
      });
      const result = await response.json();
      if (response.status === 409 && result.alreadySubmitted) {
        router.replace("/survey/thanks");
        return;
      }
      if (!response.ok) throw new Error(result.error || "送信に失敗しました。");
      router.replace("/survey/thanks");
    } catch (cause) {
      console.error("Failed to save survey response", cause);
      setError(cause instanceof Error ? cause.message : "送信できませんでした。通信環境をご確認ください。");
      setIsSubmitting(false);
    }
  }

  return <main className="survey-page">
    <section className="survey-card">
      <header className="survey-header"><div className="survey-logo">いいもの三瀬</div><span>お客様アンケート</span></header>
      <div className="survey-intro"><span className="survey-eyebrow">QUESTIONNAIRE</span><h1>いいもの三瀬から<br />うれしいお知らせをお届けします</h1><p>あなたに合ったお知らせをお届けするため、<br />簡単なアンケートにご協力ください。</p>{lineDisplayName ? <span className="line-welcome">{lineDisplayName}さんとして回答します</span> : <span className="line-welcome">LINEログインを確認しています…</span>}</div>
      <form onSubmit={handleSubmit}>
        <fieldset className="survey-field store-picker"><legend><b>1</b> 購入店舗 <em>必須</em></legend><label><span>まず販売店を選んでください</span><select name="storeGroup" required value={selectedGroup} onChange={event => setSelectedGroup(event.target.value)}><option value="" disabled>販売店を選ぶ</option>{Object.keys(storeGroups).map(group => <option key={group} value={group}>{group}</option>)}</select></label><label><span>次に店舗名を選んでください</span><select name="store" required defaultValue="" key={selectedGroup} disabled={!selectedGroup}><option value="" disabled>{selectedGroup ? "店舗名を選ぶ" : "先に販売店を選んでください"}</option>{selectedGroup && storeGroups[selectedGroup].map(store => <option key={store} value={store}>{store}</option>)}</select></label><small>候補を絞って、店舗名を見つけやすくしています</small></fieldset>
        <fieldset className="survey-field"><legend><b>2</b> 生年月日 <em>必須</em></legend><div className="birthdate-fields"><label><input name="birthYear" required type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1950" aria-label="生まれた年" /><span>年</span></label><label><input name="birthMonth" required type="text" inputMode="numeric" pattern="[0-9]{1,2}" maxLength={2} placeholder="1" aria-label="生まれた月" /><span>月</span></label><label><input name="birthDay" required type="text" inputMode="numeric" pattern="[0-9]{1,2}" maxLength={2} placeholder="1" aria-label="生まれた日" /><span>日</span></label></div><small>例：1950年 1月 1日</small></fieldset>
        <label className="survey-field"><span><b>3</b> いいもの三瀬へひとこと <em className="optional">任意</em></span><textarea name="message" rows={5} maxLength={1000} placeholder="ご意見やご要望など、伝えたいことがあればご自由にお書きください" /><small>お店へのメッセージや、あったらうれしいサービスなどをお聞かせください</small></label>
        {error ? <p className="survey-error" role="alert" aria-live="polite">{error}</p> : null}
        <button type="submit" className="survey-submit" disabled={isSubmitting || !lineReady}>{isSubmitting ? "送信しています…" : lineReady ? "回答を送信する" : "LINEログインを確認中…"}</button>
      </form>
      <p className="survey-note">ご回答いただいた情報は、サービスの改善およびご案内のためにのみ利用します。</p>
    </section>
  </main>;
}
