import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/groups')({
  beforeLoad: () => { throw redirect({ to: '/app/admin/groups' }) },
})
