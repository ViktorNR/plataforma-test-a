import type { Feedback } from '@/lib/types';

export default function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  const level = feedback.score >= 85 ? 'good' : feedback.score >= 60 ? 'mid' : 'low';
  const fails = feedback.items.filter((i) => !i.ok);
  const oks = feedback.items.filter((i) => i.ok);
  return (
    <section className="card feedback" aria-live="polite">
      <div className="score-row">
        <div className={`score score-${level}`}>{feedback.score}%</div>
        <div>
          <h3>{feedback.score >= 100 ? '¡Perfecto!' : feedback.score >= 60 ? 'Buen avance' : 'Sigue intentando'}</h3>
          <p className="muted">{feedback.summary}</p>
        </div>
      </div>
      <div className="bar"><span className={`bar-${level}`} style={{ width: `${feedback.score}%` }} /></div>
      {fails.length > 0 && (
        <>
          <h4>Por corregir</h4>
          <ul className="fb-list">
            {fails.map((i, k) => (
              <li key={k} className="fb-bad"><span aria-hidden>✖</span> {i.text}</li>
            ))}
          </ul>
        </>
      )}
      {oks.length > 0 && (
        <>
          <h4>Correcto</h4>
          <ul className="fb-list">
            {oks.map((i, k) => (
              <li key={k} className="fb-ok"><span aria-hidden>✔</span> {i.text}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
