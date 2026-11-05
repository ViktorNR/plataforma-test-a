import re, html, zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path('/out/canvas')
outd = Path('/out/canvas_txt')

# 1) Imágenes por pregunta en las evaluaciones principales
targets = {
    'g7b8f6b1339b2e73e68f6fe5308357428': 'Control1',
    'ga161ad9f23aa7dd0e4bf6f4d75cd6d8e': 'Solemne1',
    'gf24c7ce9b1f21dd032bce328cf24f3f3': 'Control2',
    'g87a9331d2a0b75eb66583a5b7fc1b212': 'Solemne2',
}
lines = []
for d, name in targets.items():
    q = root / d / 'assessment_qti.xml'
    if not q.exists():
        # algunas están en non_cc_assessments
        cands = list((root / 'non_cc_assessments').glob(d + '*'))
        q = cands[0] if cands else None
    if not q or not q.exists():
        lines.append(f'{name}: sin qti ({d})')
        continue
    t = ET.parse(q).getroot()
    i = 0
    for item in t.iter():
        if item.tag.split('}')[-1] != 'item':
            continue
        i += 1
        raw = ET.tostring(item, encoding='unicode')
        raw = html.unescape(raw)
        imgs = re.findall(r'src="([^"]+)"', raw)
        lines.append(f'{name} P{i}: ' + ' | '.join(imgs))
(outd / '04_imagenes_evaluaciones.txt').write_text('\n'.join(lines), encoding='utf-8')
print('\n'.join(lines)[:6000])

# 2) Zips de enunciados de proyectos
wr = root / 'web_resources'
for z in wr.rglob('*.zip'):
    dest = Path('/out/zips') / z.stem
    dest.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(z) as zz:
            zz.extractall(dest)
            print('ZIP', z.name, zz.namelist()[:30])
    except Exception as e:
        print('ZIP error', z, e)
