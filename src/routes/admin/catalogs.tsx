import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/catalogs')({
  beforeLoad: () => { throw redirect({ to: '/app/admin/catalogs' }) },
})
