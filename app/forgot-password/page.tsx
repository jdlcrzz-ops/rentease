import { Suspense } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default function ForgotPasswordPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <ForgotPassword searchParams={searchParams} />
    </Suspense>
  );
}

async function ForgotPassword({ searchParams }: Props) {
  const { error, message } = await searchParams;

  return (
    <main className="md-page flex min-h-screen flex-col justify-center">
      <div className="mb-8">
        <p className="md-label md-muted">Account help</p>
        <h1 className="md-display">Forgot password?</h1>
        <p className="md-muted mt-3">
          Enter your email and we&apos;ll send you a link to choose a new
          password.
        </p>
      </div>

      <form action={requestPasswordReset} className="md-card md-stack">
        {error && <p className="md-banner-error">{error}</p>}
        {message && <p className="md-banner-ok">{message}</p>}

        <label className="md-field">
          <input name="email" type="email" placeholder=" " required />
          <span>Email</span>
        </label>

        <button className="md-btn md-btn-filled md-btn-block">
          Send reset link
        </button>
        <Link href="/login" className="md-btn md-btn-tonal md-btn-block">
          Back to sign in
        </Link>

        <p className="md-muted text-sm">
          Tip: open the link on the same phone or browser you use here.
        </p>
      </form>
    </main>
  );
}
