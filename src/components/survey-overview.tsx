import Link from "next/link";
import styles from "./survey-overview.module.css";

export function SurveyOverview({ responseCount }: { responseCount: number }) {
  const questions = [
    { number: "01", title: "生年月日", detail: "年・月・日を入力", required: true },
    { number: "02", title: "購入経験", detail: "はい・いいえ・わからないから選択", required: true },
    { number: "03", title: "購入店舗", detail: "購入経験がある方のみ選択", required: true },
    { number: "04", title: "いいもの三瀬へひとこと", detail: "ご意見やご要望を自由入力", required: false },
  ];
  return <section className={`card ${styles.overview}`}><div><div className={styles.titleRow}><h2>お客様アンケート</h2><span className={styles.published}>公開中</span><span className={styles.count}>回答 {responseCount.toLocaleString("ja-JP")}件</span></div><p className={styles.description}>いいもの三瀬からのお知らせを、お客様に合わせてお届けするためのアンケートです。</p><div className={styles.questions}>{questions.map(question => <div className={styles.question} key={question.number}><b>{question.number}</b><span><strong>{question.title}</strong><small>{question.detail}</small></span><em className={question.required ? styles.required : styles.optional}>{question.required ? "必須" : "任意"}</em></div>)}</div></div><Link href="/survey" target="_blank" className={styles.link}>アンケートを開く</Link></section>;
}
