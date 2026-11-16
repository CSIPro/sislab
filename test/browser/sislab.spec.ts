import { randomUUID } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'
import ExcelJS from 'exceljs'
import { unzipSync } from 'fflate'
import { readFileSync } from 'node:fs'
import { Pool } from 'pg'
import {
	academicPeriodStatus,
	compareAcademicPeriodCodes,
	currentAcademicPeriodCode,
	defaultPeriodCode,
} from '../../src/lib/academic-period.ts'
import { addDays, sislabToday } from '../../src/lib/session-dates.ts'
import { hashPassword } from '../../src/server/auth.server.ts'

// The app is served under Vite's `base`, set in vite.config.ts.
const base = '/v2'
const suffix = randomUUID()
const password = `E2e-${randomUUID()}-Sislab`
const admin = { email: `admin-${suffix}@browser.test`, name: 'Browser', surname: 'Admin' }
const professor = { email: `professor-${suffix}@browser.test`, name: 'Browser', surname: 'Professor' }
const staff = { email: `staff-${suffix}@browser.test`, name: 'Browser', surname: 'Staff' }
const mixed = { email: `mixed-${suffix}@browser.test`, name: 'Browser', surname: 'Mixed' }
let periodCode = ''
const labName = `Browser Lab ${suffix}`
const careerName = `Browser Career ${suffix}`
const subjectName = `Browser Subject ${suffix}`
const addedCatalogName = `Browser Added Lab ${suffix}`
let createdPeriodCode = ''
let summerPeriodCode = ''
let pendingEmail = ''
let pendingPassword = ''
let pool: Pool

test.describe.configure({ mode: 'serial' })

// Toasts are Sonner list items at the bottom right of the page.
const toastNamed = (page: Page, text: string | RegExp) => page.locator('[data-sonner-toast]').filter({ hasText: text })

test.beforeAll(async () => {
	const connectionString = process.env.DATABASE_URL_TEST
	if (!connectionString) {
		throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
	}
	pool = new Pool({ connectionString })
	// The first test registers a group through the form and expects it on the Tablero. An early year sorts first, so the period below is the one the Tablero names while it is current.
	const firstYear = 2000 + (Number.parseInt(suffix.slice(0, 4), 16) % 20)
	for (let offset = 0; offset < 20; offset += 1) {
		const year = 2000 + ((firstYear - 2000 + offset) % 20)
		const candidateCodes = [`${year}-1`, `${year}-2`, `${year}-V`]
		const existing = await pool.query('SELECT code FROM periods WHERE code = ANY($1)', [candidateCodes])
		if (existing.rowCount === 0) {
			[periodCode, createdPeriodCode, summerPeriodCode] = candidateCodes
			break
		}
	}
	if (!periodCode || !createdPeriodCode) throw new Error('No unused academic-period codes are available for browser tests.')
	const passwordHash = await hashPassword(password)
	for (const [user, roles] of [
		[admin, ['admin']],
		[professor, ['professor']],
		[staff, ['staff']],
		[mixed, ['professor', 'admin']],
	] as const) {
		const result = await pool.query(
			'INSERT INTO users (email, name, surname, password_hash, active, verified_at) VALUES ($1, $2, $3, $4, true, NOW()) RETURNING id',
			[user.email, user.name, user.surname, passwordHash],
		)
		const userId = result.rows[0].id as string
		for (const role of roles) {
			await pool.query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [userId, role])
		}
	}
	// The professor's first group lives in this period, so it runs around today and professors can request in it.
	await pool.query('INSERT INTO periods (code, starts_on, ends_on) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING', [
		periodCode,
		addDays(sislabToday(), -1),
		addDays(sislabToday(), 100),
	])
	await pool.query('INSERT INTO labs (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [labName])
	await pool.query('INSERT INTO careers (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [careerName])
	await pool.query('INSERT INTO subjects (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [subjectName])
})

/**
 * Runs the registered group's period around today (open) or gives it its term's default dates (closed).
 * A period with a group is closed in the tests that expect the real current period to be the default.
 */
async function setPeriodWindow(open: boolean) {
	await pool.query('UPDATE periods SET starts_on = $2, ends_on = $3 WHERE code = $1', [
		periodCode,
		open ? addDays(sislabToday(), -1) : null,
		open ? addDays(sislabToday(), 100) : null,
	])
}

/** Period codes in a far-off year that no period uses, so a run never shares one with another. */
async function unusedPeriodCodes(count: number): Promise<string[]> {
	const codes: string[] = []
	while (codes.length < count) {
		const code = `${2101 + Math.floor(Math.random() * 99)}-${['1', '2', 'V'][Math.floor(Math.random() * 3)]}`
		const taken = await pool.query('SELECT 1 FROM periods WHERE code = $1', [code])
		if (taken.rowCount === 0 && !codes.includes(code)) codes.push(code)
	}
	return codes
}

test.afterAll(async () => {
	if (!pool) return
	const emails = [admin.email, professor.email, staff.email, mixed.email, pendingEmail].filter(Boolean)
	const users = await pool.query('SELECT id FROM users WHERE email = ANY($1)', [emails])
	const userIds = users.rows.map((user) => user.id as string)
	if (userIds.length > 0) {
		await pool.query('DELETE FROM groups WHERE professor_id = ANY($1)', [userIds])
		await pool.query('DELETE FROM sessions WHERE user_id = ANY($1)', [userIds])
		await pool.query('DELETE FROM user_roles WHERE user_id = ANY($1)', [userIds])
		await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds])
	}
	await pool.query('DELETE FROM periods WHERE code = ANY($1)', [[periodCode, createdPeriodCode, summerPeriodCode]])
	await pool.query('DELETE FROM labs WHERE name = ANY($1)', [[labName, addedCatalogName]])
	await pool.query('DELETE FROM careers WHERE name = $1', [careerName])
	await pool.query('DELETE FROM subjects WHERE name = $1', [subjectName])
	await pool.end()
})

test('guest landing, access request, and protected-route redirect work in Spanish', async ({ page }) => {
	await page.goto(`${base}/`)
	await expect(page.getByRole('heading', { name: 'Prepara tu laboratorio sin papeleo.' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Cómo funciona' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Un tablero para cada rol' })).toBeVisible()
	await expect(page.getByRole('contentinfo')).toContainText('CSI PRO')

	await page.goto(`${base}/app/dashboard`)
	await expect(page).toHaveURL(/\/sign-in$/)
	await expect(page.getByRole('tab', { name: 'Ingresar' })).toHaveAttribute('aria-selected', 'true')
	await expect(page.getByText(professor.email)).toHaveCount(0)
	await page.waitForLoadState('networkidle')
	await page.getByRole('tab', { name: 'Crear cuenta' }).click()
	pendingEmail = `pending-${suffix}@browser.test`
	pendingPassword = `Pending-${randomUUID()}-Access`
	await page.getByLabel('Nombre').fill('Browser')
	await page.getByLabel('Apellidos').fill('Pending')
	await page.getByLabel('Correo electrónico').fill(pendingEmail)
	await page.getByLabel('Contraseña').fill(pendingPassword)
	await page.getByRole('button', { name: 'Solicitar acceso' }).click()
	await expect(page.getByRole('status')).toContainText('Una persona administradora debe verificar')
})

test('professor signs in, sees only permitted destinations, opens the mobile menu, and registers a group', async ({ page }) => {
	test.setTimeout(60_000)
	await signIn(page, professor.email)
	await expect(page.getByRole('heading', { name: 'Tablero' })).toBeVisible()
	await expect(page.getByText(`Hola, ${professor.name}.`)).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Mis próximas solicitudes' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Solicitudes próximas de todos los profesores' })).toHaveCount(0)
	await expect(page.getByText(`No tienes grupos activos en el período ${periodCode}.`)).toBeVisible()
	await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Nueva solicitud' })).toBeVisible()
	await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Tablero' })).toHaveAttribute('aria-current', 'page')
	await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Catálogos' })).toHaveCount(0)
	for (const [legacy, canonical] of [
		['/dashboard', '/app/dashboard'],
		['/groups/new', '/app/groups/new'],
		['/groups/manage', '/app/groups/manage'],
		['/about', '/'],
	] as const) {
		await page.goto(`${base}${legacy}`)
		await expect.poll(() => new URL(page.url()).pathname).toBe(`${base}${canonical}`)
	}

	await page.goto(`${base}/`)
	await expect(page.getByText('Sesión activa')).toBeVisible()
	await expect(page.getByRole('link', { name: 'Ir a mi espacio' }).first()).toBeVisible()
	await page.goto(`${base}/sign-up`)
	await expect(page.getByText('Sesión activa')).toBeVisible()
	await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toHaveCount(0)

	await page.goto(`${base}/app/dashboard`)
	await page.setViewportSize({ width: 390, height: 844 })
	await page.waitForLoadState('networkidle')
	const menu = page.locator('[data-slot="sidebar-trigger"]')
	await menu.click()
	await expect(menu).toHaveAttribute('aria-expanded', 'true')
	await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Mis grupos' })).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(menu).toHaveAttribute('aria-expanded', 'false')
	await expect(menu).toBeFocused()

	await page.goto(`${base}/app/groups/new`)
	await page.waitForLoadState('networkidle')
	await pick(page, 'Período académico', new RegExp(`^${periodCode}`))
	await pick(page, 'Laboratorio', labName)
	await pick(page, 'Carrera', careerName)
	await pick(page, 'Materia', subjectName)
	await page.getByLabel('Estudiantes').fill('20')
	await page.getByLabel('Equipos').fill('4')
	await pick(page, 'Día de la semana', 'Martes')
	await setTime(page, 'Hora de inicio', '10:00')
	await expectTime(page, 'Hora de finalización', '12:00')
	await page.getByLabel('Hora de inicio, hora').click()
	await expect(page.getByRole('option')).toHaveCount(17)
	await expect(page.getByRole('option', { name: '05', exact: true })).toHaveCount(0)
	await expect(page.getByRole('option', { name: '06', exact: true })).toHaveCount(1)
	await expect(page.getByRole('option', { name: '22', exact: true })).toHaveCount(1)
	await expect(page.getByRole('option', { name: '23', exact: true })).toHaveCount(0)
	await page.keyboard.press('Escape')
	await setTime(page, 'Hora de inicio', '22:00')
	await expectTime(page, 'Hora de finalización', '')
	await setTime(page, 'Hora de inicio', '10:00')
	await expectTime(page, 'Hora de finalización', '12:00')
	await setTime(page, 'Hora de finalización', '11:00')
	await setTime(page, 'Hora de inicio', '09:00')
	await expectTime(page, 'Hora de finalización', '11:00')
	await setTime(page, 'Hora de inicio', '10:00')
	// A failed registration shows an error toast and an inline alert, and keeps the input.
	await page.route('**/_serverFn/**', (route) => route.abort(), { times: 1 })
	await page.getByRole('button', { name: 'Registrar grupo' }).click()
	await expect(toastNamed(page, 'No se pudo registrar el grupo. Inténtalo de nuevo.')).toBeVisible()
	await expect(page.locator('[data-slot="alert"]').filter({ hasText: 'No se pudo registrar el grupo.' })).toBeVisible()
	await expect(page.getByLabel('Estudiantes')).toHaveValue('20')
	// Toasts follow the theme toggle, which flips the `dark` class on the root element.
	const toaster = page.locator('[data-sonner-toaster]')
	await expect(toaster).toHaveAttribute('data-sonner-theme', 'light')
	await page.evaluate(() => document.documentElement.classList.add('dark'))
	await expect(toaster).toHaveAttribute('data-sonner-theme', 'dark')
	await page.evaluate(() => document.documentElement.classList.remove('dark'))
	await page.getByRole('button', { name: 'Registrar grupo' }).click()
	const registered = toastNamed(page, new RegExp(`El grupo 1 se registró en el período ${periodCode}`))
	await expect(registered).toBeVisible()
	await expect(page.locator('[data-slot="alert"]')).toHaveCount(0)
	await registered.getByRole('button', { name: 'Volver al tablero' }).click()
	await expect(page).toHaveURL(new RegExp(`${base}/app/dashboard`))
	await expect(page.getByText(subjectName, { exact: true })).toBeVisible()
	await expect(page.getByText('Martes, 10:00–11:00')).toBeVisible()

	// Mis grupos opens on the default period, so ask for the period of the group just registered.
	await page.goto(`${base}/app/groups/manage?period=${periodCode}`)
	await page.waitForLoadState('networkidle')
	await expect(page.getByRole('heading', { name: 'Tu semana en el laboratorio' })).toBeVisible()
	await expect(page.getByRole('button', { name: 'Activos · 1' })).toHaveAttribute('aria-pressed', 'true')
	const groupCard = page.locator('article').filter({ hasText: subjectName })
	await expect(groupCard).toContainText('Grupo 01')
	await expect(groupCard.getByLabel('Estudiantes')).toHaveCount(0)
	const cardHeight = (await groupCard.boundingBox())?.height
	await groupCard.getByRole('button', { name: 'Editar' }).click()
	const editDialog = page.getByRole('dialog', { name: 'Editar grupo' })
	await expect(editDialog).toContainText(`${subjectName} · Grupo 01`)
	await expect(editDialog.getByLabel('Estudiantes')).toHaveValue('20')
	expect((await groupCard.boundingBox())?.height).toBe(cardHeight)

	await editDialog.getByLabel('Estudiantes').fill('25')
	await editDialog.getByRole('button', { name: 'Cancelar' }).click()
	await expect(editDialog).toHaveCount(0)
	await expect(groupCard).toContainText(/Estudiantes\s*20/)
	await groupCard.getByRole('button', { name: 'Editar' }).click()
	await expect(editDialog.getByLabel('Estudiantes')).toHaveValue('20')
	await page.keyboard.press('Escape')
	await expect(editDialog).toHaveCount(0)

	await groupCard.getByRole('button', { name: 'Editar' }).click()
	await editDialog.getByLabel('Estudiantes').fill('25')
	await editDialog.getByRole('button', { name: 'Guardar cambios' }).click()
	await expect(editDialog).toHaveCount(0)
	await expect(toastNamed(page, 'Se actualizó el grupo 1.')).toBeVisible()
	await expect(page.locator('[data-slot="alert"]')).toHaveCount(0)
	await expect(groupCard).toContainText(/Estudiantes\s*25/)
	await expect(groupCard.getByRole('button', { name: 'Desactivar' })).toBeVisible()
	await groupCard.getByRole('link', { name: 'Solicitar preparación' }).click()
	await expect(page).toHaveURL(/\/app\/requests\/new\?group=/)
	await expect(page.getByRole('radio', { name: new RegExp(`${subjectName} · Grupo 01`) })).toBeChecked()
	await expect(page.getByRole('group', { name: 'Fechas disponibles' }).getByRole('button')).toHaveCount(4)
})

test('professor confirms before deactivating a group, and Reactivar needs one click', async ({ page }) => {
	test.setTimeout(60_000)
	const exerciseName = `Desactivar Exercise ${suffix}`
	const materials = { reagents: [], equipment: [], waste: [] }
	const group = await pool.query(
		`SELECT g.id, g.lab_id, g.lab_name FROM groups g JOIN users u ON u.id = g.professor_id
		WHERE u.email = $1 AND g.period_code = $2 AND g.number = 1`,
		[professor.email, periodCode],
	)
	const exercise = await pool.query('INSERT INTO lab_exercises (number, name, materials) VALUES ($1, $2, $3) RETURNING id', ['1', exerciseName, materials])
	const exerciseId = exercise.rows[0].id as string
	const request = await pool.query(
		`INSERT INTO preparation_requests
			(group_id, professor_id, exercise_id, exercise_number, exercise_name, session_date, lab_id, lab_name, start_time, end_time, materials)
		SELECT g.id, g.professor_id, $2, '1', $3, $4, g.lab_id, g.lab_name, '10:00', '12:00', $5 FROM groups g WHERE g.id = $1
		RETURNING id`,
		[group.rows[0].id, exerciseId, exerciseName, addDays(sislabToday(), 2), { ...materials, omittedReagents: [], addedReagents: [], addedEquipment: [], addedWaste: [] }],
	)
	try {
		await signIn(page, professor.email)
		await page.goto(`${base}/app/groups/manage?period=${periodCode}`)
		await page.waitForLoadState('networkidle')
		const groupCard = page.locator('article').filter({ hasText: subjectName })
		const dialog = page.getByRole('alertdialog', { name: '¿Desactivar el grupo 1?' })

		// Cancelar leaves the group active.
		await groupCard.getByRole('button', { name: 'Desactivar' }).click()
		await expect(dialog).toContainText('no se elimina')
		await expect(dialog).toContainText('Todos')
		await dialog.getByRole('button', { name: 'Cancelar' }).click()
		await expect(dialog).toHaveCount(0)
		await expect(page.getByRole('button', { name: 'Activos · 1' })).toBeVisible()
		await expect(groupCard.getByRole('button', { name: 'Desactivar' })).toBeVisible()

		// A refusal from the server shows the existing error and leaves the group active.
		await groupCard.getByRole('button', { name: 'Desactivar' }).click()
		await dialog.getByRole('button', { name: 'Desactivar' }).click()
		await expect(dialog).toHaveCount(0)
		await expect(toastNamed(page, 'No se pudo cambiar este grupo.')).toBeVisible()
		await expect(page.locator('[data-slot="alert"]').filter({ hasText: 'No se pudo cambiar este grupo.' })).toBeVisible()
		await expect(toastNamed(page, 'Se desactivó el grupo 1.')).toHaveCount(0)
		await expect(page.getByRole('button', { name: 'Activos · 1' })).toBeVisible()
		await expect(groupCard.getByRole('button', { name: 'Desactivar' })).toBeVisible()

		// Confirming deactivates the group and moves it to Todos.
		await pool.query('DELETE FROM preparation_requests WHERE id = $1', [request.rows[0].id])
		await groupCard.getByRole('button', { name: 'Desactivar' }).click()
		await dialog.getByRole('button', { name: 'Desactivar' }).click()
		await expect(dialog).toHaveCount(0)
		await expect(toastNamed(page, 'Se desactivó el grupo 1.')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Activos · 0' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Todos · 1' })).toBeVisible()
		await expect(groupCard).toHaveCount(0)
		await page.getByRole('button', { name: 'Todos · 1' }).click()
		await expect(groupCard).toContainText('Inactivo')

		// Reactivar works with one click, without a dialog.
		await groupCard.getByRole('button', { name: 'Reactivar' }).click()
		await expect(page.getByRole('alertdialog')).toHaveCount(0)
		await expect(page.getByRole('button', { name: 'Activos · 1' })).toBeVisible()
		await expect(groupCard).toContainText('Activo')
	} finally {
		await pool.query('DELETE FROM preparation_requests WHERE exercise_id = $1', [exerciseId])
		await pool.query('DELETE FROM lab_exercises WHERE id = $1', [exerciseId])
	}
})

test('admin confirms before deactivating a lab exercise, and Reactivar needs one click', async ({ page }) => {
	const exerciseName = `Retire Exercise ${suffix}`
	const materials = { reagents: [], equipment: [], waste: [] }
	const exercise = await pool.query('INSERT INTO lab_exercises (number, name, materials) VALUES ($1, $2, $3) RETURNING id', ['1', exerciseName, materials])
	const exerciseId = exercise.rows[0].id as string
	try {
		await signIn(page, admin.email)
		await page.goto(`${base}/app/admin/exercises`)
		await page.waitForLoadState('networkidle')
		await page.getByLabel('Buscar').fill(exerciseName)
		await page.getByRole('button', { name: exerciseName }).click()
		const row = page.getByRole('row').filter({ hasText: exerciseName })
		const dialog = page.getByRole('alertdialog', { name: `¿Desactivar “${exerciseName}”?` })

		// Cancelar leaves the exercise active.
		await page.getByRole('button', { name: 'Desactivar', exact: true }).click()
		await expect(dialog).toContainText('no se elimina')
		await dialog.getByRole('button', { name: 'Cancelar' }).click()
		await expect(dialog).toHaveCount(0)
		await expect(row).toContainText('Activa')

		// Confirming deactivates it.
		await page.getByRole('button', { name: 'Desactivar', exact: true }).click()
		await dialog.getByRole('button', { name: 'Desactivar' }).click()
		await expect(dialog).toHaveCount(0)
		await expect(toastNamed(page, 'Se desactivó la práctica.')).toBeVisible()
		await expect(row).toContainText('Inactiva')

		// Reactivar works with one click, without a dialog.
		await page.getByRole('button', { name: 'Reactivar', exact: true }).click()
		await expect(page.getByRole('alertdialog')).toHaveCount(0)
		await expect(toastNamed(page, 'Se reactivó la práctica.')).toBeVisible()
		await expect(row).toContainText('Activa')
		await expect(row).not.toContainText('Inactiva')
	} finally {
		await pool.query('DELETE FROM lab_exercises WHERE id = $1', [exerciseId])
	}
})

test('staff picks a day from the week strip and it becomes the selected date', async ({ page }) => {
	await signIn(page, staff.email)
	const nav = page.getByRole('navigation', { name: 'Navegación principal' })
	await nav.getByRole('link', { name: 'Todas las solicitudes' }).click()
	const week = page.getByRole('region', { name: 'Solicitudes de la semana' })
	await expect(week.getByRole('button')).toHaveCount(7)
	await expect(week.getByRole('button', { pressed: true })).toHaveAccessibleName(/, hoy:/)
	const otherDay = week.getByRole('button', { pressed: false }).first()
	const otherDayName = (await otherDay.getAttribute('aria-label'))?.split(':')[0] ?? ''
	await otherDay.click()
	await expect(week.getByRole('button', { pressed: true })).toHaveAccessibleName(new RegExp(`^${otherDayName}:`))
	await page.getByRole('button', { name: 'Día', exact: true }).click()
	await expect(page.getByText(new RegExp(`^${otherDayName} de \\d{4}`, 'i'))).toBeVisible()
	await expect(week.getByRole('button')).toHaveCount(7)
})

test('staff sees the days with requests marked in the date picker', async ({ page }) => {
	const group = await pool.query(
		'SELECT g.id, g.professor_id, g.lab_id, g.lab_name FROM groups g JOIN users u ON u.id = g.professor_id WHERE u.email = $1',
		[professor.email],
	)
	const { id: groupId, professor_id: professorId, lab_id: labId, lab_name: groupLabName } = group.rows[0]
	const materials = { reagents: [], equipment: [], waste: [] }
	const exercise = await pool.query(
		'INSERT INTO lab_exercises (number, name, materials) VALUES ($1, $2, $3) RETURNING id',
		['1', `Browser Exercise ${suffix}`, materials],
	)
	const exerciseId = exercise.rows[0].id as string
	await pool.query(
		`INSERT INTO preparation_requests
			(group_id, professor_id, exercise_id, exercise_number, exercise_name, session_date, lab_id, lab_name, start_time, end_time, materials)
		VALUES ($1, $2, $3, '1', $4, $5, $6, $7, '08:00', '10:00', $8)`,
		[
			groupId,
			professorId,
			exerciseId,
			`Browser Exercise ${suffix}`,
			sislabToday(),
			labId,
			groupLabName,
			{ ...materials, omittedReagents: [], addedReagents: [], addedEquipment: [], addedWaste: [] },
		],
	)
	try {
		await signIn(page, staff.email)
		await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Todas las solicitudes' }).click()
		await page.getByRole('button', { name: /^Fecha:/ }).click()
		const calendar = page.getByRole('dialog')
		await expect(calendar.getByRole('button', { name: /seleccionado/ })).toHaveAccessibleName(/, con solicitudes$/)
	} finally {
		await pool.query('DELETE FROM preparation_requests WHERE exercise_id = $1', [exerciseId])
		await pool.query('DELETE FROM lab_exercises WHERE id = $1', [exerciseId])
	}
})

test('professor submits a request and sees the confirmation on Mis solicitudes', async ({ page }) => {
	const exerciseName = `Enviar Exercise ${suffix}`
	const exercise = await pool.query(
		'INSERT INTO lab_exercises (number, name, materials) VALUES ($1, $2, $3) RETURNING id',
		['1', exerciseName, { reagents: [], equipment: [], waste: [] }],
	)
	const exerciseId = exercise.rows[0].id as string
	try {
		await signIn(page, professor.email)
		await page.goto(`${base}/app/requests/new`)
		await page.waitForLoadState('networkidle')
		await page.getByRole('button', { name: 'Enviar solicitud' }).click()
		await expect(page.locator('[data-slot="alert"]').filter({ hasText: 'Elige un grupo, una fecha y una práctica para continuar.' })).toBeVisible()
		await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)

		await page.getByRole('radio', { name: /Grupo 01/ }).click()
		await page.getByRole('group', { name: 'Fechas disponibles' }).getByRole('button').first().click()
		const lateReason = page.getByLabel('Motivo del aviso corto')
		if (await lateReason.isVisible()) await lateReason.fill('Prueba de navegador')
		await pick(page, 'Práctica de laboratorio', exerciseName)
		await page.getByRole('button', { name: 'Enviar solicitud' }).click()
		await expect(page).toHaveURL(/\/app\/requests\/mine$/)
		await expect(toastNamed(page, 'Solicitud enviada.')).toBeVisible()
		await expect(page.locator('[data-slot="alert"]').filter({ hasText: 'Solicitud enviada.' })).toHaveCount(0)
	} finally {
		await pool.query('DELETE FROM preparation_requests WHERE exercise_id = $1', [exerciseId])
		await pool.query('DELETE FROM lab_exercises WHERE id = $1', [exerciseId])
	}
})

test('staff voids a request through a dialog that asks for the reason', async ({ page }) => {
	const group = await pool.query(
		'SELECT g.id, g.professor_id, g.lab_id, g.lab_name FROM groups g JOIN users u ON u.id = g.professor_id WHERE u.email = $1',
		[professor.email],
	)
	const { id: groupId, professor_id: professorId, lab_id: labId, lab_name: groupLabName } = group.rows[0]
	const materials = { reagents: [], equipment: [], waste: [] }
	const exerciseName = `Anular Exercise ${suffix}`
	const exercise = await pool.query(
		'INSERT INTO lab_exercises (number, name, materials) VALUES ($1, $2, $3) RETURNING id',
		['1', exerciseName, materials],
	)
	const exerciseId = exercise.rows[0].id as string
	const request = await pool.query(
		`INSERT INTO preparation_requests
			(group_id, professor_id, exercise_id, exercise_number, exercise_name, session_date, lab_id, lab_name, start_time, end_time, materials)
		VALUES ($1, $2, $3, '1', $4, $5, $6, $7, '08:00', '10:00', $8) RETURNING id`,
		[
			groupId,
			professorId,
			exerciseId,
			exerciseName,
			sislabToday(),
			labId,
			groupLabName,
			{ ...materials, omittedReagents: [], addedReagents: [], addedEquipment: [], addedWaste: [] },
		],
	)
	const requestId = request.rows[0].id as string
	try {
		await signIn(page, staff.email)
		await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Todas las solicitudes' }).click()
		const row = page.getByRole('row').filter({ hasText: exerciseName })
		await row.getByRole('button', { name: 'Anular', exact: true }).click()
		const dialog = page.getByRole('dialog', { name: 'Anular solicitud' })
		await expect(dialog).toContainText(exerciseName)
		await expect(dialog).toContainText('Grupo 01')
		await expect(page.getByLabel('Motivo de la anulación')).toHaveCount(1)
		const submit = dialog.getByRole('button', { name: 'Anular solicitud' })
		await expect(submit).toBeDisabled()
		await dialog.getByLabel('Motivo de la anulación').fill('Se registró por error')
		await expect(submit).toBeEnabled()

		// Another person voids it first, so this attempt fails and the dialog stays open.
		await pool.query(
			"UPDATE preparation_requests SET status = 'voided', void_reason = 'Anulada antes', voided_by = (SELECT id FROM users WHERE email = $2), voided_at = NOW() WHERE id = $1",
			[requestId, staff.email],
		)
		await submit.click()
		await expect(dialog.getByRole('alert')).toBeVisible()
		const failure = (await dialog.getByRole('alert').innerText()).trim()
		await expect(page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: failure })).toBeVisible()
		await expect(dialog.getByLabel('Motivo de la anulación')).toHaveValue('Se registró por error')

		await pool.query(
			"UPDATE preparation_requests SET status = 'open', void_reason = NULL, voided_by = NULL, voided_at = NULL WHERE id = $1",
			[requestId],
		)
		await submit.click()
		await expect(dialog).toHaveCount(0)
		await expect(row).toContainText('Anulada')
		await expect(row.getByRole('button', { name: 'Anular', exact: true })).toHaveCount(0)
	} finally {
		await pool.query('DELETE FROM preparation_requests WHERE exercise_id = $1', [exerciseId])
		await pool.query('DELETE FROM lab_exercises WHERE id = $1', [exerciseId])
	}
})

test('admin opens Reportes on the current period, sees its requests, downloads the XLSX and ticket archive and opens one read-only', async ({ page, browser }) => {
	await setPeriodWindow(false)
	const currentCode = currentAcademicPeriodCode()
	const exerciseName = `Reporte Exercise ${suffix}`
	const materials = { reagents: [], equipment: [], waste: [] }
	const owner = await pool.query('SELECT id FROM users WHERE email = $1', [professor.email])
	const professorId = owner.rows[0].id as string
	const lab = await pool.query('SELECT id FROM labs WHERE name = $1', [labName])
	const labId = lab.rows[0].id as string
	const career = await pool.query('SELECT id FROM careers WHERE name = $1', [careerName])
	const subject = await pool.query('SELECT id FROM subjects WHERE name = $1', [subjectName])
	const insertedPeriod = await pool.query('INSERT INTO periods (code) VALUES ($1) ON CONFLICT (code) DO NOTHING', [currentCode])
	const group = await pool.query(
		`INSERT INTO groups (professor_id, period_code, number, lab_id, lab_name, career_id, career_name, subject_id, subject_name, students, teams, weekday, start_time, end_time)
		VALUES ($1, $2, 90, $3, $4, $5, $6, $7, $8, 20, 5, 1, '08:00', '10:00') RETURNING id`,
		[professorId, currentCode, labId, labName, career.rows[0].id, careerName, subject.rows[0].id, subjectName],
	)
	const exercise = await pool.query('INSERT INTO lab_exercises (number, name, materials) VALUES ($1, $2, $3) RETURNING id', ['1', exerciseName, materials])
	const exerciseId = exercise.rows[0].id as string
	await pool.query(
		`INSERT INTO preparation_requests
			(group_id, professor_id, exercise_id, exercise_number, exercise_name, session_date, lab_id, lab_name, start_time, end_time, materials)
		VALUES ($1, $2, $3, '1', $4, $5, $6, $7, '08:00', '10:00', $8)`,
		[group.rows[0].id, professorId, exerciseId, exerciseName, sislabToday(), labId, labName, { ...materials, omittedReagents: [], addedReagents: [], addedEquipment: [], addedWaste: [] }],
	)
	try {
		const staffPage = await (await browser.newContext()).newPage()
		await signIn(staffPage, staff.email)
		await expect(staffPage.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Reportes' })).toHaveCount(0)
		await staffPage.goto(`${base}/app/admin/reports`)
		await expect(staffPage).toHaveURL(/\/app\/dashboard$/)
		await staffPage.context().close()

		await signIn(page, admin.email)
		await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Reportes' }).click()
		await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()
		await expect(page.getByLabel('Períodos')).toContainText('(actual)')
		const row = page.getByRole('row').filter({ hasText: exerciseName })
		await expect(row).toBeVisible()
		await expect(page.getByRole('region', { name: 'Totales' })).toContainText('Solicitudes')
		const downloadPromise = page.waitForEvent('download')
		await page.getByRole('button', { name: 'Descargar Excel (XLSX)' }).click()
		const download = await downloadPromise
		expect(download.suggestedFilename()).toBe(`sislab-reporte-${currentCode}.xlsx`)
		// One toast follows the export from loading to result, and a success closes by itself.
		const excelToast = toastNamed(page, 'Excel descargado.')
		await expect(excelToast).toBeVisible()
		await expect(page.locator('[data-slot="alert"]')).toHaveCount(0)
		await expect(excelToast).toHaveCount(0, { timeout: 8000 })
		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.readFile(await download.path())
		const sheet = workbook.getWorksheet(currentCode)
		expect(sheet?.getRow(1).getCell(1).value).toBe('Fecha')
		const exported = sheet?.getSheetValues().flat().filter((value) => value === exerciseName)
		expect(exported).toHaveLength(1)
		const archivePromise = page.waitForEvent('download')
		await page.getByRole('button', { name: 'Descargar tickets (ZIP)' }).click()
		const archive = await archivePromise
		expect(archive.suggestedFilename()).toBe(`sislab-tickets-${currentCode}.zip`)
		await expect(toastNamed(page, 'Tickets descargados.')).toBeVisible()
		await expect(page.locator('[data-slot="alert"]')).toHaveCount(0)
		await expect(page.locator('[data-sonner-toast][data-type="loading"]')).toHaveCount(0)
		const files = unzipSync(new Uint8Array(readFileSync(await archive.path())))
		const pdfPath = `${currentCode}/sislab-${sislabToday()}.pdf`
		expect(Object.keys(files)).toContain(pdfPath)
		expect(Buffer.from(files[pdfPath] ?? []).subarray(0, 5).toString()).toBe('%PDF-')
		await expect(page.getByText('Si quitas todos los estados, se vuelven a mostrar los predeterminados.')).toBeVisible()
		await page.getByLabel('Estado').click()
		await page.getByRole('option', { name: 'Anulada' }).click()
		await expect(page).toHaveURL(/status=/)
		await page.keyboard.press('Escape')
		await expect(row).toBeVisible()
		await row.click()
		const details = page.getByRole('dialog', { name: exerciseName })
		await expect(details).toContainText('Reactivos')
		await expect(details.getByRole('button', { name: /Aceptar|Rechazar|Anular/ })).toHaveCount(0)
	} finally {
		await pool.query('DELETE FROM preparation_requests WHERE exercise_id = $1', [exerciseId])
		await pool.query('DELETE FROM lab_exercises WHERE id = $1', [exerciseId])
		await pool.query('DELETE FROM groups WHERE id = $1', [group.rows[0].id])
		if (insertedPeriod.rowCount) await pool.query('DELETE FROM periods WHERE code = $1', [currentCode])
		await setPeriodWindow(true)
	}
})

test('professor filters Mis grupos by academic period and the choice stays in the address', async ({ page, browser }) => {
	test.setTimeout(90_000)
	const today = sislabToday()
	const owner = await pool.query('SELECT id FROM users WHERE email = $1', [professor.email])
	const lab = await pool.query('SELECT id FROM labs WHERE name = $1', [labName])
	const career = await pool.query('SELECT id FROM careers WHERE name = $1', [careerName])
	const subject = await pool.query('SELECT id FROM subjects WHERE name = $1', [subjectName])
	// This test needs the registered group's period to be an ordinary one that has ended, not the current period.
	await setPeriodWindow(false)
	const insertedPeriod = await pool.query('INSERT INTO periods (code) VALUES ($1) ON CONFLICT (code) DO NOTHING', [currentAcademicPeriodCode()])
	const dated = await pool.query(`SELECT code, starts_on::text AS "startsOn", ends_on::text AS "endsOn" FROM periods`)
	const defaultCode = defaultPeriodCode(dated.rows, today)
	if (!defaultCode) throw new Error('The test database has no period that has started.')
	const statusOf = (code: string) => academicPeriodStatus(dated.rows.find((row) => row.code === code), today)
	const label = (code: string) => `${code}${statusOf(code) === 'current' ? ' (actual)' : ''} · 1 grupo`
	const group = await pool.query(
		`INSERT INTO groups (professor_id, period_code, number, lab_id, lab_name, career_id, career_name, subject_id, subject_name, students, teams, weekday, start_time, end_time)
		VALUES ($1, $2, 91, $3, $4, $5, $6, $7, $8, 20, 5, 3, '14:00', '16:00') RETURNING id`,
		[owner.rows[0].id, defaultCode, lab.rows[0].id, labName, career.rows[0].id, careerName, subject.rows[0].id, subjectName],
	)
	const otherCode = periodCode
	const defaultCopy = statusOf(defaultCode) === 'current' ? 'actual' : 'más reciente'
	const resetLink = page.getByRole('link', { name: `Ir al período ${defaultCopy} (${defaultCode})` })
	// The note shows under Todos tus grupos only when the selected period is not current.
	const expectCurrentNote = async (code: string) => {
		const note = page.getByText('No es el período actual.')
		if (statusOf(code) === 'current') await expect(note).toHaveCount(0)
		else await expect(note).toBeVisible()
	}
	const week = page.getByRole('region', { name: 'Tu semana en el laboratorio' })
	const cardOf = (number: string) => page.locator('article').filter({ hasText: `Grupo ${number}` })
	try {
		await signIn(page, professor.email)
		await page.goto(`${base}/app/groups/manage`)
		await page.waitForLoadState('networkidle')
		// The page opens on the default period and shows only its groups.
		await expect(page.getByLabel('Período')).toContainText(label(defaultCode))
		await expect(page.getByText(`Estás viendo los grupos del período ${defaultCode}.`)).toBeVisible()
		await expectCurrentNote(defaultCode)
		await expect(resetLink).toHaveCount(0)
		await expect(cardOf('91')).toBeVisible()
		await expect(page.getByText('Grupo 01')).toHaveCount(0)
		await expect(week).toContainText('Grupo 91')
		await expect(week).not.toContainText('Grupo 01')
		await expect(page.getByRole('button', { name: 'Activos · 1' })).toHaveAttribute('aria-pressed', 'true')
		await expect(page.getByRole('button', { name: 'Todos · 1' })).toBeVisible()
		await expect(cardOf('91')).not.toContainText('Período')

		// The select offers each period with groups, newest first, with its group count.
		await page.getByLabel('Período').click()
		const expectedLabels = [defaultCode, otherCode].sort((a, b) => compareAcademicPeriodCodes(b, a)).map(label)
		await expect(page.getByRole('option')).toHaveText(expectedLabels)
		await page.getByRole('option', { name: label(otherCode) }).click()
		await expect(page.getByRole('listbox')).toHaveCount(0)
		await expect(page).toHaveURL(new RegExp(`/app/groups/manage\\?period=${otherCode}$`))
		await expect(page.getByText(`Estás viendo los grupos del período ${otherCode}.`)).toBeVisible()
		await expectCurrentNote(otherCode)
		await expect(cardOf('01')).toBeVisible()
		await expect(cardOf('91')).toHaveCount(0)
		await expect(cardOf('01')).not.toContainText('Período')
		await expect(week).toContainText('Grupo 01')
		await expect(week).not.toContainText('Grupo 91')

		// The period stays in the address across a reload.
		await page.reload()
		await page.waitForLoadState('networkidle')
		await expect(page.getByLabel('Período')).toContainText(label(otherCode))
		await expect(cardOf('01')).toBeVisible()

		// An unknown or malformed period falls back to the default.
		for (const unknown of ['2031-1', 'no-es-un-periodo']) {
			await page.goto(`${base}/app/groups/manage?period=${unknown}`)
			await page.waitForLoadState('networkidle')
			await expect(page.getByText(`Estás viendo los grupos del período ${defaultCode}.`)).toBeVisible()
			await expect(cardOf('91')).toBeVisible()
		}

		// The link goes back to the default period and clears the param.
		await page.goto(`${base}/app/groups/manage?period=${otherCode}`)
		await page.waitForLoadState('networkidle')
		await resetLink.click()
		await expect(page).toHaveURL(new RegExp(`/app/groups/manage$`))
		await expect(page.getByText(`Estás viendo los grupos del período ${defaultCode}.`)).toBeVisible()
		await expect(resetLink).toHaveCount(0)

		// A default period with only inactive groups says so, and Todos still lists them.
		await pool.query('UPDATE groups SET active = false WHERE id = $1', [group.rows[0].id])
		await page.reload()
		await page.waitForLoadState('networkidle')
		await expect(page.getByText('No hay grupos activos en este período.')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Activos · 0' })).toHaveAttribute('aria-pressed', 'true')
		await page.getByRole('button', { name: 'Todos · 1' }).click()
		await expect(cardOf('91').getByRole('button', { name: 'Reactivar' })).toBeVisible()

		// A professor with no groups reads that the default period is empty.
		const emptyPage = await (await browser.newContext()).newPage()
		await signIn(emptyPage, mixed.email)
		await emptyPage.goto(`${base}/app/groups/manage`)
		await emptyPage.waitForLoadState('networkidle')
		await expect(emptyPage.getByText(`No tienes grupos en el período ${defaultCode}.`)).toBeVisible()
		await expect(emptyPage.getByRole('link', { name: 'Registra un grupo' })).toBeVisible()
		await emptyPage.context().close()
	} finally {
		await pool.query('DELETE FROM groups WHERE id = $1', [group.rows[0].id])
		if (insertedPeriod.rowCount) await pool.query('DELETE FROM periods WHERE code = $1', [currentAcademicPeriodCode()])
		await setPeriodWindow(true)
	}
})

test('professor sees concluded and upcoming groups held back, and the Tablero lists only the current period', async ({ page }) => {
	test.setTimeout(90_000)
	const today = sislabToday()
	const [concludedCode, upcomingCode] = await unusedPeriodCodes(2)
	const owner = await pool.query('SELECT id FROM users WHERE email = $1', [professor.email])
	const lab = await pool.query('SELECT id FROM labs WHERE name = $1', [labName])
	const career = await pool.query('SELECT id FROM careers WHERE name = $1', [careerName])
	const subject = await pool.query('SELECT id FROM subjects WHERE name = $1', [subjectName])
	await pool.query('INSERT INTO periods (code, starts_on, ends_on) VALUES ($1, $2, $3), ($4, $5, $6)', [
		concludedCode,
		addDays(today, -60),
		addDays(today, -1),
		upcomingCode,
		addDays(today, 30),
		addDays(today, 120),
	])
	const insertGroup = (period: string, number: number) =>
		pool.query(
			`INSERT INTO groups (professor_id, period_code, number, lab_id, lab_name, career_id, career_name, subject_id, subject_name, students, teams, weekday, start_time, end_time)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 20, 5, 4, '14:00', '16:00')`,
			[owner.rows[0].id, period, number, lab.rows[0].id, labName, career.rows[0].id, careerName, subject.rows[0].id, subjectName],
		)
	await insertGroup(concludedCode, 92)
	await insertGroup(upcomingCode, 93)
	const cardOf = (number: string) => page.locator('article').filter({ hasText: `Grupo ${number}` })
	let pillCode = ''
	try {
		await signIn(page, professor.email)

		// A concluded group keeps every button, disabled, and a tooltip names the period.
		await page.goto(`${base}/app/groups/manage?period=${concludedCode}`)
		await page.waitForLoadState('networkidle')
		const concluded = cardOf('92')
		await expect(concluded).toContainText('Activo')
		await expect(concluded).toContainText('Concluido')
		await expect(concluded).not.toContainText('Próximo')
		const concludedButtons = ['Solicitar preparación', 'Editar', 'Desactivar']
		for (const name of concludedButtons) await expect(concluded.getByRole('button', { name })).toBeDisabled()
		await expect(concluded.getByRole('link', { name: 'Solicitar preparación' })).toHaveCount(0)
		// The status badge sits under the Activo badge.
		const activeBox = await concluded.getByText('Activo', { exact: true }).boundingBox()
		const statusBox = await concluded.getByText('Concluido', { exact: true }).boundingBox()
		expect(statusBox?.y).toBeGreaterThan((activeBox?.y ?? 0) + (activeBox?.height ?? 0) - 1)
		// Hover opens the tooltip on each disabled button.
		for (const name of concludedButtons) {
			await concluded.getByRole('button', { name }).hover({ force: true })
			await expect(page.getByText(`El período ${concludedCode} concluyó`)).toBeVisible()
			await page.mouse.move(0, 0)
			await expect(page.getByText(`El período ${concludedCode} concluyó`)).toHaveCount(0)
		}
		// So does keyboard focus on the wrapper around the button.
		await concluded.getByRole('button', { name: 'Editar' }).locator('xpath=..').focus()
		await expect(page.getByText(`El período ${concludedCode} concluyó`)).toBeVisible()
		await page.keyboard.press('Escape')

		// An upcoming group disables only Solicitar preparación.
		await page.goto(`${base}/app/groups/manage?period=${upcomingCode}`)
		await page.waitForLoadState('networkidle')
		const upcoming = cardOf('93')
		await expect(upcoming).toContainText('Próximo')
		await expect(upcoming).not.toContainText('Concluido')
		await expect(upcoming.getByRole('button', { name: 'Solicitar preparación' })).toBeDisabled()
		await expect(upcoming.getByRole('button', { name: 'Editar' })).toBeEnabled()
		await expect(upcoming.getByRole('button', { name: 'Desactivar' })).toBeEnabled()
		await upcoming.getByRole('button', { name: 'Solicitar preparación' }).hover({ force: true })
		await expect(
			page.getByText(`Podrás solicitar preparaciones cuando inicie el período ${upcomingCode}`),
		).toBeVisible()

		// The Tablero names one period in its pill. Read it, then put a group there.
		await page.goto(`${base}/app/dashboard`)
		await page.waitForLoadState('networkidle')
		const pillText = (await page.getByText(/^Período \d{4}-[12V]$/).first().textContent()) ?? ''
		pillCode = pillText.replace('Período ', '')
		await insertGroup(pillCode, 94)
		await page.reload()
		await page.waitForLoadState('networkidle')

		// A current group is unchanged: no badge and a working link.
		await page.goto(`${base}/app/groups/manage?period=${pillCode}`)
		await page.waitForLoadState('networkidle')
		const current = cardOf('94')
		await expect(current).not.toContainText('Concluido')
		await expect(current).not.toContainText('Próximo')
		await expect(current.getByRole('link', { name: 'Solicitar preparación' })).toBeVisible()

		// The Tablero lists only the group in the period its pill names.
		await page.goto(`${base}/app/dashboard`)
		await page.waitForLoadState('networkidle')
		const groupsCard = page.getByRole('region', { name: 'Mis grupos' })
		await expect(groupsCard).toContainText('Grupo 94')
		await expect(groupsCard).not.toContainText('Grupo 92')
		await expect(groupsCard).not.toContainText('Grupo 93')

		// The request form offers only groups in the current period.
		await page.goto(`${base}/app/requests/new`)
		await page.waitForLoadState('networkidle')
		await expect(page.getByRole('radio', { name: /Grupo 94/ })).toBeVisible()
		await expect(page.getByRole('radio', { name: /Grupo 92/ })).toHaveCount(0)
		await expect(page.getByRole('radio', { name: /Grupo 93/ })).toHaveCount(0)

		// With the pill's period empty of active groups, the empty state names it.
		await pool.query('UPDATE groups SET active = false WHERE professor_id = $1 AND period_code = $2', [owner.rows[0].id, pillCode])
		await page.goto(`${base}/app/dashboard`)
		await page.waitForLoadState('networkidle')
		await expect(groupsCard).toContainText(`No tienes grupos activos en el período ${pillCode}.`)
		await expect(groupsCard).not.toContainText('Grupo 92')
	} finally {
		if (pillCode) await pool.query('UPDATE groups SET active = true WHERE professor_id = $1 AND period_code = $2', [owner.rows[0].id, pillCode])
		await pool.query('DELETE FROM groups WHERE professor_id = $1 AND number = ANY($2) AND period_code = ANY($3)', [
			owner.rows[0].id,
			[92, 93, 94],
			[concludedCode, upcomingCode, pillCode].filter(Boolean),
		])
		await pool.query('DELETE FROM periods WHERE code = ANY($1)', [[concludedCode, upcomingCode]])
	}
})

test('staff and mixed-role navigation follows the account roles', async ({ page }) => {
	await signIn(page, staff.email)
	await expect(page.getByRole('heading', { name: 'Solicitudes próximas de todos los profesores' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Mis grupos' })).toHaveCount(0)
	const nav = page.getByRole('navigation', { name: 'Navegación principal' })
	await expect(nav.getByRole('link', { name: 'Tablero' })).toBeVisible()
	await expect(nav.getByRole('link', { name: 'Todas las solicitudes' })).toBeVisible()
	await expect(nav.getByRole('link', { name: 'Mis grupos' })).toHaveCount(0)
	await expect(nav.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)

	await page.locator('[data-slot="sidebar"]').getByRole('button', { name: 'Cerrar sesión' }).click()
	await page.waitForURL('**/')
	await signIn(page, mixed.email)
	const mixedNav = page.getByRole('navigation', { name: 'Navegación principal' })
	await expect(mixedNav.getByRole('link', { name: 'Mis grupos' })).toBeVisible()
	await expect(mixedNav.getByRole('link', { name: 'Usuarios' })).toBeVisible()
})

test('admin activates a requested account and can sign in as that account', async ({ page }) => {
	await signIn(page, admin.email)
	for (const [legacy, canonical] of [
		['/admin/users', '/app/admin/users'],
		['/admin/groups', '/app/admin/groups'],
		['/admin/periods', '/app/admin/periods'],
		['/admin/catalogs', '/app/admin/catalogs'],
	] as const) {
		await page.goto(`${base}${legacy}`)
		await expect.poll(() => new URL(page.url()).pathname).toBe(`${base}${canonical}`)
	}
	for (const former of ['/admin/accounts', '/app/admin/accounts']) {
		await page.goto(`${base}${former}`)
		await expect(page.getByRole('tab', { name: /^Solicitudes de acceso/ })).toHaveAttribute('aria-selected', 'true')
		expect(new URL(page.url()).pathname).toBe(`${base}/app/admin/users`)
	}
	const nav = page.getByRole('navigation', { name: 'Navegación principal' })
	await expect(nav.getByRole('link', { name: 'Cuentas' })).toHaveCount(0)
	const usersLink = nav.getByRole('link', { name: 'Usuarios' })
	const pendingBadge = usersLink.locator('[data-slot="badge"]')
	await expect(pendingBadge).toContainText('de acceso pendiente')
	const pendingBefore = Number.parseInt((await pendingBadge.textContent()) ?? '', 10)
	expect(pendingBefore).toBeGreaterThan(0)
	await usersLink.click()
	await page.waitForLoadState('networkidle')
	await expect(page.getByRole('tab', { name: /^Usuarios/ })).toHaveAttribute('aria-selected', 'true')
	await page.getByLabel('Buscar').fill(pendingEmail)
	await expect(page.getByRole('row').filter({ hasText: pendingEmail })).toHaveCount(0)
	await page.getByRole('tab', { name: /^Solicitudes de acceso/ }).click()
	const request = page.locator('article').filter({ hasText: pendingEmail })
	await expect(request).toBeVisible()
	await expect(request.getByRole('button', { name: 'Activar cuenta' })).toBeDisabled()
	await request.getByRole('checkbox', { name: 'Verifiqué su identidad fuera de SISLAB' }).check()
	await request.getByRole('button', { name: 'Activar cuenta' }).click()
	await expect(toastNamed(page, 'ya puede ingresar a SISLAB')).toBeVisible()
	await expect(request).toHaveCount(0)
	if (pendingBefore === 1) await expect(pendingBadge).toHaveCount(0)
	else await expect(pendingBadge).toHaveText(new RegExp(`^${pendingBefore - 1}\\D`))
	await page.getByRole('tab', { name: /^Usuarios/ }).click()
	await page.getByLabel('Buscar').fill(pendingEmail)
	await expect(page.getByRole('row').filter({ hasText: pendingEmail })).toContainText('Activa')
	await page.getByRole('button', { name: 'Cerrar sesión' }).click()
	await page.waitForURL('**/')
	await signIn(page, pendingEmail, pendingPassword)
	await expect(page.getByText('Hola, Browser.')).toBeVisible()
})

test('admin edits a professor group and manages periods and catalogs', async ({ page }) => {
	test.setTimeout(60_000)
	await signIn(page, admin.email)
	await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Grupos', exact: true })).toHaveCount(0)
	await page.goto(`${base}/app/admin/groups`)
	await page.waitForLoadState('networkidle')
	const group = page.locator('article').filter({ hasText: 'Grupo 01' }).filter({ hasText: professor.email })
	await expect(group).toBeVisible()
	await expect(group).toContainText(/Estudiantes\s*25/)
	await expect(group).toContainText(`${professor.name} ${professor.surname}`)
	await expect(group.getByLabel('Estudiantes')).toHaveCount(0)
	await group.getByRole('button', { name: 'Editar' }).click()
	const editGroupDialog = page.getByRole('dialog', { name: 'Editar grupo' })
	await editGroupDialog.getByLabel('Estudiantes').fill('21')
	await editGroupDialog.getByRole('button', { name: 'Guardar cambios' }).click()
	await expect(editGroupDialog).toHaveCount(0)
	await expect(toastNamed(page, 'Se actualizó el grupo 1 de Browser.')).toBeVisible()
	await expect(page.locator('[data-slot="alert"]')).toHaveCount(0)
	await expect(group).toContainText(/Estudiantes\s*21/)

	await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Períodos', exact: true }).click()
	await page.waitForLoadState('networkidle')
	await expect(page.getByLabel('Código')).toHaveCount(0)
	await page.getByRole('button', { name: 'Agregar período', exact: true }).click()
	const periodDialog = page.getByRole('dialog', { name: 'Agregar período' })
	await periodDialog.getByLabel('Código').fill(createdPeriodCode)
	await periodDialog.getByRole('button', { name: 'Agregar período', exact: true }).click()
	await expect(periodDialog).toHaveCount(0)
	await expect(toastNamed(page, `Se guardó el período ${createdPeriodCode}`)).toBeVisible()
	await expect(page.locator('[data-slot="alert"]')).toHaveCount(0)
	await expect(page.getByRole('cell', { name: createdPeriodCode, exact: true })).toBeVisible()
	const periodCard = page.getByRole('region', { name: createdPeriodCode })
	// A period with no official dates shows its term's default dates.
	await expect(periodCard).toContainText('predeterminada')
	await expect(periodCard).not.toContainText('Sin fecha')
	await periodCard.getByRole('button', { name: 'Editar período' }).click()
	const editPeriodDialog = page.getByRole('dialog', { name: `Editar ${createdPeriodCode}` })
	await expect(editPeriodDialog.getByLabel('Código')).toHaveCount(0)
	await editPeriodDialog.getByRole('button', { name: 'Cancelar' }).click()
	await expect(editPeriodDialog).toHaveCount(0)

	await page.getByRole('button', { name: 'Agregar período', exact: true }).click()
	await periodDialog.getByLabel('Código').fill(summerPeriodCode.toLowerCase())
	await periodDialog.getByRole('button', { name: 'Agregar período', exact: true }).click()
	await expect(toastNamed(page, `Se guardó el período ${summerPeriodCode}`)).toBeVisible()
	const summerCard = page.getByRole('region', { name: summerPeriodCode })
	for (const [startsIn, endsIn, status] of [[-2, 2, 'Actual'], [-9, -5, 'Concluido'], [5, 9, 'Próximo']] as const) {
		await pool.query('UPDATE periods SET starts_on = CURRENT_DATE + $2::int, ends_on = CURRENT_DATE + $3::int WHERE code = $1', [summerPeriodCode, startsIn, endsIn])
		await page.reload()
		await page.waitForLoadState('networkidle')
		await page.getByRole('button', { name: summerPeriodCode, exact: true }).click()
		await expect(summerCard.getByText(status, { exact: true })).toBeVisible()
	}

	await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Catálogos' }).click()
	await page.waitForLoadState('networkidle')
	await page.getByRole('main').getByRole('link', { name: 'Laboratorios' }).click()
	await expect(page).toHaveURL(/\/app\/admin\/catalogs\/labs$/)
	await page.waitForLoadState('networkidle')
	await expect(page.getByRole('heading', { level: 1, name: 'Laboratorios' })).toBeVisible()
	await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Catálogos' })).toHaveAttribute('aria-current', 'true')
	await page.getByRole('button', { name: 'Cargar varios' }).click()
	const importDialog = page.getByRole('dialog', { name: 'Cargar varios valores' })
	await expect(importDialog.getByLabel('Laboratorios')).toBeVisible()
	await importDialog.getByRole('button', { name: 'Cancelar' }).click()
	await page.getByRole('button', { name: 'Nuevo laboratorio' }).click()
	const labDialog = page.getByRole('dialog', { name: 'Nuevo laboratorio' })
	await labDialog.getByLabel('Nombre').fill(addedCatalogName)
	await labDialog.getByRole('button', { name: 'Crear laboratorio' }).click()
	await expect(labDialog).toHaveCount(0)
	await expect(toastNamed(page, `Se agregó “${addedCatalogName}” a laboratorios`)).toBeVisible()
	await expect(page.locator('[data-slot="alert"]')).toHaveCount(0)
	const addedLab = page.getByRole('row').filter({ hasText: addedCatalogName })
	await expect(addedLab).toContainText('Activo')
	const labCard = page.getByRole('region', { name: addedCatalogName })
	await labCard.getByRole('button', { name: 'Cambiar nombre' }).click()
	const renameDialog = page.getByRole('dialog', { name: 'Cambiar nombre' })
	await expect(renameDialog.getByLabel('Nombre')).toHaveValue(addedCatalogName)
	await renameDialog.getByRole('button', { name: 'Cancelar' }).click()
	await expect(labCard).toBeVisible()
	await page.getByRole('button', { name: 'Desactivar', exact: true }).click()
	await expect(addedLab).toContainText('Desactivado')
	await page.getByRole('button', { name: 'Reactivar', exact: true }).click()
	await expect(addedLab).toContainText('Activo')

	await page.goto(`${base}/app/admin/exercises`)
	await page.waitForLoadState('networkidle')
	await page.getByRole('button', { name: 'Nueva práctica' }).click()
	const exerciseDialog = page.getByRole('dialog', { name: 'Nueva práctica' })
	await expect(exerciseDialog.getByLabel('Número o etiqueta')).toBeVisible()
	await exerciseDialog.getByRole('button', { name: 'Agregar reactivo' }).click()
	await expect(exerciseDialog.getByLabel('Nombre del reactivo 1')).toBeVisible()
	await exerciseDialog.getByRole('button', { name: 'Cancelar' }).click()
	await expect(exerciseDialog).toHaveCount(0)

	await page.goto(`${base}/app/admin/users`)
	await page.waitForLoadState('networkidle')
	await page.getByLabel('Buscar').fill(professor.email)
	await page.getByRole('button', { name: new RegExp(professor.email) }).click()
	const userCard = page.getByRole('region', { name: `${professor.name} ${professor.surname}` })
	await expect(userCard.getByRole('checkbox')).toHaveCount(0)
	await userCard.getByRole('button', { name: 'Editar roles' }).click()
	const rolesDialog = page.getByRole('dialog', { name: 'Editar roles' })
	await expect(rolesDialog.getByRole('checkbox', { name: 'Docente' })).toBeChecked()
	await rolesDialog.getByRole('button', { name: 'Cancelar' }).click()
	await userCard.getByRole('button', { name: 'Restablecer contraseña' }).click()
	const passwordDialog = page.getByRole('dialog', { name: 'Restablecer contraseña' })
	await expect(passwordDialog.getByLabel('Contraseña nueva')).toBeVisible()
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
	await passwordDialog.getByRole('button', { name: 'Generar contraseña y copiarla' }).click()
	await expect(toastNamed(page, 'Contraseña generada y copiada.')).toBeVisible()
	await expect(passwordDialog.locator('[data-slot="alert"]')).toHaveCount(0)
})

/** Opens a Combobox or Select by its label and picks one option. */
async function setTime(page: import('@playwright/test').Page, label: string, time: string) {
	const [hour, minute] = time.split(':')
	await expect(page.getByRole('listbox')).toHaveCount(0)
	await page.getByLabel(`${label}, hora`).click()
	await chooseOption(page, hour)
	await page.getByLabel(`${label}, minutos`).click()
	await chooseOption(page, minute)
}

/**
 * Clicks an option in the open list and waits for the list to close. A Base UI
 * list stays in the page while its close animation runs, so the next list to
 * open could otherwise share option names with it.
 */
async function chooseOption(page: import('@playwright/test').Page, name: string | RegExp) {
	await page.getByRole('option', { name, exact: typeof name === 'string' }).click()
	await expect(page.getByRole('listbox')).toHaveCount(0)
}

/** An empty time shows the "--" placeholders. */
async function expectTime(page: import('@playwright/test').Page, label: string, time: string) {
	const [hour, minute] = time ? time.split(':') : ['--', '--']
	await expect(page.getByLabel(`${label}, hora`)).toHaveText(hour)
	await expect(page.getByLabel(`${label}, minutos`)).toHaveText(minute)
}

async function pick(page: import('@playwright/test').Page, label: string, option: string | RegExp) {
	await page.getByLabel(label).click()
	await page.getByRole('option', { name: option }).click()
	await expect(page.getByRole('listbox')).toHaveCount(0)
}

async function signIn(page: import('@playwright/test').Page, email: string, userPassword = password) {
	await page.goto(`${base}/sign-in`)
	await page.waitForLoadState('networkidle')
	await page.getByLabel('Correo electrónico').fill(email)
	await page.getByLabel('Contraseña').fill(userPassword)
	await page.getByRole('button', { name: 'Ingresar' }).click()
	await expect(page).toHaveURL(/\/app\/dashboard$/)
	await page.waitForLoadState('networkidle')
}
