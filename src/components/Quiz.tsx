'use client';

import { useState } from 'react';

export default function Quiz({
  questions,
  initial,
  onChange,
}: {
  questions: { id: string; text: string; options: string[] }[];
  initial?: Record<string, number>;
  onChange: (answers: Record<string, number>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initial ?? {});

  return (
    <ol className="quiz">
      {questions.map((q, qi) => (
        <li key={q.id} className="card">
          <p className="q-text"><b>{qi + 1}.</b> {q.text}</p>
          <div className="stack-sm">
            {q.options.map((o, oi) => (
              <label key={oi} className={`opt${answers[q.id] === oi ? ' on' : ''}`}>
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === oi}
                  onChange={() => {
                    const next = { ...answers, [q.id]: oi };
                    setAnswers(next);
                    onChange(next);
                  }}
                />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
