"use client"

import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { BellRing, Package, Percent } from "lucide-react"

export default function NotificationsPage() {
  const notifications = [
    {
      id: "1",
      type: "offer",
      icon: Percent,
      title: "¡Nueva Oferta Flash!",
      description: "Hasta 50% de descuento en productos seleccionados de tecnología. ¡No te lo pierdas!",
      time: "Hace 5 minutos",
      link: "/category/tecnologia",
    },
    {
      id: "2",
      type: "product",
      icon: Package,
      title: "Tu pedido #12345 ha sido enviado",
      description: "Tu paquete con 'Auriculares Bluetooth' ya está en camino. ¡Pronto lo recibirás!",
      time: "Hace 1 hora",
      link: "/dashboard/buyer?tab=orders",
    },
    {
      id: "3",
      type: "offer",
      icon: Percent,
      title: "Descuentos exclusivos en Moda",
      description: "Renueva tu guardarropa con hasta 30% de descuento en ropa y accesorios.",
      time: "Hace 3 horas",
      link: "/category/moda",
    },
    {
      id: "4",
      type: "product",
      icon: BellRing,
      title: "¡Producto en stock!",
      description: "El 'Smartphone X' que te interesaba ya está disponible nuevamente.",
      time: "Ayer",
      link: "/product/some-smartphone-id", // Replace with actual product ID
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Notificaciones</h1>

      {notifications.length === 0 ? (
        <p className="text-center text-gray-500">No tienes notificaciones nuevas.</p>
      ) : (
        <div className="grid gap-4 max-w-2xl mx-auto">
          {notifications.map((notification) => (
            <Card key={notification.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-shrink-0">
                  <notification.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-lg">{notification.title}</h3>
                  <p className="text-sm text-gray-700 mb-1">{notification.description}</p>
                  <p className="text-xs text-gray-500">{notification.time}</p>
                  {notification.link && (
                    <Link href={notification.link} className="text-blue-600 hover:underline text-sm mt-2 block">
                      Ver más
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
