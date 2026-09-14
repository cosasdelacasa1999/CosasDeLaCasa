import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // 1. Endpoint oficial sin autenticación de DolarVzla CDN
  try {
    const res = await fetch(`https://rates.dolarvzla.com/bcv/current.json?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (res.ok) {
      const data = await res.json();
      const valor = Number(data?.current?.usd ?? data?.usd ?? data?.price);
      if (!isNaN(valor) && valor > 0) {
        return NextResponse.json({ promedio: valor, source: "dolarvzla-cdn" });
      }
    }
  } catch (e) {
    console.error("Fallo DolarVzla CDN:", e);
  }

  // 2. Respaldo secundario: DolarApi Oficial
  try {
    const res = await fetch(`https://ve.dolarapi.com/v1/dolares/oficial?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (res.ok) {
      const data = await res.json();
      const valor = Number(data?.promedio ?? data?.price);
      if (!isNaN(valor) && valor > 0) {
        return NextResponse.json({ promedio: valor, source: "dolarapi" });
      }
    }
  } catch (e) {
    console.error("Fallo DolarApi:", e);
  }

  // 3. Respaldo terciario: CriptoYa
  try {
    const res = await fetch(`https://criptoya.com/api/bcv?_t=${Date.now()}`, {
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      const valor = Number(data?.price ?? data?.promedio);
      if (!isNaN(valor) && valor > 0) {
        return NextResponse.json({ promedio: valor, source: "criptoya" });
      }
    }
  } catch (e) {
    console.error("Fallo CriptoYa:", e);
  }

  return NextResponse.json({ error: "No se pudo obtener la tasa" }, { status: 500 });
}