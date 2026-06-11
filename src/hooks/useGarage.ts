import { useCallback, useEffect, useState } from 'react'
import { addGarageVehicle, deleteGarageVehicle, getGarage, updateGarageVehicle } from '../api'
import type { Vehicle } from '../types'

export function useGarage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGarage()
      .then((res) => setVehicles(res.data))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false))
  }, [])

  // Re-fetch the whole garage. Used after any service mutation since the server
  // computes remaining_km / status from the (possibly changed) mileage.
  const refresh = useCallback(async () => {
    const res = await getGarage()
    setVehicles(res.data)
    return res.data
  }, [])

  const addVehicle = useCallback(
    async (data: Omit<Vehicle, 'id' | 'created_at' | 'user_id' | 'service_items'>) => {
      const res = await addGarageVehicle(data)
      setVehicles((prev) => [...prev, res.data])
      return res.data
    },
    [],
  )

  const updateMileage = useCallback(
    async (id: string, mileage: number) => {
      // Optimistic: show the new odometer immediately; refresh pulls the
      // recomputed remaining_km / status for each tracked item.
      setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, mileage } : v)))
      try {
        await updateGarageVehicle(id, { mileage })
      } finally {
        await refresh()
      }
    },
    [refresh],
  )

  const deleteVehicle = useCallback(async (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id))
    try {
      await deleteGarageVehicle(id)
    } catch {
      const res = await getGarage()
      setVehicles(res.data)
    }
  }, [])

  return { vehicles, loading, addVehicle, updateMileage, deleteVehicle, refresh }
}
