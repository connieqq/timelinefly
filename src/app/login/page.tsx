"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError("邮箱格式不正确，请检查后重试。");
        return;
      }
      setHint(payload.devHint ?? "");
      setStep("code");
    } catch {
      setError("请求失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      if (!response.ok) {
        setError("验证码不正确。开发环境固定验证码为 123456。");
        return;
      }
      router.push("/timeline");
    } catch {
      setError("登录失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="glow-orb glow-orb-a" />
      <div className="glow-orb glow-orb-b" />
      <section className="login-card">
        <p className="eyebrow">Daily Review System</p>
        <h1>TimelineFly</h1>
        <p className="login-subtitle">
          用 24 小时的真实轨迹复盘你的一天，而不是只记录计划。
        </p>

        {step === "email" ? (
          <form onSubmit={submitEmail} className="form-stack">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit" disabled={submitting}>
              {submitting ? "发送中..." : "发送验证码"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="form-stack">
            <label htmlFor="code">验证码</label>
            <input
              id="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="输入 6 位验证码"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <button type="submit" disabled={submitting}>
              {submitting ? "登录中..." : "登录 TimelineFly"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setStep("email")}
            >
              更换邮箱
            </button>
          </form>
        )}

        {hint ? <p className="hint-text">{hint}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
