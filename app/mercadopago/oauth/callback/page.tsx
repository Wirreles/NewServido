"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { auth } from "@/lib/firebase"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function MercadoPagoOAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state") // El userId enviado como state
    if (!code || !state) {
      setError("No se encontró el código de autorización en la URL.")
      setLoading(false)
      return
    }
    const connectAccount = async () => {
      setLoading(true)
      try {
        // Obtener el token de Firebase
        const tokenFirebase = await auth.currentUser?.getIdToken()
        if (!tokenFirebase) throw new Error("No se pudo obtener el token de autenticación.")
        // Hacer el POST al backend
        const response = await fetch('/api/mercadopago/oauth-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenFirebase}`
          },
          body: JSON.stringify({
            code,
            userId: state // o currentUser.uid si prefieres
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Error al conectar la cuenta de MercadoPago")
        toast({
          title: "Cuenta conectada",
          description: "Tu cuenta de Mercado Pago fue conectada exitosamente.",
        })
        router.push("/dashboard/seller")
      } catch (err: any) {
        setError(err.message)
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      }
      setLoading(false)
    }
    connectAccount()
    // eslint-disable-next-line
  }, [searchParams, currentUser])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {loading ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Conectando tu cuenta de Mercado Pago...</p>
        </>
      ) : error ? (
        <>
          <p className="text-red-600 font-semibold mb-2">Error: {error}</p>
          <button className="underline" onClick={() => router.push("/dashboard/seller")}>Volver al panel</button>
        </>
      ) : null}
    </div>
  )
}