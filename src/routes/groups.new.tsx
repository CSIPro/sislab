import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/new')({
  beforeLoad: () => { throw redirect({ to: '/app/groups/new' }) },
})
