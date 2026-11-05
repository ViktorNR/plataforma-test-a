import type { Feedback, FeedbackItem, QuizQ } from '../types';

export function gradeQuiz(answers: Record<string, number>, questions: QuizQ[]): Feedback {
  const items: FeedbackItem[] = [];
  let correct = 0;
  questions.forEach((q, i) => {
    const given = answers?.[q.id];
    const ok = given === q.answer;
    if (ok) correct++;
    items.push({
      ok,
      text:
        given === undefined
          ? `Pregunta ${i + 1}: sin responder. Respuesta correcta: «${q.options[q.answer]}». ${q.explanation}`
          : ok
            ? `Pregunta ${i + 1}: correcta. ${q.explanation}`
            : `Pregunta ${i + 1}: incorrecta. Respuesta correcta: «${q.options[q.answer]}». ${q.explanation}`,
    });
  });
  const score = Math.round((correct / questions.length) * 100);
  return { score, summary: `Respondiste correctamente ${correct} de ${questions.length} preguntas (${score}%).`, items };
}
