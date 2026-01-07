import { redirect } from 'next/navigation'

// Redirect to new Landscape route (Scout terminology)
export default function TAMOverviewPage() {
  redirect('/landscape')
}
