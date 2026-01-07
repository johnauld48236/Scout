import { redirect } from 'next/navigation'

// Redirect to new Territories route (Scout terminology)
export default function AccountPlansPage() {
  redirect('/territories')
}
