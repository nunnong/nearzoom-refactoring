'use client'

import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'

import { type PhotoBoothStore, createPhotoBoothStore } from '../stores/photoboothStore'

export type PhotoBoothStoreApi = ReturnType<typeof createPhotoBoothStore>

export const PhotoBoothStoreContext = createContext<PhotoBoothStoreApi | undefined>(
  undefined,
)

export interface PhotoBoothProviderProps {
  children: ReactNode
}

export const PhotoBoothProvider = ({
  children,
}: PhotoBoothProviderProps) => {
  const storeRef = useRef<PhotoBoothStoreApi | null>(null)
  if (storeRef.current === null) {
    storeRef.current = createPhotoBoothStore()
  }

  return (
    <PhotoBoothStoreContext.Provider value={storeRef.current}>
      {children}
    </PhotoBoothStoreContext.Provider>
  )
}

export const usePhotoBoothStore = <T,>(
  selector: (store: PhotoBoothStore) => T,
): T => {
  const photoBoothStoreContext = useContext(PhotoBoothStoreContext)

  if (!photoBoothStoreContext) {
    throw new Error(`usePhotoBoothStore must be used within PhotoBoothProvider`)
  }

  return useStore(photoBoothStoreContext, selector)
}