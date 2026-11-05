"""
Genera las bases de datos de ejemplo del Laboratorio MySQL y de los ejercicios SQL.
Salida: src/lib/sqltemplates/<id>.sql  (solo DDL + datos; sin CREATE DATABASE ni USE).

Uso (desde plataforma-bd/):
  docker run --rm -v "${PWD}:/app" -v "<carpeta Material Ejercicios>:/mat:ro" python:3.12-slim \
      python /app/scripts/templates/build_templates.py

- centro_medico, unab, automotora, rosselot, ejemplo_unab: se arman con los scripts del profesor (carpeta /mat).
- educacion_superior, universidad, biblioteca, inventario, comercio, academico: modelos de las evaluaciones,
  con datos sintéticos deterministas (semilla fija) pensados para que las consultas típicas tengan resultados interesantes.
"""
import random
import re
import datetime as dt
from pathlib import Path

OUT = Path('/app/src/lib/sqltemplates')
MAT = Path('/mat')
OUT.mkdir(parents=True, exist_ok=True)


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return '1' if v else '0'
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, dt.datetime):
        return "'" + v.strftime('%Y-%m-%d %H:%M:%S') + "'"
    if isinstance(v, dt.date):
        return "'" + v.isoformat() + "'"
    return "'" + str(v).replace('\\', '\\\\').replace("'", "''") + "'"


def ins(table, cols, rows, batch=60):
    out = []
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        vals = ',\n  '.join('(' + ', '.join(q(v) for v in r) + ')' for r in chunk)
        out.append(f"INSERT INTO {table} ({', '.join(cols)}) VALUES\n  {vals};")
    return '\n'.join(out) + '\n'


def write(name, text):
    (OUT / f'{name}.sql').write_text(text, encoding='utf-8')
    print(f'{name}.sql  {len(text):>7} caracteres')


def clean(s):
    """Quita CREATE DATABASE / USE / DROP DATABASE de un script del profesor."""
    s = re.sub(r'(?im)^\s*create\s+database[^;]*;\s*$', '', s)
    s = re.sub(r'(?im)^\s*use\s+[^;]*;\s*$', '', s)
    s = re.sub(r'(?im)^\s*drop\s+database[^;]*;\s*$', '', s)
    return s.strip() + '\n'


# =====================================================================
# 1) Material del profesor
# =====================================================================
ddl_cm = clean((MAT / '8- Semana 06/Material Video DDL/0-Codigo DDL.txt').read_text(encoding='utf-8'))
ins_cm = clean((MAT / '8- Semana 06/Material Video DDL/2- Insert Masivos.txt').read_text(encoding='utf-8'))
write('centro_medico', ddl_cm + '\n' + ins_cm)

# UNAB (empresa / departamento / sede / empleado)
unab = clean((MAT / '8- Semana 06/2.0- Ejercicio.txt').read_text(encoding='utf-8'))
r = random.Random(11)
nombres = ['Camila', 'Diego', 'Fernanda', 'Matías', 'Valentina', 'Sebastián', 'Antonia', 'Nicolás', 'Javiera', 'Tomás', 'Catalina', 'Felipe']
apat = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda']
unab += '\n' + ins('Empresa', ['rut', 'nombre'], [('76123456-7', 'UNAB Servicios SpA'), ('77654321-K', 'Consultora Andes Ltda.')])
unab += ins('Departamento', ['id_depto', 'nombre_depto', 'rut'], [(1, 'Recursos Humanos', '76123456-7'), (2, 'Tecnología', '76123456-7'), (3, 'Finanzas', '76123456-7'), (4, 'Operaciones', '77654321-K'), (5, 'Comercial', '77654321-K')])
unab += ins('Sede', ['id_sede', 'nombre_sede', 'ubicacion', 'rut'], [(1, 'Casa Central', 'Santiago', '76123456-7'), (2, 'Sede Viña', 'Viña del Mar', '76123456-7'), (3, 'Sede Sur', 'Concepción', '77654321-K')])
emps = []
for i in range(24):
    rut = f'{r.randint(9, 22)}{r.randint(100, 999)}{r.randint(100, 999)}-{r.choice("0123456789K")}'
    emps.append((rut, r.choice(nombres), r.choice(apat), r.choice(apat), dt.date(r.randint(1975, 2001), r.randint(1, 12), r.randint(1, 28)), r.choice(['Contrata', 'Honorario']), r.randint(1, 5)))
unab += ins('Empleado', ['rut', 'nombre', 'apaterno', 'amaterno', 'fecha_nacimiento', 'tipo', 'id_depto'], emps)
unab += ins('Telefono', ['rut', 'telefono'], [(e[0], 900000000 + r.randint(1000000, 9999999)) for e in emps] + [(emps[0][0], 912345678)])
unab += ins('Email', ['rut', 'email'], [(e[0], (f'{e[1][0]}{e[2]}{i}@emp.cl'.lower()).replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n')) for i, e in enumerate(emps)])
write('unab', unab)

# Automotora (clientes, teléfonos, vehículos)
auto = clean((MAT / '8- Semana 06/3.1- Ejercicio 1.txt').read_text(encoding='utf-8'))
auto = auto.split('-- Agregar Clave Foranea')[0].strip() + '\n'
auto = re.sub(r"(?s)INSERT INTO Cliente.*", '', auto).strip() + '\n'
r = random.Random(12)
cli = [('171185750', 'Eduardo', 'Navarro', 'Lorenzo'), ('145556589', 'Carla', 'Oyarce', 'Soto'), ('142829797', 'Cristian', 'Tamayo', 'Rojas'), ('137659255', 'Elizabeth', 'Pizarro', 'Vera'), ('190610830', 'Ignacio', 'Tapia', 'Reyes'), ('201234567', 'Marcela', 'Fuentes', 'Díaz')]
auto += '\n' + ins('Cliente', ['rut', 'nombre', 'apaterno', 'amaterno'], cli)
auto += ins('Telefono', ['rut', 'telefono'], [(c[0], 900000000 + r.randint(1000000, 9999999)) for c in cli] + [('171185750', 322855378)])
marcas = [('Hyundai', 'Verna', 'Plata'), ('Kia', 'Morning', 'Rojo'), ('Chevrolet', 'Sail', 'Blanco'), ('Toyota', 'Yaris', 'Gris'), ('Nissan', 'Versa', 'Azul'), ('Suzuki', 'Swift', 'Negro'), ('Mazda', 'CX-5', 'Gris'), ('Peugeot', '208', 'Blanco')]
veh = []
for i, (m, mo, co) in enumerate(marcas):
    veh.append((987000000 + i, m, mo, co, cli[i % len(cli)][0]))
auto += ins('Vehiculo', ['Chasis', 'marca', 'modelo', 'color', 'rut'], veh)
write('automotora', auto)

# Rosselot
ros = clean((MAT / '8- Semana 06/3.3- Ejercicio 2.txt').read_text(encoding='utf-8'))
ros = ros.split('INSERT INTO Cliente')[0].strip().replace('mun_chasis', 'num_chasis') + '\n'
ros += '\n' + ins('cliente', ['rut', 'nombre', 'apellido', 'direccion', 'telefono', 'fecha_nacimiento'], [
    ('171185750', 'Eduardo', 'Navarro', 'Quillota 980', 945524171, dt.date(1988, 11, 15)),
    ('145556589', 'Carla', 'Oyarce', 'Sau Sau 360', 940458565, dt.date(1980, 8, 7)),
    ('142829797', 'Cristian', 'Tamayo', 'Las Maravillas 950', 958676745, dt.date(1973, 9, 2)),
    ('201234567', 'Marcela', 'Fuentes', 'Libertad 120', 977665544, dt.date(1995, 3, 21))])
ros += ins('vehiculo', ['num_motor', 'num_chasis', 'rut'], [
    ('123456789', 'AB6875757464', '171185750'), ('456789098', 'AB5678989994', '171185750'), ('456798787', 'AB0987656778', '171185750'),
    ('435698778', 'AB5678987654', '145556589'), ('234567876', 'AB6868686899', '145556589'), ('660987645', 'AB7474799993', '142829797')])
write('rosselot', ros)

# Ejemplo UNAB (alumnos, asignaturas, profesores, secciones)
ej = clean((MAT / '8- Semana 06/4- Resolución Ejercicio Tarea.txt').read_text(encoding='utf-8'))
ej = re.split(r'\n\s*1\.\s', ej)[0].strip() + '\n'  # el archivo trae después los enunciados de consultas (no son SQL)
alum = [('11111111-1', 'Camila Torres'), ('22222222-2', 'Diego Vega'), ('12345678-9', 'Javiera Soto'), ('55667788-2', 'Matías Rojas'), ('33445566-7', 'Antonia Díaz'), ('44556677-8', 'Felipe Muñoz'), ('66778899-0', 'Valentina Pérez')]
asig = [(101, 'Matemáticas'), (102, 'Lenguaje'), (103, 'Historia'), (104, 'Ciencias'), (105, 'Arte')]  # NOMBRE es VARCHAR(12) en el DDL de clase
prof = [('33344455-6', 'Carlos Pérez'), ('44455566-7', 'Ana Gómez'), ('55566677-8', 'Luis Herrera'), ('66677788-9', 'María Castro')]
ej += '\n' + ins('ALUMNO', ['RUT_ALUMNO', 'NOMBRE'], alum) + ins('ASIGNATURA', ['NRC', 'NOMBRE'], asig) + ins('PROFESOR', ['RUT_PROFESOR', 'NOMBRE'], prof)
r = random.Random(13)
sec = []
for a in alum:
    for nrc in r.sample([x[0] for x in asig], 3):
        p = {101: prof[0], 102: prof[1], 103: prof[2], 104: prof[3], 105: prof[1]}[nrc]
        sec.append((p[0], a[0], nrc, round(r.uniform(3.0, 7.0), 1)))
ej += ins('SECCIONES', ['RUT_PROFESOR', 'RUT_ALUMNO', 'NRC', 'NOTAS'], sec)
write('ejemplo_unab', ej)

# =====================================================================
# 2) Modelos de las evaluaciones (datos sintéticos)
# =====================================================================
NOM = ['Camila', 'Diego', 'Fernanda', 'Matías', 'Valentina', 'Sebastián', 'Antonia', 'Nicolás', 'Javiera', 'Tomás', 'Catalina', 'Felipe', 'Constanza', 'Ignacio', 'Francisca', 'Vicente', 'Daniela', 'Martín', 'Isidora', 'Benjamín', 'Paula', 'Joaquín', 'Trinidad', 'Cristóbal', 'Sofía', 'Rodrigo', 'Carolina', 'Andrés']
APE = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Vargas', 'Álvarez', 'Vera']


def ascii_(s):
    for a, b in zip('áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'):
        s = s.replace(a, b)
    return s


# ---------- universidad (Solemne 2) ----------
r = random.Random(21)
fac = [(1, 'Facultad de Ingeniería', 'Av. República 220'), (2, 'Facultad de Medicina', 'Av. Salvador 1450'), (3, 'Facultad de Derecho', 'Calle Huérfanos 880'),
       (4, 'Facultad de Economía y Negocios', 'Av. Brasil 1200'), (5, 'Facultad de Artes', 'Calle Lastarria 340'), (6, 'Facultad de Teología', 'Calle Bandera 75')]
car = [(1, 'Ingeniería Civil Informática', 5, 300, 1), (2, 'Ingeniería Civil Industrial', 5, 300, 1), (3, 'Ingeniería en Ciberseguridad', 4, 240, 1), (4, 'Ingeniería Civil Eléctrica', 5, 300, 1),
       (5, 'Medicina', 7, 420, 2), (6, 'Enfermería', 5, 300, 2), (7, 'Kinesiología', 5, 290, 2), (8, 'Derecho', 5, 300, 3), (9, 'Criminología', 4, 240, 3),
       (10, 'Ingeniería Comercial', 5, 300, 4), (11, 'Contador Auditor', 4, 240, 4), (12, 'Administración Pública', 4, 230, 4), (13, 'Diseño Gráfico', 4, 220, 5), (14, 'Artes Visuales', 4, 220, 5)]
mat = [(1, 'Cálculo I', 6, 'Lun 08:30'), (2, 'Cálculo II', 6, 'Mar 10:00'), (3, 'Álgebra Lineal', 5, 'Mié 08:30'), (4, 'Física General', 6, 'Jue 10:00'), (5, 'Química General', 5, 'Vie 08:30'),
       (6, 'Programación', 6, 'Lun 14:30'), (7, 'Bases de Datos', 6, 'Mar 14:30'), (8, 'Comunicación Oral', 3, 'Mié 16:00'), (9, 'Matemática Discreta', 5, 'Jue 14:30'), (10, 'Metodología de la Investigación', 4, 'Vie 10:00'),
       (11, 'Anatomía', 8, 'Lun 10:00'), (12, 'Fisiología', 8, 'Mar 08:30'), (13, 'Derecho Civil', 6, 'Mié 10:00'), (14, 'Derecho Penal', 6, 'Jue 08:30'), (15, 'Microeconomía', 5, 'Vie 14:30'),
       (16, 'Contabilidad', 5, 'Lun 16:00'), (17, 'Marketing', 4, 'Mar 16:00'), (18, 'Historia del Arte', 3, 'Mié 14:30'), (19, 'Ética Profesional', 2, 'Jue 16:00'), (20, 'Inglés Técnico', 3, 'Vie 16:00'),
       (21, 'Cálculo III', 6, 'Lun 12:00'), (22, 'Computación Gráfica', 4, 'Mar 12:00'), (23, 'Mecánica', 6, 'Mié 12:00'), (24, 'Metodologías Ágiles', 4, 'Jue 12:00')]
decanos = []
for f in fac:
    n, a = r.choice(NOM), r.choice(APE)
    decanos.append((f[0], n, a, f'+569{r.randint(40000000, 99999999)}', f'{ascii_(n).lower()}.{ascii_(a).lower()}.decano@uni.cl', r.choice([4200000, 4500000, 4800000, 5100000, 5400000]), f[0]))
prof_rows = []
for i in range(1, 31):
    n, a = r.choice(NOM), r.choice(APE)
    prof_rows.append((i, n, a, f'+569{r.randint(40000000, 99999999)}', f'prof{i}.{ascii_(a).lower()}@uni.cl', r.choice(['Diurna', 'Vespertina', 'Mixta']), r.choice([1200000, 1500000, 1800000, 2100000, 2500000, 2900000])))
est_rows = []
for i in range(1, 121):
    n, a = r.choice(NOM), r.choice(APE)
    est_rows.append((i, n, a, f'est{i}.{ascii_(a).lower()}@alumnos.uni.cl', r.randint(20, 220), r.randint(1, 10), r.choice([2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7])))
# matrículas en materias: algunas materias muy populares (>30 estudiantes)
popular = [1, 6, 7, 8, 9, 13, 16]
pesos = [6 if m[0] in popular else 1 for m in mat]
mat_est = set()
for e in est_rows:
    k = r.randint(4, 7)
    while len([1 for x in mat_est if x[1] == e[0]]) < k:
        m = r.choices([x[0] for x in mat], weights=pesos)[0]
        mat_est.add((m, e[0]))
mat_prof = set()
for m in mat:
    for p in r.sample(range(1, 31), r.randint(1, 3)):
        mat_prof.add((m[0], p))
prof_est = set()
for p in range(1, 31):
    n = r.choice([0, 1, 2, 2, 3, 4, 6, 8, 10])
    for e in r.sample(range(1, 121), n):
        prof_est.add((p, e))
prof_fac = set()
for p in range(1, 31):
    prof_fac.add((p, r.randint(1, 5)))
    if r.random() < 0.3:
        prof_fac.add((p, r.randint(1, 5)))
est_car = set()
est_fac = set()
for e in est_rows:
    c = r.choice(car)
    est_car.add((e[0], c[0]))
    est_fac.add((e[0], c[4]))
    if r.random() < 0.1:
        c2 = r.choice(car)
        est_car.add((e[0], c2[0]))
        est_fac.add((e[0], c2[4]))
uni = '''CREATE TABLE facultad (
  id INT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  direccion VARCHAR(40) NOT NULL
);
CREATE TABLE carrera (
  id INT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  duracion_anios INT NOT NULL,
  creditos INT NOT NULL,
  id_facultad INT,
  FOREIGN KEY (id_facultad) REFERENCES facultad(id)
);
CREATE TABLE decano (
  id INT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  apellido VARCHAR(40) NOT NULL,
  telefono VARCHAR(15) NOT NULL,
  email VARCHAR(40) NOT NULL UNIQUE,
  salario INT NOT NULL,
  id_facultad INT,
  FOREIGN KEY (id_facultad) REFERENCES facultad(id)
);
CREATE TABLE materia (
  id INT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  creditos INT NOT NULL,
  horario VARCHAR(40) NOT NULL
);
CREATE TABLE profesor (
  id INT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  apellido VARCHAR(40) NOT NULL,
  telefono VARCHAR(15) NOT NULL,
  email VARCHAR(40) NOT NULL UNIQUE,
  jornada VARCHAR(40) NOT NULL,
  salario INT NOT NULL
);
CREATE TABLE estudiante (
  id INT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  apellido VARCHAR(40) NOT NULL,
  email VARCHAR(40) NOT NULL UNIQUE,
  creditos INT NOT NULL,
  semestre INT NOT NULL,
  promedio INT NOT NULL
);
CREATE TABLE materia_estudiante (
  id_materia INT, id_estudiante INT,
  PRIMARY KEY (id_materia, id_estudiante),
  FOREIGN KEY (id_materia) REFERENCES materia(id),
  FOREIGN KEY (id_estudiante) REFERENCES estudiante(id)
);
CREATE TABLE materia_profesor (
  id_materia INT, id_profesor INT,
  PRIMARY KEY (id_materia, id_profesor),
  FOREIGN KEY (id_materia) REFERENCES materia(id),
  FOREIGN KEY (id_profesor) REFERENCES profesor(id)
);
CREATE TABLE profesor_estudiante (
  id_profesor INT, id_estudiante INT,
  PRIMARY KEY (id_profesor, id_estudiante),
  FOREIGN KEY (id_profesor) REFERENCES profesor(id),
  FOREIGN KEY (id_estudiante) REFERENCES estudiante(id)
);
CREATE TABLE profesor_facultad (
  id_profesor INT, id_facultad INT,
  PRIMARY KEY (id_profesor, id_facultad),
  FOREIGN KEY (id_profesor) REFERENCES profesor(id),
  FOREIGN KEY (id_facultad) REFERENCES facultad(id)
);
CREATE TABLE estudiante_carrera (
  id_estudiante INT, id_carrera INT,
  PRIMARY KEY (id_estudiante, id_carrera),
  FOREIGN KEY (id_estudiante) REFERENCES estudiante(id),
  FOREIGN KEY (id_carrera) REFERENCES carrera(id)
);
CREATE TABLE estudiante_facultad (
  id_estudiante INT, id_facultad INT,
  PRIMARY KEY (id_estudiante, id_facultad),
  FOREIGN KEY (id_estudiante) REFERENCES estudiante(id),
  FOREIGN KEY (id_facultad) REFERENCES facultad(id)
);
'''
uni += ins('facultad', ['id', 'nombre', 'direccion'], fac) + ins('carrera', ['id', 'nombre', 'duracion_anios', 'creditos', 'id_facultad'], car)
uni += ins('decano', ['id', 'nombre', 'apellido', 'telefono', 'email', 'salario', 'id_facultad'], decanos)
uni += ins('materia', ['id', 'nombre', 'creditos', 'horario'], mat) + ins('profesor', ['id', 'nombre', 'apellido', 'telefono', 'email', 'jornada', 'salario'], prof_rows)
uni += ins('estudiante', ['id', 'nombre', 'apellido', 'email', 'creditos', 'semestre', 'promedio'], est_rows)
uni += ins('materia_estudiante', ['id_materia', 'id_estudiante'], sorted(mat_est)) + ins('materia_profesor', ['id_materia', 'id_profesor'], sorted(mat_prof))
uni += ins('profesor_estudiante', ['id_profesor', 'id_estudiante'], sorted(prof_est)) + ins('profesor_facultad', ['id_profesor', 'id_facultad'], sorted(prof_fac))
uni += ins('estudiante_carrera', ['id_estudiante', 'id_carrera'], sorted(est_car)) + ins('estudiante_facultad', ['id_estudiante', 'id_facultad'], sorted(est_fac))
write('universidad', uni)

# ---------- biblioteca (Solemne 2) ----------
r = random.Random(31)
tipos = [(1, 'Estudiante'), (2, 'Docente'), (3, 'Funcionario'), (4, 'Externo')]
edit = [(100, 'Alfaguara'), (200, 'Planeta'), (300, 'Penguin Random House'), (400, 'Anagrama'), (500, 'Zig-Zag'), (600, 'Santillana'), (700, 'Fondo de Cultura Económica'), (800, 'Lom Ediciones')]
gens = [(1, 'Literatura'), (2, 'Novela'), (3, 'Fantasía'), (4, 'Ciencia ficción'), (5, 'Historia'), (6, 'Poesía'), (7, 'Terror'), (8, 'Ensayo'), (9, 'Biografía'), (10, 'Aventura')]
titulos = ['La casa de los espíritus', 'Pedro Páramo', 'Cien años de soledad', 'Rayuela', 'El túnel', 'Ficciones', 'Los detectives salvajes', 'La ciudad y los perros', 'Rinconete y Cortadillo', 'Fahrenheit 451',
           'Dune', 'Neuromante', 'El Hobbit', 'Drácula', 'Frankenstein', 'Historia de Chile', 'Veinte poemas de amor', 'Canto general', 'El señor de las moscas', 'Matadero cinco']
personas = []
for i in range(1, 61):
    n, a = r.choice(NOM), r.choice(APE)
    personas.append((i, r.choice(tipos)[0], f'{n} {a}', f'{r.randint(9, 25)}.{r.randint(100, 999)}.{r.randint(100, 999)}-{r.choice("0123456789K")}', f'+569{r.randint(40000000, 99999999)}'))
libros = []
for i in range(1, 81):
    # algunas editoriales concentran más libros (>10)
    e = r.choices([x[0] for x in edit], weights=[5, 4, 4, 1, 2, 3, 1, 1])[0]
    g = r.choice(gens)[0]
    libros.append((i, e, r.choice(tipos)[0], g, f'978-956-{r.randint(1000, 9999)}-{r.randint(10, 99)}-{r.randint(0, 9)}', f'{r.randint(1, 5)}ª edición', f'EJ-{r.randint(1, 9)}'))
prest = []
base = dt.datetime(2025, 3, 3, 9, 0)
for i in range(1, 301):
    p = r.choice(personas)
    l = r.choice(libros)
    f = base + dt.timedelta(days=r.randint(0, 400), hours=r.randint(0, 8))
    dev = f + dt.timedelta(days=r.randint(5, 30)) if r.random() < 0.8 else None
    prest.append((i, p[0], l[0], p[1], f, dev))
bib = '''CREATE TABLE tipopersona (
  idtipopersona INT PRIMARY KEY,
  nom_tipopersona VARCHAR(45)
);
CREATE TABLE persona (
  idpersona INT PRIMARY KEY,
  idtipopersona_fk INT,
  nom_persona VARCHAR(100),
  doc_identificacion VARCHAR(45),
  tel VARCHAR(13),
  FOREIGN KEY (idtipopersona_fk) REFERENCES tipopersona(idtipopersona)
);
CREATE TABLE editorial (
  ideditorial INT PRIMARY KEY,
  nom_editorial VARCHAR(45)
);
CREATE TABLE genero (
  idgenero INT PRIMARY KEY,
  nom_genero VARCHAR(45)
);
CREATE TABLE libro (
  idlibro INT PRIMARY KEY,
  ideditorial_fk INT,
  idtipopersona_fk INT,
  idgenero_fk INT,
  isbn VARCHAR(20),
  edicion VARCHAR(15),
  ejemplar VARCHAR(15),
  FOREIGN KEY (ideditorial_fk) REFERENCES editorial(ideditorial),
  FOREIGN KEY (idtipopersona_fk) REFERENCES tipopersona(idtipopersona),
  FOREIGN KEY (idgenero_fk) REFERENCES genero(idgenero)
);
CREATE TABLE prestamo (
  idprestamo INT PRIMARY KEY,
  idpersona_fk INT,
  idlibro_fk INT,
  idtipopersona_fk INT,
  fecha_prestamo DATETIME,
  fecha_devolucion DATETIME,
  FOREIGN KEY (idpersona_fk) REFERENCES persona(idpersona),
  FOREIGN KEY (idlibro_fk) REFERENCES libro(idlibro),
  FOREIGN KEY (idtipopersona_fk) REFERENCES tipopersona(idtipopersona)
);
CREATE TABLE usuario (
  idusuario INT PRIMARY KEY,
  nom_usuario VARCHAR(100),
  login VARCHAR(20),
  clave VARCHAR(64),
  imagen VARCHAR(50),
  condicion TINYINT
);
CREATE TABLE permiso (
  idpermiso INT PRIMARY KEY,
  nom_permiso VARCHAR(45)
);
CREATE TABLE usuario_permiso (
  idusuario_permiso INT PRIMARY KEY,
  idusuario_fk INT,
  idpermiso_fk INT,
  FOREIGN KEY (idusuario_fk) REFERENCES usuario(idusuario),
  FOREIGN KEY (idpermiso_fk) REFERENCES permiso(idpermiso)
);
'''
bib += ins('tipopersona', ['idtipopersona', 'nom_tipopersona'], tipos) + ins('editorial', ['ideditorial', 'nom_editorial'], edit) + ins('genero', ['idgenero', 'nom_genero'], gens)
bib += ins('persona', ['idpersona', 'idtipopersona_fk', 'nom_persona', 'doc_identificacion', 'tel'], personas)
bib += ins('libro', ['idlibro', 'ideditorial_fk', 'idtipopersona_fk', 'idgenero_fk', 'isbn', 'edicion', 'ejemplar'], libros)
# Para que existan personas sin préstamos, se excluyen las últimas 8 personas de los préstamos
prest = [p for p in prest if p[1] <= 52]
bib += ins('prestamo', ['idprestamo', 'idpersona_fk', 'idlibro_fk', 'idtipopersona_fk', 'fecha_prestamo', 'fecha_devolucion'], prest)
bib += ins('usuario', ['idusuario', 'nom_usuario', 'login', 'clave', 'imagen', 'condicion'], [(1, 'Administrador', 'admin', 'a1b2c3', 'admin.png', 1), (2, 'Bibliotecaria', 'biblio', 'd4e5f6', 'biblio.png', 1), (3, 'Auxiliar', 'aux', 'g7h8i9', 'aux.png', 0)])
bib += ins('permiso', ['idpermiso', 'nom_permiso'], [(1, 'Escritorio'), (2, 'Préstamos'), (3, 'Libros'), (4, 'Usuarios'), (5, 'Reportes')])
bib += ins('usuario_permiso', ['idusuario_permiso', 'idusuario_fk', 'idpermiso_fk'], [(1, 1, 1), (2, 1, 2), (3, 1, 3), (4, 1, 4), (5, 1, 5), (6, 2, 1), (7, 2, 2), (8, 2, 3), (9, 3, 2)])
write('biblioteca', bib)

# ---------- inventario (Solemne 2) ----------
r = random.Random(41)
prov = [(i, n, p, f'{d} {r.randint(10, 999)}', f'{r.randint(10000, 99999)}', pob, f'+5622{r.randint(1000000, 9999999)}', f'+5622{r.randint(1000000, 9999999)}', f'ventas@{ascii_(n).lower().replace(" ", "")}.cl', f'76{r.randint(100000, 999999)}-{r.randint(0, 9)}')
        for i, (n, p, d, pob) in enumerate([('TecnoSur', 'Marcela Ríos', 'Av. Matta', 'Santiago'), ('InfoPlus', 'Hugo Lagos', 'Calle Prat', 'Valparaíso'), ('ElectroAndes', 'Paula Sáez', 'Av. Brasil', 'Viña del Mar'),
                                           ('Distribuidora Norte', 'Raúl Pino', 'Calle Colón', 'Antofagasta'), ('Insumos del Sur', 'Elena Vidal', 'Av. Alemania', 'Temuco'), ('Proveedor Sin Artículos', 'Nadie Aún', 'Calle Sola', 'Santiago')], 1)]
cats = [(1, 'Computación'), (2, 'Redes'), (3, 'Audio y video'), (4, 'Mobiliario'), (5, 'Impresión')]
arts = []
marcas_m = {'Computación': [('Dell', 'Latitude 5420'), ('HP', 'ProBook 450'), ('Lenovo', 'ThinkPad E14'), ('Asus', 'VivoBook 15')], 'Redes': [('Cisco', 'SG350'), ('Ubiquiti', 'UniFi AP'), ('TP-Link', 'Archer C6')],
            'Audio y video': [('Epson', 'PowerLite'), ('Sony', 'SRS-XB'), ('Logitech', 'C920')], 'Mobiliario': [('Herman', 'Ergo 2'), ('Steelcase', 'Gesture')], 'Impresión': [('Brother', 'HL-L2350'), ('Canon', 'G3110')]}
for i in range(1, 41):
    c = r.choice(cats)
    m = r.choice(marcas_m[c[1]])
    arts.append((i, f'{c[1]} - {m[0]} {m[1]}', m[0], m[1], r.randint(1, 30), dt.date(2022 + r.randint(0, 3), r.randint(1, 12), r.randint(1, 28)), round(r.uniform(15000, 1500000), 2), r.randint(1, 5), c[0]))
ubic = [(1, 'Laboratorio 1', 'Piso 1'), (2, 'Laboratorio 2', 'Piso 1'), (3, 'Sala de profesores', 'Piso 2'), (4, 'Bodega central', 'Subterráneo'), (5, 'Biblioteca', 'Piso 3')]
prest_tario = []
for i in range(1, 9):
    n, a = r.choice(NOM), r.choice(APE)
    prest_tario.append((i, f'{n} {a}', f'{r.randint(10000000, 25000000)}', f'Calle {r.choice(APE)} {r.randint(10, 900)}', f'{r.randint(10000, 99999)}', r.choice(['Santiago', 'Valparaíso', 'Concepción']), f'+569{r.randint(40000000, 99999999)}', f'{ascii_(n).lower()}.{ascii_(a).lower()}@correo.cl'))
elem = []
k = 1
for a in arts:
    for _ in range(r.randint(1, 3)):
        u = r.choice(ubic)[0]
        baja = r.random() < 0.15
        elem.append((k, u, a[0], f'SN-{r.randint(100000, 999999)}', r.randint(1, 10), baja, dt.date(2025, r.randint(1, 12), r.randint(1, 28)) if baja else None, r.choice(['Obsoleto', 'Daño por uso', 'Robo']) if baja else None,
                     r.choice(prest_tario)[0] if r.random() < 0.3 else None))
        k += 1
inv = '''CREATE TABLE proveedor (
  id INT PRIMARY KEY,
  nombre VARCHAR(45) NOT NULL,
  personaContacto VARCHAR(45),
  domicilio VARCHAR(45),
  codPostal VARCHAR(5),
  poblacion VARCHAR(45),
  telefono VARCHAR(15),
  fax VARCHAR(15),
  email VARCHAR(45),
  cifnif VARCHAR(12)
);
CREATE TABLE categoria (
  id INT PRIMARY KEY,
  descripcion VARCHAR(45)
);
CREATE TABLE articulo (
  id INT PRIMARY KEY,
  descripcion VARCHAR(80),
  marca VARCHAR(45),
  modelo VARCHAR(45),
  cantidad INT,
  fechaCompra DATE,
  Importe DECIMAL(12,2),
  Proveedor_id INT,
  Categoria_id INT,
  FOREIGN KEY (Proveedor_id) REFERENCES proveedor(id),
  FOREIGN KEY (Categoria_id) REFERENCES categoria(id)
);
CREATE TABLE imagen (
  idArticulo INT PRIMARY KEY,
  imagen MEDIUMBLOB,
  FOREIGN KEY (idArticulo) REFERENCES articulo(id)
);
CREATE TABLE ubicacion (
  id INT PRIMARY KEY,
  ubicacion VARCHAR(45),
  planta VARCHAR(45)
);
CREATE TABLE prestatario (
  id INT PRIMARY KEY,
  nombre VARCHAR(45),
  nif VARCHAR(9),
  domicilio VARCHAR(45),
  codPostal VARCHAR(5),
  poblacion VARCHAR(45),
  telefono VARCHAR(15),
  email VARCHAR(45)
);
CREATE TABLE elemento (
  id INT,
  Ubicacion_id INT,
  Articulo_id INT,
  numSerie VARCHAR(45),
  cantidad INT,
  baja BOOLEAN,
  fechaBaja DATE,
  motivoBaja VARCHAR(200),
  Prestatario_id INT,
  PRIMARY KEY (id, Ubicacion_id, Articulo_id),
  FOREIGN KEY (Ubicacion_id) REFERENCES ubicacion(id),
  FOREIGN KEY (Articulo_id) REFERENCES articulo(id),
  FOREIGN KEY (Prestatario_id) REFERENCES prestatario(id)
);
'''
inv += ins('proveedor', ['id', 'nombre', 'personaContacto', 'domicilio', 'codPostal', 'poblacion', 'telefono', 'fax', 'email', 'cifnif'], prov)
inv += ins('categoria', ['id', 'descripcion'], cats)
inv += ins('articulo', ['id', 'descripcion', 'marca', 'modelo', 'cantidad', 'fechaCompra', 'Importe', 'Proveedor_id', 'Categoria_id'], arts)
inv += ins('ubicacion', ['id', 'ubicacion', 'planta'], ubic) + ins('prestatario', ['id', 'nombre', 'nif', 'domicilio', 'codPostal', 'poblacion', 'telefono', 'email'], prest_tario)
inv += ins('elemento', ['id', 'Ubicacion_id', 'Articulo_id', 'numSerie', 'cantidad', 'baja', 'fechaBaja', 'motivoBaja', 'Prestatario_id'], elem)
write('inventario', inv)

# ---------- comercio (Control 2: clientes, facturas, productos) ----------
r = random.Random(51)
ciudades = ['Santiago', 'Valparaíso', 'Concepción', 'Viña del Mar', 'Temuco', 'Antofagasta', 'La Serena']
cats = [(1, 'Computación'), (2, 'Accesorios'), (3, 'Audio'), (4, 'Hogar'), (5, 'Deportes'), (6, 'Juguetes')]
prods = [('Notebook 14"', 1, 450000), ('Notebook Gamer', 1, 890000), ('Monitor 24"', 1, 129990), ('Mouse inalámbrico', 2, 9990), ('Teclado mecánico', 2, 39990), ('Webcam HD', 2, 24990), ('Audífonos Bluetooth', 3, 34990),
         ('Parlante portátil', 3, 29990), ('Barra de sonido', 3, 99990), ('Aspiradora robot', 4, 159990), ('Hervidor eléctrico', 4, 19990), ('Zapatillas running', 5, 59990), ('Pelota de fútbol', 5, 14990),
         ('Bicicleta MTB', 5, 249990), ('Set de bloques', 6, 24990), ('Auto a control remoto', 6, 34990), ('Pizarra magnética', 4, 17990), ('Disco SSD 1TB', 1, 79990)]
pagos = [(1, 'Efectivo'), (2, 'Tarjeta de débito'), (3, 'Tarjeta de crédito'), (4, 'Transferencia')]
tiendas = [(1, 'Tienda Centro', 'Santiago'), (2, 'Tienda Costa', 'Valparaíso'), (3, 'Tienda Sur', 'Concepción'), (4, 'Tienda Norte', 'Antofagasta'), (5, 'Tienda Lago', 'Temuco')]
clientes = []
for i in range(1, 41):
    n, a = r.choice(NOM), r.choice(APE)
    clientes.append((i, n, a, r.randint(18, 70), r.choice(ciudades)))
productos = [(i + 1, p[0], p[1], r.choice([0, 3, 8, 15, 25, 40, 60]), p[2]) for i, p in enumerate(prods)]
facturas = []
detalles = []
for i in range(1, 121):
    c = r.choice(clientes[:34])  # los últimos clientes no compran
    fecha = dt.date(2022 + r.randint(0, 1), r.randint(1, 12), r.randint(1, 28))
    facturas.append((1000 + i, fecha, r.choice(pagos)[0], c[0], r.choice(tiendas)[0]))
    for pr in r.sample(productos, r.randint(1, 4)):
        detalles.append((1000 + i, pr[0], r.randint(1, 5), pr[4]))
com = '''CREATE TABLE categoria (
  id_categoria INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL
);
CREATE TABLE producto (
  id_producto INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL,
  id_categoria INT,
  stock INT DEFAULT 0,
  precio DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);
CREATE TABLE cliente (
  id_cliente INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL,
  apellido VARCHAR(40) NOT NULL,
  edad INT,
  ciudad VARCHAR(40)
);
CREATE TABLE modo_pago (
  num_pago INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL
);
CREATE TABLE tienda (
  id_tienda INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL,
  ciudad VARCHAR(40)
);
CREATE TABLE factura (
  num_factura INT PRIMARY KEY,
  fecha DATE NOT NULL,
  num_pago INT,
  id_cliente INT,
  id_tienda INT,
  FOREIGN KEY (num_pago) REFERENCES modo_pago(num_pago),
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
  FOREIGN KEY (id_tienda) REFERENCES tienda(id_tienda)
);
CREATE TABLE detalle (
  num_factura INT,
  id_producto INT,
  cantidad INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (num_factura, id_producto),
  FOREIGN KEY (num_factura) REFERENCES factura(num_factura),
  FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);
'''
com += ins('categoria', ['id_categoria', 'nombre'], cats) + ins('producto', ['id_producto', 'nombre', 'id_categoria', 'stock', 'precio'], productos)
com += ins('cliente', ['id_cliente', 'nombre', 'apellido', 'edad', 'ciudad'], clientes) + ins('modo_pago', ['num_pago', 'nombre'], pagos) + ins('tienda', ['id_tienda', 'nombre', 'ciudad'], tiendas)
com += ins('factura', ['num_factura', 'fecha', 'num_pago', 'id_cliente', 'id_tienda'], facturas) + ins('detalle', ['num_factura', 'id_producto', 'cantidad', 'precio'], detalles)
write('comercio', com)

# ---------- academico (Control 2: alumno / curso / carrera) ----------
r = random.Random(61)
carr = [(10, 'Ingeniería Civil Informática', 'Dr. Marcos Salas', 0, 2150000), (15, 'Ingeniería Comercial', 'Dra. Paula Ibáñez', 0, 1850000), (50, 'Psicología', 'Dr. Raúl Cortés', 0, 1700000),
        (20, 'Derecho', 'Dra. Elena Mora', 0, 2400000), (30, 'Enfermería', 'Dra. Sonia Pinto', 0, 1450000), (40, 'Diseño Gráfico', 'Mg. Rodrigo Leal', 0, 980000), (60, 'Trabajo Social', 'Mg. Karina Vidal', 0, 870000)]
acad = [(f'{r.randint(8, 16)}.{r.randint(100, 999)}.{r.randint(100, 999)}-{r.choice("0123456789K")}', r.choice(NOM), r.choice(APE), r.choice(['Ingeniero', 'Psicólogo', 'Abogado', 'Enfermero', 'Diseñador', 'Economista']), r.choice(['Ciencias', 'Humanidades', 'Salud', 'Tecnología'])) for _ in range(12)]
siglas = ['INF101', 'INF102', 'INF205', 'COM110', 'COM220', 'PSI100', 'PSI210', 'DER120', 'DER230', 'ENF140', 'DIS150', 'TSO160', 'MAT100', 'EST200']
cursos = [(s, f'Curso {s}', r.randint(3, 8), r.randint(1, 8), r.choice([c[0] for c in carr]), r.choice(acad)[0]) for s in siglas]
alumnos = []
for i in range(1, 81):
    n, a = r.choice(NOM), r.choice(APE)
    alumnos.append((f'{r.randint(18, 26)}.{r.randint(100, 999)}.{r.randint(100, 999)}-{r.choice("0123456789K")}', n, a, r.choice(['F', 'M']), r.randint(18, 30), r.choice(ciudades)))
ca = set()
for al in alumnos:
    for c in r.sample(cursos, r.randint(2, 5)):
        ca.add((c[0], al[0], round(r.uniform(2.5, 7.0), 1), r.randint(50, 100)))
estado = []
for al in alumnos:
    mine = [x for x in ca if x[1] == al[0]]
    aprob = len([x for x in mine if x[2] >= 4.0])
    estado.append((al[0], aprob, len(mine) - aprob, len(mine)))
cnt = {}
for c in cursos:
    pass
carr2 = []
for c in carr:
    n_al = len({x[1] for x in ca if any(cu[0] == x[0] and cu[4] == c[0] for cu in cursos)})
    carr2.append((c[0], c[1], c[2], n_al, c[4]))
ac = '''CREATE TABLE carrera (
  Cod_carrera INT PRIMARY KEY,
  Nombre VARCHAR(60) NOT NULL,
  director VARCHAR(60),
  num_alumno INT,
  Arancel INT
);
CREATE TABLE academico (
  Rut_acade VARCHAR(12) PRIMARY KEY,
  Nombre VARCHAR(40) NOT NULL,
  Apellido VARCHAR(40) NOT NULL,
  profesion VARCHAR(40),
  departamento VARCHAR(40)
);
CREATE TABLE alumno (
  Rut_alu VARCHAR(12) PRIMARY KEY,
  Nombre VARCHAR(40) NOT NULL,
  Apellido VARCHAR(40) NOT NULL,
  Sexo CHAR(1),
  edad INT,
  Ciudad VARCHAR(40)
);
CREATE TABLE estado_alumno (
  Rut_alu VARCHAR(12) PRIMARY KEY,
  Asign_aprobada INT,
  Asign_reprobada INT,
  Asign_total INT,
  FOREIGN KEY (Rut_alu) REFERENCES alumno(Rut_alu)
);
CREATE TABLE curso (
  Sigla_curso VARCHAR(10) PRIMARY KEY,
  Nombre VARCHAR(60) NOT NULL,
  creditos INT,
  semestre INT,
  Cod_carrera INT,
  Rut_acade VARCHAR(12),
  FOREIGN KEY (Cod_carrera) REFERENCES carrera(Cod_carrera),
  FOREIGN KEY (Rut_acade) REFERENCES academico(Rut_acade)
);
CREATE TABLE curso_alumno (
  Sigla_curso VARCHAR(10),
  Rut_alu VARCHAR(12),
  Nota_final DECIMAL(2,1),
  pct_asistencia INT,
  PRIMARY KEY (Sigla_curso, Rut_alu),
  FOREIGN KEY (Sigla_curso) REFERENCES curso(Sigla_curso),
  FOREIGN KEY (Rut_alu) REFERENCES alumno(Rut_alu)
);
'''
ac += ins('carrera', ['Cod_carrera', 'Nombre', 'director', 'num_alumno', 'Arancel'], carr2) + ins('academico', ['Rut_acade', 'Nombre', 'Apellido', 'profesion', 'departamento'], acad)
ac += ins('alumno', ['Rut_alu', 'Nombre', 'Apellido', 'Sexo', 'edad', 'Ciudad'], alumnos) + ins('estado_alumno', ['Rut_alu', 'Asign_aprobada', 'Asign_reprobada', 'Asign_total'], estado)
ac += ins('curso', ['Sigla_curso', 'Nombre', 'creditos', 'semestre', 'Cod_carrera', 'Rut_acade'], cursos) + ins('curso_alumno', ['Sigla_curso', 'Rut_alu', 'Nota_final', 'pct_asistencia'], sorted(ca))
write('academico', ac)

# ---------- educacion_superior (Control 2: matrículas) ----------
r = random.Random(71)
regiones = [(1, 'Arica y Parinacota'), (2, 'Tarapacá'), (3, 'Antofagasta'), (4, 'Atacama'), (5, 'Coquimbo'), (6, 'Valparaíso'), (7, 'Metropolitana de Santiago'), (8, "Libertador General Bernardo O'Higgins"),
            (9, 'Maule'), (10, 'Ñuble'), (11, 'Biobío'), (12, 'La Araucanía'), (13, 'Los Ríos'), (14, 'Los Lagos'), (15, 'Aysén'), (16, 'Magallanes')]
provincias = [(1, 'Santiago', 7), (2, 'Cordillera', 7), (3, 'Maipo', 7), (4, 'Valparaíso', 6), (5, 'Marga Marga', 6), (6, 'Concepción', 11), (7, 'Cautín', 12), (8, 'Antofagasta', 3), (9, 'Elqui', 5)]
comunas = [(1, 'Santiago', 1), (2, 'Providencia', 1), (3, 'Las Condes', 1), (4, 'Ñuñoa', 1), (5, 'Maipú', 1), (6, 'Puente Alto', 2), (7, 'San Bernardo', 3), (8, 'Valparaíso', 4), (9, 'Viña del Mar', 5),
           (10, 'Concepción', 6), (11, 'Temuco', 7), (12, 'Antofagasta', 8), (13, 'La Serena', 9), (14, 'Quilpué', 5), (15, 'Talcahuano', 6)]
tinst = [(1, 'Universidad'), (2, 'Instituto Profesional'), (3, 'Centro de Formación Técnica')]
acred = [(1, 'No acreditada'), (2, '3 años'), (3, '4 años'), (4, '5 años'), (5, '6 años'), (6, '7 años')]
inst = [(1, 'Universidad Andina del Sur', dt.date(2021, 1, 1), dt.date(2028, 1, 1), 6, 1), (2, 'Universidad del Pacífico', dt.date(2020, 6, 1), dt.date(2025, 6, 1), 4, 1), (3, 'Universidad Metropolitana Central', dt.date(2019, 3, 1), dt.date(2024, 3, 1), 5, 1),
        (4, 'Universidad Tecnológica del Norte', dt.date(2022, 1, 1), dt.date(2026, 1, 1), 3, 1), (5, 'Instituto Profesional Austral', dt.date(2021, 9, 1), dt.date(2026, 9, 1), 4, 2), (6, 'Instituto Profesional Horizonte', dt.date(2018, 5, 1), dt.date(2021, 5, 1), 2, 2),
        (7, 'CFT Técnico Valle', dt.date(2020, 1, 1), dt.date(2023, 1, 1), 2, 3), (8, 'CFT Costa Tec', dt.date(2023, 1, 1), dt.date(2026, 1, 1), 3, 3), (9, 'Universidad Regional del Sur', dt.date(2017, 1, 1), dt.date(2024, 1, 1), 1, 1)]
sedes = []
sid = 1
for i in inst:
    for cm in r.sample(comunas, r.randint(1, 3)):
        sedes.append((sid, i[0], f'Sede {cm[1]}', cm[0]))
        sid += 1
niveles = [(1, 'Pregrado'), (2, 'Técnico de nivel superior'), (3, 'Postgrado'), (4, 'Postítulo')]
modal = [(1, 'Presencial'), (2, 'Semipresencial'), (3, 'No presencial')]
vig = [(1, 'Vigente'), (2, 'Vigente sin ingreso'), (3, 'No vigente')]
tarea = [(1, 'Ciencias'), (2, 'Profesional')]
areas = [(1, 'Ingeniería', 2), (2, 'Salud', 2), (3, 'Educación', 2), (4, 'Derecho', 2), (5, 'Administración y Comercio', 2), (6, 'Arte y Arquitectura', 2), (7, 'Ciencias Básicas', 1)]
jornadas = [(1, 'Diurna'), (2, 'Vespertina')]
planes = [(1, 'Regular'), (2, 'Plan especial'), (3, 'Continuidad')]
ingresos = [(1, 'Admisión regular'), (2, 'Admisión especial'), (3, 'Convalidación'), (4, 'Admisión PACE')]
sexos = [(1, 'Femenino'), (2, 'Masculino')]
carr_nombres = {1: ['Ingeniería Civil Informática', 'Ingeniería Civil Industrial', 'Ingeniería en Ciberseguridad', 'Ingeniería Eléctrica', 'Ingeniería en Construcción'],
                2: ['Enfermería', 'Kinesiología', 'Nutrición y Dietética', 'Tecnología Médica', 'Técnico en Enfermería'], 3: ['Pedagogía en Educación Básica', 'Educación de Párvulos', 'Pedagogía en Matemáticas'],
                4: ['Derecho', 'Técnico Jurídico'], 5: ['Ingeniería Comercial', 'Contador Auditor', 'Administración de Empresas', 'Técnico en Administración'], 6: ['Arquitectura', 'Diseño Gráfico', 'Artes Visuales'], 7: ['Licenciatura en Química', 'Licenciatura en Física']}
carreras = []  # (cod, ..., modalidad en la posición 8)
car_rows = []
cid = 1000
for s in sedes:
    for _ in range(r.randint(2, 4)):
        a = r.choices(areas, weights=[5, 4, 3, 2, 4, 2, 1])[0]
        nom = r.choice(carr_nombres[a[0]])
        niv = 2 if nom.startswith('Técnico') else r.choice([1, 1, 1, 3])
        mod = r.choice([1, 1, 1, 2, 3])
        dur = 4 if niv == 2 else r.choice([8, 10])
        acr = r.choice([None, None, 2, 3, 4, 5, 6])
        carreras.append((cid, nom, mod))
        car_rows.append((cid, nom, r.randint(1, 3), dur, r.choice([1, 2]), dur + 2, r.choice([0, 1]), r.randint(10000, 99999), mod, r.choice(jornadas)[0], r.choice(planes)[0], niv, r.choice([1, 1, 1, 2, 3]), a[0], s[0], acr))
        cid += 1
# La modalidad «Semipresencial» (código 2) solo tiene matrículas en 2021: sirve para «se ofrece en 2021 pero no en 2022».
estud = []
for i in range(1, 701):
    nac = dt.date(r.randint(1980, 2005), r.randint(1, 12), r.randint(1, 28))
    edad = 2023 - nac.year
    rango = '15-19' if edad < 20 else '20-24' if edad < 25 else '25-29' if edad < 30 else '30-39' if edad < 40 else '40 y más'
    estud.append((f'{r.randint(15000000, 26999999)}', nac, rango, r.choice(sexos)[0]))
estud = list({e[0]: e for e in estud}.values())
mats = []
seen = set()
for e in estud:
    for _ in range(r.randint(1, 3)):
        c = r.choice(carreras)
        anio = 2021 if c[2] == 2 else r.choice([2021, 2022, 2023])
        periodos = [2021] if c[2] == 2 else range(anio, min(2023, anio + r.randint(0, 2)) + 1)
        for periodo in periodos:
            key = (e[0], c[0], periodo)
            if key in seen:
                continue
            seen.add(key)
            mats.append((e[0], c[0], periodo, r.choice([60000, 70000, 90000, 110000]), r.choice([1450000, 1600000, 1850000, 2100000, 2500000, 3000000]), r.choice([0, 1]), r.choice([1, 2]), anio, r.choice([1, 2]), r.choice(ingresos)[0]))
es = '''CREATE TABLE region (
  reg_codigo INT PRIMARY KEY,
  reg_nombre VARCHAR(60)
);
CREATE TABLE provincia (
  prov_codigo INT PRIMARY KEY,
  prov_nombre VARCHAR(60),
  prov_region INT,
  FOREIGN KEY (prov_region) REFERENCES region(reg_codigo)
);
CREATE TABLE comuna (
  com_codigo INT PRIMARY KEY,
  com_nombre VARCHAR(60),
  com_provincia INT,
  FOREIGN KEY (com_provincia) REFERENCES provincia(prov_codigo)
);
CREATE TABLE tipo_institucion (
  tpinst_codigo INT PRIMARY KEY,
  tpinst_descripcion VARCHAR(60)
);
CREATE TABLE acreditacion (
  acr_codigo INT PRIMARY KEY,
  acr_descripcion VARCHAR(60)
);
CREATE TABLE institucion (
  inst_codigo INT PRIMARY KEY,
  inst_nombre VARCHAR(80),
  inst_acreditacion_inicio DATE,
  inst_acreditacion_fin DATE,
  inst_acreditacion INT,
  inst_tipo_institucion INT,
  FOREIGN KEY (inst_acreditacion) REFERENCES acreditacion(acr_codigo),
  FOREIGN KEY (inst_tipo_institucion) REFERENCES tipo_institucion(tpinst_codigo)
);
CREATE TABLE sede (
  sed_codigo INT,
  sed_institucion INT,
  sed_nombre VARCHAR(80),
  sed_comuna INT,
  PRIMARY KEY (sed_codigo, sed_institucion),
  FOREIGN KEY (sed_institucion) REFERENCES institucion(inst_codigo),
  FOREIGN KEY (sed_comuna) REFERENCES comuna(com_codigo)
);
CREATE TABLE nivel (
  niv_codigo INT PRIMARY KEY,
  niv_descripcion VARCHAR(60)
);
CREATE TABLE modalidad (
  mod_codigo INT PRIMARY KEY,
  mod_descripcion VARCHAR(60)
);
CREATE TABLE vigencia (
  vig_codigo INT PRIMARY KEY,
  vig_descripcion VARCHAR(60)
);
CREATE TABLE tipo_area (
  tpar_codigo INT PRIMARY KEY,
  tpar_descripcion VARCHAR(60)
);
CREATE TABLE area (
  are_codigo INT PRIMARY KEY,
  are_descripcion VARCHAR(60),
  are_tipo_area INT,
  FOREIGN KEY (are_tipo_area) REFERENCES tipo_area(tpar_codigo)
);
CREATE TABLE jornada (
  jor_codigo INT PRIMARY KEY,
  jor_descripcion VARCHAR(60)
);
CREATE TABLE tipo_plan (
  tppl_codigo INT PRIMARY KEY,
  tppl_descripcion VARCHAR(60)
);
CREATE TABLE ingreso (
  ing_codigo INT PRIMARY KEY,
  ing_descripcion VARCHAR(60)
);
CREATE TABLE sexo (
  sex_codigo INT PRIMARY KEY,
  sex_descripcion VARCHAR(30)
);
CREATE TABLE carrera (
  car_codigo INT PRIMARY KEY,
  car_nombre VARCHAR(100),
  car_version INT,
  car_duracion_estudio INT,
  car_duracion_titulacion INT,
  car_duracion_total INT,
  car_requisito_ingreso INT,
  car_codigo_demre INT,
  car_modalidad INT,
  car_jornada INT,
  car_tipo_plan INT,
  car_nivel INT,
  car_vigencia INT,
  car_area INT,
  car_sede INT,
  car_acreditacion INT,
  FOREIGN KEY (car_modalidad) REFERENCES modalidad(mod_codigo),
  FOREIGN KEY (car_jornada) REFERENCES jornada(jor_codigo),
  FOREIGN KEY (car_tipo_plan) REFERENCES tipo_plan(tppl_codigo),
  FOREIGN KEY (car_nivel) REFERENCES nivel(niv_codigo),
  FOREIGN KEY (car_vigencia) REFERENCES vigencia(vig_codigo),
  FOREIGN KEY (car_area) REFERENCES area(are_codigo),
  FOREIGN KEY (car_acreditacion) REFERENCES acreditacion(acr_codigo)
);
CREATE TABLE estudiante (
  est_run VARCHAR(10) PRIMARY KEY,
  est_nacimiento DATE,
  est_rango_edad VARCHAR(20),
  est_sexo INT,
  FOREIGN KEY (est_sexo) REFERENCES sexo(sex_codigo)
);
CREATE TABLE matricula (
  mat_estudiante VARCHAR(10),
  mat_carrera INT,
  mat_periodo INT,
  mat_valor_matricula INT,
  mat_valor_arancel INT,
  mat_ingreso_primer_agno TINYINT,
  mat_ingreso_semestre_matricula INT,
  mat_agno_ingreso INT,
  mat_semestre_ingreso INT,
  mat_forma_ingreso INT,
  PRIMARY KEY (mat_estudiante, mat_carrera, mat_periodo),
  FOREIGN KEY (mat_estudiante) REFERENCES estudiante(est_run),
  FOREIGN KEY (mat_carrera) REFERENCES carrera(car_codigo),
  FOREIGN KEY (mat_forma_ingreso) REFERENCES ingreso(ing_codigo)
);
'''
es += ins('region', ['reg_codigo', 'reg_nombre'], regiones) + ins('provincia', ['prov_codigo', 'prov_nombre', 'prov_region'], provincias) + ins('comuna', ['com_codigo', 'com_nombre', 'com_provincia'], comunas)
es += ins('tipo_institucion', ['tpinst_codigo', 'tpinst_descripcion'], tinst) + ins('acreditacion', ['acr_codigo', 'acr_descripcion'], acred)
es += ins('institucion', ['inst_codigo', 'inst_nombre', 'inst_acreditacion_inicio', 'inst_acreditacion_fin', 'inst_acreditacion', 'inst_tipo_institucion'], inst)
es += ins('sede', ['sed_codigo', 'sed_institucion', 'sed_nombre', 'sed_comuna'], sedes)
es += ins('nivel', ['niv_codigo', 'niv_descripcion'], niveles) + ins('modalidad', ['mod_codigo', 'mod_descripcion'], modal) + ins('vigencia', ['vig_codigo', 'vig_descripcion'], vig)
es += ins('tipo_area', ['tpar_codigo', 'tpar_descripcion'], tarea) + ins('area', ['are_codigo', 'are_descripcion', 'are_tipo_area'], areas)
es += ins('jornada', ['jor_codigo', 'jor_descripcion'], jornadas) + ins('tipo_plan', ['tppl_codigo', 'tppl_descripcion'], planes) + ins('ingreso', ['ing_codigo', 'ing_descripcion'], ingresos) + ins('sexo', ['sex_codigo', 'sex_descripcion'], sexos)
es += ins('carrera', ['car_codigo', 'car_nombre', 'car_version', 'car_duracion_estudio', 'car_duracion_titulacion', 'car_duracion_total', 'car_requisito_ingreso', 'car_codigo_demre', 'car_modalidad', 'car_jornada', 'car_tipo_plan', 'car_nivel', 'car_vigencia', 'car_area', 'car_sede', 'car_acreditacion'], car_rows)
es += ins('estudiante', ['est_run', 'est_nacimiento', 'est_rango_edad', 'est_sexo'], estud)
es += ins('matricula', ['mat_estudiante', 'mat_carrera', 'mat_periodo', 'mat_valor_matricula', 'mat_valor_arancel', 'mat_ingreso_primer_agno', 'mat_ingreso_semestre_matricula', 'mat_agno_ingreso', 'mat_semestre_ingreso', 'mat_forma_ingreso'], mats)
write('educacion_superior', es)
print('educacion_superior: carreras', len(carreras), 'estudiantes', len(estud), 'matrículas', len(mats))
