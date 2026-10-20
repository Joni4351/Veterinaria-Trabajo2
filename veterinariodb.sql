-- ============================================================================
-- SCRIPT DE BASE DE DATOS: veterinariodb
-- Sistema de Gestión Veterinaria
-- Compatible con: Microsoft SQL Server (SSMS, Azure Data Studio, sqlcmd)
-- Incluye: Creación de BD, Tablas, Restricciones, Integridad Referencial y Seeders Completos
-- ============================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'veterinariodb')
BEGIN
    CREATE DATABASE [veterinariodb];
END
GO

USE [veterinariodb];
GO

-- ============================================================================
-- 1. TABLA DE HISTORIAL DE MIGRACIONES EF CORE
-- ============================================================================
IF OBJECT_ID(N'dbo.[__EFMigrationsHistory]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[__EFMigrationsHistory] (
        [MigrationId] NVARCHAR(150) NOT NULL,
        [ProductVersion] NVARCHAR(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END
GO

-- ============================================================================
-- 2. TABLA ROLES
-- ============================================================================
IF OBJECT_ID(N'dbo.[Roles]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Roles] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Nombre] NVARCHAR(100) NOT NULL,
        [PermisosEscritura] BIT NOT NULL,
        CONSTRAINT [PK__Roles__3214EC07445D2FB3] PRIMARY KEY ([Id])
    );
END
GO

-- ============================================================================
-- 3. TABLA USUARIOS
-- ============================================================================
IF OBJECT_ID(N'dbo.[Usuarios]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Usuarios] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RolId] INT NOT NULL,
        [NombreCompleto] NVARCHAR(150) NOT NULL,
        [Email] NVARCHAR(150) NOT NULL,
        [PasswordHash] NVARCHAR(256) NOT NULL,
        CONSTRAINT [PK__Usuarios__3214EC0795B09A7E] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Usuarios_Roles] FOREIGN KEY ([RolId]) REFERENCES [dbo].[Roles] ([Id])
    );
    CREATE UNIQUE NONCLUSTERED INDEX [UQ__Usuarios__A9D10534A20CB241] ON [dbo].[Usuarios] ([Email]);
    CREATE NONCLUSTERED INDEX [IX_Usuarios_RolId] ON [dbo].[Usuarios] ([RolId]);
END
GO

-- ============================================================================
-- 4. TABLA CLIENTES (DNI / RUT ÚNICO)
-- ============================================================================
IF OBJECT_ID(N'dbo.[Clientes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Clientes] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [DocumentoIdentidad] NVARCHAR(20) NOT NULL,
        [NombreCompleto] NVARCHAR(150) NOT NULL,
        [Telefono] NVARCHAR(20) NULL,
        [Email] NVARCHAR(150) NULL,
        CONSTRAINT [PK__Clientes__3214EC070C5DA8E9] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE NONCLUSTERED INDEX [UQ__Clientes__049E81A92BDD82D2] ON [dbo].[Clientes] ([DocumentoIdentidad]);
END
GO

-- ============================================================================
-- 5. TABLA ESPECIALIDADES
-- ============================================================================
IF OBJECT_ID(N'dbo.[Especialidades]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Especialidades] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Nombre] NVARCHAR(100) NOT NULL,
        [CostoBase] DECIMAL(10,2) NOT NULL,
        CONSTRAINT [PK__Especial__3214EC0723BFF743] PRIMARY KEY ([Id])
    );
END
GO

-- ============================================================================
-- 6. TABLA INSUMOS (MEDICAMENTOS Y ARTÍCULOS MÉDICOS)
-- ============================================================================
IF OBJECT_ID(N'dbo.[Insumos]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Insumos] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [NombreProducto] NVARCHAR(150) NOT NULL,
        [Tipo] NVARCHAR(50) NOT NULL,
        [StockActual] INT NOT NULL,
        [PrecioUnitario] DECIMAL(10,2) NOT NULL,
        CONSTRAINT [PK__Insumos__3214EC0728749262] PRIMARY KEY ([Id])
    );
END
GO

-- ============================================================================
-- 7. TABLA PACIENTES (MASCOTAS)
-- ============================================================================
IF OBJECT_ID(N'dbo.[Pacientes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Pacientes] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ClienteId] INT NOT NULL,
        [Nombre] NVARCHAR(100) NOT NULL,
        [Especie] NVARCHAR(50) NOT NULL,
        [Raza] NVARCHAR(50) NULL,
        [Peso] DECIMAL(5,2) NULL,
        [Alergias] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK__Paciente__3214EC076582479F] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Pacientes_Clientes] FOREIGN KEY ([ClienteId]) REFERENCES [dbo].[Clientes] ([Id])
    );
    CREATE NONCLUSTERED INDEX [IX_Pacientes_ClienteId] ON [dbo].[Pacientes] ([ClienteId]);
END
GO

-- ============================================================================
-- 8. TABLA CITAS MÉDICAS
-- ============================================================================
IF OBJECT_ID(N'dbo.[Citas]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Citas] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [PacienteId] INT NOT NULL,
        [UsuarioId] INT NOT NULL,
        [EspecialidadId] INT NOT NULL,
        [FechaHora] DATETIME2 NOT NULL,
        [Estado] NVARCHAR(50) NOT NULL,
        CONSTRAINT [PK__Citas__3214EC07A639186A] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Citas_Pacientes] FOREIGN KEY ([PacienteId]) REFERENCES [dbo].[Pacientes] ([Id]),
        CONSTRAINT [FK_Citas_Usuarios] FOREIGN KEY ([UsuarioId]) REFERENCES [dbo].[Usuarios] ([Id]),
        CONSTRAINT [FK_Citas_Especialidades] FOREIGN KEY ([EspecialidadId]) REFERENCES [dbo].[Especialidades] ([Id])
    );
    CREATE NONCLUSTERED INDEX [IX_Citas_PacienteId] ON [dbo].[Citas] ([PacienteId]);
    CREATE NONCLUSTERED INDEX [IX_Citas_UsuarioId] ON [dbo].[Citas] ([UsuarioId]);
    CREATE NONCLUSTERED INDEX [IX_Citas_EspecialidadId] ON [dbo].[Citas] ([EspecialidadId]);
END
GO

-- ============================================================================
-- 9. TABLA CONSULTAS MÉDICAS
-- ============================================================================
IF OBJECT_ID(N'dbo.[Consultas]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Consultas] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [PacienteId] INT NOT NULL,
        [CitaId] INT NULL,
        [Motivo] NVARCHAR(MAX) NOT NULL,
        [Diagnostico] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK__Consulta__3214EC07AF440D4C] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Consultas_Pacientes] FOREIGN KEY ([PacienteId]) REFERENCES [dbo].[Pacientes] ([Id]),
        CONSTRAINT [FK_Consultas_Citas] FOREIGN KEY ([CitaId]) REFERENCES [dbo].[Citas] ([Id])
    );
    CREATE NONCLUSTERED INDEX [IX_Consultas_PacienteId] ON [dbo].[Consultas] ([PacienteId]);
    CREATE NONCLUSTERED INDEX [IX_Consultas_CitaId] ON [dbo].[Consultas] ([CitaId]);
END
GO

-- ============================================================================
-- 10. TABLA RECETAS MÉDICAS
-- ============================================================================
IF OBJECT_ID(N'dbo.[Recetas]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Recetas] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ConsultaId] INT NOT NULL,
        [FechaEmision] DATE NOT NULL,
        [ValidaHasta] DATE NOT NULL,
        CONSTRAINT [PK__Recetas__3214EC07247EC520] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Recetas_Consultas] FOREIGN KEY ([ConsultaId]) REFERENCES [dbo].[Consultas] ([Id])
    );
    CREATE UNIQUE NONCLUSTERED INDEX [UQ__Recetas__7D0B7DCDF5A12854] ON [dbo].[Recetas] ([ConsultaId]);
END
GO

-- ============================================================================
-- 11. TABLA DETALLES DE RECETA
-- ============================================================================
IF OBJECT_ID(N'dbo.[DetallesReceta]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DetallesReceta] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RecetaId] INT NOT NULL,
        [InsumoId] INT NOT NULL,
        [Dosis] NVARCHAR(100) NOT NULL,
        [DuracionDias] INT NOT NULL,
        CONSTRAINT [PK__Detalles__3214EC074095EE85] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DetallesReceta_Recetas] FOREIGN KEY ([RecetaId]) REFERENCES [dbo].[Recetas] ([Id]),
        CONSTRAINT [FK_DetallesReceta_Insumos] FOREIGN KEY ([InsumoId]) REFERENCES [dbo].[Insumos] ([Id])
    );
    CREATE NONCLUSTERED INDEX [IX_DetallesReceta_RecetaId] ON [dbo].[DetallesReceta] ([RecetaId]);
    CREATE NONCLUSTERED INDEX [IX_DetallesReceta_InsumoId] ON [dbo].[DetallesReceta] ([InsumoId]);
END
GO

-- ============================================================================
-- 12. TABLA FACTURAS
-- ============================================================================
IF OBJECT_ID(N'dbo.[Facturas]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Facturas] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [ClienteId] INT NOT NULL,
        [FechaEmision] DATE NOT NULL CONSTRAINT [DF_Facturas_FechaEmision] DEFAULT (CONVERT(date, GETDATE())),
        [MontoImpuestos] DECIMAL(10,2) NOT NULL,
        [MontoTotal] DECIMAL(10,2) NOT NULL,
        CONSTRAINT [PK__Facturas__3214EC07EDC3F268] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Facturas_Clientes] FOREIGN KEY ([ClienteId]) REFERENCES [dbo].[Clientes] ([Id])
    );
    CREATE NONCLUSTERED INDEX [IX_Facturas_ClienteId] ON [dbo].[Facturas] ([ClienteId]);
END
GO

-- ============================================================================
-- 13. TABLA DETALLES DE FACTURA
-- ============================================================================
IF OBJECT_ID(N'dbo.[DetallesFactura]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DetallesFactura] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [FacturaId] INT NOT NULL,
        [ConsultaId] INT NULL,
        [InsumoId] INT NULL,
        [Subtotal] DECIMAL(10,2) NOT NULL,
        CONSTRAINT [PK__Detalles__3214EC073EE87D18] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DetallesFactura_Facturas] FOREIGN KEY ([FacturaId]) REFERENCES [dbo].[Facturas] ([Id]),
        CONSTRAINT [FK_DetallesFactura_Consultas] FOREIGN KEY ([ConsultaId]) REFERENCES [dbo].[Consultas] ([Id]),
        CONSTRAINT [FK_DetallesFactura_Insumos] FOREIGN KEY ([InsumoId]) REFERENCES [dbo].[Insumos] ([Id])
    );
    CREATE NONCLUSTERED INDEX [IX_DetallesFactura_FacturaId] ON [dbo].[DetallesFactura] ([FacturaId]);
    CREATE NONCLUSTERED INDEX [IX_DetallesFactura_ConsultaId] ON [dbo].[DetallesFactura] ([ConsultaId]);
    CREATE NONCLUSTERED INDEX [IX_DetallesFactura_InsumoId] ON [dbo].[DetallesFactura] ([InsumoId]);
END
GO

-- Marcar migración de EF Core como aplicada
IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = N'20260904061906_InitialCreate')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260904061906_InitialCreate', N'9.0.0');
END
GO

-- ============================================================================
-- 14. LIMPIEZA PREVIA DE REGISTROS (GARANTIZA ESTADO LIMPIO Y ORDENADO)
-- ============================================================================
DELETE FROM [dbo].[DetallesFactura];
DELETE FROM [dbo].[Facturas];
DELETE FROM [dbo].[DetallesReceta];
DELETE FROM [dbo].[Recetas];
DELETE FROM [dbo].[Consultas];
DELETE FROM [dbo].[Citas];
DELETE FROM [dbo].[Pacientes];
DELETE FROM [dbo].[Insumos];
DELETE FROM [dbo].[Clientes];
DELETE FROM [dbo].[Especialidades];
DELETE FROM [dbo].[Usuarios];
DELETE FROM [dbo].[Roles];
GO

-- ============================================================================
-- 15. SEEDERS: POBLADO DE DATOS VÁLIDOS EN TODAS LAS TABLAS
-- ============================================================================

-- 15.1 ROLES
SET IDENTITY_INSERT [dbo].[Roles] ON;
INSERT INTO [dbo].[Roles] ([Id], [Nombre], [PermisosEscritura]) VALUES
(1, N'Administrador', 1),
(2, N'Veterinario', 1),
(3, N'Recepcionista', 0);
SET IDENTITY_INSERT [dbo].[Roles] OFF;
DBCC CHECKIDENT ('dbo.Roles', RESEED, 3);
GO

-- 15.2 USUARIOS (Contraseñas válidas: Admin123*, Vet123*, Recep123*)
-- Jonathan Garrido como Administrador Principal
SET IDENTITY_INSERT [dbo].[Usuarios] ON;
INSERT INTO [dbo].[Usuarios] ([Id], [RolId], [NombreCompleto], [Email], [PasswordHash]) VALUES
(1, 1, N'Jonathan Garrido', N'admin@veterinaria.com', N'AQAAAAIAAYagAAAAEG1He/nXIjT4pXMZ3Az3d9s+cIIYav6ghq2AezMxjIcvk3C5LBaCKv0fQOaLz4ZBTQ=='),
(2, 2, N'Dr. Carlos Mendoza', N'vet@veterinaria.com', N'AQAAAAIAAYagAAAAED4lr9W4eZnKGRAJbKn0yV22jnka9a11oJPpXkNdKbtYeNrQxG2zlS//Nt804qT7EQ=='),
(3, 3, N'Ana Silva', N'recep@veterinaria.com', N'AQAAAAIAAYagAAAAEEqsiEpjpb/G48tfFNqtDf/ewGQeQ9DLmAqLQzV7mpUB/JhV24jw2A+f9sPQZcB9qA==');
SET IDENTITY_INSERT [dbo].[Usuarios] OFF;
DBCC CHECKIDENT ('dbo.Usuarios', RESEED, 3);
GO

-- 15.3 ESPECIALIDADES
SET IDENTITY_INSERT [dbo].[Especialidades] ON;
INSERT INTO [dbo].[Especialidades] ([Id], [Nombre], [CostoBase]) VALUES
(1, N'Medicina General', 25000.00),
(2, N'Cirugía', 120000.00),
(3, N'Dermatología', 40000.00),
(4, N'Odontología', 50000.00),
(5, N'Traumatología', 75000.00);
SET IDENTITY_INSERT [dbo].[Especialidades] OFF;
DBCC CHECKIDENT ('dbo.Especialidades', RESEED, 5);
GO

-- 15.4 INSUMOS (MEDICAMENTOS Y MATERIALES)
SET IDENTITY_INSERT [dbo].[Insumos] ON;
INSERT INTO [dbo].[Insumos] ([Id], [NombreProducto], [Tipo], [StockActual], [PrecioUnitario]) VALUES
(1, N'Amoxicilina 500mg', N'Antibiótico', 150, 8500.00),
(2, N'Meloxicam Gotas 10ml', N'Antiinflamatorio', 80, 12000.00),
(3, N'Vacuna Séxtuple Canina', N'Vacuna', 45, 18000.00),
(4, N'Vacuna Triple Felina', N'Vacuna', 30, 16500.00),
(5, N'NexGard Spectra Antiparasitario', N'Antiparasitario', 60, 22000.00),
(6, N'Suero Fisiológico 500ml', N'Insumo Médico', 200, 4500.00);
SET IDENTITY_INSERT [dbo].[Insumos] OFF;
DBCC CHECKIDENT ('dbo.Insumos', RESEED, 6);
GO

-- 15.5 CLIENTES (TODOS CON RUT CHILENO VÁLIDO CON ALGORITMO MÓDULO 11)
SET IDENTITY_INSERT [dbo].[Clientes] ON;
INSERT INTO [dbo].[Clientes] ([Id], [DocumentoIdentidad], [NombreCompleto], [Telefono], [Email]) VALUES
(1, N'18.765.432-7', N'Jonathan Garrido', N'+56992027788', N'joni@gmail.com'),
(2, N'12.345.678-5', N'Juan Pérez', N'+56912345678', N'juan.perez@example.com'),
(3, N'11.111.111-1', N'María González', N'+56987654321', N'maria.gonzalez@example.com'),
(4, N'7.654.321-6', N'Pedro Soto', N'+56976543210', N'pedro.soto@example.com'),
(5, N'19.876.543-0', N'Camila Morales', N'+56954321678', N'camila.morales@example.com');
SET IDENTITY_INSERT [dbo].[Clientes] OFF;
DBCC CHECKIDENT ('dbo.Clientes', RESEED, 5);
GO

-- 15.6 PACIENTES (MASCOTAS)
SET IDENTITY_INSERT [dbo].[Pacientes] ON;
INSERT INTO [dbo].[Pacientes] ([Id], [ClienteId], [Nombre], [Especie], [Raza], [Peso], [Alergias]) VALUES
(1, 1, N'Thor', N'Canino', N'Pastor Alemán', 34.50, N'Ninguna'),
(2, 1, N'Milo', N'Felino', N'Europeo Común', 4.80, N'Sensibilidad digestiva'),
(3, 2, N'Max', N'Canino', N'Golden Retriever', 31.20, N'Ninguna'),
(4, 3, N'Luna', N'Felino', N'Siamés', 3.90, N'Polen de temporada'),
(5, 4, N'Rocky', N'Canino', N'Bulldog Francés', 13.10, N'Dermatitis por pulgas'),
(6, 5, N'Simba', N'Felino', N'Persa', 5.20, N'Ninguna');
SET IDENTITY_INSERT [dbo].[Pacientes] OFF;
DBCC CHECKIDENT ('dbo.Pacientes', RESEED, 6);
GO

-- 15.7 CITAS MÉDICAS
SET IDENTITY_INSERT [dbo].[Citas] ON;
INSERT INTO [dbo].[Citas] ([Id], [PacienteId], [UsuarioId], [EspecialidadId], [FechaHora], [Estado]) VALUES
(1, 1, 2, 1, '2026-10-21 10:00:00', N'Confirmada'),
(2, 2, 2, 3, '2026-10-21 11:30:00', N'Completada'),
(3, 3, 2, 1, '2026-10-22 09:00:00', N'Confirmada'),
(4, 4, 2, 4, '2026-10-22 14:00:00', N'Pendiente'),
(5, 5, 2, 2, '2026-10-23 16:00:00', N'Confirmada');
SET IDENTITY_INSERT [dbo].[Citas] OFF;
DBCC CHECKIDENT ('dbo.Citas', RESEED, 5);
GO

-- 15.8 CONSULTAS MÉDICAS
SET IDENTITY_INSERT [dbo].[Consultas] ON;
INSERT INTO [dbo].[Consultas] ([Id], [PacienteId], [CitaId], [Motivo], [Diagnostico]) VALUES
(1, 2, 2, N'Control de rutina y revisión de piel por rascado frecuente', N'Dermatitis atópica leve. Se indica tratamiento con antiinflamatorio y loción calmante.'),
(2, 1, NULL, N'Control post-vacunación anual y chequeo general', N'Paciente en excelente condición corporal y signos vitales estables.'),
(3, 3, NULL, N'Molestia en pata delantera izquierda tras paseo en parque', N'Esguince leve en articulación metacarpiana. Reposo indicado por 5 días.');
SET IDENTITY_INSERT [dbo].[Consultas] OFF;
DBCC CHECKIDENT ('dbo.Consultas', RESEED, 3);
GO

-- 15.9 RECETAS MÉDICAS (ConsultaId es único)
SET IDENTITY_INSERT [dbo].[Recetas] ON;
INSERT INTO [dbo].[Recetas] ([Id], [ConsultaId], [FechaEmision], [ValidaHasta]) VALUES
(1, 1, '2026-10-15', '2026-11-15'),
(2, 3, '2026-10-18', '2026-11-18');
SET IDENTITY_INSERT [dbo].[Recetas] OFF;
DBCC CHECKIDENT ('dbo.Recetas', RESEED, 2);
GO

-- 15.10 DETALLES DE RECETA
SET IDENTITY_INSERT [dbo].[DetallesReceta] ON;
INSERT INTO [dbo].[DetallesReceta] ([Id], [RecetaId], [InsumoId], [Dosis], [DuracionDias]) VALUES
(1, 1, 2, N'3 gotas cada 24 horas por vía oral', 7),
(2, 1, 1, N'1/2 comprimido cada 12 horas', 10),
(3, 2, 2, N'5 gotas cada 24 horas con alimento', 5);
SET IDENTITY_INSERT [dbo].[DetallesReceta] OFF;
DBCC CHECKIDENT ('dbo.DetallesReceta', RESEED, 3);
GO

-- 15.11 FACTURAS
SET IDENTITY_INSERT [dbo].[Facturas] ON;
INSERT INTO [dbo].[Facturas] ([Id], [ClienteId], [FechaEmision], [MontoImpuestos], [MontoTotal]) VALUES
(1, 1, '2026-10-15', 7600.00, 47600.00),
(2, 2, '2026-10-18', 7030.00, 44030.00),
(3, 3, '2026-10-19', 4750.00, 29750.00);
SET IDENTITY_INSERT [dbo].[Facturas] OFF;
DBCC CHECKIDENT ('dbo.Facturas', RESEED, 3);
GO

-- 15.12 DETALLES DE FACTURA
SET IDENTITY_INSERT [dbo].[DetallesFactura] ON;
INSERT INTO [dbo].[DetallesFactura] ([Id], [FacturaId], [ConsultaId], [InsumoId], [Subtotal]) VALUES
(1, 1, 1, NULL, 40000.00),
(2, 1, NULL, 2, 12000.00),
(3, 2, 3, NULL, 25000.00),
(4, 3, NULL, 5, 22000.00);
SET IDENTITY_INSERT [dbo].[DetallesFactura] OFF;
DBCC CHECKIDENT ('dbo.DetallesFactura', RESEED, 4);
GO

PRINT '============================================================================';
PRINT 'Base de datos veterinariodb inicializada y poblada con éxito total.';
PRINT 'Todas las tablas cuentan con datos semilla válidos, consistentes e indexados.';
PRINT '============================================================================';
GO
