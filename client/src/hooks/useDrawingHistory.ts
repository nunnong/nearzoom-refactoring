import { useState, useCallback } from 'react'

interface LineData {
  points: number[]
  stroke: string
  strokeWidth: number
}

interface StickerData {
  id: string
  x: number
  y: number
  src: string
  width: number
  height: number
  rotation?: number
}

interface HistoryState {
  lines: LineData[]
  stickers: StickerData[]
}

export const useDrawingHistory = () => {
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyStep, setHistoryStep] = useState(-1)

  const saveToHistory = useCallback((lines: LineData[], stickers: StickerData[]) => {
    const currentState = { lines: [...lines], stickers: [...stickers] }
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(currentState)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }, [history, historyStep])

  const initializeHistory = useCallback(() => {
    const initialState = { lines: [], stickers: [] }
    setHistory([initialState])
    setHistoryStep(0)
  }, [])

  const undo = useCallback(() => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1)
      return history[historyStep - 1]
    }
    return null
  }, [history, historyStep])

  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1)
      return history[historyStep + 1]
    }
    return null
  }, [history, historyStep])

  return {
    history,
    historyStep,
    saveToHistory,
    initializeHistory,
    undo,
    redo,
  }
}