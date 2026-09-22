"use client";

import { useState } from "react";

interface PredictActivityProps {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export function PredictActivity({
  question,
  options,
  answer,
  explanation,
}: PredictActivityProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const hasAnswered = selected !== null;
  const isCorrect = selected === answer;

  return (
    <section className="rounded-xl border border-border bg-panel-subtle p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Predict before run
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-panel-foreground">
        {question}
      </p>

      <div
        className="mt-4 grid gap-2"
        role="group"
        aria-label="预测选项"
      >
        {options.map((option) => {
          const isSelected = selected === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelected(option)}
              className={[
                "min-h-10 rounded-lg border px-3 text-left font-mono text-xs transition-colors",
                isSelected
                  ? "border-border bg-accent text-accent-foreground"
                  : "border-border bg-background text-panel-foreground hover:bg-accent",
              ].join(" ")}
            >
              {option}
            </button>
          );
        })}
      </div>

      {hasAnswered ? (
        <div
          className="mt-4 border-t border-border pt-4"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-panel-foreground">
            {isCorrect ? "预测正确" : "这个预测还不成立"}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {explanation}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          先做判断，再看解释。目标是验证你的布局模型，而不是记属性答案。
        </p>
      )}
    </section>
  );
}
