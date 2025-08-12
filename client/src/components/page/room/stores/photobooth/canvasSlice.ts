import { StateCreator } from 'zustand'
import { CANVAS_CONFIG } from '../../types/photoCanvas'

export interface CanvasSlice {
  canvasSize: {
    width: number
    height: number
  }
  frameVisible: boolean
  backgroundColor: string
  setCanvasSize: (size: { width: number; height: number }) => void
  setFrameVisible: (visible: boolean) => void
  setBackgroundColor: (color: string) => void
  resetCanvasSize: () => void
}

export const createCanvasSlice: StateCreator<
  CanvasSlice,
  [],
  [],
  CanvasSlice
> = set => ({
  canvasSize: {
    width: CANVAS_CONFIG.width,
    height: CANVAS_CONFIG.height,
  },
  frameVisible: true,
  backgroundColor: CANVAS_CONFIG.backgroundColor,
  setCanvasSize: size =>
    set(() => ({
      canvasSize: size,
    })),
  setFrameVisible: visible =>
    set(() => ({
      frameVisible: visible,
    })),
  setBackgroundColor: color =>
    set(() => ({
      backgroundColor: color,
    })),
  resetCanvasSize: () =>
    set(() => ({
      canvasSize: {
        width: CANVAS_CONFIG.width,
        height: CANVAS_CONFIG.height,
      },
    })),
})
