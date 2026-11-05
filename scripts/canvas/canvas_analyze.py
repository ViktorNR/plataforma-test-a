import re, html, json
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path('/out/canvas')
outd = Path('/out/canvas_txt')
outd.mkdir(exist_ok=True)


def strip_ns(tag):
    return tag.split('}')[-1]


def text_of(el):
    return html.unescape(re.sub(r'<[^>]+>', ' ', ''.join(el.itertext()) if el is not None else '')).strip()


def clean_html(s):
    s = html.unescape(s or '')
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'</(p|div|li|tr|h\d)>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\n\s*\n+', '\n', html.unescape(s)).strip()


# ---------- Módulos ----------
mm = root / 'course_settings' / 'module_meta.xml'
lines = []
if mm.exists():
    t = ET.parse(mm).getroot()
    for mod in t:
        if strip_ns(mod.tag) != 'module':
            continue
        title = text_of(mod.find('{*}title'))
        lines.append(f'## MÓDULO: {title}')
        items = mod.find('{*}items')
        if items is not None:
            for it in items:
                lines.append('  - [%s] %s' % (text_of(it.find('{*}content_type')), text_of(it.find('{*}title'))))
(outd / '00_modulos.txt').write_text('\n'.join(lines), encoding='utf-8')
print('módulos:', len(lines))

# ---------- Cuestionarios ----------
quizzes = []
for meta in root.rglob('assessment_meta.xml'):
    d = meta.parent
    try:
        m = ET.parse(meta).getroot()
    except Exception:
        continue
    title = text_of(m.find('{*}title'))
    descr = clean_html(m.findtext('{*}description') or '')
    pts = m.findtext('{*}points_possible')
    qtype = m.findtext('{*}quiz_type')
    qti = d / 'assessment_qti.xml'
    quizzes.append((title, pts, qtype, descr, qti if qti.exists() else None, d.name))

# Cuestionarios "non_cc_assessments"
for qti in (root / 'non_cc_assessments').glob('*.xml.qti') if (root / 'non_cc_assessments').exists() else []:
    quizzes.append((qti.stem, None, None, '', qti, 'non_cc'))

print('cuestionarios:', len(quizzes))


def parse_qti(path):
    out = []
    t = ET.parse(path).getroot()
    for item in t.iter():
        if strip_ns(item.tag) != 'item':
            continue
        qtype, pts = '', ''
        for f in item.iter():
            if strip_ns(f.tag) == 'qtimetadatafield':
                lab = text_of(f.find('{*}fieldlabel'))
                ent = text_of(f.find('{*}fieldentry'))
                if lab == 'question_type':
                    qtype = ent
                if lab == 'points_possible':
                    pts = ent
        pres = item.find('{*}presentation')
        qtext = ''
        if pres is not None:
            mat = pres.find('{*}material')
            if mat is not None:
                mt = mat.find('{*}mattext')
                qtext = clean_html(mt.text if mt is not None else '')
        choices = {}
        for rl in item.iter():
            if strip_ns(rl.tag) == 'response_label':
                ident = rl.get('ident')
                mt = rl.find('.//{*}mattext')
                choices[ident] = clean_html(mt.text if mt is not None else '')
        correct = []
        rp = item.find('{*}resprocessing')
        if rp is not None:
            for rc in rp.findall('{*}respcondition'):
                sv = rc.find('{*}setvar')
                if sv is not None and sv.text and float(sv.text or 0) > 0:
                    for ve in rc.iter():
                        if strip_ns(ve.tag) == 'varequal' and ve.text:
                            correct.append(ve.text)
        feedback = []
        for fb in item.iter():
            if strip_ns(fb.tag) == 'itemfeedback':
                mt = fb.find('.//{*}mattext')
                if mt is not None and mt.text:
                    feedback.append(clean_html(mt.text))
        out.append(dict(type=qtype, points=pts, text=qtext, choices=choices, correct=correct, feedback=feedback))
    return out


summary = []
for title, pts, qtype, descr, qti, dname in quizzes:
    safe = re.sub(r'[^\w\- ]+', '', title)[:60].strip().replace(' ', '_') or dname
    lines = [f'# {title}', f'puntos: {pts}  tipo: {qtype}  carpeta: {dname}', '', descr, '']
    n = 0
    if qti:
        try:
            qs = parse_qti(qti)
        except Exception as e:
            qs = []
            lines.append(f'ERROR {e}')
        for i, q in enumerate(qs, 1):
            n += 1
            lines.append(f'--- P{i} [{q["type"]}] ({q["points"]} pts)')
            lines.append(q['text'])
            for k, v in q['choices'].items():
                mark = '(*)' if k in q['correct'] else '   '
                lines.append(f'   {mark} {v}')
            if not q['choices'] and q['correct']:
                lines.append('   respuesta(s): ' + ' | '.join(q['correct']))
            for f in q['feedback'][:2]:
                if f:
                    lines.append('   retro: ' + f[:300])
    (outd / f'quiz_{safe}.txt').write_text('\n'.join(lines), encoding='utf-8')
    summary.append((title, pts, n))
for s in summary:
    print(s)

# ---------- Tareas ----------
n = 0
for a in root.rglob('assignment_settings.xml'):
    d = a.parent
    try:
        m = ET.parse(a).getroot()
    except Exception:
        continue
    title = text_of(m.find('{*}title'))
    pts = m.findtext('{*}points_possible')
    body = ''
    for h in d.glob('*.html'):
        body = clean_html(h.read_text(encoding='utf-8', errors='replace'))
    safe = re.sub(r'[^\w\- ]+', '', title)[:60].strip().replace(' ', '_')
    (outd / f'tarea_{safe}.txt').write_text(f'# {title}\npuntos: {pts}\n\n{body}', encoding='utf-8')
    n += 1
print('tareas:', n)

# ---------- Páginas wiki ----------
n = 0
for w in (root / 'wiki_content').glob('*.html') if (root / 'wiki_content').exists() else []:
    body = clean_html(w.read_text(encoding='utf-8', errors='replace'))
    (outd / f'wiki_{w.stem[:60]}.txt').write_text(body, encoding='utf-8')
    n += 1
print('wiki:', n)

# ---------- Archivos subidos ----------
wr = root / 'web_resources'
files = [str(p.relative_to(wr)) for p in wr.rglob('*') if p.is_file()] if wr.exists() else []
(outd / '01_archivos_web_resources.txt').write_text('\n'.join(files), encoding='utf-8')
print('web_resources:', len(files))
syl = root / 'course_settings' / 'syllabus_body.html'
if syl.exists():
    (outd / '02_syllabus.txt').write_text(clean_html(syl.read_text(encoding='utf-8', errors='replace')), encoding='utf-8')
# Calificaciones / grupos de tareas
ag = root / 'course_settings' / 'assignment_groups.xml'
if ag.exists():
    (outd / '03_grupos_tareas.xml.txt').write_text(ag.read_text(encoding='utf-8', errors='replace'), encoding='utf-8')
