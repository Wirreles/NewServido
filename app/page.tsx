"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, limit, query, orderBy, where, documentId } from "firebase/firestore" // Import documentId
import { useAuth } from "@/contexts/auth-context"
import { Facebook, Instagram } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  imageQuery?: string
  imageUrl?: string
  category?: string
  description?: string
}

interface CategoryItem {
  id: string
  name: string
  iconQuery?: string
  imageUrl?: string
}

interface BrandItem {
  id: string
  name: string
  logoQuery?: string
  imageUrl?: string
}

export default function HomePage() {
  const { currentUser, authLoading, getVenderLink, getDashboardLink } = useAuth()

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (authLoading) return

    const fetchData = async () => {
      setLoadingData(true)
      try {
        const categoriesQuery = query(collection(db, "categories"), orderBy("name"), limit(12))
        const categorySnapshot = await getDocs(categoriesQuery)
        setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CategoryItem))

        // Fetch a larger set of latest products and then slice them
        const latestProductsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(20))
        const latestProductSnapshot = await getDocs(latestProductsQuery)
        const allLatestProducts = latestProductSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product)

        setFeaturedProducts(allLatestProducts.slice(0, 10)) // First 10 for featured
        setNewProducts(allLatestProducts.slice(10, 20)) // Next 10 for new products

        const brandsQuery = query(collection(db, "brands"), orderBy("name"), limit(8))
        const brandSnapshot = await getDocs(brandsQuery)
        setBrands(brandSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BrandItem))

        // Fetch recently viewed products
        const storedRecentlyViewedIds = JSON.parse(localStorage.getItem("servido-recently-viewed") || "[]")
        if (storedRecentlyViewedIds.length > 0) {
          // Firestore 'in' query has a limit of 10, so we might need multiple queries if more than 10 IDs
          // For simplicity, we'll query for up to 10.
          const recentlyViewedQuery = query(
            collection(db, "products"),
            where(documentId(), "in", storedRecentlyViewedIds.slice(0, 10)),
          )
          const recentlyViewedSnapshot = await getDocs(recentlyViewedQuery)
          const fetchedRecentlyViewed = recentlyViewedSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Product,
          )

          // Sort fetched products to match the order in localStorage
          const orderedRecentlyViewed = storedRecentlyViewedIds
            .map((id: string) => fetchedRecentlyViewed.find((p) => p.id === id))
            .filter(Boolean) as Product[] // Filter out any null/undefined if product not found

          setRecentlyViewedProducts(orderedRecentlyViewed)
        }
      } catch (error) {
        console.error("Error fetching homepage data:", error)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [authLoading])

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-900">
      {/* Main Banner (Single Image) */}
      <section className="w-full pt-4 pb-8">
        <div className="w-full max-w-screen-xl mx-auto aspect-[16/5] md:aspect-[16/4] relative">
          <Image
            src="/images/banner-1.png"
            alt="Servido - Para cada momento un producto ideal."
            layout="fill"
            objectFit="cover"
            className="rounded-md"
            priority
          />
        </div>
      </section>

      {/* Sliding Categories - Circular Style */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-semibold mb-6">Categorías Populares</h2>
          {loadingData && categories.length === 0 ? (
            <p>Cargando categorías...</p>
          ) : categories.length === 0 ? (
            <p>No hay categorías disponibles.</p>
          ) : (
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {categories.map((category) => (
                  <CarouselItem
                    key={category.id}
                    className="pl-2 md:pl-4 basis-1/4 sm:basis-1/5 md:basis-1/6 lg:basis-1/8"
                  >
                    <Link href={`/category/${category.id}`} className="block text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-purple-200 hover:border-purple-500 transition-all">
                          <Image
                            src={
                              category.imageUrl ||
                              `/placeholder.svg?height=80&width=80&query=${category.iconQuery || category.name + " icon"}`
                            }
                            alt={category.name}
                            width={80}
                            height={80}
                            className="object-contain p-2"
                          />
                        </div>
                        <span className="text-xs font-medium mt-2">{category.name}</span>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
        </div>
      </section>

      {/* Second Banner Image */}
      <section className="w-full py-8">
        <div className="w-full max-w-screen-xl mx-auto aspect-[16/5] md:aspect-[16/4] relative">
          <Image
            src="/images/banner-2.png"
            alt="Servido - Todo lo que necesitas para tu auto lo encontras acá."
            layout="fill"
            objectFit="cover"
            className="rounded-md"
          />
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-semibold mb-6">Productos Destacados</h2>
          {loadingData && featuredProducts.length === 0 ? (
            <p>Cargando productos destacados...</p>
          ) : featuredProducts.length === 0 ? (
            <p>No hay productos destacados en este momento.</p>
          ) : (
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {featuredProducts.map((product) => (
                  <CarouselItem key={product.id} className="pl-4 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Link href={`/product/${product.id}`} className="block">
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                        <div className="aspect-square relative w-full">
                          <Image
                            src={
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">${product.price.toFixed(2)}</p>
                          <span className="text-xs text-green-600">Envío gratis</span>
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
        </div>
      </section>

      {/* New Products */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-semibold mb-6">Productos Nuevos</h2>
          {loadingData && newProducts.length === 0 ? (
            <p>Cargando productos nuevos...</p>
          ) : newProducts.length === 0 ? (
            <p>No hay productos nuevos en este momento.</p>
          ) : (
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {newProducts.map((product) => (
                  <CarouselItem key={product.id} className="pl-4 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Link href={`/product/${product.id}`} className="block">
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                        <div className="aspect-square relative w-full">
                          <Image
                            src={
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">${product.price.toFixed(2)}</p>
                          <span className="text-xs text-green-600">Envío gratis</span>
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
        </div>
      </section>

      {/* Recently Viewed Products */}
      {recentlyViewedProducts.length > 0 && (
        <section className="py-8 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl font-semibold mb-6">Productos Vistos Recientemente</h2>
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {recentlyViewedProducts.map((product) => (
                  <CarouselItem key={product.id} className="pl-4 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Link href={`/product/${product.id}`} className="block">
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                        <div className="aspect-square relative w-full">
                          <Image
                            src={
                              product.imageUrl ||
                              `/placeholder.svg?height=200&width=200&query=${product.imageQuery || product.name}`
                            }
                            alt={product.name}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <CardContent className="p-3 flex flex-col flex-grow">
                          <h3 className="text-sm font-medium mb-1 truncate h-10 leading-tight">{product.name}</h3>
                          <p className="text-lg font-semibold text-blue-600 mb-2">${product.price.toFixed(2)}</p>
                          <span className="text-xs text-green-600">Envío gratis</span>
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </section>
      )}

      {/* Registration Banner */}
      {!currentUser && (
        <section className="py-12 bg-purple-600 text-white">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">¿Nuevo en Servido?</h2>
            <p className="text-lg mb-6">
              Regístrate para acceder a ofertas exclusivas, guardar tus favoritos y mucho más.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button asChild size="lg" className="bg-white text-purple-700 hover:bg-gray-100 w-full sm:w-auto">
                <Link href="/signup?role=buyer">Crear cuenta de Comprador</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white text-purple-700 hover:bg-white hover:text-purple-700 w-full sm:w-auto"
              >
                <Link href={getVenderLink()}>Crear cuenta de Vendedor</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Rotating Brands (now horizontal scroll) */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-semibold mb-8 text-center">Nuestras Marcas</h2>
          {loadingData && brands.length === 0 ? (
            <p>Cargando marcas...</p>
          ) : brands.length === 0 ? (
            <p>No hay marcas para mostrar.</p>
          ) : (
            <div className="relative w-full overflow-hidden py-4">
              <div
                className="flex items-center w-max animate-infinite-scroll"
                style={{ "--scroll-speed": "30s" } as React.CSSProperties}
              >
                {/* Duplicate brands to create a seamless loop */}
                {brands.concat(brands).map((brand, index) => (
                  <div key={`${brand.id}-${index}`} className="flex-shrink-0 px-4" style={{ width: "150px" }}>
                    <Image
                      src={
                        brand.imageUrl ||
                        `/placeholder.svg?height=60&width=100&query=${brand.logoQuery || brand.name + " logo"}&color=gray`
                      }
                      alt={brand.name}
                      width={100}
                      height={60}
                      objectFit="contain"
                      className="mx-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white pt-12 pb-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Servido Info */}
            <div>
              <div className="mb-3">
                <Image src="/images/logo.png" alt="Servido Logo" width={120} height={40} />
              </div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-blue-400">
                    Acerca de Nosotros
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-400">
                    Trabaja con Nosotros
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-400">
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-400">
                    Políticas de Privacidad
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Contacto</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  Email:{" "}
                  <a href="mailto:infoservido.com.ar" className="hover:text-blue-400">
                    infoservido.com.ar
                  </a>
                </li>
                <li>
                  Contacto:{" "}
                  <a href="mailto:contactoservido.com.ar" className="hover:text-blue-400">
                    contactoservido.com.ar
                  </a>
                </li>
              </ul>
              <h3 className="text-lg font-semibold mb-3 mt-6">Síguenos</h3>
              <div className="flex gap-4">
                <Link
                  href="https://facebook.com/servido"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400"
                >
                  <Facebook className="h-6 w-6" />
                  <span className="sr-only">Facebook</span>
                </Link>
                <Link
                  href="https://instagram.com/servido"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400"
                >
                  <Instagram className="h-6 w-6" />
                  <span className="sr-only">Instagram</span>
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Enlaces Rápidos</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/dashboard/buyer" className="hover:text-blue-400">
                    Mis Compras
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-400">
                    Ofertas
                  </Link>
                </li>
                <li>
                  <Link href={getVenderLink()} className="hover:text-blue-400">
                    Vender
                  </Link>
                </li>
                <li>
                  <Link href={getDashboardLink()} className="hover:text-blue-400">
                    Mi Cuenta
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-400">
                    Historial
                  </Link>
                </li>
              </ul>
            </div>

            {/* Motivational Quote */}
            <div className="col-span-full lg:col-span-1 flex flex-col justify-end">
              <p className="text-sm italic text-gray-400 mb-2">
                "La clave para un día productivo es empezar con una mentalidad positiva"
              </p>
              <p className="text-sm font-semibold text-gray-300">Jonathan CEO</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Servido. Todos los derechos reservados.</p>
            <p>Creado por Atenea Software.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
