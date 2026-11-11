import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Notice" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice">
      <p>
        This notice explains how {LEGAL.productName}, operated by{" "}
        {LEGAL.companyName} (&quot;we&quot;), handles personal information, in line with
        the Data Privacy Act of 2012 (Republic Act No. 10173).
      </p>

      <h2>1. Who is responsible</h2>
      <ul>
        <li>
          For the <strong>owner&apos;s account</strong> (email, login, business name),
          we decide how the data is used. We are the personal information
          controller.
        </li>
        <li>
          For <strong>tenant information</strong> that a landlord enters or
          collects through {LEGAL.productName}, the landlord decides why and how
          it is used. The landlord is the controller, and we process it on the
          landlord&apos;s behalf.
        </li>
      </ul>

      <h2>2. What we collect</h2>
      <ul>
        <li>
          <strong>Owners:</strong> email address, password (stored in scrambled
          form by our login provider), business name, payment instructions,
          properties, rooms, beds, bills and payment records.
        </li>
        <li>
          <strong>Tenants:</strong> full name, mobile number, email, emergency
          contact name and number, move-in and move-out dates, rent, deposit,
          bills, payments, and screenshots or photos of payments that a tenant
          uploads. These images can show account names, numbers and reference
          codes.
        </li>
        <li>
          <strong>Technical data:</strong> basic logs, IP address and a cookie
          that keeps a person signed in.
        </li>
      </ul>
      <p>
        We ask landlords not to enter government ID numbers or other sensitive
        personal information.
      </p>

      <h2>3. Why we use it</h2>
      <ul>
        <li>to provide the service: tracking rooms, tenants, bills and payments;</li>
        <li>to let tenants see their own bills and send proof of payment;</li>
        <li>to help landlords prepare payment reminders (landlords send them);</li>
        <li>to keep the service secure and fix problems;</li>
        <li>to meet legal obligations.</li>
      </ul>

      <h2>4. Who can see it</h2>
      <ul>
        <li>The landlord and any staff the landlord authorizes.</li>
        <li>
          A tenant can see only their own bills, through a private link that the
          landlord shares. Anyone who has the link can open that page, so
          tenants should not share it.
        </li>
        <li>We do not sell personal information.</li>
        <li>
          Service providers that store and run the app for us: Supabase
          (database and file storage) and Vercel (website hosting). Data may be
          stored or processed in data centers outside the Philippines. We use
          providers that apply security safeguards.
        </li>
      </ul>

      <h2>5. How long we keep it</h2>
      <p>
        We keep data while the landlord&apos;s account is active. Landlords should keep
        tenant records only as long as needed for rent, tax and legal purposes.
        When an account is closed, we delete or anonymize its data within{" "}
        [NUMBER] days, unless the law requires us to keep it.
      </p>

      <h2>6. Security</h2>
      <p>
        Data is sent over encrypted connections. Each business can only access
        its own records. Payment screenshots are stored privately. No system is
        perfectly secure. If a personal data breach occurs that requires
        notification, we will notify the affected landlords and the National
        Privacy Commission as the law requires.
      </p>

      <h2>7. Your rights</h2>
      <p>Under the Data Privacy Act you may:</p>
      <ul>
        <li>be informed about how your data is processed;</li>
        <li>access your data and ask for a copy;</li>
        <li>ask us to correct wrong or outdated data;</li>
        <li>object to processing, or ask us to suspend, block or delete data;</li>
        <li>receive your data in a commonly used format (data portability);</li>
        <li>claim compensation if you were harmed by unlawful use of your data;</li>
        <li>file a complaint with the National Privacy Commission (privacy.gov.ph).</li>
      </ul>
      <p>
        Tenants: please contact your landlord first, because the landlord decides
        how your information is used. You can also write to us at{" "}
        {LEGAL.contactEmail} and we will help.
      </p>

      <h2>8. Children</h2>
      <p>{LEGAL.productName} is meant for adults. It is not intended for anyone under 18.</p>

      <h2>9. Changes to this notice</h2>
      <p>
        We may update this notice. When we make important changes, we will tell
        account owners through the app or by email.
      </p>

      <h2>10. Contact us</h2>
      <p>
        {LEGAL.companyName}
        <br />
        {LEGAL.address}
        <br />
        {LEGAL.contactEmail}
      </p>
    </LegalPage>
  );
}
