"use client";

import { useEffect, useState } from "react";
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
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const CONDICIONES = ["Nuevo", "Usado como nuevo", "Usado", "Muy usado"];
const FUNCIONALIDADES = ["Operativo", "Casi operativo", "Para repuestos"];

// Utilidad para comprimir fotos del móvil antes de subir a Supabase
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
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const router = useRouter();

  // Modo Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Estados del Formulario (con recuperación de localStorage)
  const [titulo, setTitulo] = useState("");
  const [marca, setMarca] = useState("");
  const [condicion, setCondicion] = useState("Usado");
  const [funcionalidad, setFuncionalidad] = useState("Operativo");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [categoriaId, setCategoriaId] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [estadoSubida, setEstadoSubida] = useState("");

  // Modal personalizado bonito
  const [modalInfo, setModalInfo] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  // Nueva Categoría
  const [nuevaCat, setNuevaCat] = useState("");
  const [creandoCat, setCreandoCat] = useState(false);

  useEffect(() => {
    verificarSesion();
    // Recuperar borrador si existía
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
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Guardar borrador automáticamente en localStorage ante cualquier cambio
  useEffect(() => {
    if (!editandoId) {
      const draft = { titulo, marca, condicion, funcionalidad, descripcion, precio, cantidad };
      localStorage.setItem("bazar_draft_form", JSON.stringify(draft));
    }
  }, [titulo, marca, condicion, funcionalidad, descripcion, precio, cantidad, editandoId]);

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
    if (prods) setProductos(prods as Producto[]);
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
      setCategoriaId(data.id);
      setNuevaCat("");
    }
    setCreandoCat(false);
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

  const iniciarEdicion = (item: Producto) => {
    setEditandoId(item.id);
    setTitulo(item.titulo);
    setMarca(item.marca || "");
    setCondicion(item.condicion || "Usado");
    setFuncionalidad(item.funcionalidad || "Operativo");
    setDescripcion(item.descripcion || "");
    setPrecio(String(item.precio));
    setCantidad(String(item.cantidad ?? 1));
    setCategoriaId(item.categoria_id || (categorias[0]?.id ?? ""));
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

          // Sistema de reintento automático (2 intentos por foto)
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
            await new Promise((r) => setTimeout(r, 1000)); // Esperar 1s antes de reintentar
          }

          if (uploadError) {
            throw new Error(`No se pudo subir la foto ${i + 1}: ${uploadError.message}`);
          }

          const { data } = supabase.storage.from("productos").getPublicUrl(fileName);
          urlsFotos.push(data.publicUrl);
        }
      }

      setEstadoSubida("Guardando en inventario...");

      if (editandoId) {
        const prodExistente = productos.find((p) => p.id === editandoId);
        const updatePayload: any = {
          titulo: titulo.trim(),
          marca: marca.trim() || null,
          condicion,
          funcionalidad,
          descripcion: descripcion.trim() || null,
          precio: parseFloat(precio),
          cantidad: Math.max(0, parseInt(cantidad) || 1),
          categoria_id: categoriaId,
        };

        if (urlsFotos.length > 0) {
          updatePayload.fotos = urlsFotos;
        } else if (previews.length > 0 && prodExistente) {
          updatePayload.fotos = previews;
        }

        const { error: updateError } = await supabase.from("productos").update(updatePayload).eq("id", editandoId);
        if (updateError) throw updateError;
        cancelarEdicion();
      } else {
        const { error: insertError } = await supabase.from("productos").insert({
          titulo: titulo.trim(),
          marca: marca.trim() || null,
          condicion,
          funcionalidad,
          descripcion: descripcion.trim() || null,
          precio: parseFloat(precio),
          cantidad: Math.max(0, parseInt(cantidad) || 1),
          categoria_id: categoriaId,
          fotos: urlsFotos,
          estado: "disponible",
        });

        if (insertError) throw insertError;
        cancelarEdicion();
      }

      limpiarBorrador();
      await cargarDatos();
      setModalInfo({
        title: "¡Publicado con éxito!",
        desc: "El artículo ya está disponible en el catálogo público del bazar.",
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

  const toggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === "disponible" ? "vendido" : "disponible";
    await supabase.from("productos").update({ estado: nuevoEstado }).eq("id", id);
    cargarDatos();
  };

  const eliminarProducto = async (id: string) => {
    if (!confirm("¿Eliminar este artículo del inventario?")) return;

    const prodAEliminar = productos.find((p) => p.id === id);
    if (prodAEliminar && prodAEliminar.fotos && prodAEliminar.fotos.length > 0) {
      const pathsParaBorrar = prodAEliminar.fotos
        .map((url) => {
          const parts = url.split("/productos/");
          return parts.length > 1 ? parts[1] : null;
        })
        .filter((p): p is string => Boolean(p));

      if (pathsParaBorrar.length > 0) {
        await supabase.storage.from("productos").remove(pathsParaBorrar);
      }
    }

    await supabase.from("productos").delete().eq("id", id);
    cargarDatos();
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center text-xs">Cargando administrador...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-neutral-800 font-sans pb-24 relative">
      {/* Barra Superior */}
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

      <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-4 space-y-4">
        {/* Crear Categoría Rápida */}
        <div className="bg-white border border-neutral-200 p-3.5 rounded-2xl shadow-2xs">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4 text-cyan-600" /> Nueva Categoría
          </h2>
          <form onSubmit={handleCrearCategoria} className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: Cocina, Joyas, Decoración..."
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
              className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-cyan-600"
            />
            <button
              type="submit"
              disabled={creandoCat}
              className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl"
            >
              {creandoCat ? "..." : "Crear"}
            </button>
          </form>
        </div>

        {/* Formulario */}
        <div className="bg-white border border-neutral-200 p-4 sm:p-5 rounded-2xl shadow-2xs">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              {editandoId ? (
                <>
                  <Edit2 className="w-4 h-4 text-amber-500" /> Editando Producto
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-cyan-600" /> Publicar Nuevo Ítem
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
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-600"
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
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-600"
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
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 mb-1">Marca (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Oster, Sony..."
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-600"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Cápsulas de Condición */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">Estado del Producto</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {CONDICIONES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCondicion(c)}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-medium border transition-all ${
                      condicion === c
                        ? "bg-cyan-600 text-white border-cyan-600"
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
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-600"
              />
            </div>

            {/* Subida de Fotos con Selección de Portada */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                Fotos (Toca una foto para hacerla Portada)
              </label>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 hover:border-cyan-500 rounded-xl p-3 cursor-pointer bg-neutral-50 transition-colors">
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
                          index === 0 ? "border-cyan-600 ring-2 ring-cyan-500/20" : "border-neutral-300 hover:border-neutral-400"
                        }`}
                        title="Toca para definir como portada"
                      >
                        <img
                          src={src}
                          alt={`Previsualización ${index + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {index === 0 ? (
                          <span className="absolute top-1 left-1 bg-cyan-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-xs">
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
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              {subiendo ? (estadoSubida || "Guardando...") : editandoId ? "Actualizar Producto" : "Publicar en el Bazar"}
            </button>
          </form>
        </div>

        {/* Lista del Inventario */}
        <div className="space-y-2 pt-2">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Inventario ({productos.length})
          </h2>

          <div className="space-y-2">
            {productos.map((item) => (
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
                    <p className="font-bold text-xs truncate text-neutral-900">{item.titulo}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                      <span className="text-cyan-700 font-black">${Number(item.precio).toFixed(2)}</span>
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
                  <button
                    onClick={() => iniciarEdicion(item)}
                    className="p-1.5 text-neutral-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleEstado(item.id, item.estado)}
                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${
                      item.estado === "vendido"
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : "bg-teal-50 text-teal-700 border border-teal-200"
                    }`}
                  >
                    {item.estado === "vendido" ? "Vendido" : "Disp."}
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
      </main>

      {/* Modal Personalizado Bonito (Reemplazo de alert nativo) */}
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
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}