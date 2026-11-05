import type { Feedback, FeedbackItem } from '../types';

/** Normaliza un nombre: sin tildes, minúsculas, solo [a-z0-9_]. */
export const strip = (s: string) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** Clave de comparación: además ignora plural simple ("libros" == "libro"). */
export const key = (s: string) => {
  const n = strip(s);
  return n.length > 3 && n.endsWith('s') ? n.slice(0, -1) : n;
};

export const nameSet = (name: string, aliases: string[] = []) => new Set([name, ...aliases].map(key));

export function finish(earned: number, max: number, penalty: number, items: FeedbackItem[]): Feedback {
  const raw = max > 0 ? ((earned - penalty) / max) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return {
    score,
    summary: `Obtuviste ${score}% (${Math.max(0, earned - penalty).toFixed(1).replace(/\.0$/, '')} de ${max} puntos).`,
    items,
  };
}
