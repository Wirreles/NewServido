import { MercadoPagoConfig, Payment, Preference } from "mercadopago"
import { encrypt } from "@/lib/utils"
import { debugLog } from "@/lib/utils"
import {
  PaymentItem,
  PaymentWebhookData,
  ExtendedPaymentResponse,
  Subscription,
  SubscriptionPaymentInfo
} from "@/types/payment"
import { Subscription as SubscriptionModel } from "@/lib/models/subscription"
import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from "@/lib/config"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export class MercadoPagoService {
  private static instance: MercadoPagoService
  private client: MercadoPagoConfig
  private accessToken: string

  private constructor() {
    this.accessToken = process.env.MP_ACCESS_TOKEN || ""
    this.client = new MercadoPagoConfig({ accessToken: this.accessToken })
  }

  static getInstance(): MercadoPagoService {
    if (!this.instance) {
      this.instance = new MercadoPagoService()
    }
    return this.instance
  }

  private async getSellerAccessToken(sellerId: string): Promise<string> {
    const sellerRef = doc(db, "users", sellerId)
    const sellerDoc = await getDoc(sellerRef)
    const sellerData = sellerDoc.data()

    const encryptedToken = sellerData?.mercadopago?.access_token
    if (!encryptedToken) {
      throw new Error("El vendedor no tiene una cuenta de MercadoPago conectada")
    }

    return encrypt(encryptedToken)
  }

  async createSubscriptionPreference(userId: string, planType: SubscriptionPlanType): Promise<any> {
    try {
      const plan = SUBSCRIPTION_PLANS[planType]
      debugLog('Subscription Create - Creating preference', { plan })

      const items = [{
        id: plan.id,
        title: plan.title,
        description: plan.description,
        unit_price: plan.price,
        quantity: 1,
        currency_id: "ARS"
      }]

      debugLog('MercadoPago Service - Creating Subscription', {
        userId,
        planType,
        items
      })

      // Para suscripciones usamos el token de la app
      this.client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN_SUS || "" })

      const preference = new Preference(this.client)
      const preferenceData = {
        items,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/seller`,
          failure: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/seller/subscribe`,
          pending: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/seller/subscribe`
        },
        notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
        external_reference: `subscription_${userId}_${items[0].id.replace('subscription-', '')}`,
        metadata: {
          user_id: userId,
          type: "subscription"
        }
      }

      debugLog("MercadoPago Service - Preference Object", preferenceData)

      const response = await preference.create({ body: preferenceData })
      debugLog("MercadoPago Service - Preference Created", response)

      return response
    } catch (error) {
      debugLog("MercadoPago Service - Error Creating Preference", error)
      throw error
    }
  }

  async createPreference(items: PaymentItem[], sellerId: string, buyerId: string) {
    try {
      const accessToken = await this.getSellerAccessToken(sellerId)
      this.client = new MercadoPagoConfig({ accessToken })

      const preference = new Preference(this.client)
      const preferenceData = {
        items: items.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          unit_price: item.price,
          quantity: item.quantity,
          currency_id: "ARS"
        })),
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
          failure: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure`,
          pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`
        },
        notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
        external_reference: `payment_${buyerId}_${sellerId}`,
        metadata: {
          buyer_id: buyerId,
          seller_id: sellerId
        }
      }

      const response = await preference.create({ body: preferenceData })
      return response
    } catch (error) {
      console.error("Error creating preference:", error)
      throw error
    }
  }

  async getPaymentDetails(paymentId: string): Promise<ExtendedPaymentResponse> {
    const payment = new Payment(this.client)
    const response = await payment.get({ id: paymentId })
    return response as unknown as ExtendedPaymentResponse
  }

  async processPaymentWebhook(data: PaymentWebhookData) {
    const payment = await this.getPaymentDetails(data.payment_id)

    // Crear registro de pago
    const paymentRecord = {
      id: data.payment_id,
      status: data.status,
      payment_details: payment,
      created_at: new Date().toISOString()
    }

    // Si el pago fue aprobado, actualizar el stock
    if (data.status === "approved" && payment.additional_info?.items) {
      await this.updateProductStock(payment.additional_info.items)
    }

    return payment
  }

  private async updateProductStock(items: PaymentItem[]) {
    // Implementar la lógica de actualización de stock
  }

  async refreshAccessToken(sellerId: string) {
    try {
      const sellerRef = doc(db, "users", sellerId)
      const sellerDoc = await getDoc(sellerRef)
      const sellerData = sellerDoc.data()

      const encryptedRefreshToken = sellerData?.mercadopago?.refresh_token
      if (!encryptedRefreshToken) {
        throw new Error("No se encontró el refresh token")
      }

      const refreshToken = encrypt(encryptedRefreshToken)

      const response = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MP_CLIENT_SECRET}`
        },
        body: JSON.stringify({
          client_secret: process.env.MP_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken
        })
      })

      if (!response.ok) {
        throw new Error("Error al refrescar el token")
      }

      const { access_token, refresh_token } = await response.json()

      // Actualizar tokens en Firestore
      await sellerRef.update({
        "mercadopago.access_token": encrypt(access_token),
        "mercadopago.refresh_token": encrypt(refresh_token),
        "mercadopago.updated_at": new Date().toISOString()
      })

      return access_token
    } catch (error) {
      console.error("Error refreshing access token:", error)
      throw error
    }
  }

  static async handleSubscriptionPayment(externalReference: string, status: string, paymentInfo: SubscriptionPaymentInfo) {
    try {
      const [, userId, planType] = externalReference.split('_')
      const plan = SUBSCRIPTION_PLANS[planType as SubscriptionPlanType]

      const subscriptionData: Subscription = {
        userId,
        planType,
        paymentId: paymentInfo.id,
        status,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        price: plan.price
      }

      // Crear la suscripción en la base de datos
      await SubscriptionModel.create(subscriptionData);

      // Actualizar el rol del usuario a seller
      const userRef = doc(db, "users", userId)
      await userRef.update({
        role: "seller",
        subscription: {
          active: true,
          startDate: subscriptionData.startDate,
          endDate: subscriptionData.endDate,
          lastPaymentDate: new Date(),
          paymentId: paymentInfo.id
        }
      })

      // Registrar el pago
      const paymentRef = doc(db, "payments", paymentInfo.id)
      await paymentRef.set({
        userId,
        type: 'subscription',
        planType,
        amount: paymentInfo.transaction_amount,
        status: paymentInfo.status,
        paymentId: paymentInfo.id,
        createdAt: new Date()
      })

    } catch (error) {
      console.error("Error handling subscription payment:", error)
      throw error
    }
  }
} 