"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { PaymentItem } from "@/types/payment"

interface PaymentButtonProps {
  items: PaymentItem[]
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function PaymentButton({ items, onSuccess, onError }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar el pago",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items,
          buyerId: user.uid
        })
      })

      if (!response.ok) {
        throw new Error("Error al crear la preferencia de pago")
      }

      const preferences = await response.json()

      // Si hay múltiples vendedores, abrir cada link en una nueva pestaña
      preferences.forEach((pref: { init_point: string }) => {
        window.open(pref.init_point, "_blank")
      })

      onSuccess?.()
    } catch (error) {
      console.error("Error al procesar el pago:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el pago",
        variant: "destructive"
      })
      onError?.(error as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || !items.length}
      className="w-full"
    >
      {loading ? "Procesando..." : "Pagar ahora"}
    </Button>
  )
} 