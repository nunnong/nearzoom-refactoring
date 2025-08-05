import { createStore } from 'zustand/vanilla'
import { devtools, persist } from 'zustand/middleware'

export enum PhotoBoothState {
  WAITING = 'waiting',
  SHOOTING = 'photoshoot',
  SELECTING = 'photo-select'
}

export type UserState = {
  username: string
  photoBoothState: PhotoBoothState
}

export type UserActions = {
  setUsername: (username: string) => void
  setPhotoBoothState: (state: PhotoBoothState) => void
  nextPhotoBoothState: () => void
}

export type UserStore = UserState & UserActions

export const defaultInitState: UserState = {
  username: '',
  photoBoothState: PhotoBoothState.WAITING,
}

export const createUserStore = (
  initState: UserState = defaultInitState,
) => {
  return createStore<UserStore>()(
    devtools(
      persist(
        (set, get) => ({
          ...initState,
          setUsername: (username: string) => set({ username }),
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
        }),
        {
          name: 'user-storage',
        }
      ),
      {
        name: 'user-store',
      }
    )
  )
}