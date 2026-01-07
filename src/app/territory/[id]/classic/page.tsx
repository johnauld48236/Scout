import { redirect } from 'next/navigation'

// Classic view - redirect to old accounts route for now
// This maintains backwards compatibility while the prototype becomes default
export default async function TerritoryClassicPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Redirect to the original classic account view
  redirect(`/accounts/${id}`)
}
