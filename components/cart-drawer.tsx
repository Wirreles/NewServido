"use client"

import type React from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Minus, Trash2, X, Loader2, ShoppingBag } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { ApiService } from "@/lib/services/api"
import type { PaymentItem } from "@/types/payment"

interface GroupedItems {
  [sellerId: string]: PaymentItem[]
}

export function CartDrawer() {
  const { items, removeFromCart, clearCart } = useCart()
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const groupedItems = items.reduce<GroupedItems>((acc, item) => {
    if (!acc[item.sellerId]) {
      acc[item.sellerId] = []
    }
    acc[item.sellerId].push({
      id: item.id,
      title: item.title,
      description: item.description || "",
      unit_price: item.unit_price,
      quantity: item.quantity,
      currency_id: item.currency_id,
      image: item.imageUrl
    })
    return acc
  }, {})

  const handleCheckout = async (sellerItems: PaymentItem[], sellerId: string) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar la compra",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      const response = await ApiService.createPayment({
        productId: sellerItems[0].id,
        quantity: sellerItems[0].quantity,
        vendedorId: sellerId
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error("No se recibió el punto de inicio del pago")
      }

      window.location.href = response.data.init_point
    } catch (error) {
      console.error("Error al procesar el pago:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el pago",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingBag className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center">
              {items.length}
            </span>
            )}
          </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Carrito de Compras</SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          {Object.entries(groupedItems).map(([sellerId, sellerItems]) => (
            <div key={sellerId} className="mb-8 border-b pb-4">
              <h3 className="font-semibold mb-4">Vendedor ID: {sellerId}</h3>
              {sellerItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center mb-4">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">
                      ${item.unit_price} x {item.quantity}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
              <Button
                className="w-full mt-4"
                onClick={() => handleCheckout(sellerItems, sellerId)}
                disabled={loading}
              >
                Pagar ${sellerItems.reduce((total, item) => total + item.unit_price * item.quantity, 0).toFixed(2)}
              </Button>
            </div>
          ))}
          {items.length === 0 ? (
            <p className="text-center text-gray-500">No hay productos en el carrito</p>
          ) : (
                        <Button
                          variant="outline"
              className="w-full mt-4"
              onClick={clearCart}
            >
              Vaciar Carrito
                </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
