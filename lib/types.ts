export interface Categoria {
  id: string;
  nombre: string;
  created_at?: string;
}

export interface Producto {
  id: string;
  titulo: string;
  marca?: string | null;
  condicion?: 'Nuevo' | 'Usado como nuevo' | 'Usado' | 'Muy usado' | string;
  funcionalidad?: 'Operativo' | 'Casi operativo' | 'Para repuestos' | string;
  descripcion: string | null;
  precio: number;
  cantidad: number;
  categoria_id: string | null;
  fotos: string[];
  estado: 'disponible' | 'vendido';
  created_at?: string;
  categorias?: Categoria;
}

export interface ItemCarrito {
  producto: Producto;
  cantidadPedida: number;
}