"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "./button"
import { useToast } from "./use-toast"

export function ConnectMercadoPagoButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const handleConnect = async () => {
    try {
      setIsLoading(true)

      // Obtener URL de autorización
      const response = await fetch("/api/mercadopago/oauth")
      const data = await response.json()

      if (!data.authUrl) {
        throw new Error("No se pudo obtener la URL de autorización")
      }

      // Guardar el userId en sessionStorage para recuperarlo en el callback
      if (currentUser?.uid) {
        sessionStorage.setItem("mp_connecting_user_id", currentUser.uid)
      } else {
        throw new Error("Usuario no autenticado")
      }

      // Imprimir la URL para debugging
      console.log("Redirigiendo a:", data.authUrl)

      // Redirigir a MercadoPago
      window.location.href = data.authUrl
    } catch (error) {
      console.error("Error al conectar con MercadoPago:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo iniciar la conexión con MercadoPago",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      className="w-full max-w-sm"
    >
      {isLoading ? "Conectando..." : "Conectar cuenta de MercadoPago"}
    </Button>
  )
} 