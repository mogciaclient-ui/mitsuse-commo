import Link from "next/link";
import styles from "./survey-catalog.module.css";

export function SurveyCatalog({ responseCount }: { responseCount: number }) {
  return <><h2 className={styles.sectionTitle}>現在のアンケート</h2><article className={`card ${styles.surveyCard}`}><div><div className={styles.meta}><span className={styles.status}>公開中</span><span className={styles.date}>2026年8月〜</span></div><h2>お客様アンケート</h2><p>購入店舗、生年月日、いいもの三瀬へのひとことを伺うアンケートです。</p></div><div className={styles.actions}><span className={styles.count}>{responseCount.toLocaleString("ja-JP")}件の回答</span><Link href="/line/surveys/current" className={styles.link}>内容と回答を見る</Link></div></article><h2 className={styles.sectionTitle}>過去のアンケート</h2><section className={`card ${styles.empty}`}>過去のアンケートはまだありません。</section></>;
}
