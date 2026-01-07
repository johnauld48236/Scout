import { redirect } from 'next/navigation'

// Redirect to new Landscape detail route (Scout terminology)
export default async function TAMAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/landscape/${id}`)
}
