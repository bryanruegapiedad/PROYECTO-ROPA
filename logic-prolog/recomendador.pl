% ============================================================
% recomendador.pl — Motor de Reglas de Inferencia
% Proyecto: NOVA Studio - Sistema de Gestión de Ventas
% Motor: SWI-Prolog / pyswip
% ============================================================
%
% Este módulo define las reglas lógicas para recomendar
% tallas y estilos a clientes según su perfil.
% ============================================================

:- module(recomendador, [
    recomendar_talla/5,
    recomendar_estilo/4,
    talla_equivalente/3,
    estilo_por_categoria/3
]).

% ============================================================
% BASE DE HECHOS: medidas y tallas por género
% recomendar_talla(+Genero, +Talla, +RangoAltura, +RangoPecho, -Consejo)
% ============================================================

recomendar_talla(mujer, 'XS', '148-154 cm', '76-80 cm', 'Talla XS ideal para silueta delgada y altura petite.').
recomendar_talla(mujer, 'S',  '155-160 cm', '80-85 cm', 'Talla S: ajuste slim, perfecto para looks elegantes y definidos.').
recomendar_talla(mujer, 'M',  '160-166 cm', '85-90 cm', 'Talla M: balance perfecto entre comodidad y estilo.').
recomendar_talla(mujer, 'L',  '166-172 cm', '90-96 cm', 'Talla L: holgura cómoda sin perder la silueta.').
recomendar_talla(mujer, 'XL', '172-178 cm', '96-102 cm','Talla XL: maximalismo con estilo, perfecta para looks oversize.').

recomendar_talla(hombre, 'XS', '155-162 cm', '84-88 cm', 'Talla XS: corte entallado para silueta atlética y delgada.').
recomendar_talla(hombre, 'S',  '162-168 cm', '88-93 cm', 'Talla S: ajuste clásico y versátil para cualquier ocasión.').
recomendar_talla(hombre, 'M',  '168-174 cm', '93-99 cm', 'Talla M: la talla más popular, cómoda y estilizada.').
recomendar_talla(hombre, 'L',  '174-180 cm', '99-105 cm','Talla L: espacio extra sin sacrificar el look.').
recomendar_talla(hombre, 'XL', '180-188 cm', '105-112 cm','Talla XL: ideal para complexión grande con estilo definido.').

recomendar_talla(unisex, 'XS', '148-158 cm', 'ajuste oversize petite', 'Oversize XS: dramático y cómodo para estaturas bajas.').
recomendar_talla(unisex, 'S',  '158-166 cm', 'ajuste oversize regular','Oversize S: equilibrio entre comodidad y proporciones visuales.').
recomendar_talla(unisex, 'M',  '166-174 cm', 'ajuste oversize amplio', 'Oversize M: la opción más versátil del catálogo NOVA.').
recomendar_talla(unisex, 'L',  '174-182 cm', 'ajuste máximo',          'Oversize L: máxima comodidad, tendencia urbana.').

recomendar_talla(niña, '6',  '110-116 cm', '', 'Talla 6 para niñas de 5-6 años aproximadamente.').
recomendar_talla(niña, '8',  '116-122 cm', '', 'Talla 8 para niñas de 7-8 años aproximadamente.').
recomendar_talla(niña, '10', '122-128 cm', '', 'Talla 10 para niñas de 9-10 años aproximadamente.').
recomendar_talla(niña, '12', '128-134 cm', '', 'Talla 12 para niñas de 11-12 años aproximadamente.').

recomendar_talla(niño, '6',  '110-116 cm', '', 'Talla 6 para niños de 5-6 años aproximadamente.').
recomendar_talla(niño, '8',  '116-122 cm', '', 'Talla 8 para niños de 7-8 años aproximadamente.').
recomendar_talla(niño, '10', '122-128 cm', '', 'Talla 10 para niños de 9-10 años aproximadamente.').
recomendar_talla(niño, '12', '128-134 cm', '', 'Talla 12 para niños de 11-12 años aproximadamente.').

% ============================================================
% REGLAS: equivalencias de tallas entre sistemas
% talla_equivalente(+SistemaOrigen, +Talla, -TallaEquivalente)
% ============================================================

talla_equivalente(europeo, '36', 'XS').
talla_equivalente(europeo, '38', 'S').
talla_equivalente(europeo, '40', 'M').
talla_equivalente(europeo, '42', 'L').
talla_equivalente(europeo, '44', 'XL').

talla_equivalente(us, '0',  'XS').
talla_equivalente(us, '2',  'S').
talla_equivalente(us, '4',  'M').
talla_equivalente(us, '6',  'L').
talla_equivalente(us, '8',  'XL').

% ============================================================
% REGLAS DE ESTILO: recomendaciones por categoría y ocasión
% recomendar_estilo(+Categoria, +Ocasion, -Color, -Consejo)
% ============================================================

recomendar_estilo('Prendas superiores', casual, 'Negro', 'El negro es siempre una elección segura y elegante para el día a día.').
recomendar_estilo('Prendas superiores', formal, 'Blanco hueso', 'El blanco hueso transmite seriedad y sofisticación en entornos formales.').
recomendar_estilo('Vestidos', casual, 'Verde oliva', 'El verde oliva es tendencia este año, perfecto para looks naturales.').
recomendar_estilo('Vestidos', formal, 'Negro', 'El vestido negro es un clásico atemporal para eventos nocturnos.').
recomendar_estilo('Pantalones', casual, 'Beige arena', 'El beige arena combina con prácticamente cualquier prenda superior.').
recomendar_estilo('Pantalones', formal, 'Indigo', 'El indigo es el tono más refinado de los pantalones de mezclilla.').
recomendar_estilo('Calzado', casual, 'Blanco', 'El calzado blanco amplifica visualmente la silueta y aporta frescura.').
recomendar_estilo('Calzado', formal, 'Marrón', 'El marrón en calzado es el complemento ideal para looks formales.').
recomendar_estilo('Sets', casual, 'Rosado pastel', 'Los tonos pastel son ideales para looks coordenados y femeninos.').
recomendar_estilo('Faldas', casual, 'Terracota', 'El terracota aporta calidez y es una de las apuestas de la temporada.').

% ============================================================
% REGLAS: combinaciones de colores compatibles
% estilo_por_categoria(+Color, +Categoria, -Combinacion)
% ============================================================

estilo_por_categoria('Negro', 'Prendas superiores', 'Combina con pantalones beige, jeans claros o faldas blancas.').
estilo_por_categoria('Blanco hueso', 'Prendas superiores', 'Perfecto con jeans oscuros, pantalones camel o faldas negras.').
estilo_por_categoria('Verde oliva', 'Prendas superiores', 'Combina con pantalones beige, jeans straight o botines marrones.').
estilo_por_categoria('Beige arena', 'Pantalones', 'Combina con blusas blancas, tops negros o camisas de colores suaves.').
estilo_por_categoria('Indigo', 'Pantalones', 'Versátil: combina con camisetas básicas, blusas de seda o blazers.').
estilo_por_categoria('Terracota', 'Faldas', 'Combina con blusas blancas, tops crema o chaquetas de lino natural.').
estilo_por_categoria('Rosado pastel', 'Sets', 'El conjunto monocromático es tendencia; añade zapatillas blancas.').
estilo_por_categoria('Camel', 'Prendas superiores', 'El camel es neutro cálido; combina con negro, marfil o burdeos.').
estilo_por_categoria('Blanco', 'Calzado', 'El blanco en calzado funciona con cualquier outfit y amplía visualmente.').

% ============================================================
% REGLA GENERAL: consejo cuando no hay regla específica
% ============================================================

consejo_general(Categoria, Talla, 'Elige la talla que prefieras para mayor comodidad.') :-
    \+ recomendar_talla(_, Talla, _, _, _),
    atom(Categoria).
