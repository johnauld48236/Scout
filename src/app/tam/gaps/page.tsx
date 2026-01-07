import { redirect } from 'next/navigation'

// Redirect to new Landscape gaps route (Scout terminology)
export default function GapAnalysisPage() {
  redirect('/landscape/gaps')
}
