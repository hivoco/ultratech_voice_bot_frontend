"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { textLang } from "@/lib/id";
import { playSfx } from "@/lib/sfx";
import { uiQuestions, type ReplyUi, type UiAnswers } from "@/lib/replyUi";

/** Localized chrome for the question cards (the questions themselves come from the backend). */
export interface QuizLabels {
  next: string;
  send: string;
  back: string;
  pickAll: string;
}

/**
 * "choice" (one question) and "quiz" (1 / N questions in a row) from the backend's `ui`, inside the
 * engineer bubble. A tap on a single-choice option picks it and moves on; multi-select questions
 * get checkboxes and a Next / Send button. After the last question the answers go out as the
 * user's next message. Once answered (or no longer the newest message) it shows the picks read-only.
 */
export function QuestionCard({
  ui,
  active,
  answered,
  labels,
  photoEnabled,
  onSubmit,
  onPhoto,
}: {
  ui: Extract<ReplyUi, { type: "choice" | "quiz" }>;
  active: boolean;
  answered?: UiAnswers;
  labels: QuizLabels;
  photoEnabled: boolean;
  onSubmit: (answers: UiAnswers) => void;
  onPhoto: () => void;
}) {
  const questions = uiQuestions(ui);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[][]>(() => questions.map(() => []));
  const [advancing, setAdvancing] = useState(false);

  if (answered) {
    // Read-only record of what was sent; the user's own bubble right below repeats it.
    return (
      <ul className="flex w-full flex-col gap-1.5" lang={textLang(...questions.map((q) => q.question))}>
        {questions.map((q, i) => {
          const a = answered.items.find((x) => x.id === q.id)?.answer ?? [];
          return (
            <li key={q.id} className="flex w-full flex-col rounded-[14px] bg-sand px-3.5 py-2.5">
              <span className="text-[12px] font-[510] [overflow-wrap:anywhere] text-muted">{questions.length > 1 ? `${i + 1}. ${q.question}` : q.question}</span>
              <span className="text-[15px] leading-[20px] font-[590] [overflow-wrap:anywhere] text-ink">{a.join(", ") || "—"}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  const q = questions[Math.min(step, questions.length - 1)];
  const chosen = picks[step] ?? [];
  const last = step === questions.length - 1;
  const counted = questions.length > 1;

  function finish(all: string[][]) {
    onSubmit({
      ui_id: ui.id,
      items: questions.map((x, i) => ({ id: x.id, question: x.question, answer: all[i] })),
    });
  }

  function choose(option: string) {
    if (!active || advancing) return;
    playSfx("select");
    if (q.multiple) {
      setPicks((p) => p.map((v, i) => (i === step ? (v.includes(option) ? v.filter((o) => o !== option) : [...v, option]) : v)));
      return;
    }
    const next = picks.map((v, i) => (i === step ? [option] : v));
    setPicks(next);
    // Let the yellow selection show for a moment before moving on / sending.
    setAdvancing(true);
    window.setTimeout(() => {
      setAdvancing(false);
      if (last) finish(next);
      else setStep((s) => s + 1);
    }, 320);
  }

  return (
    <div className="flex w-full flex-col gap-3 pt-0.5" role="group" aria-label={q.question} lang={textLang(q.question, ...q.options)}>
      <div className="flex w-full items-baseline justify-between gap-3">
        <p className="min-w-0 text-[16px] leading-[21px] font-[590] [overflow-wrap:anywhere] text-ink">{q.question}</p>
        {counted && (
          <span className="shrink-0 text-[14px] text-muted tabular-nums" aria-label={`Question ${step + 1} of ${questions.length}`}>
            {step + 1} / {questions.length}
          </span>
        )}
      </div>
      {counted && (
        <div className="flex w-full gap-1.5" aria-hidden>
          {questions.map((x, i) => (
            <span key={x.id} className={`h-[6px] flex-1 rounded-full ${i <= step ? "bg-brand" : "border border-line-2 bg-paper"}`} />
          ))}
        </div>
      )}
      {q.multiple && <p className="-mt-1 text-[12px] font-[510] text-muted">{labels.pickAll}</p>}
      <motion.div key={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex w-full flex-col gap-2">
        {q.options.map((opt) => {
          const on = chosen.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              role={q.multiple ? "checkbox" : "radio"}
              aria-checked={on}
              disabled={!active}
              onClick={() => choose(opt)}
              className={`flex min-h-[52px] w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[16px] leading-[21px] transition-[background-color,transform] enabled:active:scale-[0.98] disabled:cursor-default ${
                on ? "bg-brand font-[590] text-ink" : "border border-line-2 bg-paper text-ink enabled:hover:bg-sand"
              }`}
            >
              <Mark multiple={q.multiple} on={on} />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{opt}</span>
            </button>
          );
        })}
      </motion.div>
      {active && (step > 0 || q.multiple) && (
        <div className="flex w-full items-center justify-between gap-2">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="min-h-11 rounded-full px-2 text-[14px] font-[510] text-muted hover:text-ink">
              ← {labels.back}
            </button>
          ) : (
            <span />
          )}
          {q.multiple && (
            <button
              type="button"
              disabled={!chosen.length}
              onClick={() => (last ? finish(picks) : setStep((s) => s + 1))}
              className="min-h-11 rounded-full bg-brand px-5 text-[14px] font-[590] text-ink transition-[background-color,transform] enabled:hover:bg-brand-hover active:scale-95 disabled:opacity-50"
            >
              {last ? labels.send : labels.next}
            </button>
          )}
        </div>
      )}
      {ui.photoPrompt && photoEnabled && active && (
        <button type="button" onClick={onPhoto} className="flex min-h-11 w-full items-center gap-3 rounded-[14px] px-4 py-2 text-left text-[15px] leading-[20px] [overflow-wrap:anywhere] text-ink hover:bg-sand">
          <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a100" strokeWidth="1.9" strokeLinejoin="round" className="shrink-0">
            <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
            <circle cx="12" cy="13" r="3.2" />
          </svg>
          {ui.photoPrompt}
        </button>
      )}
    </div>
  );
}

/** Radio (single) or checkbox (multi). Unselected radios are hidden but keep their space, per the design. */
function Mark({ multiple, on }: { multiple: boolean; on: boolean }) {
  if (multiple) {
    return (
      <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" className="shrink-0">
        <rect x="1.5" y="1.5" width="19" height="19" rx="5" fill={on ? "#1c1a14" : "#fff"} stroke={on ? "#1c1a14" : "#d9d1b8"} strokeWidth="1.5" />
        {on && <path d="m6.5 11.2 3 3 6-6.2" fill="none" stroke="#ffd400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    );
  }
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" className={`shrink-0 ${on ? "" : "invisible"}`}>
      <circle cx="11" cy="11" r="10" fill="#1c1a14" />
      <circle cx="11" cy="11" r="4.2" fill="#ffd400" />
    </svg>
  );
}

/** "facts" layout: highlighted metrics (label → value) and titled checklists, under the answer text. */
export function FactsCard({ ui }: { ui: Extract<ReplyUi, { type: "facts" }> }) {
  return (
    <div className="flex w-full flex-col gap-3.5 pt-0.5" lang={textLang(...ui.metrics.map((m) => m.label + m.value), ...ui.sections.flatMap((s) => s.items))}>
      {ui.metrics.length > 0 && (
        <dl className="flex w-full flex-col gap-2 rounded-[18px] bg-[#f8efd5] px-4 py-3.5">
          {ui.metrics.map((m, i) => (
            // Wraps: a long value drops under its label (right-aligned) instead of crushing it mid-word.
            <div key={i} className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <dt className="min-w-0 text-[15px] leading-[20px] break-words text-[#5b5546]">{m.label}</dt>
              <dd className="ml-auto min-w-0 text-right text-[20px] leading-[25px] font-[700] break-words text-[#9a6f00]">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {ui.sections.map((s, i) => (
        <div key={i} className="flex w-full flex-col gap-2.5">
          {s.title && <p className="text-[16px] leading-[21px] font-[590] text-ink">{s.title}</p>}
          <ul className="flex flex-col gap-2.5">
            {s.items.map((item, j) => (
              <li key={j} className="flex gap-3 text-[15px] leading-[21px] text-ink-soft">
                <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" className="mt-[-1px] shrink-0">
                  <circle cx="11" cy="11" r="11" fill="#ffd400" />
                  <path d="m6.8 11.3 2.8 2.8 5.6-5.8" fill="none" stroke="#1c1a14" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="min-w-0 [overflow-wrap:anywhere]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
