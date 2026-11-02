import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default function ResetPasswordPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <ResetPassword searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPassword({ searchParams }: Props) {
  await connection();
  const { error } = await searchParams;

  // Only people who opened a valid reset link are signed in here
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(
        "Please request a reset link first."
      )}`
    );
  }

  return (
    <main className="md-page flex min-h-screen flex-col justify-center">
      <div className="mb-8">
        <p className="md-label md-muted">Almost done</p>
        <h1 className="md-display">New password</h1>
        <p className="md-muted mt-3">
          Choose a new password for {user.email}.
        </p>
      </div>

      <form action={updatePassword} className="md-card md-stack">
        {error && <p className="md-banner-error">{error}</p>}

        <label className="md-field">
          <input
            name="password"
            type="password"
            placeholder=" "
            minLength={8}
            required
            autoComplete="new-password"
          />
          <span>New password (8+ characters)</span>
        </label>
        <label className="md-field">
          <input
            name="confirm"
            type="password"
            placeholder=" "
            minLength={8}
            required
            autoComplete="new-password"
          />
          <span>Type it again</span>
        </label>

        <button className="md-btn md-btn-filled md-btn-block">
          Save new password
        </button>
      </form>
    </main>
  );
}
