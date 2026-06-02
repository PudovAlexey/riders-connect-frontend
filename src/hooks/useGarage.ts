import { useCallback, useEffect, useState } from 'react'
import { addGarageVehicle, deleteGarageVehicle, getGarage } from '../api'
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

  const addVehicle = useCallback(
    async (data: Omit<Vehicle, 'id' | 'created_at' | 'user_id'>) => {
      const res = await addGarageVehicle(data)
      setVehicles((prev) => [...prev, res.data])
      return res.data
    },
    [],
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

  return { vehicles, loading, addVehicle, deleteVehicle }
}
