"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, LogIn, Eye, EyeOff, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales incorrectas o no autorizadas.");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-neutral-800 flex flex-col justify-between p-4 relative">
      {/* Patrón de fondo sutil */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.035] z-0"
        style={{
          backgroundImage: `radial-gradient(#0891b2 1px, transparent 1px)`,
          backgroundSize: '16px 16px'
        }}
      />

      {/* Botón de volver */}
      <div className="relative z-10 max-w-sm w-full mx-auto pt-2">
        <Link 
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-800 hover:text-cyan-900 bg-white hover:bg-neutral-100 border border-neutral-200/80 px-3 py-1.5 rounded-full transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>

      {/* Tarjeta de Inicio de Sesión */}
      <div className="relative z-10 w-full max-w-sm mx-auto bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-xl">
        {/* Logo / Encabezado */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-12 h-12 mb-2 flex items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="El Bazar Cubides" 
              fill 
              sizes="48px"
              className="object-contain" 
            />
          </div>
          <h1 className="text-lg font-black text-neutral-900 tracking-tight">Panel Administrativo</h1>
          <p className="text-xs text-cyan-700 font-medium">El Bazar Cubides</p>
        </div>

        {/* Mensaje de advertencia amigable */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 mb-5 flex items-start gap-2 text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug">
            Área restringida. Si no eres administrador, puedes ignorar esta ventana y regresar al bazar.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-2.5 rounded-xl mb-4 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-cyan-600 outline-none transition-all"
              placeholder="admin@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-3 pr-10 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-cyan-600 outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all text-xs shadow-md shadow-cyan-600/20"
          >
            {loading ? (
              <span>Accediendo...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Espaciador inferior */}
      <div className="h-6" />
    </div>
  );
}