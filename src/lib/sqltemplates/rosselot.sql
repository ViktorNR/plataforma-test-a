CREATE TABLE cliente (
    rut VARCHAR(11) PRIMARY KEY,
    nombre VARCHAR(30),
    apellido VARCHAR(40),
    direccion VARCHAR(90),
    telefono INT,
    fecha_nacimiento DATE
);

CREATE TABLE vehiculo (
    num_motor VARCHAR(15) PRIMARY KEY,
    num_chasis VARCHAR(15),
    rut VARCHAR(11),
    FOREIGN KEY (rut) REFERENCES cliente(rut)
);

INSERT INTO cliente (rut, nombre, apellido, direccion, telefono, fecha_nacimiento) VALUES
  ('171185750', 'Eduardo', 'Navarro', 'Quillota 980', 945524171, '1988-11-15'),
  ('145556589', 'Carla', 'Oyarce', 'Sau Sau 360', 940458565, '1980-08-07'),
  ('142829797', 'Cristian', 'Tamayo', 'Las Maravillas 950', 958676745, '1973-09-02'),
  ('201234567', 'Marcela', 'Fuentes', 'Libertad 120', 977665544, '1995-03-21');
INSERT INTO vehiculo (num_motor, num_chasis, rut) VALUES
  ('123456789', 'AB6875757464', '171185750'),
  ('456789098', 'AB5678989994', '171185750'),
  ('456798787', 'AB0987656778', '171185750'),
  ('435698778', 'AB5678987654', '145556589'),
  ('234567876', 'AB6868686899', '145556589'),
  ('660987645', 'AB7474799993', '142829797');
