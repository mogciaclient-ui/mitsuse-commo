"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    if (!firebaseAuth) {
      setError("Firebaseの環境変数を設定するとログインできます。");
      setLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(firebaseAuth, String(data.get("email")), String(data.get("password")));
      router.replace("/dashboard");
    } catch (cause) {
      console.error("Login failed", cause);
      setError("メールアドレスまたはパスワードが正しくありません。");
      setLoading(false);
    }
  }

  return <main className="login-page"><section className="login-card">
    <div className="login-brand">いいもの三瀬</div><div className="login-shop">LINE運用管理</div>
    <h1>管理画面にログイン</h1><p>アンケートの回答状況を確認できます</p>
    <form onSubmit={handleLogin}>
      <label>メールアドレス<input name="email" required type="email" autoComplete="email" placeholder="admin@example.com" /></label>
      <label>パスワード<input name="password" required type="password" autoComplete="current-password" placeholder="パスワードを入力" /></label>
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      <button className="login-submit" type="submit" disabled={loading}>{loading ? "ログインしています…" : "ログイン"}</button>
    </form>
  </section></main>;
}
