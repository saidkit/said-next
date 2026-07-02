"use client"; // a client island at the edge (ADR-NEXT-S08) — the rest of the page stays RSC

import { useActionState } from "react";
import { submitContact } from "../server/submit";
import type { ContactState } from "../types";

const initial: ContactState = { ok: true };

export function ContactForm() {
  // React 19: [lastResult, formAction, isPending]. No client fetch layer, no store.
  const [state, action, pending] = useActionState(submitContact, initial);

  return (
    <form action={action} className="contact-form">
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      {state.errors?.email ? <p role="alert">{state.errors.email}</p> : null}

      <label>
        Message
        <textarea name="message" rows={4} required />
      </label>
      {state.errors?.message ? <p role="alert">{state.errors.message}</p> : null}

      <button type="submit" disabled={pending}>{pending ? "Sending…" : "Send"}</button>

      {state.message ? (
        <p role={state.ok ? "status" : "alert"}>{state.message}</p>
      ) : null}
    </form>
  );
}
