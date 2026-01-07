import { redirect } from 'next/navigation'

// Redirect to new Territories/new route (Scout terminology)
export default function NewAccountPage() {
  redirect('/territories/new')
}
