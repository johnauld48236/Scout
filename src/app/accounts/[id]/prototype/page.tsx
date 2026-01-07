import { redirect } from 'next/navigation'

// Redirect to new Territory route (Scout terminology - prototype is now the default)
export default async function PrototypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/territory/${id}`)
}
