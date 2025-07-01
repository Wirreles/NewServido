"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { auth } from "@/lib/firebase"

export function ConnectMercadoPagoButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { currentUser } = useAuth()

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      if (!currentUser) {
        throw new Error("Debes iniciar sesión para conectar tu cuenta de MercadoPago.")
      }
      // Obtener el token de Firebase del usuario autenticado
      const tokenFirebase = await auth.currentUser?.getIdToken()
      if (!tokenFirebase) {
        throw new Error("No se pudo obtener el token de autenticación.")
      }
      // Llama al nuevo endpoint
      const response = await fetch('/api/mercadopago/oauth-url', {
        headers: {
          'Authorization': `Bearer ${tokenFirebase}`
        }
      });
      const data = await response.json();
      if (!data.authUrl) throw new Error("No se recibió la URL de autorización");
      window.location.href = data.authUrl;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo iniciar la conexión con MercadoPago",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? "Conectando..." : "Conectar cuenta de MercadoPago"}
    </Button>
  )
}