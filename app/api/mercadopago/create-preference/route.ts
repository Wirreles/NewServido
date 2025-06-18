import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { MercadoPagoService } from "@/lib/services/mercadopago"
import type { CreatePaymentRequest } from "@/types/payment"

export async function POST(request: NextRequest) {
  try {
    const { items, buyerId } = await request.json() as CreatePaymentRequest

    if (!items?.length || !buyerId) {
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 }
      )
    }

    // Agrupar items por vendedor
    const itemsByVendor = items.reduce((acc, item) => {
      if (!acc[item.sellerId]) {
        acc[item.sellerId] = []
      }
      acc[item.sellerId].push(item)
      return acc
    }, {} as Record<string, typeof items>)

    const mpService = MercadoPagoService.getInstance()

    // Crear preferencias para cada vendedor
    const preferences = await Promise.all(
      Object.entries(itemsByVendor).map(async ([sellerId, sellerItems]) => {
        const preference = await mpService.createPreference(
          sellerItems,
          sellerId,
          buyerId
        )
        return {
          sellerId,
          preferenceId: preference.id,
          init_point: preference.init_point
        }
      })
    )

    return NextResponse.json(preferences)
  } catch (error) {
    console.error("Error creando preferencia:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear la preferencia de pago" },
      { status: 500 }
    )
  }
} 