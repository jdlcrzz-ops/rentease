import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="md-page">
      <Link href="/login" className="md-btn md-btn-tonal md-btn-sm">
        &larr; Back
      </Link>
      <h1 className="md-display mb-2 mt-5">{title}</h1>
      <p className="md-muted mb-6 text-sm">
        {LEGAL.productName} · Effective {LEGAL.effectiveDate}
      </p>
      {LEGAL.isDraft && (
        <p className="md-banner-warn mb-6">
          Draft: this page has not yet been reviewed by a lawyer. Fill in the
          bracketed details in lib/legal.ts before launch.
        </p>
      )}
      <div className="md-legal">{children}</div>
    </main>
  );
}
