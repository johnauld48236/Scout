import { redirect } from 'next/navigation'

// Redirect to new Landscape list route (Scout terminology)
export default function TAMListPage() {
  redirect('/landscape/list')
}
