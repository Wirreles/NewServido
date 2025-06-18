"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function MercadoPagoCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get("code")
        const userId = sessionStorage.getItem("mp_connecting_user_id")

        if (!code || !userId) {
          throw new Error("Datos de autorización incompletos")
        }

        // Enviar el código al backend para obtener y guardar el token
        const response = await fetch("/api/mercadopago/oauth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, userId }),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Error al conectar la cuenta")
        }

        // Limpiar el userId del storage
        sessionStorage.removeItem("mp_connecting_user_id")

        toast({
          title: "¡Cuenta conectada!",
          description: "Tu cuenta de MercadoPago ha sido conectada exitosamente",
        })

        // Redirigir al dashboard
        router.push("/dashboard/seller")
      } catch (error) {
        console.error("Error en callback:", error)
        toast({
          title: "Error",
          description: "No se pudo completar la conexión con MercadoPago",
          variant: "destructive",
        })
        router.push("/dashboard/seller")
      } finally {
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [router, searchParams, toast])

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold text-center mb-4">
          {isProcessing ? "Conectando tu cuenta..." : "Procesando..."}
        </h1>
        <p className="text-center text-muted-foreground">
          Por favor, espera mientras procesamos la conexión con MercadoPago
        </p>
      </Card>
    </div>
  )
} 