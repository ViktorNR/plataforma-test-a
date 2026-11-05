import zipfile, os, re, sys, html
from pathlib import Path

src = Path('/in/Backup Curso Canvas/202625-dot-2497-_-base-de-datos-export.imscc')
out = Path('/out/canvas')
out.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(src) as z:
    z.extractall(out)
    print(len(z.namelist()), 'archivos')

# Clase 6.zip
z6 = Path('/in/Material Ejercicios/8- Semana 06/Clase 6.zip')
o6 = Path('/out/clase6')
o6.mkdir(parents=True, exist_ok=True)
try:
    with zipfile.ZipFile(z6) as z:
        z.extractall(o6)
        print('Clase 6:', z.namelist()[:50])
except Exception as e:
    print('Clase 6 error', e)

# listado por extensión y carpeta
from collections import Counter
c = Counter()
for p in out.rglob('*'):
    if p.is_file():
        c[(p.relative_to(out).parts[0], p.suffix.lower())] += 1
for k, v in sorted(c.items()):
    print(k, v)
