"use client";

import { useRef, useState, type FormEvent } from "react";
import ParticleButton from "@/components/kokonutui/particle-button";
import { useActionStatus } from "@/components/motion/use-action-status";
import { FieldError, INPUT_CLASS } from "@/components/report/ReportField";

export const FEEDBACK_TOPICS = {
  usability: "Something is hard to use",
  accessibility: "Accessibility problem (screen reader, keyboard, contrast…)",
  data: "The data looks wrong or missing",
  other: "Something else",
} as const;
type Topic = keyof typeof FEEDBACK_TOPICS;
const MAX_MESSAGE_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 15_000;

async function sendFeedback(topic: Topic, message: string, website: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, message, website }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach the feedback service. Please try again.");
  }
  if (response.status === 429) throw new Error("Too many messages. Wait a minute and try again.");
  if (!response.ok) throw new Error("Your feedback could not be saved. Please try again.");
}

type Props = {
  /** Accessible name of the form. */
  readonly label?: string;
  /** Topic chosen on arrival and after each send, for pages about one topic. */
  readonly initialTopic?: Topic;
};

export function FeedbackForm({ label = "Pilot feedback", initialTopic }: Props) {
  const startTopic: Topic | "" = initialTopic ?? "";
  const [topic, setTopic] = useState<Topic | "">(startTopic);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ topic?: string; message?: string }>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const sendStatus = useActionStatus(status === "sending", failure ? "error" : "success");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const problems = {
      ...(topic ? {} : { topic: "Choose what your feedback is about." }),
      ...(message.trim() ? {} : { message: "Write your feedback." }),
    };
    setErrors(problems);
    setFailure("");
    if (!topic || Object.keys(problems).length) {
      document.getElementById(problems.topic ? "feedback-topic" : "feedback-message")?.focus();
      return;
    }
    setStatus("sending");
    try {
      await sendFeedback(topic, message.trim(), honeypot.current?.value ?? "");
      setStatus("sent");
      setTopic(startTopic);
      setMessage("");
    } catch (error) {
      setStatus("idle");
      setFailure(error instanceof Error ? error.message : "Your feedback could not be saved.");
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  return (
    <form noValidate onSubmit={submit} aria-label={label} className="mt-4 max-w-prose space-y-4">
      <p className="text-sm text-muted">
        Anonymous: we store only the topic, your message, and the time. Please leave out names,
        contact details, and private information about anyone.
      </p>
      <div>
        <label htmlFor="feedback-topic" className="font-medium text-ink">
          What is it about?
        </label>
        <select
          id="feedback-topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value as Topic | "")}
          className={INPUT_CLASS}
          aria-invalid={Boolean(errors.topic)}
          aria-describedby={errors.topic ? "feedback-topic-error" : undefined}
        >
          <option value="">Choose a topic</option>
          {Object.entries(FEEDBACK_TOPICS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError id="feedback-topic-error" error={errors.topic} />
      </div>
      <div>
        <label htmlFor="feedback-message" className="font-medium text-ink">
          Your feedback
        </label>
        <textarea
          id="feedback-message"
          rows={5}
          maxLength={MAX_MESSAGE_LENGTH}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={INPUT_CLASS}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={`feedback-message-help${errors.message ? " feedback-message-error" : ""}`}
        />
        <p id="feedback-message-help" className="mt-1 text-sm text-muted">
          Up to {MAX_MESSAGE_LENGTH} characters.
        </p>
        <FieldError id="feedback-message-error" error={errors.message} />
      </div>
      {/* Honeypot for form bots; hidden from people and assistive technology. */}
      {/* The hidden attribute, not only CSS, so reader modes and CSS-less views drop it too. */}
      <div hidden aria-hidden="true">
        <label htmlFor="feedback-website">Leave this field empty</label>
        <input id="feedback-website" ref={honeypot} tabIndex={-1} autoComplete="off" />
      </div>
      <ParticleButton
        type="submit"
        variant="accent"
        status={sendStatus}
        pendingLabel="Sending…"
        successLabel="Sent"
        errorLabel="Not sent"
      >
        Send feedback
      </ParticleButton>
      {status === "sent" || failure ? (
        <p
          ref={resultRef}
          tabIndex={-1}
          role={failure ? "alert" : "status"}
          className={failure ? "font-medium text-warning" : "font-medium text-ink"}
        >
          {failure || "Thank you. Your feedback was received."}
        </p>
      ) : null}
    </form>
  );
}
