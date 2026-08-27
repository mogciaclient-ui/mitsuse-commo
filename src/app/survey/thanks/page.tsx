export default async function SurveyThanksPage({ searchParams }: { searchParams: Promise<{ reward?: string }> }) {
  const { reward } = await searchParams;
  return <main className="survey-page"><section className="survey-card survey-complete"><span className="survey-check">✓</span><h1>ご回答ありがとうございます</h1><p>{reward === "sent" ? <>LINEのトークに<br />100円引きクーポンをお届けしました。</> : "アンケートの回答を受け付けました。"}</p></section></main>;
}
