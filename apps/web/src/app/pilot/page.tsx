import type { Metadata } from "next";
import { PilotDashboard } from "@/components/pilot/PilotDashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { configuredFeedbackEmail } from "@/lib/feedback-email";
import { findNavItem } from "@/lib/navigation";

const item = findNavItem("/pilot");

export const metadata: Metadata = { title: item.label };

export default function Page() {
  const feedbackEmail = configuredFeedbackEmail();
  return (
    <>
      <PageHeader title={item.label}>
        A preview of what a Fremont pilot would report: how many barriers people have submitted, how
        many a reviewer has checked, and what the numbers can and cannot tell you.
      </PageHeader>
      <PilotDashboard feedbackEmail={feedbackEmail} />
    </>
  );
}
