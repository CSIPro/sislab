import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/periods')({
  beforeLoad: () => { throw redirect({ to: '/app/admin/periods' }) },
})
