import { useState, useEffect } from 'react'

export default function CalendarioTest() {
  const [loading, setLoading] = useState(true)

  const daysToShow = []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <h1>Calendário Test</h1>
    </div>
  )
}