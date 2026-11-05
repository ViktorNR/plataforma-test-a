import re
from pathlib import Path
import docx
from pypdf import PdfReader

wr = Path('/out/canvas/web_resources')
outd = Path('/out/canvas_txt/res')
outd.mkdir(parents=True, exist_ok=True)
want = re.compile(r'(s0[4-9]|s1[0-3])/|Evaluaciones-revision-docente/|assessment_questions/|Multimedia cargada/.*(apunte|Ejemplo)', re.I)
n = 0
for p in wr.rglob('*'):
    if not p.is_file():
        continue
    rel = p.relative_to(wr).as_posix()
    if p.name.startswith('~$') or not want.search(rel):
        continue
    t = None
    try:
        if p.suffix.lower() == '.docx':
            d = docx.Document(str(p))
            parts = [x.text for x in d.paragraphs]
            for tb in d.tables:
                for r in tb.rows:
                    parts.append(' | '.join(c.text.strip().replace('\n', ' / ') for c in r.cells))
            t = '\n'.join(parts)
        elif p.suffix.lower() == '.pdf':
            r = PdfReader(str(p))
            t = '\n'.join(f'--- page {i}\n' + (pg.extract_text() or '') for i, pg in enumerate(r.pages, 1))
    except Exception as e:
        t = f'ERROR {e}'
    if t is not None:
        (outd / (rel.replace('/', '__') + '.txt')).write_text(t, encoding='utf-8')
        print(len(t), rel)
        n += 1
print(n)
