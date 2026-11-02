import { Suspense } from "react";
import { signIn, signUp } from "./actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginForm({ searchParams }: Props) {
  const { error, message } = await searchParams;

  return (
    <main className="md-page flex min-h-screen flex-col justify-center">
      <div className="mb-8">
        <p className="md-label md-muted">Welcome to</p>
        <h1 className="md-display">RentEase</h1>
        <p className="md-muted mt-3">
          Rooms, tenants and payments, organized in one place.
        </p>
      </div>

      <form className="md-card md-stack">
        {error && <p className="md-banner-error">{error}</p>}
        {message && <p className="md-banner-ok">{message}</p>}

        <label className="md-field">
          <input name="email" type="email" placeholder=" " required />
          <span>Email</span>
        </label>
        <label className="md-field">
          <input
            name="password"
            type="password"
            placeholder=" "
            required
            minLength={6}
          />
          <span>Password (6+ characters)</span>
        </label>

        <button formAction={signIn} className="md-btn md-btn-filled md-btn-block">
          Sign in
        </button>
        <button formAction={signUp} className="md-btn md-btn-tonal md-btn-block">
          Create account
        </button>
      </form>
    </main>
  );
}
