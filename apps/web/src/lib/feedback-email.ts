// Server-only setting: the contact address shown next to the feedback form. Pages that show it
// say nothing extra when it is unset or malformed, so a bad value never renders a broken link.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function configuredFeedbackEmail(): string | null {
  const configured = process.env.FEEDBACK_EMAIL?.trim() ?? "";
  return EMAIL_PATTERN.test(configured) ? configured : null;
}
