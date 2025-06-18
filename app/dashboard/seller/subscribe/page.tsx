"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2 } from "lucide-react"

export default function SellerSubscribePage() {
  const { currentUser, authLoading, refreshUserProfile } = useAuth() // Get refreshUserProfile
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== "seller")) {
      router.push("/login") // Redirect if not logged in or not a seller
      return
    }
    if (!authLoading && currentUser?.isSubscribed) {
      router.push("/dashboard/seller") // Redirect if already subscribed
    }
  }, [currentUser, authLoading, router])

  const handleSubscribe = async () => {
    if (!currentUser || !currentUser.uid) {
      setError("Usuario no autenticado.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const userRef = doc(db, "users", currentUser.uid)
      await updateDoc(userRef, {
        isSubscribed: true,
        productUploadLimit: 20, // Set initial limit for 20 products
      })

      // Refresh user profile in context immediately after successful update
      await refreshUserProfile()

      setSuccess(true)
      // The useEffect will now handle the redirection because currentUser.isSubscribed will be true
    } catch (err) {
      console.error("Error simulating subscription:", err)
      setError("Error al procesar la suscripción. Por favor, inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || (!currentUser && !authLoading) || currentUser?.isSubscribed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-orange-600">¡Conviértete en Vendedor Premium!</CardTitle>
          <CardDescription className="text-lg text-gray-700">
            Desbloquea todo el potencial de tu negocio en Servido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-5xl font-extrabold text-gray-900">
            $10,000<span className="text-xl font-medium text-gray-500">/mes</span>
          </div>
          <ul className="list-disc list-inside text-left text-gray-700 space-y-2">
            <li>
              <CheckCircle2 className="inline-block h-5 w-5 text-green-500 mr-2" />
              Sube hasta <span className="font-semibold">20 productos</span> por mes.
            </li>
            <li>
              <CheckCircle2 className="inline-block h-5 w-5 text-green-500 mr-2" />
              Acceso completo al panel de vendedor.
            </li>
            <li>
              <CheckCircle2 className="inline-block h-5 w-5 text-green-500 mr-2" />
              Soporte prioritario.
            </li>
            <li>
              <CheckCircle2 className="inline-block h-5 w-5 text-green-500 mr-2" />
              Estadísticas avanzadas (próximamente).
            </li>
          </ul>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success ? (
            <div className="text-green-600 font-semibold text-lg flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 mr-2" />
              Suscripción exitosa! Redirigiendo...
            </div>
          ) : (
            <Button
              onClick={handleSubscribe}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Simular Suscripción Ahora"
              )}
            </Button>
          )}
          <p className="text-sm text-gray-500 mt-4">
            *Esta es una simulación. El método de pago real se implementará más adelante.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
