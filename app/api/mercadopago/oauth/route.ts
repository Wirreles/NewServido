import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"

// Endpoint para iniciar el flujo OAuth
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.MERCADOPAGO_CLIENT_ID
    if (!clientId) {
      throw new Error("MERCADOPAGO_CLIENT_ID no está configurado")
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/oauth/callback`
    
    // Construimos los parámetros de manera segura
    const params = {
      client_id: clientId,
      response_type: "code",
      platform_id: "mp",
      state: "RANDOM_STATE",
      redirect_uri: redirectUri,
      scope: "offline_access read write"
    }

    // Construimos la URL base correcta (sin .ar)
    const baseUrl = "https://auth.mercadopago.com"
    const queryString = new URLSearchParams(params).toString()
    const authUrl = `${baseUrl}/authorization?${queryString}`

    console.log("URL de autorización generada:", authUrl) // Para debugging
    
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("Error generando URL de autorización:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar URL de autorización" },
      { status: 500 }
    )
  }
}

// Endpoint para manejar el callback de OAuth
export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json()

    if (!code || !userId) {
      throw new Error("Código de autorización o ID de usuario faltante")
    }

    // Intercambiar el código por el access token usando la URL base correcta
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.MERCADOPAGO_CLIENT_ID,
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/oauth/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error("Error de MercadoPago:", errorData)
      throw new Error(`Error obteniendo token: ${errorData.message || 'Error desconocido'}`)
    }

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error("No se pudo obtener el access token")
    }

    // Obtener información de la cuenta del vendedor
    const userResponse = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Accept": "application/json",
      },
    })

    if (!userResponse.ok) {
      throw new Error("Error obteniendo información del usuario")
    }

    const userData = await userResponse.json()

    // Guardar tokens y datos del vendedor en Firebase
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      throw new Error("Usuario no encontrado")
    }

    await updateDoc(userRef, {
      mercadopago: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        user_id: userData.id,
        nickname: userData.nickname,
        email: userData.email,
        site_id: userData.site_id,
        country: userData.site_id,
        connected_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({ 
      success: true,
      message: "Cuenta conectada exitosamente" 
    })
  } catch (error) {
    console.error("Error en OAuth callback:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al conectar la cuenta" },
      { status: 500 }
    )
  }
} 