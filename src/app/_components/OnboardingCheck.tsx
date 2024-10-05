'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import React from 'react'

export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user) {
      const needsOnboarding = user.publicMetadata.needsOnboarding
      if (needsOnboarding && window.location.pathname !== '/onboarding') {
        router.push('/onboarding')
      }
    }
  }, [isLoaded, user, router])

  return (
    <>{children}</>
  )
}