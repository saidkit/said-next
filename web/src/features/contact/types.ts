/** Result of the contact Server Action (expected errors as data, ADR-NEXT-S09). */
export type ContactState = {
  ok: boolean;
  message?: string;
  errors?: { email?: string; message?: string };
};
