import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { Pool } from 'pg'
import { sislabToday } from '../../src/lib/session-dates.ts'
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

test.beforeAll(async () => {
	const connectionString = process.env.DATABASE_URL_TEST
	if (!connectionString) {
		throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
	}
	pool = new Pool({ connectionString })
	const firstYear = 2000 + (Number.parseInt(suffix.slice(0, 4), 16) % 201)
	for (let offset = 0; offset < 201; offset += 1) {
		const year = 2000 + ((firstYear - 2000 + offset) % 201)
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
	await pool.query('INSERT INTO periods (code) VALUES ($1) ON CONFLICT (code) DO NOTHING', [periodCode])
	await pool.query('INSERT INTO labs (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [labName])
	await pool.query('INSERT INTO careers (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [careerName])
	await pool.query('INSERT INTO subjects (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [subjectName])
})

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
	await signIn(page, professor.email)
	await expect(page.getByRole('heading', { name: 'Tablero' })).toBeVisible()
	await expect(page.getByText(`Hola, ${professor.name}.`)).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Mis próximas solicitudes' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Solicitudes próximas de todos los profesores' })).toHaveCount(0)
	await expect(page.getByText('Aún no tienes grupos activos.')).toBeVisible()
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
	await page.getByLabel('Hora de inicio').fill('10:00')
	await expect(page.getByLabel('Hora de término')).toHaveValue('12:00')
	await page.getByLabel('Hora de inicio').fill('22:30')
	await expect(page.getByLabel('Hora de término')).toHaveValue('')
	await page.getByLabel('Hora de inicio').fill('10:00')
	await expect(page.getByLabel('Hora de término')).toHaveValue('12:00')
	await page.getByLabel('Hora de término').fill('11:00')
	await page.getByLabel('Hora de inicio').fill('09:00')
	await expect(page.getByLabel('Hora de término')).toHaveValue('11:00')
	await page.getByLabel('Hora de inicio').fill('10:00')
	await page.getByRole('button', { name: 'Registrar grupo' }).click()
	await expect(page.getByText(new RegExp(`El grupo 1 se registró en el período ${periodCode}`))).toBeVisible()
	await page.goto(`${base}/app/dashboard`)
	await expect(page.getByText(subjectName, { exact: true })).toBeVisible()
	await expect(page.getByText('Martes, 10:00–11:00')).toBeVisible()

	await page.goto(`${base}/app/groups/manage`)
	await page.waitForLoadState('networkidle')
	await expect(page.getByRole('heading', { name: 'Tu semana en el laboratorio' })).toBeVisible()
	await expect(page.getByRole('radio', { name: 'Activos · 1' })).toBeChecked()
	const groupCard = page.locator('article').filter({ hasText: subjectName })
	await expect(groupCard).toContainText('Grupo 01')
	await groupCard.getByRole('button', { name: 'Editar' }).click()
	await expect(groupCard.getByLabel('Estudiantes')).toHaveValue('20')
	await groupCard.getByRole('link', { name: 'Solicitar preparación' }).click()
	await expect(page).toHaveURL(/\/app\/requests\/new\?group=/)
	await expect(page.getByRole('radio', { name: new RegExp(`${subjectName} · Grupo 01`) })).toBeChecked()
	await expect(page.getByRole('group', { name: 'Fechas disponibles' }).getByRole('button')).toHaveCount(4)
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
	await page.getByRole('radio', { name: 'Día' }).click()
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
	await request.getByLabel('Verifiqué su identidad fuera de SISLAB').check()
	await request.getByRole('button', { name: 'Activar cuenta' }).click()
	await expect(page.getByRole('status')).toContainText('ya puede ingresar a SISLAB')
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
	await signIn(page, admin.email)
	await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Grupos', exact: true })).toHaveCount(0)
	await page.goto(`${base}/app/admin/groups`)
	await page.waitForLoadState('networkidle')
	const group = page.locator('article').filter({ hasText: `${periodCode} · Grupo 1` })
	await expect(group).toBeVisible()
	await group.getByLabel('Estudiantes').fill('21')
	await group.getByRole('button', { name: 'Guardar cambios' }).click()
	await expect(page.getByRole('status')).toContainText('Se actualizó el grupo 1 de Browser.')
	await expect(group.getByLabel('Estudiantes')).toHaveValue('21')

	await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Períodos', exact: true }).click()
	await page.waitForLoadState('networkidle')
	await expect(page.getByLabel('Código')).toHaveCount(0)
	await page.getByRole('button', { name: 'Agregar período', exact: true }).click()
	const periodDialog = page.getByRole('dialog', { name: 'Agregar período' })
	await periodDialog.getByLabel('Código').fill(createdPeriodCode)
	await periodDialog.getByRole('button', { name: 'Agregar período', exact: true }).click()
	await expect(periodDialog).toHaveCount(0)
	await expect(page.getByRole('status')).toContainText(`Se guardó el período ${createdPeriodCode}`)
	await expect(page.getByRole('cell', { name: createdPeriodCode, exact: true })).toBeVisible()
	const periodCard = page.getByRole('region', { name: createdPeriodCode })
	await expect(periodCard).toContainText('Sin fecha')
	await periodCard.getByRole('button', { name: 'Editar período' }).click()
	const editPeriodDialog = page.getByRole('dialog', { name: `Editar ${createdPeriodCode}` })
	await expect(editPeriodDialog.getByLabel('Código')).toHaveCount(0)
	await editPeriodDialog.getByRole('button', { name: 'Cancelar' }).click()
	await expect(editPeriodDialog).toHaveCount(0)

	await page.getByRole('button', { name: 'Agregar período', exact: true }).click()
	await periodDialog.getByLabel('Código').fill(summerPeriodCode.toLowerCase())
	await periodDialog.getByRole('button', { name: 'Agregar período', exact: true }).click()
	await expect(page.getByRole('status')).toContainText(`Se guardó el período ${summerPeriodCode}`)
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
	await expect(page.getByRole('status')).toContainText(`Se agregó “${addedCatalogName}” a laboratorios`)
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
	await expect(rolesDialog.getByRole('checkbox', { name: 'Profesor' })).toBeChecked()
	await rolesDialog.getByRole('button', { name: 'Cancelar' }).click()
	await userCard.getByRole('button', { name: 'Restablecer contraseña' }).click()
	await expect(page.getByRole('dialog', { name: 'Restablecer contraseña' }).getByLabel('Contraseña nueva')).toBeVisible()
})

/** Opens a Combobox or Select by its label and picks one option. */
async function pick(page: import('@playwright/test').Page, label: string, option: string | RegExp) {
	await page.getByLabel(label).click()
	await page.getByRole('option', { name: option }).click()
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
