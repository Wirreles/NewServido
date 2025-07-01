// URLs
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3005"

// Debug function
export function debugLog(context: string, data: any) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEBUG ${context}]:`, data)
  }
}

export const SUBSCRIPTION_PLANS = {
  basic: {
    id: "subscription-basic",
    title: "Plan Básico",
    description: "Ideal para vendedores que están comenzando",
    price: 10.00,
    features: [
      "Hasta 10 productos",
      "Soporte básico",
      "Estadísticas básicas"
    ]
  },
  premium: {
    id: "subscription-premium",
    title: "Plan Premium",
    description: "Para vendedores que buscan crecer",
    price: 20.00,
    features: [
      "Productos ilimitados",
      "Soporte prioritario",
      "Estadísticas avanzadas",
      "Herramientas de marketing"
    ]
  }
} as const

export type SubscriptionPlanType = keyof typeof SUBSCRIPTION_PLANS 