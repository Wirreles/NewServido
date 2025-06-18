import mercadopago from "mercadopago"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore"
import type { PaymentItem, PaymentWebhookData } from "@/types/payment"

export class MercadoPagoService {
  private static instance: MercadoPagoService
  
  private constructor() {}

  static getInstance(): MercadoPagoService {
    if (!this.instance) {
      this.instance = new MercadoPagoService()
    }
    return this.instance
  }

  async getSellerToken(sellerId: string): Promise<string> {
    const sellerDoc = await getDoc(doc(db, "users", sellerId))
    if (!sellerDoc.exists()) {
      throw new Error("Vendedor no encontrado")
    }

    const sellerData = sellerDoc.data()
    const accessToken = sellerData?.mercadopago?.access_token

    if (!accessToken) {
      throw new Error("El vendedor no tiene una cuenta de MercadoPago conectada")
    }

    return accessToken
  }

  async createPreference(items: PaymentItem[], sellerId: string, buyerId: string) {
    const accessToken = await this.getSellerToken(sellerId)

    mercadopago.configure({
      access_token: accessToken
    })

    const preference = {
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        currency_id: "ARS", // Cambiar según el país
        description: item.description,
        picture_url: item.image
      })),
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
      metadata: {
        seller_id: sellerId,
        buyer_id: buyerId
      }
    }

    const response = await mercadopago.preferences.create(preference)
    return response.body
  }

  async processPaymentWebhook(data: PaymentWebhookData) {
    const { seller_id, payment_id } = data

    // Obtener token del vendedor
    const accessToken = await this.getSellerToken(seller_id)

    // Configurar MP con el token del vendedor
    mercadopago.configure({
      access_token: accessToken
    })

    // Obtener detalles del pago
    const payment = await mercadopago.payment.findById(payment_id)
    
    // Guardar la transacción
    await addDoc(collection(db, "transactions"), {
      ...data,
      payment_details: payment.body,
      processed_at: new Date().toISOString()
    })

    // Si el pago fue aprobado, actualizar el stock
    if (data.status === "approved") {
      await this.updateProductStock(payment.body.additional_info.items)
    }

    return payment.body
  }

  private async updateProductStock(items: any[]) {
    for (const item of items) {
      const productRef = doc(db, "products", item.id)
      const productDoc = await getDoc(productRef)
      
      if (productDoc.exists()) {
        const currentStock = productDoc.data().stock
        await updateDoc(productRef, {
          stock: currentStock - item.quantity,
          sold: (productDoc.data().sold || 0) + item.quantity
        })
      }
    }
  }
} 