'use client'

import Dashboard from '@/components/page/myroom/Dashboard'
import { TEST_IMAGES } from '@/constants'
import { useAuth } from '@/hooks/useAuth'

export default function MyRoom() {
  const { currentUser } = useAuth()
  
  return <Dashboard images={TEST_IMAGES} userProfile={currentUser} />
}