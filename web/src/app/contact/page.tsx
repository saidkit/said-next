import type { Metadata } from "next";
import { ContactForm } from "@/features/contact";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section>
      <h1>Contact</h1>
      <p>
        A Server Action + Zod form — expected errors are <strong>return values</strong> (ADR-NEXT-S09),
        wired with <code>useActionState</code> at the client edge (ADR-NEXT-S08). The page itself is a
        Server Component.
      </p>
      <ContactForm />
    </section>
  );
}
