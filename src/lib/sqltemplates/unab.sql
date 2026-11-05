CREATE TABLE Empresa
(
rut varchar(12) primary key,
nombre varchar(100)
);

CREATE TABLE Departamento
(
id_depto int primary key,
nombre_depto varchar(30),
rut varchar(12),
foreign key (rut) REFERENCES Empresa(rut)
);

CREATE TABLE Sede 
(
id_sede int primary key,
nombre_sede varchar(30),
ubicacion varchar(50),
rut varchar(12),
foreign key (rut) REFERENCES Empresa(rut)
);

CREATE TABLE Empleado
(
rut varchar(12) PRIMARY KEY,
nombre varchar(30),
apaterno varchar(50),
amaterno varchar(50),
fecha_nacimiento date,
tipo enum('Contrata','Honorario'),
id_depto int,
foreign key (id_depto) REFERENCES Departamento(id_depto)
);

CREATE TABLE Telefono
(
rut varchar(12),
telefono int,
primary key (rut,telefono),
foreign key (rut) references Empleado(rut)
);

CREATE TABLE Email
(
rut varchar(12),
email varchar(30),
primary key (rut, email),
foreign key (rut) references Empleado(rut)
);

INSERT INTO Empresa (rut, nombre) VALUES
  ('76123456-7', 'UNAB Servicios SpA'),
  ('77654321-K', 'Consultora Andes Ltda.');
INSERT INTO Departamento (id_depto, nombre_depto, rut) VALUES
  (1, 'Recursos Humanos', '76123456-7'),
  (2, 'Tecnología', '76123456-7'),
  (3, 'Finanzas', '76123456-7'),
  (4, 'Operaciones', '77654321-K'),
  (5, 'Comercial', '77654321-K');
INSERT INTO Sede (id_sede, nombre_sede, ubicacion, rut) VALUES
  (1, 'Casa Central', 'Santiago', '76123456-7'),
  (2, 'Sede Viña', 'Viña del Mar', '76123456-7'),
  (3, 'Sede Sur', 'Concepción', '77654321-K');
INSERT INTO Empleado (rut, nombre, apaterno, amaterno, fecha_nacimiento, tipo, id_depto) VALUES
  ('16986673-7', 'Nicolás', 'Martínez', 'Sepúlveda', '1981-03-26', 'Honorario', 5),
  ('21290196-7', 'Valentina', 'Rojas', 'Muñoz', '1992-12-21', 'Contrata', 5),
  ('15563769-9', 'Catalina', 'Rojas', 'Sepúlveda', '1975-09-03', 'Contrata', 1),
  ('12347714-0', 'Nicolás', 'Soto', 'Silva', '1993-04-17', 'Contrata', 3),
  ('16104778-1', 'Nicolás', 'Pérez', 'Contreras', '1992-02-23', 'Honorario', 3),
  ('21335625-4', 'Camila', 'Muñoz', 'Sepúlveda', '1999-02-13', 'Contrata', 3),
  ('15168117-K', 'Camila', 'Díaz', 'Díaz', '1976-08-13', 'Honorario', 4),
  ('10679744-3', 'Catalina', 'Pérez', 'Soto', '1977-05-11', 'Contrata', 4),
  ('21220237-3', 'Felipe', 'Muñoz', 'González', '1976-08-26', 'Honorario', 2),
  ('19672292-7', 'Javiera', 'Díaz', 'Rojas', '1988-11-13', 'Contrata', 4),
  ('15317100-4', 'Tomás', 'Pérez', 'González', '1981-03-13', 'Contrata', 1),
  ('11318552-4', 'Camila', 'Sepúlveda', 'Soto', '2001-05-13', 'Contrata', 1),
  ('10313696-K', 'Matías', 'González', 'Sepúlveda', '1986-06-20', 'Honorario', 2),
  ('18595952-9', 'Fernanda', 'Contreras', 'Rojas', '1995-03-10', 'Contrata', 5),
  ('12842294-2', 'Felipe', 'Martínez', 'Díaz', '1996-07-16', 'Contrata', 4),
  ('9206211-0', 'Javiera', 'Pérez', 'Díaz', '1998-12-13', 'Honorario', 4),
  ('22710602-4', 'Javiera', 'Rojas', 'Muñoz', '1979-04-16', 'Contrata', 3),
  ('12308866-0', 'Diego', 'Pérez', 'Contreras', '1989-04-02', 'Contrata', 2),
  ('13477643-9', 'Fernanda', 'Muñoz', 'Soto', '1979-08-11', 'Contrata', 5),
  ('9118586-5', 'Felipe', 'Pérez', 'González', '1975-10-21', 'Contrata', 4),
  ('10848418-5', 'Fernanda', 'Muñoz', 'Muñoz', '1989-09-12', 'Contrata', 2),
  ('21449460-1', 'Catalina', 'Silva', 'Muñoz', '1988-01-28', 'Honorario', 5),
  ('9739778-6', 'Antonia', 'Sepúlveda', 'González', '1994-02-03', 'Contrata', 1),
  ('13526845-5', 'Antonia', 'Sepúlveda', 'Silva', '1989-08-27', 'Contrata', 5);
INSERT INTO Telefono (rut, telefono) VALUES
  ('16986673-7', 909632402),
  ('21290196-7', 901499790),
  ('15563769-9', 906204879),
  ('12347714-0', 902471902),
  ('16104778-1', 909069116),
  ('21335625-4', 901373975),
  ('15168117-K', 904862478),
  ('10679744-3', 902893894),
  ('21220237-3', 909342480),
  ('19672292-7', 909158714),
  ('15317100-4', 905292118),
  ('11318552-4', 901189703),
  ('10313696-K', 907173199),
  ('18595952-9', 906050489),
  ('12842294-2', 903402839),
  ('9206211-0', 904398634),
  ('22710602-4', 909697218),
  ('12308866-0', 903845535),
  ('13477643-9', 906746603),
  ('9118586-5', 908414396),
  ('10848418-5', 909360271),
  ('21449460-1', 905051424),
  ('9739778-6', 906485488),
  ('13526845-5', 907790698),
  ('16986673-7', 912345678);
INSERT INTO Email (rut, email) VALUES
  ('16986673-7', 'nmartinez0@emp.cl'),
  ('21290196-7', 'vrojas1@emp.cl'),
  ('15563769-9', 'crojas2@emp.cl'),
  ('12347714-0', 'nsoto3@emp.cl'),
  ('16104778-1', 'nperez4@emp.cl'),
  ('21335625-4', 'cmunoz5@emp.cl'),
  ('15168117-K', 'cdiaz6@emp.cl'),
  ('10679744-3', 'cperez7@emp.cl'),
  ('21220237-3', 'fmunoz8@emp.cl'),
  ('19672292-7', 'jdiaz9@emp.cl'),
  ('15317100-4', 'tperez10@emp.cl'),
  ('11318552-4', 'csepulveda11@emp.cl'),
  ('10313696-K', 'mgonzalez12@emp.cl'),
  ('18595952-9', 'fcontreras13@emp.cl'),
  ('12842294-2', 'fmartinez14@emp.cl'),
  ('9206211-0', 'jperez15@emp.cl'),
  ('22710602-4', 'jrojas16@emp.cl'),
  ('12308866-0', 'dperez17@emp.cl'),
  ('13477643-9', 'fmunoz18@emp.cl'),
  ('9118586-5', 'fperez19@emp.cl'),
  ('10848418-5', 'fmunoz20@emp.cl'),
  ('21449460-1', 'csilva21@emp.cl'),
  ('9739778-6', 'asepulveda22@emp.cl'),
  ('13526845-5', 'asepulveda23@emp.cl');
