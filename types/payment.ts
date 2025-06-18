export interface PaymentItem {
  id: string
  title: string
  price: number
  quantity: number
  description?: string
  image?: string
  sellerId: string
}

export interface CreatePaymentRequest {
  items: PaymentItem[]
  buyerId: string
}

export interface PaymentResponse {
  checkoutUrl: string
  orderId: string
}

export interface PaymentNotification {
  type: string
  data: {
    id: string
  }
}

export interface PaymentWebhookData {
  payment_id: string
  status: string
  external_reference: string
  preference_id: string
  merchant_order_id: string
  seller_id: string
  buyer_id: string
} 