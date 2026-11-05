CREATE TABLE Cliente 
(
Rut varchar(10) PRIMARY KEY,
nombre varchar(20),
apaterno varchar(20),
amaterno varchar(20)
);

CREATE TABLE Telefono
(
  rut VARCHAR(10),
  telefono INT,
  PRIMARY KEY (rut, telefono)
);


CREATE TABLE Vehiculo
(
    Chasis int PRIMARY KEY,
    marca varchar(20),
    modelo varchar(20),
    color varchar(15),
    rut varchar(10),
    FOREIGN KEY (rut) REFERENCES Cliente(rut)
);

INSERT INTO Cliente (rut, nombre, apaterno, amaterno) VALUES
  ('171185750', 'Eduardo', 'Navarro', 'Lorenzo'),
  ('145556589', 'Carla', 'Oyarce', 'Soto'),
  ('142829797', 'Cristian', 'Tamayo', 'Rojas'),
  ('137659255', 'Elizabeth', 'Pizarro', 'Vera'),
  ('190610830', 'Ignacio', 'Tapia', 'Reyes'),
  ('201234567', 'Marcela', 'Fuentes', 'Díaz');
INSERT INTO Telefono (rut, telefono) VALUES
  ('171185750', 908961974),
  ('145556589', 905512986),
  ('142829797', 909877341),
  ('137659255', 906868424),
  ('190610830', 903392436),
  ('201234567', 907402873),
  ('171185750', 322855378);
INSERT INTO Vehiculo (Chasis, marca, modelo, color, rut) VALUES
  (987000000, 'Hyundai', 'Verna', 'Plata', '171185750'),
  (987000001, 'Kia', 'Morning', 'Rojo', '145556589'),
  (987000002, 'Chevrolet', 'Sail', 'Blanco', '142829797'),
  (987000003, 'Toyota', 'Yaris', 'Gris', '137659255'),
  (987000004, 'Nissan', 'Versa', 'Azul', '190610830'),
  (987000005, 'Suzuki', 'Swift', 'Negro', '201234567'),
  (987000006, 'Mazda', 'CX-5', 'Gris', '171185750'),
  (987000007, 'Peugeot', '208', 'Blanco', '145556589');
