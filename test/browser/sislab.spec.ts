import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { Pool } from 'pg'
import { hashPassword } from '../../src/server/auth.server.ts'

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
		const candidateCodes = [`${year}-1`, `${year}-2`]
		const existing = await pool.query('SELECT code FROM periods WHERE code = ANY($1)', [candidateCodes])
		if (existing.rowCount === 0) {
			[periodCode, createdPeriodCode] = candidateCodes
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
			'INSERT INTO users (email, name, surname, password_hash, active) VALUES ($1, $2, $3, $4, true) RETURNING id',
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
	await pool.query('DELETE FROM periods WHERE code = ANY($1)', [[periodCode, createdPeriodCode]])
	await pool.query('DELETE FROM labs WHERE name = ANY($1)', [[labName, addedCatalogName]])
	await pool.query('DELETE FROM careers WHERE name = $1', [careerName])
	await pool.query('DELETE FROM subjects WHERE name = $1', [subjectName])
	await pool.end()
})

test('guest landing, access request, and protected-route redirect work in Spanish', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('heading', { name: 'Prepara tu laboratorio sin papeleo.' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Cómo funciona' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Un tablero para cada rol' })).toBeVisible()
	await expect(page.getByRole('contentinfo')).toContainText('CSI PRO')

	await page.goto('/app/dashboard')
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
		await page.goto(legacy)
		await expect.poll(() => new URL(page.url()).pathname).toBe(canonical)
	}

	await page.goto('/')
	await expect(page.getByText('Sesión activa')).toBeVisible()
	await expect(page.getByRole('link', { name: 'Ir a mi espacio' }).first()).toBeVisible()
	await page.goto('/sign-up')
	await expect(page.getByText('Sesión activa')).toBeVisible()
	await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toHaveCount(0)

	await page.goto('/app/dashboard')
	await page.setViewportSize({ width: 390, height: 844 })
	await page.waitForLoadState('networkidle')
	const menu = page.locator('.app-menu-button')
	await menu.click()
	await expect(menu).toHaveAttribute('aria-expanded', 'true')
	await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Mis grupos' })).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(menu).toHaveAttribute('aria-expanded', 'false')
	await expect(menu).toBeFocused()

	await page.goto('/app/groups/new')
	await page.waitForLoadState('networkidle')
	await page.getByLabel('Periodo académico').selectOption(periodCode)
	await page.getByLabel('Laboratorio').selectOption({ label: labName })
	await page.getByLabel('Carrera').selectOption({ label: careerName })
	await page.getByLabel('Materia').selectOption({ label: subjectName })
	await page.getByLabel('Estudiantes').fill('20')
	await page.getByLabel('Equipos').fill('4')
	await page.getByLabel('Día de la semana').selectOption('2')
	await page.getByLabel('Hora de inicio').fill('10:00')
	await page.getByLabel('Hora de término').fill('11:00')
	await page.getByRole('button', { name: 'Registrar grupo' }).click()
	await expect(page.getByText(new RegExp(`El grupo 1 se registró en el periodo ${periodCode}`))).toBeVisible()
	await page.goto('/app/dashboard')
	await expect(page.getByText(subjectName, { exact: true })).toBeVisible()
	await expect(page.getByText('Martes, 10:00–11:00')).toBeVisible()

	await page.goto('/app/groups/manage')
	await page.waitForLoadState('networkidle')
	await expect(page.getByRole('heading', { name: 'Tu semana en el laboratorio' })).toBeVisible()
	await expect(page.getByRole('button', { name: 'Activos · 1' })).toHaveAttribute('aria-pressed', 'true')
	const groupCard = page.locator('article').filter({ hasText: subjectName })
	await expect(groupCard).toContainText('Grupo 01')
	await groupCard.getByRole('button', { name: 'Editar' }).click()
	await expect(groupCard.getByLabel('Estudiantes')).toHaveValue('20')
	await groupCard.getByRole('link', { name: 'Solicitar preparación' }).click()
	await expect(page).toHaveURL(/\/app\/requests\/new\?group=/)
	await expect(page.getByRole('radio', { name: new RegExp(`${subjectName} · Grupo 01`) })).toBeChecked()
	await expect(page.getByRole('group', { name: 'Fechas disponibles' }).getByRole('button')).toHaveCount(4)
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

	await page.locator('#app-sidebar').getByRole('button', { name: 'Cerrar sesión' }).click()
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
		['/admin/accounts', '/app/admin/accounts'],
		['/admin/groups', '/app/admin/groups'],
		['/admin/periods', '/app/admin/periods'],
		['/admin/catalogs', '/app/admin/catalogs'],
	] as const) {
		await page.goto(legacy)
		await expect.poll(() => new URL(page.url()).pathname).toBe(canonical)
	}
	await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Cuentas' }).click()
	await page.waitForLoadState('networkidle')
	const request = page.locator('li').filter({ hasText: pendingEmail })
	await expect(request).toBeVisible()
	await request.getByRole('button', { name: 'Activar' }).click()
	await expect(page.getByRole('status')).toContainText('ya puede ingresar a SISLAB')
	await page.getByRole('button', { name: 'Cerrar sesión' }).click()
	await page.waitForURL('**/')
	await signIn(page, pendingEmail, pendingPassword)
	await expect(page.getByText('Hola, Browser.')).toBeVisible()
})

test('admin edits a professor group and manages periods and catalogs', async ({ page }) => {
	await signIn(page, admin.email)
	await page.getByRole('link', { name: 'Grupos', exact: true }).click()
	await page.waitForLoadState('networkidle')
	const group = page.locator('article').filter({ hasText: `${periodCode} · Grupo 1` })
	await expect(group).toBeVisible()
	await group.getByLabel('Estudiantes').fill('21')
	await group.getByRole('button', { name: 'Guardar cambios' }).click()
	await expect(page.getByRole('status')).toContainText('Se actualizó el grupo 1 de Browser.')
	await expect(group.getByLabel('Estudiantes')).toHaveValue('21')

	await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Periodos', exact: true }).click()
	await page.waitForLoadState('networkidle')
	await page.getByLabel('Clave del periodo').fill(createdPeriodCode)
	await page.getByRole('button', { name: 'Guardar periodo' }).click()
	await expect(page.getByRole('status')).toContainText('Se guardó el periodo académico')
	await expect(page.getByText(createdPeriodCode)).toBeVisible()

	await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Catálogos' }).click()
	await page.waitForLoadState('networkidle')
	await page.getByLabel('Nombre de laboratorios').fill(addedCatalogName)
	await page.getByRole('button', { name: 'Agregar' }).first().click()
	await expect(page.getByRole('status')).toContainText('Se guardó el elemento de laboratorios')
	await expect(page.getByText(addedCatalogName)).toBeVisible()
})

async function signIn(page: import('@playwright/test').Page, email: string, userPassword = password) {
	await page.goto('/sign-in')
	await page.waitForLoadState('networkidle')
	await page.getByLabel('Correo electrónico').fill(email)
	await page.getByLabel('Contraseña').fill(userPassword)
	await page.getByRole('button', { name: 'Ingresar' }).click()
	await expect(page).toHaveURL(/\/app\/dashboard$/)
	await page.waitForLoadState('networkidle')
}
