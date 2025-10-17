import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Custom hook for API calls
export function useApi(endpoint, dependencies = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await api.get(endpoint)
        
        if (!cancelled) {
          setData(response.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'An error occurred')
          console.error('API Error:', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, dependencies)

  return { data, loading, error, refetch: () => setLoading(true) }
}

// Hook for stats
export function useStats() {
  return useApi('/api/stats')
}

// Hook for conversations
export function useConversations(page = 1, limit = 10, filter = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filter
  }).toString()
  
  return useApi(`/api/conversations?${params}`, [page, limit, JSON.stringify(filter)])
}

// Hook for tracking data
export function useTrackingData(filters = {}) {
  const params = new URLSearchParams(filters).toString()
  return useApi(`/api/tracking-data?${params}`, [JSON.stringify(filters)])
}

// Manual API calls
export const apiService = {
  getStats: () => api.get('/api/stats'),
  getConversations: (page = 1, limit = 10, filter = {}) => {
    const params = { page, limit, ...filter }
    return api.get('/api/conversations', { params })
  },
  getTrackingData: (filters = {}) => {
    return api.get('/api/tracking-data', { params: filters })
  }
}

export default api