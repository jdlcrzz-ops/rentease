import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are an agreement between you and {LEGAL.companyName} for
        your use of {LEGAL.productName}. By creating an account you agree to
        them and to our Privacy Notice.
      </p>

      <h2>1. What the service does</h2>
      <p>
        {LEGAL.productName} helps landlords organize properties, rooms, tenants,
        bills and payment records, and lets tenants see their own bills and send
        proof of payment. It is a record-keeping tool. It is not legal,
        accounting or tax advice.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must be at least 18. Keep your password private and tell us if you
        think your account was misused. You are responsible for what happens
        under your account.
      </p>

      <h2>3. Landlord responsibilities</h2>
      <ul>
        <li>
          You are responsible for the tenant information you enter, and for
          having a lawful reason to collect it. Please tell your tenants that you
          use {LEGAL.productName} and share our Privacy Notice with them.
        </li>
        <li>
          Late fees, deposits and rent terms must be agreed with your tenants,
          ideally in writing. The app only applies the numbers you enter.
        </li>
        <li>
          Do not enter government ID numbers or other sensitive personal
          information.
        </li>
        <li>Keep your records accurate and check them before relying on them.</li>
      </ul>

      <h2>4. Tenant private links</h2>
      <p>
        Each tenant gets a private link. Anyone with the link can see that
        tenant&apos;s bills and send payment proof. Share links only with the
        right tenant, and create a new link if one is shared by mistake.
      </p>

      <h2>5. Payments between tenants and landlords</h2>
      <p>
        {LEGAL.productName} does not collect, hold or transfer rent money.
        Tenants pay the landlord directly (for example by GCash, Maya, bank
        transfer or cash). We only record what the landlord enters or approves.
        Any dispute about rent, deposits or repairs is between the landlord and
        the tenant.
      </p>

      <h2>6. Fees</h2>
      <p>
        [Describe your pricing here, for example a monthly subscription per
        property, any free trial, how you charge, and how to cancel.]
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        Do not use the service for anything unlawful, to harass anyone, to try to
        break into other accounts or data, or to upload harmful files.
      </p>

      <h2>8. Availability and backups</h2>
      <p>
        We work to keep the service running, but it is provided &quot;as is&quot; and may
        sometimes be unavailable. Please keep your own copy of important
        records, such as signed leases and receipts.
      </p>

      <h2>9. Your data and ending the service</h2>
      <p>
        Your landlord data stays yours. You can ask us to export or delete it by
        writing to {LEGAL.contactEmail}. We may suspend accounts that break these
        terms. You may stop using the service at any time.
      </p>

      <h2>10. Limits on our responsibility</h2>
      <p>
        To the extent the law allows, we are not responsible for lost rent,
        missed payments, or other indirect losses that come from using or being
        unable to use the service. Our total responsibility for any claim is
        limited to the fees you paid us in the 3 months before the claim.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these terms. If a change is important, we will tell you in
        the app or by email. Using the service after a change means you accept
        it.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These terms follow the laws of the Republic of the Philippines. Disputes
        will be brought to the proper courts of [CITY], Philippines.
      </p>

      <h2>13. Contact</h2>
      <p>
        {LEGAL.companyName}, {LEGAL.address}, {LEGAL.contactEmail}
      </p>
    </LegalPage>
  );
}
