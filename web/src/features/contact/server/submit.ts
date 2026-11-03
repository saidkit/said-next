"use server";

import { z } from "zod";

import type { ContactState } from "../types";

/**
 * Server Action (ADR-NEXT-S09) — **expected** failures (validation) are RETURN
 * VALUES, not throws. The client renders them via `useActionState`. Reserve
 * `throw` (→ error.tsx) for the genuinely unexpected. A `"use server"` file
 * exports only async functions; the result type lives in `../types`.
 */
const Schema = z.object({
  email: z.string().email("Enter a valid email."),
  message: z.string().min(1, "Message can't be empty."),
});

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "Check the highlighted fields.",
      errors: { email: f.email?.[0], message: f.message?.[0] },
    };
  }

  // A real app hands off to a service module here (an email provider behind a
  // typed contract, ADR-NEXT-S06) and would `revalidatePath(...)` if needed.
  // await sendMessage(parsed.data);

  return { ok: true, message: "Thanks — we'll be in touch." };
}
