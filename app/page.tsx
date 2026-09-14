"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Producto, Categoria, ItemCarrito } from "@/lib/types";
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  X, 
  MessageCircle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Truck,
  Sparkles,
  Plus,
  Minus,
  Lock,
  Coins,
  Share2,
  SlidersHorizontal
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const RANGOS_PRECIO = [
  { id: "todos", label: "Cualquier precio" },
  { id: "hasta10", label: "Menos de $10", max: 10 },
  { id: "10a25", label: "$10 a $25", min: 10, max: 25 },
  { id: "mas25", label: "Más de $25", min: 25 },
];

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("todas");
  const [rangoPrecioSeleccionado, setRangoPrecioSeleccionado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [modalFotoIndex, setModalFotoIndex] = useState<number>(0);
  const [cantidadModal, setCantidadModal] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [copiadoToast, setCopiadoToast] = useState(false);

  // Tasa BCV
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);

  useEffect(() => {
    // 1. Cargar datos cacheados inmediatamente para evitar pantallas en blanco
    const cachedProds = localStorage.getItem("bazar_prods_cache");
    const cachedCats = localStorage.getItem("bazar_cats_cache");
    const cachedBcv = localStorage.getItem("bazar_bcv_cache");

    if (cachedProds && cachedCats) {
      try {
        setProductos(JSON.parse(cachedProds));
        setCategorias(JSON.parse(cachedCats));
        if (cachedBcv) setTasaBcv(Number(cachedBcv));
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Traer los datos frescos en paralelo
    cargarDatosFrescos();
  }, []);

  async function cargarDatosFrescos() {
    try {
      const [catsRes, prodsRes, bcvRes] = await Promise.allSettled([
        supabase.from("categorias").select("*").order("nombre"),
        supabase.from("productos").select("*, categorias(*)").order("created_at", { ascending: false }),
        fetch("https://ve.dolarapi.com/v1/dolares/oficial").then((r) => r.json()),
      ]);

      if (catsRes.status === "fulfilled" && catsRes.value.data) {
        setCategorias(catsRes.value.data);
        localStorage.setItem("bazar_cats_cache", JSON.stringify(catsRes.value.data));
      }

      if (prodsRes.status === "fulfilled" && prodsRes.value.data) {
        const prods = prodsRes.value.data as Producto[];
        setProductos(prods);
        localStorage.setItem("bazar_prods_cache", JSON.stringify(prods));
      }

      if (bcvRes.status === "fulfilled" && bcvRes.value?.promedio) {
        const val = Number(bcvRes.value.promedio);
        setTasaBcv(val);
        localStorage.setItem("bazar_bcv_cache", String(val));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Manejo del botón de "Atrás" en teléfonos móviles para cerrar modales
  useEffect(() => {
    const handlePopState = () => {
      if (productoSeleccionado) {
        setProductoSeleccionado(null);
      } else if (carritoAbierto) {
        setCarritoAbierto(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [productoSeleccionado, carritoAbierto]);

  const abrirModalProducto = (prod: Producto) => {
    window.history.pushState({ modal: "producto" }, "");
    setProductoSeleccionado(prod);
    setModalFotoIndex(0);
    setCantidadModal(1);
  };

  const cerrarModalProducto = useCallback(() => {
    if (productoSeleccionado) {
      setProductoSeleccionado(null);
      if (window.history.state?.modal === "producto") {
        window.history.back();
      }
    }
  }, [productoSeleccionado]);

  const abrirCarrito = () => {
    window.history.pushState({ modal: "carrito" }, "");
    setCarritoAbierto(true);
  };

  const cerrarCarrito = useCallback(() => {
    if (carritoAbierto) {
      setCarritoAbierto(false);
      if (window.history.state?.modal === "carrito") {
        window.history.back();
      }
    }
  }, [carritoAbierto]);

  // Compartir producto
  const compartirProducto = (prod: Producto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
    const texto = `¡Mira este artículo en El Bazar Cubides!: ${prod.titulo} por $${Number(prod.precio).toFixed(2)}`;

    if (navigator.share) {
      navigator.share({
        title: prod.titulo,
        text: texto,
        url: url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${texto}\n${url}`);
      setCopiadoToast(true);
      setTimeout(() => setCopiadoToast(false), 2000);
    }
  };

  // Formateador de Bolívares
  const formatoBs = (montoUsd: number) => {
    if (!tasaBcv) return null;
    const totalBs = montoUsd * tasaBcv;
    return new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalBs);
  };

  const agregarAlCarrito = (producto: Producto, cant: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (producto.estado === "vendido" || (producto.cantidad ?? 1) <= 0) return;

    setCarrito((prev) => {
      const index = prev.findIndex((item) => item.producto.id === producto.id);
      const stockMax = producto.cantidad ?? 1;

      if (index > -1) {
        const nuevaCant = Math.min(prev[index].cantidadPedida + cant, stockMax);
        const nuevo = [...prev];
        nuevo[index] = { ...nuevo[index], cantidadPedida: nuevaCant };
        return nuevo;
      } else {
        return [...prev, { producto, cantidadPedida: Math.min(cant, stockMax) }];
      }
    });
  };

  const modificarCantidadCarrito = (id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === id) {
            const stockMax = item.producto.cantidad ?? 1;
            const nueva = item.cantidadPedida + delta;
            return nueva > 0 && nueva <= stockMax ? { ...item, cantidadPedida: nueva } : item;
          }
          return item;
        })
        .filter((item) => item.cantidadPedida > 0)
    );
  };

  const quitarDelCarrito = (id: string) => {
    setCarrito(carrito.filter((item) => item.producto.id !== id));
  };

  const totalCarrito = carrito.reduce(
    (acc, item) => acc + Number(item.producto.precio) * item.cantidadPedida,
    0
  );
  const totalArticulos = carrito.reduce((acc, item) => acc + item.cantidadPedida, 0);

  const enviarWhatsApp = () => {
    const telefono = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "584120000000";
    
    let texto = "*¡Hola! Estuve viendo el catálogo de El Bazar Cubides y me interesan estos artículos:*\n\n";
    
    carrito.forEach((item, index) => {
      const subtotal = Number(item.producto.precio) * item.cantidadPedida;
      const subtotalBs = tasaBcv ? ` (~Bs. ${formatoBs(subtotal)})` : "";
      texto += `${index + 1}. *${item.producto.titulo}* ${item.producto.marca ? `(${item.producto.marca})` : ""} - Cant: ${item.cantidadPedida} x $${Number(item.producto.precio).toFixed(2)} = *$${subtotal.toFixed(2)}*${subtotalBs}\n`;
    });

    texto += `\n*Total estimado:* $${totalCarrito.toFixed(2)}`;
    if (tasaBcv) {
      texto += ` (Aprox: Bs. ${formatoBs(totalCarrito)} tasa BCV)`;
    }
    
    if (totalCarrito >= 25) {
      texto += "\n*(Aplica para Delivery Gratis)*";
    }
    
    texto += "\n\n¿Siguen disponibles?";

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  // Filtrado múltiple: Categoría, Búsqueda y Rango de Precio
  const productosFiltrados = productos.filter((prod) => {
    const coincideCat = categoriaSeleccionada === "todas" || prod.categoria_id === categoriaSeleccionada;
    
    const q = busqueda.toLowerCase();
    const coincideBusqueda = 
      prod.titulo.toLowerCase().includes(q) || 
      (prod.marca && prod.marca.toLowerCase().includes(q)) ||
      (prod.descripcion && prod.descripcion.toLowerCase().includes(q));

    const p = Number(prod.precio);
    let coincidePrecio = true;
    if (rangoPrecioSeleccionado === "hasta10") coincidePrecio = p < 10;
    else if (rangoPrecioSeleccionado === "10a25") coincidePrecio = p >= 10 && p <= 25;
    else if (rangoPrecioSeleccionado === "mas25") coincidePrecio = p > 25;

    return coincideCat && coincideBusqueda && coincidePrecio;
  });

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-neutral-800 selection:bg-cyan-500 selection:text-white pb-20 relative flex flex-col justify-between">
      {/* Fondo sutil */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `radial-gradient(#0891b2 1px, transparent 1px)`,
          backgroundSize: '16px 16px'
        }}
      />

      {/* Toast copiado en portapapeles */}
      {copiadoToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg animate-in fade-in duration-150">
          Enlace copiado al portapapeles
        </div>
      )}

      <div>
        {/* Banner Promocional y Monitor BCV */}
        <div className="bg-gradient-to-r from-teal-700 via-cyan-700 to-teal-600 text-white text-xs font-semibold py-1.5 px-3 shadow-xs relative z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-yellow-300 animate-bounce shrink-0" />
              <span><strong>Delivery Gratis</strong> desde <strong>$25</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-teal-900/50 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-teal-500/30 text-[10px] sm:text-xs">
              <Coins className="w-3 h-3 text-teal-200 shrink-0" />
              <span>
                BCV: {tasaBcv ? `Bs. ${tasaBcv.toFixed(2)}` : "Cargando..."}
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/70 shadow-2xs">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-3">
            {/* Logo y Nombre */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center">
                <Image 
                  src="/logo.png" 
                  alt="El Bazar Cubides Logo" 
                  fill 
                  sizes="36px"
                  className="object-contain" 
                />
              </div>
              <div className="leading-tight hidden min-[360px]:block">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-neutral-900">
                  El Bazar Cubides
                </h1>
                <p className="text-[10px] text-cyan-700 font-medium">Tesoros & Garage</p>
              </div>
            </div>

            {/* Buscador */}
            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar artículos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-neutral-100 focus:bg-white border border-neutral-200 focus:border-cyan-500 rounded-full text-xs outline-none transition-all"
              />
            </div>

            {/* Carrito */}
            <button
              onClick={abrirCarrito}
              className="relative p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full transition-all shrink-0 shadow-sm shadow-cyan-600/30"
            >
              <ShoppingCart className="w-4 h-4" />
              {totalArticulos > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-neutral-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalArticulos}
                </span>
              )}
            </button>
          </div>

          {/* Filtros: Categorías */}
          <div className="max-w-6xl mx-auto px-3 pt-1 pb-1.5">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <button
                onClick={() => setCategoriaSeleccionada("todas")}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                  categoriaSeleccionada === "todas"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                Todos ({productos.length})
              </button>
              {categorias.map((cat) => {
                const count = productos.filter((p) => p.categoria_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                      categoriaSeleccionada === cat.id
                        ? "bg-cyan-600 text-white shadow-xs"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {cat.nombre} ({count})
                  </button>
                );
              })}
            </div>

            {/* Filtros: Rango de Precio */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 pb-0.5 scrollbar-none text-[10px] border-t border-neutral-100">
              <span className="text-neutral-400 font-medium shrink-0 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-cyan-600" /> Precio:
              </span>
              {RANGOS_PRECIO.map((rango) => (
                <button
                  key={rango.id}
                  onClick={() => setRangoPrecioSeleccionado(rango.id)}
                  className={`px-2.5 py-0.5 rounded-md whitespace-nowrap font-medium transition-all ${
                    rangoPrecioSeleccionado === rango.id
                      ? "bg-teal-700 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {rango.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Grid del Catálogo */}
        <main className="max-w-6xl mx-auto px-2 sm:px-4 pt-3 relative z-10">
          {loading && productos.length === 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-neutral-200 p-2 animate-pulse space-y-2">
                  <div className="aspect-square bg-neutral-200 rounded-lg w-full" />
                  <div className="h-3 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200/70 p-6 mx-2 mt-4 shadow-xs">
              <Sparkles className="w-8 h-8 text-cyan-600/40 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 font-medium">No hay productos que coincidan con estos filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3.5">
              {productosFiltrados.map((prod) => {
                const stock = prod.cantidad ?? 1;
                const esVendido = prod.estado === "vendido" || stock <= 0;
                const enCarrito = carrito.some((item) => item.producto.id === prod.id);
                const fotos = prod.fotos && prod.fotos.length > 0 ? prod.fotos : ["/placeholder.png"];

                return (
                  <div
                    key={prod.id}
                    onClick={() => abrirModalProducto(prod)}
                    className={`group bg-white rounded-xl border overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-150 shadow-2xs hover:shadow-md ${
                      esVendido ? "border-red-200/70 opacity-60 bg-red-50/10" : "border-neutral-200/80 hover:border-cyan-400"
                    }`}
                  >
                    {/* Contenedor Imagen limpia */}
                    <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
                      {fotos[0] !== "/placeholder.png" ? (
                        <Image
                          src={fotos[0]}
                          alt={prod.titulo}
                          fill
                          className={`object-cover transition-transform duration-200 ${esVendido ? "grayscale" : "group-hover:scale-105"}`}
                          sizes="(max-width: 640px) 33vw, 20vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">Sin foto</div>
                      )}

                      {/* Botón rápido de compartir */}
                      <button
                        onClick={(e) => compartirProducto(prod, e)}
                        className="absolute top-1.5 right-1.5 p-1 bg-white/80 hover:bg-white text-neutral-700 rounded-full shadow-xs backdrop-blur-xs transition-colors"
                        title="Compartir"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>

                      {/* Badge Vendido */}
                      {esVendido && (
                        <div className="absolute inset-0 bg-red-600/80 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-white text-[9px] font-black tracking-wider uppercase bg-black/40 px-1.5 py-0.5 rounded">
                            Vendido
                          </span>
                        </div>
                      )}

                      {/* Stock disponible si hay más de 1 */}
                      {!esVendido && stock > 1 && (
                        <div className="absolute top-1 left-1 bg-neutral-900/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {stock} disp.
                        </div>
                      )}
                    </div>

                    {/* Información y Precios limpios abajo */}
                    <div className="p-2 flex flex-col justify-between flex-1 gap-2">
                      <div className="space-y-1">
                        {prod.marca && (
                          <p className="text-[9px] text-cyan-700 font-bold uppercase tracking-wider truncate">
                            {prod.marca}
                          </p>
                        )}
                        <h3 className="font-semibold text-neutral-900 text-[11px] sm:text-xs leading-snug line-clamp-2">
                          {prod.titulo}
                        </h3>

                        {/* Bloque de Precio */}
                        <div className="pt-0.5">
                          <div className="text-xs sm:text-sm font-black text-neutral-900 leading-none">
                            ${Number(prod.precio).toFixed(0)}
                          </div>
                          {tasaBcv && (
                            <div className="text-[9px] text-teal-700 font-semibold tracking-tight mt-0.5">
                              Bs. {formatoBs(Number(prod.precio))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        disabled={esVendido}
                        onClick={(e) => agregarAlCarrito(prod, 1, e)}
                        className={`w-full py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                          esVendido
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                            : enCarrito
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : "bg-cyan-50 hover:bg-cyan-600 text-cyan-800 hover:text-white border border-cyan-200"
                        }`}
                      >
                        {esVendido ? "Agotado" : enCarrito ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        <span>
                          {esVendido ? "" : enCarrito ? "Listo" : "Agregar"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Footer con acceso de Admin */}
      <footer className="max-w-6xl mx-auto w-full px-4 pt-12 pb-4 text-center text-neutral-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200/60 mt-8 relative z-10">
        <p className="text-[11px]">
          © {new Date().getFullYear()} El Bazar Cubides • Caracas, Venezuela
        </p>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-colors font-medium border border-neutral-200"
        >
          <Lock className="w-3 h-3 text-neutral-500" />
          <span>Acceso Administrador</span>
        </Link>
      </footer>

      {/* Modal de Detalle */}
      {productoSeleccionado && (
        <div 
          onClick={cerrarModalProducto}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl border border-neutral-200 animate-in slide-in-from-bottom duration-200"
          >
            {/* Cabecera modal con botón Compartir y Cerrar */}
            <div className="p-3 border-b border-neutral-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                {productoSeleccionado.categorias?.nombre || "Detalle"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => compartirProducto(productoSeleccionado)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-600 flex items-center gap-1 text-xs font-medium"
                  title="Compartir"
                >
                  <Share2 className="w-4 h-4 text-cyan-700" />
                  <span className="hidden sm:inline">Compartir</span>
                </button>
                <button 
                  onClick={cerrarModalProducto}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Galería grande */}
            <div className="relative aspect-4/3 w-full bg-neutral-900 overflow-hidden">
              {productoSeleccionado.fotos && productoSeleccionado.fotos.length > 0 ? (
                <Image
                  src={productoSeleccionado.fotos[modalFotoIndex] || productoSeleccionado.fotos[0]}
                  alt={productoSeleccionado.titulo}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">Sin fotos</div>
              )}

              {productoSeleccionado.fotos && productoSeleccionado.fotos.length > 1 && (
                <>
                  <button
                    onClick={() => setModalFotoIndex((prev) => (prev - 1 + productoSeleccionado.fotos.length) % productoSeleccionado.fotos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setModalFotoIndex((prev) => (prev + 1) % productoSeleccionado.fotos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
                    {productoSeleccionado.fotos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setModalFotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === modalFotoIndex ? "bg-cyan-400 w-4" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Información en Modal */}
            <div className="p-5 space-y-4">
              <div>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h2 className="text-lg font-black text-neutral-900 leading-tight">
                    {productoSeleccionado.titulo}
                  </h2>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black text-teal-700 leading-none">
                      ${Number(productoSeleccionado.precio).toFixed(2)}
                    </div>
                    {tasaBcv && (
                      <div className="text-xs text-neutral-500 font-bold mt-1">
                        ≈ Bs. {formatoBs(Number(productoSeleccionado.precio))}
                      </div>
                    )}
                  </div>
                </div>
                {productoSeleccionado.marca && (
                  <p className="text-xs text-neutral-500 font-medium">Marca: <strong className="text-neutral-800">{productoSeleccionado.marca}</strong></p>
                )}
              </div>

              {/* Cápsulas de Estado, Stock y Funcionalidad */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-100">
                <span className="text-[11px] px-2.5 py-1 bg-cyan-100/70 text-cyan-900 font-bold rounded-lg">
                  Disponibles: {productoSeleccionado.cantidad ?? 1} unid.
                </span>
                {productoSeleccionado.condicion && (
                  <span className="text-[11px] px-2.5 py-1 bg-neutral-100 text-neutral-700 font-semibold rounded-lg">
                    Estado: <span className="text-cyan-800">{productoSeleccionado.condicion}</span>
                  </span>
                )}
                {productoSeleccionado.funcionalidad && (
                  <span className="text-[11px] px-2.5 py-1 bg-cyan-50 text-cyan-800 font-semibold rounded-lg border border-cyan-200/50">
                    Funcionalidad: {productoSeleccionado.funcionalidad}
                  </span>
                )}
                {(productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0) && (
                  <span className="text-[11px] px-2.5 py-1 bg-red-100 text-red-700 font-black rounded-lg">
                    Vendido
                  </span>
                )}
              </div>

              {/* Selector de Cantidad */}
              {productoSeleccionado.estado !== 'vendido' && (productoSeleccionado.cantidad ?? 1) > 1 && (
                <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl">
                  <span className="text-xs font-bold text-neutral-700">Cantidad a comprar:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCantidadModal(Math.max(1, cantidadModal - 1))}
                      className="p-1 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-black text-neutral-900 min-w-5 text-center">
                      {cantidadModal}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCantidadModal(Math.min(productoSeleccionado.cantidad ?? 1, cantidadModal + 1))}
                      className="p-1 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Descripción */}
              {productoSeleccionado.descripcion && (
                <div className="pt-2 border-t border-neutral-100">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Detalles & Observaciones</h4>
                  <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    {productoSeleccionado.descripcion}
                  </p>
                </div>
              )}

              {/* Botón agregar */}
              <button
                disabled={productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0}
                onClick={() => {
                  agregarAlCarrito(productoSeleccionado, cantidadModal);
                  cerrarModalProducto();
                  abrirCarrito();
                }}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                  productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0
                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30"
                }`}
              >
                {productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0 ? (
                  "Artículo Vendido"
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" /> Agregar al Carrito ({cantidadModal})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer del Carrito */}
      {carritoAbierto && (
        <div 
          onClick={cerrarCarrito}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white h-full flex flex-col p-5 shadow-2xl animate-in slide-in-from-right duration-150"
          >
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
              <h2 className="text-base font-bold flex items-center gap-2 text-neutral-900">
                <ShoppingCart className="w-5 h-5 text-cyan-600" />
                Tu Carrito ({totalArticulos})
              </h2>
              <button
                onClick={cerrarCarrito}
                className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {carrito.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 text-xs">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
                El carrito está vacío
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                {carrito.map((item) => {
                  const stockMax = item.producto.cantidad ?? 1;
                  const itemTotalUsd = Number(item.producto.precio) * item.cantidadPedida;
                  return (
                    <div
                      key={item.producto.id}
                      className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-neutral-800 truncate">{item.producto.titulo}</h4>
                          <p className="text-xs text-cyan-700 font-bold">
                            ${itemTotalUsd.toFixed(2)}
                            {tasaBcv && (
                              <span className="text-[10px] text-teal-800 font-semibold ml-1.5">
                                (Bs. {formatoBs(itemTotalUsd)})
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => quitarDelCarrito(item.producto.id)}
                          className="text-neutral-400 hover:text-red-500 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 text-xs">
                        <span className="text-[11px] text-neutral-500">Unidades:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => modificarCantidadCarrito(item.producto.id, -1)}
                            className="p-1 rounded bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-neutral-800 min-w-4 text-center">
                            {item.cantidadPedida}
                          </span>
                          <button
                            disabled={item.cantidadPedida >= stockMax}
                            onClick={() => modificarCantidadCarrito(item.producto.id, 1)}
                            className={`p-1 rounded bg-white border border-neutral-200 transition-colors ${
                              item.cantidadPedida >= stockMax
                                ? "text-neutral-300 border-neutral-100 cursor-not-allowed"
                                : "text-neutral-600 hover:bg-neutral-100"
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {carrito.length > 0 && (
              <div className="pt-3 border-t border-neutral-200 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-neutral-500 font-medium">Total Estimado</span>
                  <div className="text-right">
                    <div className="text-xl font-black text-teal-700">${totalCarrito.toFixed(2)}</div>
                    {tasaBcv && (
                      <div className="text-xs text-neutral-600 font-bold">
                        ≈ Bs. {formatoBs(totalCarrito)}
                      </div>
                    )}
                  </div>
                </div>

                {totalCarrito >= 25 && (
                  <div className="text-[11px] bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                    <Truck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    ¡Genial! Calificas para <strong>Delivery Gratis</strong>.
                  </div>
                )}

                <button
                  onClick={enviarWhatsApp}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-xs sm:text-sm"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Pedir por WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}