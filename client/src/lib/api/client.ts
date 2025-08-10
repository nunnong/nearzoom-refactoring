import axios from 'axios'
import { API_BASE_URL } from '@/constants/api'
import type { ApiError } from '@/types/auth'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
})

export default api