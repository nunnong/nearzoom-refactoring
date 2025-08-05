import { createStore } from 'zustand/vanilla'
import { devtools, persist } from 'zustand/middleware'

export enum PhotoBoothState {
  WAITING = 'waiting',
  SHOOTING = 'photoshoot',
  SELECTING = 'photo-select'
}

export type PhotoBoothStoreState = {
  photoBoothState: PhotoBoothState
  currentCutIndex: number
  selectedPhotos: string[]
  frameColor: string
  cutCount: number
}

export type PhotoBoothActions = {
  setPhotoBoothState: (state: PhotoBoothState) => void
  nextPhotoBoothState: () => void
  setCurrentCutIndex: (index: number) => void
  setSelectedPhotos: (photos: string[]) => void
  setFrameColor: (color: string) => void
  setCutCount: (count: number) => void
  resetPhotoBoothData: () => void
}

export type PhotoBoothStore = PhotoBoothStoreState & PhotoBoothActions

export const defaultInitState: PhotoBoothStoreState = {
  photoBoothState: PhotoBoothState.WAITING,
  currentCutIndex: 1,
  selectedPhotos: [],
  frameColor: '#FFFFFF',
  cutCount: 4,
}

export const createPhotoBoothStore = (
  initState: PhotoBoothStoreState = defaultInitState,
) => {
  return createStore<PhotoBoothStore>()(
    devtools(
      persist(
        (set, get) => ({
          ...initState,
          setPhotoBoothState: (state: PhotoBoothState) => set({ photoBoothState: state }),
          nextPhotoBoothState: () => {
            const currentState = get().photoBoothState
            switch (currentState) {
              case PhotoBoothState.WAITING:
                set({ photoBoothState: PhotoBoothState.SHOOTING })
                break
              case PhotoBoothState.SHOOTING:
                set({ photoBoothState: PhotoBoothState.SELECTING })
                break
              case PhotoBoothState.SELECTING:
                // 완료 후 다시 대기로 돌아감
                set({ photoBoothState: PhotoBoothState.WAITING })
                break
            }
          },
          setCurrentCutIndex: (index: number) => set({ currentCutIndex: index }),
          setSelectedPhotos: (photos: string[]) => set({ selectedPhotos: photos }),
          setFrameColor: (color: string) => set({ frameColor: color }),
          setCutCount: (count: number) => set({ cutCount: count }),
          resetPhotoBoothData: () => set({
            photoBoothState: PhotoBoothState.WAITING,
            currentCutIndex: 1,
            selectedPhotos: [],
            frameColor: '#FFFFFF',
            cutCount: 4,
          }),
        }),
        {
          name: 'photobooth-storage',
        }
      ),
      {
        name: 'photobooth-store',
      }
    )
  )
}