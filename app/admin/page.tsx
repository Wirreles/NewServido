"use client"

import Link from "next/link"
import Image from "next/image"
import {
  Home,
  Users,
  Tag,
  List,
  Package2,
  ShoppingBag,
  Trash2,
  ImageIcon,
  XCircle,
  ShoppingCart,
  User,
  PlusCircle,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

import { useState, useEffect, type ChangeEvent, useMemo } from "react"
import { db, storage } from "@/lib/firebase"
import {
  collection,
  addDoc, // Keep if adding categories/brands
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: Date
  role?: string
  photoURL?: string
  isSubscribed?: boolean
  productUploadLimit?: number
}

interface Category {
  id: string
  name: string
  description?: string
  imageUrl?: string
  imagePath?: string
}

interface Brand {
  id: string
  name: string
  imageUrl?: string
  imagePath?: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  imageUrl?: string
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
  imagePath?: string
  seller?: UserData
  averageRating?: number // Added for reviews filter
}

export default function AdminDashboard() {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("overview")
  const [users, setUsers] = useState<UserData[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [products, setProducts] = useState<Product[]>([]) // Still used for overview count
  const [allProducts, setAllProducts] = useState<Product[]>([])

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null)
  const [newCategoryImagePreviewUrl, setNewCategoryImagePreviewUrl] = useState<string | null>(null)
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false)

  // Brand Form State
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImageFile, setNewBrandImageFile] = useState<File | null>(null)
  const [newBrandImagePreviewUrl, setNewBrandImagePreviewUrl] = useState<string | null>(null)
  const [uploadingBrandImage, setUploadingBrandImage] = useState(false)

  const [loading, setLoading] = useState(true)
  const [addingCategory, setAddingCategory] = useState(false)
  const [addingBrand, setAddingBrand] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para los filtros de todos los productos
  const [allProductsSearchTerm, setAllProductsSearchTerm] = useState("")
  const [allProductsFilterCategory, setAllProductsFilterCategory] = useState("all")
  const [allProductsFilterSeller, setAllProductsFilterSeller] = useState("all")
  const [allProductsFilterIsService, setAllProductsFilterIsService] = useState("all")
  const [allProductsSortOrder, setAllProductsSortOrder] = useState("default") // New state for sorting
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
      return
    }
    if (currentUser?.role !== "admin") {
      router.push(currentUser?.role === "seller" ? "/dashboard/seller" : "/?error=unauthorized_admin")
      return
    }
    if (currentUser) {
      fetchAdminData()
    }
  }, [currentUser, authLoading, router])

  const fetchAdminData = async () => {
    setLoading(true)
    setError(null)
    try {
      const usersCollection = collection(db, "users")
      const userSnapshot = await getDocs(usersCollection)
      const usersData = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as UserData[]
      setUsers(usersData)

      const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
      const categorySnapshot = await getDocs(categoriesQuery)
      setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Category))

      const brandsQuery = query(collection(db, "brands"), orderBy("name"))
      const brandSnapshot = await getDocs(brandsQuery)
      setBrands(brandSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Brand))

      const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"))
      const productSnapshot = await getDocs(productsQuery)
      const productsData = productSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            averageRating: Number.parseFloat((Math.random() * 5).toFixed(1)), // Simulate average rating
          }) as Product,
      )
      setProducts(productsData) // Update products state for overview count

      // Obtener todos los productos con información del vendedor
      const allProductsWithSellers = await Promise.all(
        productsData.map(async (product) => {
          const seller = usersData.find((user) => user.id === product.sellerId)
          return {
            ...product,
            seller,
          }
        }),
      )
      setAllProducts(allProductsWithSellers)
    } catch (err) {
      console.error("Error fetching admin data:", err)
      setError("Error al cargar los datos del panel. Verifica tu conexión y permisos.")
    } finally {
      setLoading(false)
    }
  }

  const uploadImageToStorage = async (
    file: File,
    pathPrefix: string,
  ): Promise<{ downloadURL: string; filePath: string }> => {
    if (!currentUser) throw new Error("Usuario no autenticado.")
    const filePath = `${pathPrefix}/${Date.now()}-${file.name}`
    const storageRef = ref(storage, filePath)
    try {
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      return { downloadURL, filePath }
    } catch (error) {
      console.error("Error uploading image: ", error)
      throw new Error("Error al subir la imagen.")
    }
  }

  const handleNewCategoryImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewCategoryImageFile(file)
      setNewCategoryImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveCategoryImage = () => {
    setNewCategoryImageFile(null)
    setNewCategoryImagePreviewUrl(null)
  }

  const handleAddCategory = async () => {
    if (newCategoryName.trim() === "") {
      setError("El nombre de la categoría no puede estar vacío.")
      return
    }
    setAddingCategory(true)
    setUploadingCategoryImage(true)
    setError(null)
    let imageUrl: string | undefined
    let imagePath: string | undefined

    try {
      if (newCategoryImageFile) {
        const { downloadURL, filePath } = await uploadImageToStorage(newCategoryImageFile, "categories")
        imageUrl = downloadURL
        imagePath = filePath
      }

      const categoryData: {
        name: string
        description?: string
        imageUrl?: string
        imagePath?: string
        createdAt: any
      } = {
        name: newCategoryName,
        createdAt: serverTimestamp(),
      }
      if (newCategoryDescription.trim() !== "") {
        categoryData.description = newCategoryDescription
      }
      if (imageUrl) {
        categoryData.imageUrl = imageUrl
        categoryData.imagePath = imagePath
      }

      const docRef = await addDoc(collection(db, "categories"), categoryData)
      setCategories((prevCategories) => [
        ...prevCategories,
        { id: docRef.id, ...categoryData, createdAt: new Date() } as Category,
      ])
      setNewCategoryName("")
      setNewCategoryDescription("")
      handleRemoveCategoryImage()
    } catch (err) {
      console.error("Error adding category:", err)
      setError("Error al añadir la categoría. Revisa la consola para más detalles.")
    } finally {
      setAddingCategory(false)
      setUploadingCategoryImage(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string, imagePath?: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoryName}"?`)) {
      return
    }
    try {
      if (imagePath) {
        const imageRef = ref(storage, imagePath)
        await deleteObject(imageRef)
        console.log("Image deleted from storage:", imagePath)
      }

      await deleteDoc(doc(db, "categories", categoryId))
      setCategories((prevCategories) => prevCategories.filter((cat) => cat.id !== categoryId))
      setError(null)
      console.log("Category deleted:", categoryId)
    } catch (err) {
      console.error("Error deleting category:", err)
      setError(`Error al eliminar la categoría "${categoryName}".`)
    }
  }

  const handleNewBrandImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewBrandImageFile(file)
      setNewBrandImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveBrandImage = () => {
    setNewBrandImageFile(null)
    setNewBrandImagePreviewUrl(null)
  }

  const handleAddBrand = async () => {
    if (newBrandName.trim() === "") {
      setError("El nombre de la marca no puede estar vacío.")
      return
    }
    setAddingBrand(true)
    setUploadingBrandImage(true)
    setError(null)
    let imageUrl: string | undefined
    let imagePath: string | undefined

    try {
      if (newBrandImageFile) {
        const { downloadURL, filePath } = await uploadImageToStorage(newBrandImageFile, "brands")
        imageUrl = downloadURL
        imagePath = filePath
      }

      const brandData: { name: string; imageUrl?: string; imagePath?: string; createdAt: any } = {
        name: newBrandName,
        createdAt: serverTimestamp(),
      }
      if (imageUrl) {
        brandData.imageUrl = imageUrl
        brandData.imagePath = imagePath
      }

      const docRef = await addDoc(collection(db, "brands"), brandData)
      setBrands((prevBrands) => [...prevBrands, { id: docRef.id, ...brandData, createdAt: new Date() } as Brand])
      setNewBrandName("")
      handleRemoveBrandImage()
    } catch (err) {
      console.error("Error adding brand:", err)
      setError("Error al añadir la marca. Revisa la consola para más detalles.")
    } finally {
      setAddingBrand(false)
      setUploadingBrandImage(false)
    }
  }

  const handleDeleteBrand = async (brandId: string, brandName: string, imagePath?: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la marca "${brandName}"?`)) {
      return
    }
    try {
      if (imagePath) {
        const imageRef = ref(storage, imagePath)
        await deleteObject(imageRef)
        console.log("Image deleted from storage:", imagePath)
      }

      await deleteDoc(doc(db, "brands", brandId))
      setBrands((prevBrands) => prevBrands.filter((brand) => brand.id !== brandId))
      setError(null)
      console.log("Brand deleted:", brandId)
    } catch (err) {
      console.error("Error deleting brand:", err)
      setError(`Error al eliminar la marca "${brandName}".`)
    }
  }

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, { isActive: !currentStatus })
      setUsers(users.map((user) => (user.id === userId ? { ...user, isActive: !currentStatus } : user)))
    } catch (error) {
      console.error("Error updating user status:", error)
      setError("Error al actualizar el estado del usuario.")
    }
  }

  // Función para eliminar productos desde la pestaña "Todos los Productos"
  const handleDeleteAllProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el producto "${productName}"?`)) {
      return
    }
    setDeletingProductId(productId)
    try {
      await deleteDoc(doc(db, "products", productId))
      setAllProducts((prevProducts) => prevProducts.filter((prod) => prod.id !== productId))
      setProducts((prevProducts) => prevProducts.filter((prod) => prod.id !== productId)) // Also update the main products list
      setError(null)
      console.log("Product deleted:", productId)
    } catch (err) {
      console.error("Error deleting product:", err)
      setError(`Error al eliminar el producto "${productName}".`)
    } finally {
      setDeletingProductId(null)
    }
  }

  // Lógica de filtrado y ordenamiento para todos los productos
  const filteredAllProducts = useMemo(() => {
    const tempProducts = allProducts.filter((product) => {
      const matchesSearchTerm =
        allProductsSearchTerm === "" ||
        product.name.toLowerCase().includes(allProductsSearchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(allProductsSearchTerm.toLowerCase())

      const matchesCategory = allProductsFilterCategory === "all" || product.category === allProductsFilterCategory

      const matchesSeller = allProductsFilterSeller === "all" || product.sellerId === allProductsFilterSeller

      const matchesType =
        allProductsFilterIsService === "all" ||
        (allProductsFilterIsService === "product" && !product.isService) ||
        (allProductsFilterIsService === "service" && product.isService)

      return matchesSearchTerm && matchesCategory && matchesSeller && matchesType
    })

    // Apply sorting
    if (allProductsSortOrder === "reviews_desc") {
      tempProducts.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    } else if (allProductsSortOrder === "price_asc") {
      tempProducts.sort((a, b) => a.price - b.price)
    } else if (allProductsSortOrder === "price_desc") {
      tempProducts.sort((a, b) => b.price - a.price)
    }
    // Default sort by createdAt if no specific sort is applied
    else {
      tempProducts.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
    }

    return tempProducts
  }, [
    allProducts,
    allProductsSearchTerm,
    allProductsFilterCategory,
    allProductsFilterSeller,
    allProductsFilterIsService,
    allProductsSortOrder,
  ])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            No tienes permisos para acceder a esta página. Por favor,{" "}
            <Link href="/login" className="underline">
              inicia sesión
            </Link>{" "}
            con una cuenta de administrador.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-lg text-gray-700">Cargando panel administrativo...</span>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr] bg-gray-100">
      {/* Sidebar */}
      <div className="hidden border-r bg-white lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-purple-600" prefetch={false}>
              <Package2 className="h-6 w-6" />
              <span>Servido Admin</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              {[
                { tab: "overview", label: "Resumen", icon: Home },
                { tab: "users", label: "Usuarios", icon: Users },
                { tab: "categories", label: "Categorías", icon: List },
                { tab: "brands", label: "Marcas", icon: Tag },
                { tab: "allProducts", label: "Todos los Productos", icon: ShoppingCart },
              ].map((item) => (
                <Button
                  key={item.tab}
                  variant={activeTab === item.tab ? "secondary" : "ghost"}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-purple-600 justify-start"
                  onClick={() => setActiveTab(item.tab)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Header for mobile sidebar */}
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-white px-6 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="lg:hidden w-72">
              <div className="flex h-[60px] items-center border-b px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold text-purple-600" prefetch={false}>
                  <Package2 className="h-6 w-6" />
                  <span>Servido Admin</span>
                </Link>
              </div>
              <nav className="grid gap-2 p-4 text-base font-medium">
                {[
                  { tab: "overview", label: "Resumen", icon: Home },
                  { tab: "users", label: "Usuarios", icon: Users },
                  { tab: "categories", label: "Categorías", icon: List },
                  { tab: "brands", label: "Marcas", icon: Tag },
                  { tab: "allProducts", label: "Todos los Productos", icon: ShoppingCart },
                ].map((item) => (
                  <Button
                    key={item.tab}
                    variant={activeTab === item.tab ? "secondary" : "ghost"}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:text-purple-600 justify-start"
                    onClick={() => {
                      setActiveTab(item.tab) /* Consider closing sheet here */
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-lg md:text-2xl text-gray-800 flex-1 text-center lg:text-left">
            Panel Administrativo
          </h1>
        </header>

        {/* Main Area with Tabs */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Responsive TabsList */}
            <TabsList className="flex w-full overflow-x-auto justify-start sm:justify-center md:justify-start bg-white border-b pb-2">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="categories">Categorías</TabsTrigger>
              <TabsTrigger value="brands">Marcas</TabsTrigger>
              <TabsTrigger value="allProducts">Todos los Productos</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Categorías</CardTitle>
                    <List className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{categories.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Marcas</CardTitle>
                    <Tag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{brands.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                    <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{products.length}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {" "}
                    {/* Added for responsiveness */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.name} />
                                <AvatarFallback>
                                  <User className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === "admin"
                                    ? "destructive"
                                    : user.role === "seller"
                                      ? "outline"
                                      : "secondary"
                                }
                              >
                                {user.role || "user"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {user.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserActive(user.id, user.isActive)}
                              >
                                {user.isActive ? "Desactivar" : "Activar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Categorías</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddCategory()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">Añadir Nueva Categoría</h3>
                    <div>
                      <Label htmlFor="newCategoryName">Nombre de Categoría</Label>
                      <Input
                        id="newCategoryName"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newCategoryDescription">Descripción (Opcional)</Label>
                      <Textarea
                        id="newCategoryDescription"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                        placeholder="Breve descripción de la categoría..."
                      />
                    </div>
                    {/* Image Upload for Category */}
                    <div>
                      <Label htmlFor="newCategoryImage">Imagen de Categoría (Opcional)</Label>
                      <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                        <div className="w-24 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                          {newCategoryImagePreviewUrl ? (
                            <Image
                              src={newCategoryImagePreviewUrl || "/placeholder.svg"}
                              alt="Vista previa de categoría"
                              layout="fill"
                              objectFit="cover"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="newCategoryImage"
                          type="file"
                          accept="image/*"
                          onChange={handleNewCategoryImageChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 cursor-pointer"
                        />
                        {newCategoryImagePreviewUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveCategoryImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Quitar Imagen
                          </Button>
                        )}
                      </div>
                      {uploadingCategoryImage && (
                        <p className="text-sm text-purple-600 mt-2 flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo imagen...
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={addingCategory || uploadingCategoryImage}>
                      {addingCategory || uploadingCategoryImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Añadir Categoría
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    {" "}
                    {/* Added for responsiveness */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Imagen</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell>
                              {cat.imageUrl ? (
                                <Image
                                  src={cat.imageUrl || "/placeholder.svg"}
                                  alt={cat.name}
                                  width={50}
                                  height={50}
                                  className="rounded object-cover aspect-square"
                                />
                              ) : (
                                <div className="w-[50px] h-[50px] bg-gray-200 rounded flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                              {cat.description || "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteCategory(cat.id, cat.name, cat.imagePath)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Brands Tab */}
            <TabsContent value="brands" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Marcas</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddBrand()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">Añadir Nueva Marca</h3>
                    <div>
                      <Label htmlFor="newBrandName">Nombre de Marca</Label>
                      <Input
                        id="newBrandName"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        required
                      />
                    </div>
                    {/* Image Upload for Brand */}
                    <div>
                      <Label htmlFor="newBrandImage">Logo de Marca (Opcional)</Label>
                      <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                        <div className="w-24 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                          {newBrandImagePreviewUrl ? (
                            <Image
                              src={newBrandImagePreviewUrl || "/placeholder.svg"}
                              alt="Vista previa de marca"
                              layout="fill"
                              objectFit="contain"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="newBrandImage"
                          type="file"
                          accept="image/*"
                          onChange={handleNewBrandImageChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 cursor-pointer"
                        />
                        {newBrandImagePreviewUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveBrandImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Quitar Imagen
                          </Button>
                        )}
                      </div>
                      {uploadingBrandImage && (
                        <p className="text-sm text-purple-600 mt-2 flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo imagen...
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={addingBrand || uploadingBrandImage}>
                      {addingBrand || uploadingBrandImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Añadir Marca
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    {" "}
                    {/* Added for responsiveness */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Logo</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brands.map((brand) => (
                          <TableRow key={brand.id}>
                            <TableCell>
                              {brand.imageUrl ? (
                                <Image
                                  src={brand.imageUrl || "/placeholder.svg"}
                                  alt={brand.name}
                                  width={50}
                                  height={50}
                                  className="rounded object-contain aspect-square"
                                />
                              ) : (
                                <div className="w-[50px] h-[50px] bg-gray-200 rounded flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{brand.name}</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteBrand(brand.id, brand.name, brand.imagePath)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Todos los Productos Tab */}
            <TabsContent value="allProducts" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Todos los Productos de la Plataforma</CardTitle>
                  <CardDescription>
                    Visualiza y gestiona todos los productos y servicios de todos los vendedores.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filtros para todos los productos */}
                  <div className="mb-6 p-4 border rounded-lg bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="allProductsSearchTerm">Buscar</Label>
                      <Input
                        id="allProductsSearchTerm"
                        placeholder="Nombre o descripción..."
                        value={allProductsSearchTerm}
                        onChange={(e) => setAllProductsSearchTerm(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="allProductsFilterCategory">Categoría</Label>
                      <Select value={allProductsFilterCategory} onValueChange={setAllProductsFilterCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las categorías</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="allProductsFilterSeller">Vendedor</Label>
                      <Select value={allProductsFilterSeller} onValueChange={setAllProductsFilterSeller}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los vendedores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los vendedores</SelectItem>
                          {users
                            .filter((user) => user.role === "seller")
                            .map((seller) => (
                              <SelectItem key={seller.id} value={seller.id}>
                                {seller.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="allProductsFilterType">Tipo</Label>
                      <Select value={allProductsFilterIsService} onValueChange={setAllProductsFilterIsService}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="product">Productos</SelectItem>
                          <SelectItem value="service">Servicios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="allProductsSortOrder">Ordenar por</Label>
                      <Select value={allProductsSortOrder} onValueChange={setAllProductsSortOrder}>
                        <SelectTrigger>
                          <SelectValue placeholder="Orden predeterminado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Predeterminado</SelectItem>
                          <SelectItem value="reviews_desc">Reseñas (Mayor a Menor)</SelectItem>
                          <SelectItem value="price_asc">Precio (Menor a Mayor)</SelectItem>
                          <SelectItem value="price_desc">Precio (Mayor a Mayor)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tabla de todos los productos */}
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      {" "}
                      {/* Added for responsiveness */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Vendedor</TableHead>
                            <TableHead>Reseñas</TableHead> {/* New column for reviews */}
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAllProducts.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-10">
                                No se encontraron productos que coincidan con los filtros.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAllProducts.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {product.imageUrl ? (
                                        <Image
                                          src={product.imageUrl || "/placeholder.svg"}
                                          alt={product.name}
                                          width={40}
                                          height={40}
                                          className="object-cover"
                                        />
                                      ) : (
                                        <ShoppingBag className="h-5 w-5 text-gray-400" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium">{product.name}</div>
                                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                        {product.description}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>${product.price.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={product.isService ? "outline" : "secondary"}>
                                    {product.isService ? "Servicio" : "Producto"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={product.seller?.photoURL || "/placeholder.svg"} />
                                      <AvatarFallback>
                                        <User className="h-4 w-4" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="text-sm">{product.seller?.name || "Vendedor desconocido"}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span>{product.averageRating?.toFixed(1) || "N/A"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteAllProduct(product.id, product.name)}
                                    disabled={deletingProductId === product.id}
                                  >
                                    {deletingProductId === product.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
