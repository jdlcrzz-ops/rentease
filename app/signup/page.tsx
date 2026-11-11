import { Suspense } from "react";
import Link from "next/link";
import { signUp } from "../login/actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default function SignupPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <SignupForm searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupForm({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <main className="md-page flex min-h-screen flex-col justify-center">
      <div className="mb-8">
        <p className="md-label md-muted">Get started</p>
        <h1 className="md-display">Create account</h1>
        <p className="md-muted mt-3">
          Set up your rental business in a few minutes.
        </p>
      </div>

      <form action={signUp} className="md-card md-stack">
        {error && <p className="md-banner-error">{error}</p>}

        <label className="md-field">
          <input name="email" type="email" placeholder=" " required autoComplete="email" />
          <span>Email</span>
        </label>
        <label className="md-field">
          <input
            name="password"
            type="password"
            placeholder=" "
            minLength={8}
            required
            autoComplete="new-password"
          />
          <span>Password (8+ characters)</span>
        </label>

        <label className="md-check">
          <input type="checkbox" name="agree" required />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank">
              Terms of Service
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" target="_blank">
              Privacy Notice
            </Link>
            .
          </span>
        </label>

        <button className="md-btn md-btn-filled md-btn-block">Create account</button>
        <Link href="/login" className="md-btn md-btn-tonal md-btn-block">
          I already have an account
        </Link>
      </form>
    </main>
  );
}
