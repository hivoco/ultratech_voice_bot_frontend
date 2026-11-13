"use client";

import { useEffect, useState } from "react";
import { EngineerBubble, ExpertCard, Suggestions, UserBubble } from "@/components/chat/Bubbles";
import { FactsCard, QuestionCard } from "@/components/chat/ReplyBlocks";
import { RowBoundary } from "@/components/chat/RowBoundary";
import { parseContact } from "@/lib/contact";
import { answersText, parseReplyUi, type UiAnswers } from "@/lib/replyUi";
import { stringList } from "@/lib/id";
import { DEMO, EMPTY, ONE, WORST, type Fixture } from "./fixtures";

const SETS = { demo: DEMO, worst: WORST, empty: EMPTY, one: ONE } as const;
type SetName = keyof typeof SETS;
const LABELS: Record<SetName, string> = { demo: "Demo", worst: "Worst case", empty: "Empty", one: "One" };
const QUIZ = { next: "Next", send: "Send", back: "Back", pickAll: "Pick all that apply" };

/** Dev-only: every reply layout from fixtures, switchable with ?data=demo|worst|empty|one. */
export function DevReplies() {
  const [set, setSet] = useState<SetName>("demo");
  const [sent, setSent] = useState<string[]>([]);
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("data");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the URL once on mount (no SSR mismatch)
    if (d && d in SETS) setSet(d as SetName);
  }, []);
  function pick(s: SetName) {
    setSet(s);
    setSent([]);
    const url = new URL(window.location.href);
    url.searchParams.set("data", s);
    window.history.replaceState(null, "", url);
  }
  return (
    <div className="bg-page min-h-dvh">
      <main className="mx-auto flex max-w-[430px] flex-col gap-3 px-4 pt-4 pb-28">
        {SETS[set].map((f, i) => (
          <RowBoundary key={`${set}-${i}`}>
            <Row f={f} onSend={(t) => setSent((s) => [...s, t])} />
          </RowBoundary>
        ))}
        {sent.map((t, i) => (
          <UserBubble key={i} text={t} />
        ))}
      </main>
      <div role="group" aria-label="Fixture" className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 gap-0.5 rounded-full bg-neutral-200 p-0.5 font-sans text-[12px]">
        {(Object.keys(SETS) as SetName[]).map((s) => (
          <button key={s} type="button" aria-pressed={set === s} onClick={() => pick(s)} className={`rounded-full px-3 py-1.5 ${set === s ? "bg-white shadow-sm" : "text-neutral-600"}`}>
            {LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ f, onSend }: { f: Fixture; onSend: (text: string) => void }) {
  const ui = parseReplyUi(f.ui);
  const [answered, setAnswered] = useState<UiAnswers>();
  const questions = stringList(f.suggested_questions, 3);
  const contact = parseContact(f.contact);
  return (
    <>
      <UserBubble text={f.ask} />
      <EngineerBubble text={f.text} voiceMeta="UltraTech Engineer">
        {(ui?.type === "choice" || ui?.type === "quiz") && (
          <QuestionCard
            ui={ui}
            active={!answered}
            answered={answered}
            labels={QUIZ}
            photoEnabled
            onSubmit={(a) => {
              setAnswered(a);
              onSend(answersText(ui, a));
            }}
            onPhoto={() => onSend("[camera]")}
          />
        )}
        {ui?.type === "facts" && <FactsCard ui={ui} />}
        {questions.length > 0 && (
          <Suggestions title="At this stage, people often ask" items={questions.map((q) => ({ label: q, send: q }))} active onPick={onSend} />
        )}
      </EngineerBubble>
      {f.serious === true && (
        <ExpertCard
          {...contact}
          name={contact.name ?? "A site engineer should check this"}
          role={contact.role ?? (f.condition ? `Photo: ${f.condition}` : "")}
          note="Pause work on this part and get a qualified expert to inspect it on site before you continue."
        />
      )}
    </>
  );
}
