import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { defineConfig } from '@playwright/test'

loadEnv({ path: ['.env.local', '.env'], quiet: true })

const testDatabaseUrl = process.env.DATABASE_URL_TEST
if (!testDatabaseUrl) {
	throw new Error('Set DATABASE_URL_TEST to a dedicated, migrated PostgreSQL database.')
}

const port = 4173
const viteEntry = resolve('node_modules/vite/bin/vite.js')

export default defineConfig({
	testDir: './test/browser',
	testMatch: '**/*.spec.ts',
	fullyParallel: false,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		browserName: 'chromium',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: `"${process.execPath}" "${viteEntry}" dev --host 127.0.0.1 --port ${port} --strictPort`,
		url: `http://127.0.0.1:${port}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			...process.env,
			DATABASE_URL: testDatabaseUrl,
		},
	},
})
