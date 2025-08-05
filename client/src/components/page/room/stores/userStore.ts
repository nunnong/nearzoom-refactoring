import { createStore } from 'zustand/vanilla'
import { devtools, persist } from 'zustand/middleware'

export type UserState = {
  username: string
}

export type UserActions = {
  setUsername: (username: string) => void
}

export type UserStore = UserState & UserActions

export const defaultInitState: UserState = {
  username: '',
}

export const createUserStore = (
  initState: UserState = defaultInitState,
) => {
  return createStore<UserStore>()(
    devtools(
      persist(
        (set) => ({
          ...initState,
          setUsername: (username: string) => set({ username }),
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