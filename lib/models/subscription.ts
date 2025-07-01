import { db } from "@/lib/firebase"
import { collection, addDoc, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore"
import type { Subscription as SubscriptionType } from "@/types/payment"
import { SubscriptionPlanType } from "@/lib/config"

interface SubscriptionDocument extends Omit<SubscriptionType, "startDate" | "endDate"> {
  startDate: Timestamp
  endDate: Timestamp
}

export class Subscription {
  static async create(data: SubscriptionType) {
    try {
      const subscriptionRef = await addDoc(collection(db, "subscriptions"), {
        ...data,
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
        createdAt: Timestamp.now()
      })

      return subscriptionRef.id
    } catch (error) {
      console.error("Error creating subscription:", error)
      throw error
    }
  }

  static async getActiveSubscription(userId: string): Promise<SubscriptionType | null> {
    try {
      const q = query(
        collection(db, "subscriptions"),
        where("userId", "==", userId),
        where("status", "==", "active"),
        where("endDate", ">=", Timestamp.now())
      )

      const querySnapshot = await getDocs(q)
      const doc = querySnapshot.docs[0]

      if (!doc) {
        return null
      }

      const data = doc.data() as SubscriptionDocument

      return {
        ...data,
        id: doc.id,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
        planType: data.planType as SubscriptionPlanType
      }
    } catch (error) {
      console.error("Error getting active subscription:", error)
      throw error
    }
  }

  static async cancelSubscription(subscriptionId: string) {
    try {
      const subscriptionRef = doc(db, "subscriptions", subscriptionId)
      await updateDoc(subscriptionRef, {
        status: "cancelled",
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      throw error
    }
  }
} 