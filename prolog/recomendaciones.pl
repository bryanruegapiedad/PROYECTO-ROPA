% Reglas de recomendación para la tienda virtual
% Formato: recomendar(Categoria, Talla, Color, Mensaje)

recomendar(Categoria, Talla, Color, Mensaje) :-
    categoria_recomendada(Categoria, Talla, Color, Mensaje).

categoria_recomendada('mujer', Talla, Color, Mensaje) :-
    member(Talla, ['S', 'M', 'L']),
    member(Color, ['Negro', 'Blanco', 'Azul', 'Rojo', 'Gris']),
    Mensaje = 'Estilo elegante: combina esta prenda con tonos sobrios y accesorios minimalistas.'.

categoria_recomendada('hombre', Talla, Color, Mensaje) :-
    member(Talla, ['S', 'M', 'L', 'XL']),
    member(Color, ['Negro', 'Azul', 'Blanco', 'Gris']),
    Mensaje = 'Look urbano y refinado: prioriza capas limpias y una paleta sobria.'.

categoria_recomendada('polos', Talla, Color, Mensaje) :-
    member(Talla, ['S', 'M', 'L']),
    member(Color, ['Negro', 'Blanco', 'Gris', 'Azul']),
    Mensaje = 'Ideal para un look casual premium: combina con denim y calzado minimalista.'.

categoria_recomendada('camisas', Talla, Color, Mensaje) :-
    member(Talla, ['S', 'M', 'L', 'XL']),
    member(Color, ['Blanco', 'Azul', 'Negro']),
    Mensaje = 'Perfecto para una apariencia formal y moderna, con líneas limpias y cuidado en los detalles.'.

categoria_recomendada('pantalones', Talla, Color, Mensaje) :-
    member(Talla, ['28', '30', '32', '34', 'M', 'L']),
    member(Color, ['Azul', 'Negro', 'Gris']),
    Mensaje = 'Excelente opción para un outfit versátil: combina con una camiseta básica o una prenda estructurada.'.

categoria_recomendada('casacas', Talla, Color, Mensaje) :-
    member(Talla, ['S', 'M', 'L', 'XL']),
    member(Color, ['Azul', 'Negro', 'Gris']),
    Mensaje = 'Aporta calidez y estilo: funciona muy bien en looks de transición entre casual y urbano.'.

categoria_recomendada('vestidos', Talla, Color, Mensaje) :-
    member(Talla, ['S', 'M', 'L']),
    member(Color, ['Rojo', 'Blanco', 'Negro', 'Azul']),
    Mensaje = 'Un look especial para destacar con una silueta moderna y elegante.'.

categoria_recomendada(_, _, _, 'Estilo versátil para tu próxima compra.').
