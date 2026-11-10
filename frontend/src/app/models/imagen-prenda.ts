import { Producto } from './producto';

const ARCHIVOS = 'assets/images/products';

function normalizar(valor: string | undefined): string {
  return (valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Resuelve siempre a las fotos de producto locales, sin depender de URLs del API. */
export function imagenDePrenda(producto: Producto, color = producto.color): string {
  const categoria = normalizar(producto.categoria);
  const nombre = normalizar(producto.nombre);
  const tono = normalizar(color);

  if (categoria.includes('zapato') || nombre.includes('zapatilla')) {
    const archivo = tono.includes('rosa') ? 'zapatilla-casual-rosa.png'
      : tono.includes('negro') ? 'zapatilla-casual-negra.png'
      : tono.includes('azul') ? 'zapatilla-casual-azul.png'
      : 'zapatilla-casual-blanca.png';
    return `${ARCHIVOS}/zapatos/${archivo}`;
  }
  if (categoria.includes('pantal') || nombre.includes('jean') || nombre.includes('pantal')) {
    const archivo = tono.includes('negro') ? 'jean-clasico-negro.png'
      : tono.includes('beige') ? 'jean-clasico-beige.png'
      : tono.includes('gris') ? 'jean-clasico-gris.png'
      : 'jean-clasico-azul.jpg';
    return `${ARCHIVOS}/pantalones/${archivo}`;
  }
  if (categoria.includes('vestido') || nombre.includes('vestido')) {
    const archivo = tono.includes('negro') ? 'vestido-casual-negro.png'
      : tono.includes('azul') ? 'vestido-casual-azul.png'
      : tono.includes('beige') ? 'vestido-casual-beige.png'
      : 'vestido-casual-rojo.jpg';
    return `${ARCHIVOS}/vestidos/${archivo}`;
  }
  if (categoria.includes('blusa') || nombre.includes('blusa')) {
    const archivo = tono.includes('rosa') ? 'blusa-basica-rosa.png'
      : tono.includes('azul') ? 'blusa-basica-azul.jpg'
      : 'blusa-basica-blanca.jpg';
    return `${ARCHIVOS}/blusas/${archivo}`;
  }
  if (categoria.includes('polera') || nombre.includes('polera') || nombre.includes('hoodie') || nombre.includes('sudadera')) {
    const archivo = tono.includes('gris') ? 'polera-basica-gris.png' : 'polera-basica-negra.png';
    return `${ARCHIVOS}/poleras/${archivo}`;
  }
  const archivo = tono.includes('blanco') ? 'polo-basico-blanco.png'
    : tono.includes('azul') ? 'polo-basico-azul.jpg'
    : tono.includes('rojo') ? 'polo-basico-rojo.jpg'
    : 'polo-basico-negro.jpg';
  return `${ARCHIVOS}/polos/${archivo}`;
}

export function normalizarImagenesProducto(producto: Producto): Producto {
  const imgStr = String(producto.imagen || '').trim();
  const tieneImagenValida = imgStr.length > 5;
  const imagenPrincipal = tieneImagenValida ? imgStr : imagenDePrenda(producto);

  const variantes = producto.variantes?.map(variante => {
    const varImg = String(variante.imagen || '').trim();
    return {
      ...variante,
      imagen: varImg.length > 5 ? varImg : imagenPrincipal,
    };
  });

  const imagenes = (producto.imagenes && producto.imagenes.length) 
    ? producto.imagenes 
    : [{
        url: imagenPrincipal,
        alt: producto.nombre,
        orden: 1,
      }];

  return {
    ...producto,
    imagen: imagenPrincipal,
    imagenPrincipal,
    variantes,
    imagenes,
  };
}
