# Guía Rápida de Inicio — VetClinic Pro

## Opción 1: Scripts Automáticos (Recomendado)
Puedes hacer doble clic en los archivos creados en la raíz:
- `iniciar-todo.bat`: Inicia la API backend y el Frontend en ventanas independientes.
- O por separado:
  - `iniciar-backend.bat`: Inicia la API en `http://localhost:5021` (Swagger en `http://localhost:5021/swagger`).
  - `iniciar-frontend.bat`: Inicia el cliente React en `http://localhost:5173`.

---

## Opción 2: Ejecución Manual desde Terminales

### 1. Iniciar el Backend (.NET 8):
Abre una terminal (PowerShell o CMD) y ejecuta:
```powershell
cd C:\Users\joni5\Downloads\VeterinariaAPI-master\VeterinariaAPI
dotnet run
```
*La API escuchará en:* `http://localhost:5021` (y Swagger UI en `http://localhost:5021/swagger`).

---

### 2. Iniciar el Frontend (React 19 + Vite):
Abre una **segunda terminal** y ejecuta:
```powershell
cd C:\Users\joni5\Downloads\VeterinariaAPI-master\frontend
npm run dev
```
*El cliente estará disponible en:* `http://localhost:5173`

---

## 🗄️ Base de Datos SQL Server (`veterinariodb.sql`):
Para inicializar o restablecer la base de datos completa con todos sus seeders y datos válidos:
1. Abrir **SQL Server Management Studio (SSMS)** o **Azure Data Studio**.
2. Conectar a la instancia de SQL Server (ej: `.\SQLEXPRESS2` o `localhost`).
3. Abrir el archivo [`veterinariodb.sql`](file:///c:/Users/joni5/Downloads/VeterinariaAPI-master/veterinariodb.sql) y hacer clic en **Execute (F5)**.
4. El script creará automáticamente la base de datos `veterinariodb`, todas sus tablas relacionales, índices y poblará todas las tablas con datos semilla válidos (incluyendo RUTs chilenos con Módulo 11 y contraseñas encriptadas).

O ejecutar directamente desde PowerShell (con codificación UTF-8):
```powershell
sqlcmd -S .\SQLEXPRESS2 -E -f 65001 -i veterinariodb.sql
```

---

## 👥 Credenciales de Prueba Preconfiguradas:
- **Administrador:** `admin@veterinaria.com` / `Admin123*` (Jonathan Garrido - Acceso total)
- **Veterinario:** `vet@veterinaria.com` / `Vet123*` (Dr. Carlos Mendoza - Gestión clínica)
- **Recepcionista:** `recep@veterinaria.com` / `Recep123*` (Ana Silva - Agenda y clientes)

---

## 🧪 Comprobar Pruebas Automáticas:
- **Pruebas Backend (xUnit):**
  ```powershell
  dotnet test
  ```
  *(Resultado: 6/6 Superadas)*

- **Pruebas Frontend (Vitest):**
  ```powershell
  cd frontend
  npm test -- src/test/
  ```
  *(Resultado: 22/22 Superadas)*
