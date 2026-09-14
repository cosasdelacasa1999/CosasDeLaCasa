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
  SlidersHorizontal,
  Sparkle
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

  // Manejo del botón Atrás en móvil
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

  const compartirProducto = (prod: Producto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
    const texto = `¡Mira este tesoro en El Bazar Cubides!: ${prod.titulo} por $${Number(prod.precio).toFixed(2)}`;

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

  // Generador de items para loop continuo (si hay 1 se replica 8 veces para que gire fluido)
  const baseRecientes = productos.slice(0, 6);
  const itemsMarquee = baseRecientes.length > 0 
    ? Array(Math.max(6, Math.ceil(12 / baseRecientes.length))).fill(baseRecientes).flat()
    : [];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-neutral-900 selection:bg-[#0092B8] selection:text-white pb-20 relative flex flex-col justify-between font-sans">
      
      {/* Toast de Enlace Copiado */}
      {copiadoToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl animate-in fade-in duration-150">
          Enlace copiado al portapapeles
        </div>
      )}

      <div>
        {/* Banner Superior Minimalista */}
        <div className="bg-[#0f172a] text-white text-xs py-2 px-4 shadow-xs relative z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] sm:text-xs">
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-amber-300" />
              <span><strong>Delivery Gratis</strong> en compras mayores a <strong>$25</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs">
              <Coins className="w-3 h-3 text-teal-300" />
              <span className="font-medium text-neutral-200">
                BCV: {tasaBcv ? `Bs. ${tasaBcv.toFixed(2)}` : "Actualizando..."}
              </span>
            </div>
          </div>
        </div>

        {/* Header estilo LARQ: Limpio y amplio */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                <Image 
                  src="/logo.png" 
                  alt="El Bazar Cubides Logo" 
                  fill 
                  sizes="36px"
                  className="object-contain" 
                />
              </div>
              <div className="leading-tight hidden min-[380px]:block">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-900">
                  El Bazar Cubides
                </h1>
                <p className="text-[10px] text-[#0092B8] font-bold tracking-wider uppercase">Tesoros & Garage</p>
              </div>
            </div>

            {/* Barra de Búsqueda Minimalista */}
            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar en el catálogo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-100 focus:bg-white border border-transparent focus:border-[#0092B8] rounded-full text-xs outline-none transition-all"
              />
            </div>

            {/* Carrito Circular */}
            <button
              onClick={abrirCarrito}
              className="relative p-2.5 bg-neutral-900 hover:bg-[#0092B8] text-white rounded-full transition-colors shrink-0 shadow-sm active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              {totalArticulos > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-neutral-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalArticulos}
                </span>
              )}
            </button>
          </div>

          {/* Filtros: Categorías horizontales */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-1 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setCategoriaSeleccionada("todas")}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium text-xs transition-all ${
                  categoriaSeleccionada === "todas"
                    ? "bg-[#0092B8] text-white shadow-xs"
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
                    className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium text-xs transition-all ${
                      categoriaSeleccionada === cat.id
                        ? "bg-[#0092B8] text-white shadow-xs"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {cat.nombre} ({count})
                  </button>
                );
              })}
            </div>

            {/* Filtro Rápido de Precios */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 pb-0.5 scrollbar-none text-[11px] border-t border-neutral-100">
              <span className="text-neutral-400 font-medium shrink-0 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-[#0092B8]" /> Filtro:
              </span>
              {RANGOS_PRECIO.map((rango) => (
                <button
                  key={rango.id}
                  onClick={() => setRangoPrecioSeleccionado(rango.id)}
                  className={`px-2.5 py-0.5 rounded-md whitespace-nowrap font-medium transition-colors ${
                    rangoPrecioSeleccionado === rango.id
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {rango.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Carrusel Loop Infinito: "Recién Agregados" */}
        {itemsMarquee.length > 0 && !busqueda && categoriaSeleccionada === "todas" && (
          <section className="pt-4 pb-2 overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkle className="w-3.5 h-3.5 text-[#0092B8]" />
                <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Recién Agregados
                </h2>
              </div>
              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Últimos tesoros</span>
            </div>

            {/* Carrusel horizontal continuo sin cortes */}
            <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]">
              <div className="animate-marquee flex gap-3 py-1">
                {itemsMarquee.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => abrirModalProducto(item)}
                    className="w-40 sm:w-48 shrink-0 bg-white rounded-2xl border border-neutral-200/80 p-2.5 shadow-2xs hover:border-[#0092B8] cursor-pointer transition-all flex items-center gap-2.5"
                  >
                    <div className="relative w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                      <Image
                        src={item.fotos && item.fotos[0] ? item.fotos[0] : "/placeholder.png"}
                        alt={item.titulo}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-neutral-900 truncate leading-tight">
                        {item.titulo}
                      </p>
                      <p className="text-xs font-semibold text-[#0092B8] mt-0.5">
                        ${Number(item.precio).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cuadrícula Principal estilo LARQ (2 columnas en móvil, esquinas extra redondeadas) */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 relative z-10">
          {loading && productos.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-neutral-200/80 p-3 animate-pulse space-y-3">
                  <div className="aspect-square bg-neutral-200/70 rounded-2xl w-full" />
                  <div className="h-3 bg-neutral-200/70 rounded-md w-3/4" />
                  <div className="h-3 bg-neutral-200/70 rounded-md w-1/2" />
                </div>
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs max-w-md mx-auto my-6">
              <Sparkles className="w-8 h-8 text-[#0092B8]/40 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 font-medium">No se encontraron artículos con estos filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
              {productosFiltrados.map((prod) => {
                const stock = prod.cantidad ?? 1;
                const esVendido = prod.estado === "vendido" || stock <= 0;
                const enCarrito = carrito.some((item) => item.producto.id === prod.id);
                const fotos = prod.fotos && prod.fotos.length > 0 ? prod.fotos : ["/placeholder.png"];

                return (
                  <div
                    key={prod.id}
                    onClick={() => abrirModalProducto(prod)}
                    className={`group bg-white rounded-3xl border overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md hover:border-[#0092B8]/50 ${
                      esVendido ? "border-red-200/70 opacity-60 bg-red-50/10" : "border-neutral-200/80"
                    }`}
                  >
                    {/* Contenedor Imagen limpia estilo catálogo nórdico */}
                    <div className="relative aspect-square w-full bg-[#f4f5f7] overflow-hidden flex items-center justify-center">
                      {fotos[0] !== "/placeholder.png" ? (
                        <Image
                          src={fotos[0]}
                          alt={prod.titulo}
                          fill
                          className={`object-contain p-3 transition-transform duration-300 ${esVendido ? "grayscale" : "group-hover:scale-105"}`}
                          sizes="(max-width: 640px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="text-[10px] text-neutral-400">Sin foto</div>
                      )}

                      {/* Botón Compartir Flotante */}
                      <button
                        onClick={(e) => compartirProducto(prod, e)}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 hover:bg-white text-neutral-600 rounded-full shadow-xs backdrop-blur-xs transition-transform active:scale-90"
                        title="Compartir"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Badge Vendido */}
                      {esVendido && (
                        <div className="absolute inset-0 bg-red-600/75 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-white text-[10px] font-black tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded-full">
                            Vendido
                          </span>
                        </div>
                      )}

                      {/* Badge Stock */}
                      {!esVendido && stock > 1 && (
                        <div className="absolute top-2.5 left-2.5 bg-neutral-900/80 backdrop-blur-xs text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          {stock} disp.
                        </div>
                      )}
                    </div>

                    {/* Información y Precio */}
                    <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 gap-2.5">
                      <div className="space-y-1">
                        {prod.marca && (
                          <p className="text-[10px] text-[#0092B8] font-bold uppercase tracking-wider truncate">
                            {prod.marca}
                          </p>
                        )}
                        <h3 className="font-semibold text-neutral-900 text-xs sm:text-sm leading-snug line-clamp-2">
                          {prod.titulo}
                        </h3>

                        <div className="pt-1">
                          <div className="text-sm sm:text-base font-semibold text-[#0092B8] leading-none">
                            ${Number(prod.precio).toFixed(2)}
                          </div>
                          {tasaBcv && (
                            <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
                              Bs. {formatoBs(Number(prod.precio))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botón de Agregar estilo LARQ */}
                      <button
                        disabled={esVendido}
                        onClick={(e) => agregarAlCarrito(prod, 1, e)}
                        className={`w-full py-2 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          esVendido
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                            : enCarrito
                            ? "bg-teal-50 text-teal-800 border border-teal-200"
                            : "bg-[#0092B8] hover:bg-[#007f9f] text-white shadow-xs shadow-[#0092B8]/20"
                        }`}
                      >
                        {esVendido ? "Agotado" : enCarrito ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{esVendido ? "" : enCarrito ? "Agregado" : "Agregar"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Footer Discreto */}
      <footer className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-12 pb-4 text-neutral-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200/60 mt-8 relative z-10">
        <p className="text-[11px]">
          © {new Date().getFullYear()} El Bazar Cubides • Caracas, Venezuela
        </p>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-900 bg-white hover:bg-neutral-100 px-3 py-1.5 rounded-full transition-colors font-medium border border-neutral-200/80 shadow-2xs"
        >
          <Lock className="w-3 h-3 text-neutral-400" />
          <span>Acceso Administrador</span>
        </Link>
      </footer>

      {/* Modal Ficha Técnica estilo LARQ (fondo limpio, tipografía espaciosa, sin cajas grises) */}
      {productoSeleccionado && (
        <div 
          onClick={cerrarModalProducto}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl border border-neutral-200/80 animate-in slide-in-from-bottom duration-200"
          >
            {/* Barra superior modal */}
            <div className="px-5 py-3.5 border-b border-neutral-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <span className="text-[10px] font-bold tracking-widest text-[#0092B8] uppercase bg-[#0092B8]/10 px-2.5 py-0.5 rounded-full">
                {productoSeleccionado.categorias?.nombre || "Artículo"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => compartirProducto(productoSeleccionado)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
                  title="Compartir"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={cerrarModalProducto}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Galería grande con fondo neutro */}
            <div className="relative aspect-square w-full bg-[#f8f9fa] overflow-hidden flex items-center justify-center">
              {productoSeleccionado.fotos && productoSeleccionado.fotos.length > 0 ? (
                <Image
                  src={productoSeleccionado.fotos[modalFotoIndex] || productoSeleccionado.fotos[0]}
                  alt={productoSeleccionado.titulo}
                  fill
                  className="object-contain p-4"
                />
              ) : (
                <div className="text-neutral-400 text-xs">Sin fotos</div>
              )}

              {productoSeleccionado.fotos && productoSeleccionado.fotos.length > 1 && (
                <>
                  <button
                    onClick={() => setModalFotoIndex((prev) => (prev - 1 + productoSeleccionado.fotos.length) % productoSeleccionado.fotos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-neutral-800 rounded-full shadow-xs transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setModalFotoIndex((prev) => (prev + 1) % productoSeleccionado.fotos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-neutral-800 rounded-full shadow-xs transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                    {modalFotoIndex + 1} / {productoSeleccionado.fotos.length}
                  </div>
                </>
              )}
            </div>

            {/* Contenido Ficha */}
            <div className="p-5 space-y-4">
              <div>
                {productoSeleccionado.marca && (
                  <p className="text-[10px] font-bold text-[#0092B8] uppercase tracking-wider mb-0.5">
                    {productoSeleccionado.marca}
                  </p>
                )}
                <div className="flex justify-between items-start gap-4">
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-snug">
                    {productoSeleccionado.titulo}
                  </h2>
                  <div className="text-right shrink-0">
                    <div className="text-xl sm:text-2xl font-semibold text-[#0092B8] leading-none">
                      ${Number(productoSeleccionado.precio).toFixed(2)}
                    </div>
                    {tasaBcv && (
                      <div className="text-xs text-neutral-500 font-medium mt-1">
                        ≈ Bs. {formatoBs(Number(productoSeleccionado.precio))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pills de Especificaciones */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full font-medium">
                  {productoSeleccionado.cantidad ?? 1} disponible
                </span>
                {productoSeleccionado.condicion && (
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full font-medium">
                    {productoSeleccionado.condicion}
                  </span>
                )}
                {productoSeleccionado.funcionalidad && (
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full font-medium">
                    {productoSeleccionado.funcionalidad}
                  </span>
                )}
                {(productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0) && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold">
                    Agotado
                  </span>
                )}
              </div>

              {/* Descripción Natural sin cajas toscas */}
              {productoSeleccionado.descripcion && (
                <div className="pt-2 border-t border-neutral-100">
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                    {productoSeleccionado.descripcion}
                  </p>
                </div>
              )}

              {/* Selector de Cantidad */}
              {productoSeleccionado.estado !== 'vendido' && (productoSeleccionado.cantidad ?? 1) > 1 && (
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
                  <span className="text-xs font-medium text-neutral-700">Cantidad a comprar:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCantidadModal(Math.max(1, cantidadModal - 1))}
                      className="p-1 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-neutral-900 min-w-4 text-center">
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

              {/* Botón Principal estilo LARQ */}
              <button
                disabled={productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0}
                onClick={() => {
                  agregarAlCarrito(productoSeleccionado, cantidadModal);
                  cerrarModalProducto();
                  abrirCarrito();
                }}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                  productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0
                    ? "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"
                    : "bg-[#0092B8] hover:bg-[#007f9f] text-white shadow-[#0092B8]/20 active:scale-[0.99]"
                }`}
              >
                {productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0 ? (
                  "Artículo no disponible"
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" /> Añadir al Carrito ({cantidadModal})
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
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200/80">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-neutral-900">
                <ShoppingCart className="w-4 h-4 text-[#0092B8]" />
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
                      className="p-3 bg-neutral-50 border border-neutral-200/70 rounded-2xl space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-neutral-800 truncate">{item.producto.titulo}</h4>
                          <p className="text-xs text-[#0092B8] font-semibold">
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

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 text-xs">
                        <span className="text-[11px] text-neutral-500">Unidades:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => modificarCantidadCarrito(item.producto.id, -1)}
                            className="p-1 rounded-md bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-neutral-800 min-w-4 text-center">
                            {item.cantidadPedida}
                          </span>
                          <button
                            disabled={item.cantidadPedida >= stockMax}
                            onClick={() => modificarCantidadCarrito(item.producto.id, 1)}
                            className={`p-1 rounded-md bg-white border border-neutral-200 transition-colors ${
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
                    <div className="text-xl font-bold text-neutral-900">${totalCarrito.toFixed(2)}</div>
                    {tasaBcv && (
                      <div className="text-xs text-teal-800 font-bold">
                        ≈ Bs. {formatoBs(totalCarrito)}
                      </div>
                    )}
                  </div>
                </div>

                {totalCarrito >= 25 && (
                  <div className="text-[11px] bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                    <Truck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    ¡Genial! Calificas para <strong>Delivery Gratis</strong>.
                  </div>
                )}

                <button
                  onClick={enviarWhatsApp}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-xs sm:text-sm transition-transform active:scale-[0.99]"
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