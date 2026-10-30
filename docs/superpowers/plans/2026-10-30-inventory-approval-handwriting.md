# Aprobación obligatoria y firma manuscrita Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obligar la aprobación de inventarios físicos y adjuntar un trazo manuscrito a la firma interna verificable.

**Architecture:** Las solicitudes de conteo sin política reciben una aprobación predeterminada de owner/admin. El trazo SVG se valida, persiste como evidencia append-only y se transporta junto a la firma P-256 existente.

**Tech Stack:** FastAPI, PostgreSQL, React, TypeScript, Web Pointer Events, Web Crypto.

**Spec:** `docs/superpowers/specs/2026-10-30-inventory-approval-handwriting-design.md`

## Global Constraints

- Ningún conteo físico se aplica sin aprobación y firma interna verificable.
- El trazo SVG es evidencia visual, no certificado legal cualificado.
- La firma mantiene aislamiento estricto por `tenant_id`.

## Review Focus

- Sin política de aprobación, el conteo sigue bloqueado hasta aprobación owner/admin.
- Trazos vacíos o SVG no permitidos se rechazan en servidor.
- Mouse, touch y lápiz comparten Pointer Events sin duplicar trazos.
- La firma manuscrita no puede sustituir la firma P-256 ni el segundo factor.

### Task 1: Obligar la aprobación del conteo

**Files:** `app/api/routes/operations.py`, pruebas de operaciones.

- [ ] Escribir prueba fallida: conteo enviado sin política no puede aplicarse.
- [ ] Crear siempre una `approval_request` para conteos físicos; conservar política opcional.
- [ ] Exigir estado aprobado y firma interna antes de aplicar.
- [ ] Ejecutar pruebas del backend.

### Task 2: Persistir la firma manuscrita

**Files:** nueva migración SQL, `operations.py`, `approval_documents.py`, `documents.py`, pruebas.

- [ ] Escribir prueba fallida de validación de SVG y persistencia de trazo.
- [ ] Añadir columna append-only y validación de SVG generado por el cliente.
- [ ] Incluir el SVG al registrar y exponer evidencia de la firma interna.
- [ ] Ejecutar pruebas del backend.

### Task 3: Capturar y mostrar el trazo en aprobación

**Files:** `src/components/OperationsPage.tsx`, nuevo componente de firma, CSS y pruebas Vitest.

- [ ] Escribir prueba fallida para serializar trazos no vacíos como SVG.
- [ ] Implementar canvas Pointer Events compatible con lápiz, mouse y touch.
- [ ] Exigir trazo antes de confirmar y enviarlo junto con la firma criptográfica.
- [ ] Mostrar la evidencia manuscrita en la verificación documental.
- [ ] Ejecutar pruebas, build y revisión visual.
