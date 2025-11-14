# 📘 Dashboard – Resumen de Roles y Sidebar (MVP)

Este documento describe la estructura básica del Dashboard para el MVP de **Basbel / Vasbel**, incluyendo los **roles de usuario**, sus **permisos iniciales**, y los **ítems del sidebar** definidos hasta ahora.

---

# 1️⃣ Roles del sistema (MVP)

El MVP usa **4 roles principales**, simples pero escalables. Más adelante se podrán crear nuevos roles (almacenistas por obra, HR dedicado, etc.) sin romper esta estructura.

## 🔵 OWNER (Dueño / Súper Admin)

**Responsabilidad:** control total del sistema y configuración de la empresa.

**Puede hacer:**

* Ver todos los proyectos.
* Ver y gestionar todos los equipos.
* Ver y gestionar todos los trabajadores.
* Ver toda la actividad.
* **Invitar usuarios del sistema**.
* **Editar datos de la empresa** (nombre, contacto, etc.).

**Diferencias clave:**

* Es el único que puede invitar usuarios y editar la empresa.

---

## 🟢 ADMIN_EMPRESA (Backoffice: HR + Almacén central)

**Responsabilidad:** administración interna de la empresa.

**Puede:**

* Crear y editar proyectos (excepto eliminar el proyecto base).
* Crear/editar equipos y herramientas.
* Dar de baja equipos.
* Asignar equipos a proyectos.
* Crear/editar trabajadores.
* Asignar trabajadores a proyectos.
* Ver toda la empresa.

**No puede:**

* Invitar usuarios.
* Editar datos legales de la empresa.

---

## 🟠 ENCARGADO_OBRA (Responsable de la obra / proyecto)

**Responsabilidad:** operación diaria dentro de uno o varios proyectos asignados.

**Puede:**

* Ver únicamente los proyectos donde es encargado.
* Ver y registrar movimientos de equipos en su proyecto.
* Marcar equipos como dañados o que requieren mantenimiento.
* Ver los trabajadores asignados a su proyecto.
* **Pasar lista de asistencia**.
* Ver actividad reciente de su proyecto.

**No puede:**

* Crear equipos.
* Crear trabajadores.
* Ver datos de otros proyectos.
* Acceder a Administración.

---

## ⚪ CONSULTA (Solo lectura)

**Responsabilidad:** observación general sin permisos de edición.

**Puede:**

* Ver proyectos.
* Ver equipos.
* Ver trabajadores.
* Ver actividad.

**No puede editar nada.**

---

# 2️⃣ Sidebar (MVP)

Sidebar único para todos los usuarios. Cada rol ve solo lo que tiene permitido (los demás ítems se ocultan).

## 📌 Ítems del sidebar

### 1. Dashboard

Vista principal del usuario.

En el MVP mostrará únicamente datos básicos del usuario (nombre, rol, email, empresa).

---

### 2. Proyectos

(antes “Obras”)

* Lista de proyectos.
* Proyecto base (almacén principal) creado automáticamente al crear la empresa:

  * No se puede borrar.
  * Sirve para:

    * Equipos sin asignar (almacén principal).
    * Trabajadores administrativos/oficina.
* Dentro del proyecto:

  * Equipos asignados.
  * Trabajadores asignados.
  * Asistencia diaria.
  * Movimientos de equipos.

---

### 3. Equipos

* Lista completa de equipos y herramientas.
* Estado, serie, ubicación actual.
* Movimientos e historial.
* En MVP: visual básico sin lógica compleja.

---

### 4. Trabajadores

* Lista completa de trabajadores.
* Datos básicos.
* Proyecto asignado.
* Acceso a histórico de asistencia (a futuro).

---

### 5. Administración

Disponible solo para OWNER y ADMIN_EMPRESA.

Incluye dos sub-secciones:

#### Empresa

* Datos básicos de la empresa.
* En MVP: solo lectura para Admin; editable por Owner.

#### Usuarios del sistema

* Lista de usuarios con acceso a la plataforma.
* Roles.
* Estado.
* **INVITAR USUARIO** → solo visible para OWNER.

---

### 6. Mi cuenta

Configuración del usuario logueado.

* Datos básicos (nombre, email).
* Cambio de contraseña (a futuro).

---

### 7. Cerrar sesión

Autodescriptivo.

---

# 3️⃣ Proyecto Base (por defecto)

Al crear una empresa se genera automáticamente:

**Proyecto Base (Almacén Principal):**

* Nombre inicial = nombre de la empresa.
* Tipo: `is_default = true`.
* No se puede borrar.
* Sirve para:

  * Equipos que aún no están asignados a ningún proyecto (bodega).
  * Personal administrativo.
  * Centro para organizar datos generales antes de tener proyectos reales.

---

# 4️⃣ Próximo paso

Implementar el **Dashboard MVP básico**, que solo mostrará:

* Nombre del usuario.
* Email.
* Rol.
* Empresa.
* ID del usuario (opcional para debug).

Esto permitirá validar:

* Login.
* Lectura desde Supabase.
* Render condicional por rol (a futuro).
* Navegación del layout.
