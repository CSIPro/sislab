import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/manage')({
  beforeLoad: () => { throw redirect({ to: '/app/groups/manage' }) },
})
