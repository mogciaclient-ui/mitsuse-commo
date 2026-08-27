"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";

// 店舗一覧を受け取り次第、この配列だけを差し替えます。
const storeGroups: Record<string, string[]> = {
  "いい麺亭": ["いい麺亭"],
  "マックスバリュ": ["マックスバリュエクスプレス野芥店", "マックスバリュエクスプレス内野店", "マックスバリュエクスプレス二日市店", "マックスバリュ尼寺店", "マックスバリュ若楠店"],
  "にしてつストア": ["にしてつストア七隈店", "にしてつストア周船寺店", "にしてつストア有田店", "にしてつストア北茂安店", "にしてつストアレガネットマルシェ四箇田", "にしてつストアレガネット南長住", "にしてつストアレガネット飯倉"],
  "あんくる夢市場": ["あんくる夢市場久留米店", "あんくる夢市場鳥栖弥生が丘店"],
  "薬院バリュー": ["薬院バリュー"],
  "ハイマート": ["ハイマート福浜店"],
  "ミスターマックス": ["ミスターマックス篠栗店", "ミスターマックス土井店"],
  "アスタラビスタ": ["アスタラビスタ城島店", "アスタラビスタ下庄店", "アスタラビスタ大和店", "アスタラビスタ大川店", "アスタラビスタ柳川西店", "アスタラビスタ高田店"],
};

export default function SurveyPage() {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const storeGroup = String(data.get("storeGroup") ?? "");
    const store = String(data.get("store") ?? "");
    const year = Number(data.get("birthYear"));
    const month = Number(data.get("birthMonth"));
    const day = Number(data.get("birthDay"));
    const message = String(data.get("message") ?? "").trim();
    const birthDate = new Date(Date.UTC(year, month - 1, day));
    const currentYear = new Date().getFullYear();
    const validBirthDate = year >= 1900 && year <= currentYear && birthDate.getUTCFullYear() === year && birthDate.getUTCMonth() === month - 1 && birthDate.getUTCDate() === day;

    if (!storeGroups[storeGroup]?.includes(store)) {
      setError("購入店舗を選択してください。");
      return;
    }
    if (!validBirthDate) {
      setError("生年月日を正しく入力してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");
    if (!firestore) {
      setError("現在、回答の受付準備中です。しばらくしてからもう一度お試しください。");
      setIsSubmitting(false);
      return;
    }
    try {
      await addDoc(collection(firestore, "surveyResponses"), {
        storeGroup,
        store,
        birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        message,
        source: "line-survey",
        schemaVersion: 1,
        createdAt: serverTimestamp(),
      });
      router.push("/survey/thanks");
    } catch (cause) {
      console.error("Failed to save survey response", cause);
      setError("送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。");
      setIsSubmitting(false);
    }
  }

  return <main className="survey-page">
    <section className="survey-card">
      <header className="survey-header"><div className="survey-logo">いい麺亭</div><span>お客様アンケート</span></header>
      <div className="survey-intro"><span className="survey-eyebrow">QUESTIONNAIRE</span><h1>いい麺亭から<br />うれしいお知らせをお届けします</h1><p>あなたに合ったお知らせをお届けするため、<br />簡単なアンケートにご協力ください。</p></div>
      <form onSubmit={handleSubmit}>
        <fieldset className="survey-field store-picker"><legend><b>1</b> 購入店舗 <em>必須</em></legend><label><span>まず販売店を選んでください</span><select name="storeGroup" required value={selectedGroup} onChange={event => setSelectedGroup(event.target.value)}><option value="" disabled>販売店を選ぶ</option>{Object.keys(storeGroups).map(group => <option key={group} value={group}>{group}</option>)}</select></label><label><span>次に店舗名を選んでください</span><select name="store" required defaultValue="" key={selectedGroup} disabled={!selectedGroup}><option value="" disabled>{selectedGroup ? "店舗名を選ぶ" : "先に販売店を選んでください"}</option>{selectedGroup && storeGroups[selectedGroup].map(store => <option key={store} value={store}>{store}</option>)}</select></label><small>候補を絞って、店舗名を見つけやすくしています</small></fieldset>
        <fieldset className="survey-field"><legend><b>2</b> 生年月日 <em>必須</em></legend><div className="birthdate-fields"><label><input name="birthYear" required type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1950" aria-label="生まれた年" /><span>年</span></label><label><input name="birthMonth" required type="text" inputMode="numeric" pattern="[0-9]{1,2}" maxLength={2} placeholder="1" aria-label="生まれた月" /><span>月</span></label><label><input name="birthDay" required type="text" inputMode="numeric" pattern="[0-9]{1,2}" maxLength={2} placeholder="1" aria-label="生まれた日" /><span>日</span></label></div><small>例：1950年 1月 1日</small></fieldset>
        <label className="survey-field"><span><b>3</b> いい麺亭へひとこと <em className="optional">任意</em></span><textarea name="message" rows={5} maxLength={1000} placeholder="ご意見やご要望など、伝えたいことがあればご自由にお書きください" /><small>お店へのメッセージや、あったらうれしいサービスなどをお聞かせください</small></label>
        {error ? <p className="survey-error" role="alert" aria-live="polite">{error}</p> : null}
        <button type="submit" className="survey-submit" disabled={isSubmitting}>{isSubmitting ? "送信しています…" : "回答を送信する"}</button>
      </form>
      <p className="survey-note">ご回答いただいた情報は、サービスの改善およびご案内のためにのみ利用します。</p>
    </section>
  </main>;
}
