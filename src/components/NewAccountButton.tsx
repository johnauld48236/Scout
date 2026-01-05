'use client'

import { useRouter } from 'next/navigation'

export function NewAccountButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/accounts/new')}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Account Plan
    </button>
  )
}
