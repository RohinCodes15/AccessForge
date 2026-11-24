import type { Metadata } from "next";
import { FeedbackForm } from "@/components/pilot/FeedbackForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { configuredFeedbackEmail } from "@/lib/feedback-email";

export const metadata: Metadata = { title: "Accessibility" };

const EMAIL_SUBJECT = "AccessForge accessibility problem";

export default function AccessibilityPage() {
  const email = configuredFeedbackEmail();
  return (
    <>
      <PageHeader title="Accessibility">
        We aim for this site to meet WCAG 2.2 Level AA. It is early in development and has not been
        audited yet.
      </PageHeader>
      <div className="space-y-5">
        <Card title="What we do">
          <ul className="list-disc space-y-1 pl-5">
            <li>Every map, diagram, and chart has an equivalent list or table.</li>
            <li>The site works with a keyboard, with a visible focus indicator.</li>
            <li>Color is never the only way we show meaning.</li>
            <li>We respect your reduced-motion setting.</li>
            <li>Form errors are written out and announced to screen readers.</li>
          </ul>
        </Card>
        <Card title="How we check">
          <ul className="list-disc space-y-1 pl-5">
            <li>Automated axe checks run on every page at phone, tablet, and desktop widths.</li>
            <li>
              Automated checks cannot find every problem. Testing with screen readers and with
              people who use assistive technology has not been done yet and is required before
              public launch.
            </li>
          </ul>
        </Card>
        <Card title="Reporting a problem">
          <p>
            If anything on this site gets in your way, tell us: a screen reader, keyboard, zoom,
            contrast, motion, or anything else. Messages are stored for the AccessForge team.
          </p>
          <FeedbackForm label="Report an accessibility problem" initialTopic="accessibility" />
          {email ? (
            <p className="mt-4 max-w-prose">
              Prefer email, or cannot use the form? Write to{" "}
              <a
                className="font-semibold text-accent underline"
                href={`mailto:${email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`}
              >
                {email}
              </a>
              . Email is the way to get a reply; the form is anonymous and cannot send one.
            </p>
          ) : null}
        </Card>
      </div>
    </>
  );
}
