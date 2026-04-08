import React from 'react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Welcome to AirOne Studio</h1>
      <Link 
        href="/auth/sign-in" 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
      >
        Sign In
      </Link>
    </div>
  )
}
  

