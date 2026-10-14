-- ============================================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS: veterinariodb
-- Compatible con: Microsoft SQL Server (SSMS, Azure Data Studio, sqlcmd)
-- Generado a partir del modelo Entity Framework Core de VeterinariaAPI
-- ============================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'veterinariodb')
BEGIN
    CREATE DATABASE [veterinariodb];
END
GO

USE [veterinariodb];
GO

-- 1. Tabla de Historial de Migraciones EF Core (para compatibilidad total)
IF OBJECT_ID(N'dbo.[__EFMigrationsHistory]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[__EFMigrationsHistory] (
        [MigrationId] NVARCHAR(150) NOT NULL,
        [ProductVersion] NVARCHAR(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END
GO

-- 2. Tabla Roles
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

-- 3. Tabla Usuarios
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

-- 4. Tabla Clientes
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

-- 5. Tabla Especialidades
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

-- 6. Tabla Insumos
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

-- 7. Tabla Pacientes
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

-- 8. Tabla Citas
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

-- 9. Tabla Consultas
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

-- 10. Tabla Recetas
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

-- 11. Tabla DetallesReceta
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

-- 12. Tabla Facturas
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

-- 13. Tabla DetallesFactura
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

-- ============================================================================
-- DATOS SEMILLA BÁSICOS (ROLES Y MIGRACIÓN INICIAL)
-- ============================================================================

-- Marcar migración de EF Core como aplicada
IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = N'20260904061906_InitialCreate')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260904061906_InitialCreate', N'9.0.0');
END
GO

-- Insertar Roles predeterminados si no existen
SET IDENTITY_INSERT [dbo].[Roles] ON;
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Id] = 1)
    INSERT INTO [dbo].[Roles] ([Id], [Nombre], [PermisosEscritura]) VALUES (1, N'Administrador', 1);

IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Id] = 2)
    INSERT INTO [dbo].[Roles] ([Id], [Nombre], [PermisosEscritura]) VALUES (2, N'Veterinario', 1);

IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Id] = 3)
    INSERT INTO [dbo].[Roles] ([Id], [Nombre], [PermisosEscritura]) VALUES (3, N'Recepcionista', 0);
SET IDENTITY_INSERT [dbo].[Roles] OFF;
GO

-- Insertar Especialidades básicas
SET IDENTITY_INSERT [dbo].[Especialidades] ON;
IF NOT EXISTS (SELECT 1 FROM [dbo].[Especialidades] WHERE [Id] = 1)
    INSERT INTO [dbo].[Especialidades] ([Id], [Nombre], [CostoBase]) VALUES (1, N'Medicina General', 25.00);

IF NOT EXISTS (SELECT 1 FROM [dbo].[Especialidades] WHERE [Id] = 2)
    INSERT INTO [dbo].[Especialidades] ([Id], [Nombre], [CostoBase]) VALUES (2, N'Cirugía', 120.00);

IF NOT EXISTS (SELECT 1 FROM [dbo].[Especialidades] WHERE [Id] = 3)
    INSERT INTO [dbo].[Especialidades] ([Id], [Nombre], [CostoBase]) VALUES (3, N'Dermatología', 40.00);

IF NOT EXISTS (SELECT 1 FROM [dbo].[Especialidades] WHERE [Id] = 4)
    INSERT INTO [dbo].[Especialidades] ([Id], [Nombre], [CostoBase]) VALUES (4, N'Odontología', 50.00);
SET IDENTITY_INSERT [dbo].[Especialidades] OFF;
GO

PRINT 'Base de datos veterinariodb inicializada con éxito.';
GO

