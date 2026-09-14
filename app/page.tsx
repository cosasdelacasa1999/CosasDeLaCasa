"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Sparkle,
  HelpCircle,
  Maximize2,
  Send,
  MapPin,
  CreditCard,
  Store,
  ArrowUp,
  Clock
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
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
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

  // Modales
  const [infoModalAbierto, setInfoModalAbierto] = useState(false);
  const [fotoFullscreen, setFotoFullscreen] = useState<string | null>(null);
  const [confirmarPedidoAbierto, setConfirmarPedidoAbierto] = useState(false);
  const [nombreCliente, setNombreCliente] = useState("");
  const [zonaEntrega, setZonaEntrega] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo en Dólares ($)");

  // Animaciones y Scroll to top
  const [mostrarScrollTop, setMostrarScrollTop] = useState(false);
  const [carritoRebote, setCarritoRebote] = useState(false);
  const [productoAgregadoId, setProductoAgregadoId] = useState<string | null>(null);

  // Swipe táctil en modal
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Tasa BCV
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);

  useEffect(() => {
    const cachedProds = localStorage.getItem("bazar_prods_cache");
    const cachedCats = localStorage.getItem("bazar_cats_cache");

    if (cachedProds && cachedCats) {
      try {
        setProductos(JSON.parse(cachedProds));
        setCategorias(JSON.parse(cachedCats));
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    }

    cargarDatosFrescos();

    const handleScroll = () => {
      setMostrarScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function obtenerTasaBCVFresca(): Promise<number | null> {
    try {
      const res = await fetch(`/api/bcv?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const valor = Number(data.promedio);
        if (!isNaN(valor) && valor > 0) return valor;
      }
    } catch (err) {
      console.warn("Fallo endpoint interno /api/bcv:", err);
    }

    try {
      const resCdn = await fetch(`https://rates.dolarvzla.com/bcv/current.json?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (resCdn.ok) {
        const data = await resCdn.json();
        const valor = Number(data?.current?.usd ?? data?.usd ?? data?.price);
        if (!isNaN(valor) && valor > 0) return valor;
      }
    } catch (err) {
      console.error("Fallo directo rates.dolarvzla.com:", err);
    }

    return null;
  }

  async function cargarDatosFrescos() {
    try {
      const [catsRes, prodsRes, tasaCalculada] = await Promise.allSettled([
        supabase.from("categorias").select("*").order("nombre"),
        supabase.from("productos").select("*, categorias(*)").order("created_at", { ascending: false }),
        obtenerTasaBCVFresca(),
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

      if (tasaCalculada.status === "fulfilled" && tasaCalculada.value) {
        setTasaBcv(tasaCalculada.value);
        localStorage.setItem("bazar_bcv_cache", String(tasaCalculada.value));
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
      if (fotoFullscreen) {
        setFotoFullscreen(null);
      } else if (confirmarPedidoAbierto) {
        setConfirmarPedidoAbierto(false);
      } else if (infoModalAbierto) {
        setInfoModalAbierto(false);
      } else if (productoSeleccionado) {
        setProductoSeleccionado(null);
      } else if (carritoAbierto) {
        setCarritoAbierto(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [fotoFullscreen, confirmarPedidoAbierto, infoModalAbierto, productoSeleccionado, carritoAbierto]);

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

  const formatoBs = (montoUsd: number) => {
    if (!tasaBcv) return null;
    const totalBs = montoUsd * tasaBcv;
    return new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalBs);
  };

  const dispararEfectoCarrito = (id: string) => {
    setProductoAgregadoId(id);
    setCarritoRebote(true);
    setTimeout(() => setProductoAgregadoId(null), 1200);
    setTimeout(() => setCarritoRebote(false), 600);
  };

  const agregarAlCarrito = (producto: Producto, cant: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (producto.estado === "vendido" || (producto as any).estado === "reservado" || (producto.cantidad ?? 1) <= 0) return;

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

    dispararEfectoCarrito(producto.id);
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

  // Swipe táctil en fotos
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !productoSeleccionado?.fotos) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;

    if (isLeftSwipe) {
      setModalFotoIndex((prev) => (prev + 1) % productoSeleccionado.fotos.length);
    } else if (isRightSwipe) {
      setModalFotoIndex((prev) => (prev - 1 + productoSeleccionado.fotos.length) % productoSeleccionado.fotos.length);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const enviarPedidoWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const telefono = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "584120000000";
    
    let texto = `*¡Hola! Quiero confirmar un pedido en El Bazar Cubides:*\n\n`;
    texto += `*Cliente:* ${nombreCliente.trim()}\n`;
    texto += `*Zona de entrega:* ${zonaEntrega.trim()}\n`;
    texto += `*Método de pago:* ${metodoPago}\n\n`;
    texto += `*Artículos solicitados:*\n`;

    carrito.forEach((item, index) => {
      const subtotal = Number(item.producto.precio) * item.cantidadPedida;
      const subtotalBs = tasaBcv ? ` (Aprox. Bs. ${formatoBs(subtotal)})` : "";
      texto += `${index + 1}. *${item.producto.titulo}* ${item.producto.marca ? `(${item.producto.marca})` : ""} - Cant: ${item.cantidadPedida} x $${Number(item.producto.precio).toFixed(2)} = *$${subtotal.toFixed(2)}*${subtotalBs}\n`;
    });

    texto += `\n*Total a pagar:* $${totalCarrito.toFixed(2)}`;
    if (tasaBcv) {
      texto += ` (Aprox. Bs. ${formatoBs(totalCarrito)} tasa BCV)`;
    }
    
    if (totalCarrito >= 25) {
      texto += "\n✨ *(Califica para Delivery Gratis en zonas céntricas de Caracas)*";
    }

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
    setConfirmarPedidoAbierto(false);
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

  const baseRecientes = productos.slice(0, 6);
  const itemsMarquee = baseRecientes.length > 0 
    ? Array(Math.max(6, Math.ceil(12 / baseRecientes.length))).fill(baseRecientes).flat()
    : [];

  const faltaParaDelivery = Math.max(0, 25 - totalCarrito);
  const porcentajeDelivery = Math.min(100, (totalCarrito / 25) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f7fa] via-[#f4fafb] to-white text-neutral-900 selection:bg-[#0092B8] selection:text-white pb-20 relative flex flex-col justify-between font-sans">
      
      {/* Patrón de micropuntos */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: `radial-gradient(#0092B8 0.75px, transparent 0.75px)`,
          backgroundSize: '16px 16px'
        }}
      />
      
      {copiadoToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl animate-in fade-in duration-150">
          Enlace copiado al portapapeles
        </div>
      )}

      <div>
        {/* Banner Superior 100% Horizontal */}
        <div className="bg-gradient-to-r from-[#0092B8] via-[#0081a2] to-[#e6b849] text-white text-xs py-1.5 px-3 sm:px-4 shadow-xs relative z-40 overflow-hidden">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 whitespace-nowrap flex-nowrap text-[10.5px] sm:text-xs">
            <button 
              onClick={() => setInfoModalAbierto(true)}
              className="flex items-center gap-1.5 hover:opacity-90 transition-opacity truncate"
            >
              <Truck className="w-3.5 h-3.5 text-amber-200 animate-bounce shrink-0" />
              <span className="truncate"><strong>Delivery Gratis</strong> desde $25 (Ccs céntrico)</span>
            </button>

            <div className="flex items-center gap-1 bg-black/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full shrink-0 text-[10px] sm:text-xs font-mono">
              <Coins className="w-3 h-3 text-teal-200 shrink-0" />
              <span className="font-bold">
                BCV: {tasaBcv ? `Bs. ${tasaBcv.toFixed(2)}` : "Actualizando..."}
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
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
                <p className="text-[10px] text-[#0092B8] font-bold tracking-wider uppercase">Venta de garaje online</p>
              </div>
            </div>

            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar artículos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-neutral-100 focus:bg-white border border-transparent focus:border-[#0092B8] rounded-full text-xs outline-none transition-all"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 p-1 rounded-full text-neutral-400 hover:text-neutral-700 bg-neutral-200/60 hover:bg-neutral-200 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={abrirCarrito}
              className={`relative p-2.5 bg-[#0092B8] hover:bg-[#007f9f] text-white rounded-full transition-all shrink-0 shadow-sm shadow-[#0092B8]/25 active:scale-110 ${
                carritoRebote ? "scale-125 bg-emerald-600 transition-transform duration-200" : ""
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {totalArticulos > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-neutral-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalArticulos}
                </span>
              )}
            </button>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-1 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setCategoriaSeleccionada("todas")}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium text-xs transition-all ${
                  categoriaSeleccionada === "todas"
                    ? "bg-[#0092B8] text-white shadow-xs"
                    : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50"
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
                        : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50"
                    }`}
                  >
                    {cat.nombre} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-0.5 scrollbar-none text-[11px] border-t border-neutral-200/40">
              <button
                type="button"
                onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
                className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-all shrink-0 shadow-2xs ${
                  filtrosAbiertos || rangoPrecioSeleccionado !== "todos"
                    ? "bg-[#0092B8] text-white"
                    : "bg-white text-neutral-700 border border-neutral-200/80 hover:bg-neutral-50"
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Filtrar precio</span>
                {rangoPrecioSeleccionado !== "todos" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                )}
              </button>

              {filtrosAbiertos && (
                <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-150">
                  {RANGOS_PRECIO.map((rango) => (
                    <button
                      key={rango.id}
                      onClick={() => setRangoPrecioSeleccionado(rango.id)}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium text-[11px] transition-all ${
                        rangoPrecioSeleccionado === rango.id
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50"
                      }`}
                    >
                      {rango.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Carrusel Loop Infinito */}
        {itemsMarquee.length > 0 && !busqueda && categoriaSeleccionada === "todas" && (
          <section className="pt-4 pb-2 overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkle className="w-3.5 h-3.5 text-[#0092B8]" />
                <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Últimos productos agregados
                </h2>
              </div>
            </div>

            <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]">
              <div className="animate-marquee flex gap-3 py-1">
                {itemsMarquee.map((item: any, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => abrirModalProducto(item)}
                    className="w-40 sm:w-48 shrink-0 bg-white rounded-2xl border border-neutral-200/80 p-2.5 shadow-2xs hover:border-[#0092B8] cursor-pointer transition-all flex items-center gap-2.5 relative"
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
                    {item.en_oferta && (
                      <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-500 shadow-xs" title="En oferta" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cuadrícula Principal */}
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
              {productosFiltrados.map((prod: any) => {
                const stock = prod.cantidad ?? 1;
                const esVendido = prod.estado === "vendido" || stock <= 0;
                const esReservado = prod.estado === "reservado";
                const enCarrito = carrito.some((item) => item.producto.id === prod.id);
                const fotos = prod.fotos && prod.fotos.length > 0 ? prod.fotos : ["/placeholder.png"];
                const recienAgregado = productoAgregadoId === prod.id;

                return (
                  <div
                    key={prod.id}
                    onClick={() => abrirModalProducto(prod)}
                    className={`group bg-white rounded-3xl border overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md ${
                      esVendido 
                        ? "border-red-200/70 opacity-60 bg-red-50/10" 
                        : esReservado
                        ? "border-amber-300/80 bg-amber-50/15"
                        : prod.en_oferta
                        ? "border-amber-300 hover:border-amber-400"
                        : "border-neutral-200/80 hover:border-[#0092B8]/50"
                    }`}
                  >
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

                      <button
                        onClick={(e) => compartirProducto(prod, e)}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 hover:bg-white text-neutral-600 rounded-full shadow-xs backdrop-blur-xs transition-transform active:scale-90"
                        title="Compartir"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Badge Oferta */}
                      {!esVendido && !esReservado && prod.en_oferta && (
                        <div className="absolute bottom-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                          Oferta
                        </div>
                      )}

                      {/* Badge Reservado */}
                      {!esVendido && esReservado && (
                        <div className="absolute inset-0 bg-amber-500/75 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-white text-[10px] font-black tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded-full">
                            Reservado
                          </span>
                        </div>
                      )}

                      {/* Badge Vendido */}
                      {esVendido && (
                        <div className="absolute inset-0 bg-red-600/75 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-white text-[10px] font-black tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded-full">
                            Vendido
                          </span>
                        </div>
                      )}

                      {/* Badge Stock */}
                      {!esVendido && !esReservado && stock > 1 && (
                        <div className="absolute top-2.5 left-2.5 bg-neutral-900/80 backdrop-blur-xs text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          {stock} disp.
                        </div>
                      )}
                    </div>

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
                          <div className="text-sm sm:text-base font-semibold text-[#0092B8] leading-none flex items-center gap-1.5">
                            <span>${Number(prod.precio).toFixed(2)}</span>
                          </div>
                          {tasaBcv && (
                            <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
                              Bs. {formatoBs(Number(prod.precio))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        disabled={esVendido || esReservado}
                        onClick={(e) => agregarAlCarrito(prod, 1, e)}
                        className={`w-full py-2 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          esVendido || esReservado
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                            : recienAgregado
                            ? "bg-emerald-600 text-white scale-[1.02]"
                            : enCarrito
                            ? "bg-teal-50 text-teal-800 border border-teal-200"
                            : "bg-[#0092B8] hover:bg-[#007f9f] text-white shadow-xs shadow-[#0092B8]/20 active:scale-95"
                        }`}
                      >
                        {esVendido ? "Agotado" : esReservado ? "Apartado" : recienAgregado ? <CheckCircle2 className="w-3.5 h-3.5" /> : enCarrito ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{esVendido ? "" : esReservado ? "Reservado" : recienAgregado ? "¡Agregado!" : enCarrito ? "Agregado" : "Agregar"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Botón Flotante Scroll to Top */}
      {mostrarScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-5 z-40 p-3 bg-white/90 hover:bg-white text-neutral-800 rounded-full shadow-lg border border-neutral-200/80 backdrop-blur-md transition-all active:scale-90"
          title="Subir al inicio"
        >
          <ArrowUp className="w-4 h-4 text-[#0092B8]" />
        </button>
      )}

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-12 pb-4 text-neutral-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200/60 mt-8 relative z-10">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <p className="text-[11px]">
            © {new Date().getFullYear()} El Bazar Cubides • Caracas, Venezuela
          </p>
          <button
            onClick={() => setInfoModalAbierto(true)}
            className="text-[11px] font-bold text-[#0092B8] hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Cómo comprar & Entregas</span>
          </button>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-900 bg-white hover:bg-neutral-100 px-3 py-1.5 rounded-full transition-colors font-medium border border-neutral-200/80 shadow-2xs"
        >
          <Lock className="w-3 h-3 text-neutral-400" />
          <span>Acceso Administrador</span>
        </Link>
      </footer>

      {/* Modal Ficha de Producto con mayor amplitud vertical */}
      {productoSeleccionado && (
        <div 
          onClick={cerrarModalProducto}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-[2.2rem] sm:rounded-3xl h-[96vh] sm:h-auto sm:max-h-[94vh] overflow-y-auto flex flex-col shadow-2xl border border-neutral-200/90 animate-in slide-in-from-bottom duration-200"
          >
            <div className="px-5 py-3 border-b border-neutral-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-md z-20">
              <span className="text-[10px] font-bold tracking-widest text-[#0092B8] uppercase bg-[#0092B8]/10 px-3 py-1 rounded-full">
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

            {/* Contenedor de Imagen con Swipe Táctil */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                const fotoActual = productoSeleccionado.fotos?.[modalFotoIndex] || productoSeleccionado.fotos?.[0];
                if (fotoActual) setFotoFullscreen(fotoActual);
              }}
              className="relative aspect-4/3 w-full bg-[#f4f5f7] flex items-center justify-center overflow-hidden shrink-0 cursor-zoom-in group select-none"
            >
              {productoSeleccionado.fotos && productoSeleccionado.fotos.length > 0 ? (
                <Image
                  src={productoSeleccionado.fotos[modalFotoIndex] || productoSeleccionado.fotos[0]}
                  alt={productoSeleccionado.titulo}
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, 500px"
                  className="object-contain p-4 select-none pointer-events-none"
                />
              ) : (
                <div className="text-neutral-400 text-xs">Sin fotos disponibles</div>
              )}

              <div className="absolute top-3 left-3 bg-black/40 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-3 h-3" />
                <span>Ampliar foto</span>
              </div>

              {productoSeleccionado.fotos && productoSeleccionado.fotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalFotoIndex((prev) => (prev - 1 + productoSeleccionado.fotos.length) % productoSeleccionado.fotos.length);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white text-neutral-800 rounded-full shadow-md transition-all active:scale-90"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalFotoIndex((prev) => (prev + 1) % productoSeleccionado.fotos.length);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white text-neutral-800 rounded-full shadow-md transition-all active:scale-90"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                    {modalFotoIndex + 1} / {productoSeleccionado.fotos.length}
                  </div>
                </>
              )}
            </div>

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
                    <div className="text-xl sm:text-2xl font-bold text-[#0092B8] leading-none">
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
                {(productoSeleccionado as any).en_oferta && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                    En Oferta
                  </span>
                )}
                {(productoSeleccionado as any).estado === 'reservado' && (
                  <span className="px-3 py-1 bg-amber-500 text-white font-bold rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Apartado / Reservado
                  </span>
                )}
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

              {productoSeleccionado.descripcion && (
                <div className="pt-2 border-t border-neutral-100">
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed whitespace-pre-line font-normal">
                    {productoSeleccionado.descripcion}
                  </p>
                </div>
              )}

              {productoSeleccionado.estado !== 'vendido' && (productoSeleccionado as any).estado !== 'reservado' && (productoSeleccionado.cantidad ?? 1) > 1 && (
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70">
                  <span className="text-xs font-semibold text-neutral-700">Cantidad a llevar:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCantidadModal(Math.max(1, cantidadModal - 1))}
                      className="p-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-neutral-900 min-w-4 text-center">
                      {cantidadModal}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCantidadModal(Math.min(productoSeleccionado.cantidad ?? 1, cantidadModal + 1))}
                      className="p-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <button
                disabled={productoSeleccionado.estado === 'vendido' || (productoSeleccionado as any).estado === 'reservado' || (productoSeleccionado.cantidad ?? 1) <= 0}
                onClick={() => {
                  agregarAlCarrito(productoSeleccionado, cantidadModal);
                  cerrarModalProducto();
                  abrirCarrito();
                }}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] ${
                  productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0
                    ? "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"
                    : (productoSeleccionado as any).estado === 'reservado'
                    ? "bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed"
                    : "bg-[#0092B8] hover:bg-[#007f9f] text-white shadow-[#0092B8]/25"
                }`}
              >
                {productoSeleccionado.estado === 'vendido' || (productoSeleccionado.cantidad ?? 1) <= 0 ? (
                  "Artículo no disponible"
                ) : (productoSeleccionado as any).estado === 'reservado' ? (
                  "Artículo Apartado"
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

            {carrito.length > 0 && (
              <div className="mt-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  {faltaParaDelivery > 0 ? (
                    <span className="text-neutral-700">
                      Agrega <strong className="text-[#0092B8]">${faltaParaDelivery.toFixed(2)}</strong> más para <strong>Delivery Gratis</strong> en Caracas
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" /> ¡Desbloqueaste Delivery Gratis!
                    </span>
                  )}
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#0092B8] to-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${porcentajeDelivery}%` }}
                  />
                </div>
              </div>
            )}

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
                            <Minus className="w-3.5 h-3.5" />
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
                            <Plus className="w-3.5 h-3.5" />
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

                <button
                  onClick={() => setConfirmarPedidoAbierto(true)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-xs sm:text-sm transition-transform active:scale-[0.99]"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Continuar con el Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación previo a WhatsApp */}
      {confirmarPedidoAbierto && (
        <div 
          onClick={() => setConfirmarPedidoAbierto(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-extrabold text-neutral-900 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#0092B8]" />
                Datos de tu Entrega
              </h3>
              <button 
                onClick={() => setConfirmarPedidoAbierto(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={enviarPedidoWhatsApp} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">Tu Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alejandro Cubides"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">Zona o Punto de Entrega (Caracas)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Chacao, La Candelaria, Sabana Grande..."
                  value={zonaEntrega}
                  onChange={(e) => setZonaEntrega(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">Método de Pago</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
                >
                  <option value="Efectivo en Dólares ($)">Efectivo en Dólares ($)</option>
                  <option value="Binance USDT">Binance USDT</option>
                  <option value="Pago Móvil (Tasa BCV)">Pago Móvil (Tasa BCV)</option>
                </select>
              </div>

              <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-200/60 text-[11px] text-teal-900 leading-tight">
                Total: <strong>${totalCarrito.toFixed(2)}</strong> {tasaBcv && `(Aprox. Bs. ${formatoBs(totalCarrito)})`}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-[0.99]"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                Abrir WhatsApp con mi Pedido
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pantalla Completa para Fotos */}
      {fotoFullscreen && (
        <div 
          onClick={() => setFotoFullscreen(null)}
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 animate-in fade-in duration-200"
        >
          <button 
            onClick={() => setFotoFullscreen(null)}
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full z-10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative w-full h-[85vh] max-w-2xl flex items-center justify-center">
            <Image
              src={fotoFullscreen}
              alt="Foto ampliada"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}

      {/* Modal: Cómo Comprar / Entregas en Caracas */}
      {infoModalAbierto && (
        <div 
          onClick={() => setInfoModalAbierto(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#0092B8]" />
                ¿Cómo Funciona el Bazar?
              </h3>
              <button 
                onClick={() => setInfoModalAbierto(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-neutral-600 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-[#0092B8] shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Venta de Garaje Online</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    <strong>No somos una tienda física.</strong> Este catálogo reúne artículos personales, tesoros y cosas de la casa en venta directa.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-[#0092B8] shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Entregas en Caracas</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Coordinamos entregas personales en zonas céntricas y de fácil acceso (Chacao, Sabana Grande, La Candelaria, Bellas Artes y estaciones de metro).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Delivery Gratis</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    ¡Aplica automáticamente en compras a partir de <strong>$25</strong> en zonas céntricas de Caracas!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Métodos de Pago</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Aceptamos <strong>Efectivo en Dólares</strong> (billetes en buen estado), <strong>Binance USDT</strong> y <strong>Pago Móvil</strong> (calculado a tasa oficial BCV).
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setInfoModalAbierto(false)}
              className="w-full py-2.5 bg-neutral-900 text-white font-bold rounded-xl text-xs hover:bg-[#0092B8] transition-colors shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}