import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { MercadoPagoService } from "@/lib/services/mercadopago"
import type { PaymentNotification } from "@/types/payment"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as PaymentNotification

    // Solo procesar notificaciones de pagos
    if (data.type !== "payment") {
      return NextResponse.json({ message: "Notificación recibida" })
    }

    const mpService = MercadoPagoService.getInstance()
    const payment = await mpService.processPaymentWebhook({
      payment_id: data.data.id,
      status: "approved", // Se obtiene del pago real
      external_reference: "", // Se obtiene del pago real
      preference_id: "", // Se obtiene del pago real
      merchant_order_id: "", // Se obtiene del pago real
      seller_id: "", // Se obtiene de los metadatos del pago
      buyer_id: "" // Se obtiene de los metadatos del pago
    })

    return NextResponse.json({ message: "Pago procesado", payment })
  } catch (error) {
    console.error("Error procesando webhook:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error procesando el pago" },
      { status: 500 }
    )
  }
} 