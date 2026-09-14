"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Producto, Categoria } from "@/lib/types";
import { useRouter } from "next/navigation";
import { 
  PlusCircle, 
  Upload, 
  Trash2, 
  LogOut, 
  Image as ImageIcon,
  FolderPlus,
  ArrowLeft,
  Edit2,
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  Tag,
  Check,
  Search,
  Share2,
  Download
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const CONDICIONES = [
  "Nuevo", 
  "Usado como nuevo", 
  "Usado", 
  "Muy usado", 
  "Nuevo/Viejito", 
  "Muy viejito"
];
const FUNCIONALIDADES = ["Operativo", "Casi operativo", "Para repuestos"];

async function comprimirImagen(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          "image/jpeg",
          0.75
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export default function AdminDashboard() {
  const [authChecked, setAuthChecked] = useState(false);
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [busquedaAdmin, setBusquedaAdmin] = useState("");
  const router = useRouter();

  // Modo Edición Producto
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Estados del Formulario Producto
  const [titulo, setTitulo] = useState("");
  const [marca, setMarca] = useState("");
  const [condicion, setCondicion] = useState("Usado");
  const [funcionalidad, setFuncionalidad] = useState("Operativo");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [categoriaId, setCategoriaId] = useState("");
  const [enOferta, setEnOferta] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [estadoSubida, setEstadoSubida] = useState("");

  // Modal personalizado
  const [modalInfo, setModalInfo] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  // Generador de Historias
  const [generandoHistoria, setGenerandoHistoria] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Gestión de Categorías
  const [nuevaCat, setNuevaCat] = useState("");
  const [creandoCat, setCreandoCat] = useState(false);
  const [catEditandoId, setCatEditandoId] = useState<string | null>(null);
  const [catEditandoNombre, setCatEditandoNombre] = useState("");

  useEffect(() => {
    verificarSesion();
    const borrador = localStorage.getItem("bazar_draft_form");
    if (borrador) {
      try {
        const data = JSON.parse(borrador);
        setTitulo(data.titulo || "");
        setMarca(data.marca || "");
        setCondicion(data.condicion || "Usado");
        setFuncionalidad(data.funcionalidad || "Operativo");
        setDescripcion(data.descripcion || "");
        setPrecio(data.precio || "");
        setCantidad(data.cantidad || "1");
        setEnOferta(Boolean(data.enOferta));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (!editandoId) {
      const draft = { titulo, marca, condicion, funcionalidad, descripcion, precio, cantidad, enOferta };
      localStorage.setItem("bazar_draft_form", JSON.stringify(draft));
    }
  }, [titulo, marca, condicion, funcionalidad, descripcion, precio, cantidad, enOferta, editandoId]);

  const limpiarBorrador = () => {
    localStorage.removeItem("bazar_draft_form");
  };

  async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/admin/login");
    } else {
      setAuthChecked(true);
      cargarDatos();
    }
  }

  async function cargarDatos() {
    const { data: cats } = await supabase.from("categorias").select("*").order("nombre");
    const { data: prods } = await supabase
      .from("productos")
      .select("*, categorias(*)")
      .order("created_at", { ascending: false });

    if (cats) {
      setCategorias(cats);
      if (cats.length > 0 && !categoriaId) setCategoriaId(cats[0].id);
    }
    if (prods) setProductos(prods);
  }

  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCat.trim()) return;
    setCreandoCat(true);

    const { data, error } = await supabase
      .from("categorias")
      .insert({ nombre: nuevaCat.trim() })
      .select()
      .single();

    if (!error && data) {
      setCategorias([...categorias, data]);
      setNuevaCat("");
      setModalInfo({ title: "Categoría Creada", desc: `Se agregó "${data.nombre}" con éxito.`, type: "success" });
    }
    setCreandoCat(false);
  };

  const handleEditarCategoria = async (id: string) => {
    if (!catEditandoNombre.trim()) return;
    const { error } = await supabase.from("categorias").update({ nombre: catEditandoNombre.trim() }).eq("id", id);
    if (!error) {
      setCategorias(categorias.map((c) => (c.id === id ? { ...c, nombre: catEditandoNombre.trim() } : c)));
      setCatEditandoId(null);
      setCatEditandoNombre("");
    } else {
      alert("Error al actualizar categoría");
    }
  };

  const handleEliminarCategoria = async (id: string, nombre: string) => {
    const prodsEnCat = productos.filter((p) => p.categoria_id === id);
    if (prodsEnCat.length > 0) {
      alert(`No puedes eliminar "${nombre}" porque tiene ${prodsEnCat.length} producto(s) asignado(s).`);
      return;
    }

    if (!confirm(`¿Seguro que deseas eliminar la categoría "${nombre}"?`)) return;

    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (!error) {
      setCategorias(categorias.filter((c) => c.id !== id));
      if (categoriaId === id && categorias.length > 1) {
        setCategoriaId(categorias.find((c) => c.id !== id)?.id || "");
      }
    } else {
      alert("Error al eliminar categoría");
    }
  };

  const handleArchivosSeleccionados = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 5);
      setArchivos(selected);
      const urls = selected.map((file) => URL.createObjectURL(file));
      setPreviews(urls);
    }
  };

  const eliminarFotoSeleccionada = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const definirComoPortada = (index: number) => {
    if (index === 0) return;
    setArchivos((prev) => {
      const item = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [item, ...rest];
    });
    setPreviews((prev) => {
      const item = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [item, ...rest];
    });
  };

  const iniciarEdicion = (item: any) => {
    setEditandoId(item.id);
    setTitulo(item.titulo);
    setMarca(item.marca || "");
    setCondicion(item.condicion || "Usado");
    setFuncionalidad(item.funcionalidad || "Operativo");
    setDescripcion(item.descripcion || "");
    setPrecio(String(item.precio));
    setCantidad(String(item.cantidad ?? 1));
    setCategoriaId(item.categoria_id || (categorias[0]?.id ?? ""));
    setEnOferta(Boolean(item.en_oferta));
    setArchivos([]);
    setPreviews(item.fotos || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setTitulo("");
    setMarca("");
    setCondicion("Usado");
    setFuncionalidad("Operativo");
    setDescripcion("");
    setPrecio("");
    setCantidad("1");
    setEnOferta(false);
    setArchivos([]);
    setPreviews([]);
    limpiarBorrador();
  };

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !precio || !categoriaId) return;
    setSubiendo(true);
    setEstadoSubida("Procesando fotos...");

    try {
      let urlsFotos: string[] = [];

      if (archivos.length > 0) {
        for (let i = 0; i < archivos.length; i++) {
          setEstadoSubida(`Subiendo foto ${i + 1} de ${archivos.length}...`);
          const file = archivos[i];
          const blobComprimido = await comprimirImagen(file);
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

          let uploadError = null;
          let intento = 0;
          while (intento < 2) {
            const res = await supabase.storage
              .from("productos")
              .upload(fileName, blobComprimido, {
                contentType: "image/jpeg",
                upsert: false
              });
            uploadError = res.error;
            if (!uploadError) break;
            intento++;
            await new Promise((r) => setTimeout(r, 1000));
          }

          if (uploadError) {
            throw new Error(`No se pudo subir la foto ${i + 1}: ${uploadError.message}`);
          }

          const { data } = supabase.storage.from("productos").getPublicUrl(fileName);
          urlsFotos.push(data.publicUrl);
        }
      }

      setEstadoSubida("Guardando en inventario...");

      const payload: any = {
        titulo: titulo.trim(),
        marca: marca.trim() || null,
        condicion,
        funcionalidad,
        descripcion: descripcion.trim() || null,
        precio: parseFloat(precio),
        cantidad: Math.max(0, parseInt(cantidad) || 1),
        categoria_id: categoriaId,
        en_oferta: enOferta,
      };

      if (editandoId) {
        const prodExistente = productos.find((p) => p.id === editandoId);
        if (urlsFotos.length > 0) {
          payload.fotos = urlsFotos;
        } else if (previews.length > 0 && prodExistente) {
          payload.fotos = previews;
        }

        const { error: updateError } = await supabase.from("productos").update(payload).eq("id", editandoId);
        if (updateError) throw updateError;
        cancelarEdicion();
      } else {
        payload.fotos = urlsFotos;
        payload.estado = "disponible";

        const { error: insertError } = await supabase.from("productos").insert(payload);
        if (insertError) throw insertError;
        cancelarEdicion();
      }

      limpiarBorrador();
      await cargarDatos();
      setModalInfo({
        title: "¡Guardado con éxito!",
        desc: "El artículo ha sido registrado en el catálogo del bazar.",
        type: "success"
      });
    } catch (err: any) {
      console.error(err);
      setModalInfo({
        title: "Error al guardar",
        desc: err.message || "Hubo un problema de conexión. Inténtalo de nuevo.",
        type: "error"
      });
    } finally {
      setSubiendo(false);
      setEstadoSubida("");
    }
  };

  // Ciclo de estados: Disponible -> Reservado -> Vendido -> Disponible
  const rotarEstado = async (id: string, estadoActual: string) => {
    let nuevoEstado = "reservado";
    if (estadoActual === "reservado") nuevoEstado = "vendido";
    else if (estadoActual === "vendido") nuevoEstado = "disponible";

    await supabase.from("productos").update({ estado: nuevoEstado }).eq("id", id);
    cargarDatos();
  };

  const eliminarProducto = async (id: string) => {
    if (!confirm("¿Eliminar este artículo del inventario?")) return;

    const prodAEliminar = productos.find((p) => p.id === id);
    if (prodAEliminar && prodAEliminar.fotos && prodAEliminar.fotos.length > 0) {
      const pathsParaBorrar = prodAEliminar.fotos
        .map((url: string) => {
          const parts = url.split("/productos/");
          return parts.length > 1 ? parts[1] : null;
        })
        .filter((p: string | null): p is string => Boolean(p));

      if (pathsParaBorrar.length > 0) {
        await supabase.storage.from("productos").remove(pathsParaBorrar);
      }
    }

    await supabase.from("productos").delete().eq("id", id);
    cargarDatos();
  };

  // Generador de historias para Instagram / WhatsApp (Canvas 1080x1080)
  const generarHistoria = async (prod: any) => {
    setGenerandoHistoria(true);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fondo degradado nórdico
    const grad = ctx.createLinearGradient(0, 0, 0, 1080);
    grad.addColorStop(0, "#e8f7fa");
    grad.addColorStop(0.5, "#f4fafb");
    grad.addColorStop(1, "#ffffff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Cabecera de marca
    ctx.fillStyle = "#0092B8";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("EL BAZAR CUBIDES", 60, 90);

    ctx.fillStyle = "#64748b";
    ctx.font = "24px sans-serif";
    ctx.fillText("VENTA DE GARAJE ONLINE", 60, 130);

    // Tarjeta blanca central
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.08)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    ctx.beginPath();
    ctx.roundRect(60, 170, 960, 680, 36);
    ctx.fill();
    ctx.shadowColor = "transparent";

    // Cargar imagen de portada
    const imgUrl = prod.fotos?.[0] || "/placeholder.png";
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;

    await new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 100, 210, 880, 600);
        resolve(true);
      };
      img.onerror = () => resolve(false);
    });

    // Barra inferior informativa
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText(prod.titulo.slice(0, 36), 60, 930);

    ctx.fillStyle = "#0092B8";
    ctx.font = "900 64px sans-serif";
    ctx.fillText(`$${Number(prod.precio).toFixed(2)}`, 60, 1010);

    ctx.fillStyle = "#059669";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("Envío disponible en Caracas", 640, 1010);

    // Descargar PNG
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `bazar-${prod.titulo.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
    setGenerandoHistoria(false);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const productosFiltradosAdmin = productos.filter((p) => {
    const q = busquedaAdmin.toLowerCase();
    return p.titulo.toLowerCase().includes(q) || (p.marca && p.marca.toLowerCase().includes(q));
  });

  if (!authChecked) {
    return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center text-xs">Cargando administrador...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-neutral-800 font-sans pb-28 relative">
      <header className="sticky top-0 z-30 bg-teal-800 text-white px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-teal-200 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-sm sm:text-base">Panel de Inventario</h1>
          </div>
          <button
            onClick={cerrarSesion}
            className="text-xs bg-teal-900/60 hover:bg-teal-900 text-teal-200 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-teal-700"
          >
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-4 space-y-5">
        {/* 1. FORMULARIO PRINCIPAL */}
        <div className="bg-white border border-neutral-200 p-4 sm:p-5 rounded-2xl shadow-2xs">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              {editandoId ? (
                <>
                  <Edit2 className="w-4 h-4 text-amber-500" /> Editando Producto
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-[#0092B8]" /> Publicar Nuevo Ítem
                </>
              )}
            </h2>
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleGuardarProducto} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Nombre / Título *</label>
              <input
                type="text"
                required
                placeholder="Ej: Plancha de vapor, Juego de copas..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 mb-1">Precio ($ USD) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="15"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 mb-1">Stock *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 mb-1">Marca (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Oster, Sony..."
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 mb-1">Categoría *</label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opción En Oferta */}
              <div className="pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setEnOferta(!enOferta)}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                    enOferta
                      ? "bg-amber-50 border-amber-300 text-amber-900 shadow-2xs"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Tag className={`w-3.5 h-3.5 ${enOferta ? "text-amber-600" : "text-neutral-400"}`} />
                    Destacar como "En Oferta"
                  </span>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    enOferta ? "bg-amber-500 text-white" : "bg-neutral-300 text-transparent"
                  }`}>
                    ✓
                  </span>
                </button>
              </div>
            </div>

            {/* Cápsulas de Condición ampliadas */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">Condición del Producto</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {CONDICIONES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCondicion(c)}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-medium border transition-all ${
                      condicion === c
                        ? "bg-[#0092B8] text-white border-[#0092B8]"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Cápsulas de Funcionalidad */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">Funcionalidad</label>
              <div className="grid grid-cols-3 gap-1.5">
                {FUNCIONALIDADES.map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFuncionalidad(f)}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-medium border transition-all ${
                      funcionalidad === f
                        ? "bg-teal-700 text-white border-teal-700"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Detalles o Faltantes (Opcional)</label>
              <textarea
                rows={2}
                placeholder="Ej: Funciona perfecto, solo le falta la caja original..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#0092B8]"
              />
            </div>

            {/* Subida de Fotos con Portada */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                Fotos (Toca una foto para definir Portada)
              </label>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 hover:border-[#0092B8] rounded-xl p-3 cursor-pointer bg-neutral-50 transition-colors">
                <Upload className="w-5 h-5 text-neutral-400 mb-1" />
                <span className="text-xs text-neutral-600 font-medium">Toca para tomar fotos o elegirlas</span>
                <span className="text-[10px] text-neutral-400">Hasta 5 fotos (se optimizan automáticamente)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleArchivosSeleccionados}
                  className="hidden"
                />
              </label>

              {previews.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-teal-800 font-medium px-0.5">
                    <span>{previews.length} foto(s) • La primera es la portada</span>
                    <button
                      type="button"
                      onClick={() => {
                        setArchivos([]);
                        setPreviews([]);
                      }}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Quitar todas
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {previews.map((src, index) => (
                      <div 
                        key={index} 
                        onClick={() => definirComoPortada(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all shadow-2xs group ${
                          index === 0 ? "border-[#0092B8] ring-2 ring-[#0092B8]/20" : "border-neutral-300 hover:border-neutral-400"
                        }`}
                        title="Toca para definir como portada"
                      >
                        <img
                          src={src}
                          alt={`Previsualización ${index + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {index === 0 ? (
                          <span className="absolute top-1 left-1 bg-[#0092B8] text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-xs">
                            <Star className="w-2.5 h-2.5 fill-current" /> Portada
                          </span>
                        ) : (
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-[8px] font-medium px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Hacer portada
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarFotoSeleccionada(index);
                          }}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                          title="Quitar foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-white bg-black/60 px-1 rounded">
                          #{index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={subiendo}
              className="w-full py-3 bg-[#0092B8] hover:bg-[#007f9f] text-white font-extrabold rounded-xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              {subiendo ? (estadoSubida || "Guardando...") : editandoId ? "Actualizar Producto" : "Publicar en el Bazar"}
            </button>
          </form>
        </div>

        {/* 2. INVENTARIO CON BUSCADOR Y GENERADOR DE HISTORIAS */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Inventario ({productosFiltradosAdmin.length})
            </h2>

            {/* Buscador de inventario */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar en inventario..."
                value={busquedaAdmin}
                onChange={(e) => setBusquedaAdmin(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none focus:border-[#0092B8]"
              />
              {busquedaAdmin && (
                <button
                  onClick={() => setBusquedaAdmin("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {productosFiltradosAdmin.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-11 h-11 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                    {item.fotos && item.fotos[0] ? (
                      <Image src={item.fotos[0]} alt={item.titulo} fill className="object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-neutral-400 m-auto" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-xs truncate text-neutral-900">{item.titulo}</p>
                      {item.en_oferta && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded shrink-0">
                          Oferta
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                      <span className="text-[#0092B8] font-black">${Number(item.precio).toFixed(2)}</span>
                      <span>•</span>
                      <span className="bg-neutral-100 text-neutral-700 px-1 rounded font-semibold">
                        Stock: {item.cantidad ?? 1}
                      </span>
                      <span>•</span>
                      <span>{item.condicion || "Usado"}</span>
                      {item.marca && <span>• {item.marca}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Generador de Imagen para Stories */}
                  <button
                    onClick={() => generarHistoria(item)}
                    disabled={generandoHistoria}
                    className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Descargar imagen para historia de Instagram / WhatsApp"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => iniciarEdicion(item)}
                    className="p-1.5 text-neutral-500 hover:text-[#0092B8] hover:bg-cyan-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Botón de 3 Estados: Disponible -> Reservado -> Vendido */}
                  <button
                    onClick={() => rotarEstado(item.id, item.estado)}
                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${
                      item.estado === "vendido"
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : item.estado === "reservado"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-teal-50 text-teal-700 border border-teal-200"
                    }`}
                    title="Toca para alternar: Disp. -> Reservado -> Vendido"
                  >
                    {item.estado === "vendido" ? "Vendido" : item.estado === "reservado" ? "Reservado" : "Disp."}
                  </button>

                  <button
                    onClick={() => eliminarProducto(item.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. GESTIÓN DE CATEGORÍAS (Al final) */}
        <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-[#0092B8]" /> Categorías ({categorias.length})
            </h2>
          </div>

          <form onSubmit={handleCrearCategoria} className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva categoría (Ej: Coleccionables, Ropa)..."
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
              className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#0092B8]"
            />
            <button
              type="submit"
              disabled={creandoCat}
              className="px-3.5 py-1.5 bg-[#0092B8] hover:bg-[#007f9f] text-white text-xs font-bold rounded-xl"
            >
              {creandoCat ? "..." : "Agregar"}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {categorias.map((cat) => (
              <div 
                key={cat.id} 
                className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs"
              >
                {catEditandoId === cat.id ? (
                  <div className="flex items-center gap-1 flex-1 mr-1">
                    <input
                      type="text"
                      value={catEditandoNombre}
                      onChange={(e) => setCatEditandoNombre(e.target.value)}
                      className="w-full bg-white border border-[#0092B8] px-2 py-0.5 rounded text-xs outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleEditarCategoria(cat.id)}
                      className="p-1 bg-[#0092B8] text-white rounded hover:bg-[#007f9f]"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatEditandoId(null)}
                      className="p-1 text-neutral-400 hover:text-neutral-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-neutral-800 truncate">{cat.nombre}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCatEditandoId(cat.id);
                          setCatEditandoNombre(cat.nombre);
                        }}
                        className="p-1 text-neutral-400 hover:text-[#0092B8] transition-colors"
                        title="Editar nombre"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarCategoria(cat.id, cat.nombre)}
                        className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal Personalizado */}
      {modalInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center space-y-4 border border-neutral-200 animate-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
              modalInfo.type === 'success' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-600'
            }`}>
              {modalInfo.type === 'success' ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <AlertCircle className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-neutral-900">{modalInfo.title}</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">{modalInfo.desc}</p>
            </div>

            <button
              onClick={() => setModalInfo(null)}
              className="w-full py-2.5 bg-[#0092B8] hover:bg-[#007f9f] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}