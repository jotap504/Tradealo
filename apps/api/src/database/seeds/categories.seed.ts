export const CATEGORIES_SEED = [
  // Electrónica
  { slug: 'electronica',       name: 'Electrónica',            isCollectible: false, parentSlug: null },
  { slug: 'celulares',         name: 'Celulares',              isCollectible: false, parentSlug: 'electronica' },
  { slug: 'computadoras',      name: 'Computadoras',           isCollectible: false, parentSlug: 'electronica' },
  { slug: 'tablets',           name: 'Tablets',                isCollectible: false, parentSlug: 'electronica' },
  { slug: 'audio',             name: 'Audio y Sonido',         isCollectible: false, parentSlug: 'electronica' },
  { slug: 'gaming',            name: 'Videojuegos',            isCollectible: false, parentSlug: 'electronica' },
  { slug: 'camaras',           name: 'Cámaras y Fotografía',   isCollectible: false, parentSlug: 'electronica' },

  // Vehículos
  { slug: 'vehiculos',         name: 'Vehículos',              isCollectible: false, parentSlug: null },
  { slug: 'autos',             name: 'Autos',                  isCollectible: false, parentSlug: 'vehiculos' },
  { slug: 'motos',             name: 'Motos',                  isCollectible: false, parentSlug: 'vehiculos' },
  { slug: 'bicicletas',        name: 'Bicicletas',             isCollectible: false, parentSlug: 'vehiculos' },

  // Ropa
  { slug: 'ropa',              name: 'Ropa y Accesorios',      isCollectible: false, parentSlug: null },
  { slug: 'ropa-mujer',        name: 'Ropa Mujer',             isCollectible: false, parentSlug: 'ropa' },
  { slug: 'ropa-hombre',       name: 'Ropa Hombre',            isCollectible: false, parentSlug: 'ropa' },
  { slug: 'calzado',           name: 'Calzado',                isCollectible: false, parentSlug: 'ropa' },

  // Hogar
  { slug: 'hogar',             name: 'Hogar y Jardín',         isCollectible: false, parentSlug: null },
  { slug: 'muebles',           name: 'Muebles',                isCollectible: false, parentSlug: 'hogar' },
  { slug: 'electrodomesticos', name: 'Electrodomésticos',      isCollectible: false, parentSlug: 'hogar' },

  // Deportes
  { slug: 'deportes',          name: 'Deportes',               isCollectible: false, parentSlug: null },

  // Instrumentos
  { slug: 'instrumentos',      name: 'Instrumentos Musicales', isCollectible: false, parentSlug: null },

  // ── COLECCIONABLES ──────────────────────────────────────────────────────────
  { slug: 'coleccionables',    name: 'Coleccionables',         isCollectible: true,  parentSlug: null },
  { slug: 'comics',            name: 'Comics y Historietas',   isCollectible: true,  parentSlug: 'coleccionables' },
  { slug: 'figuras',           name: 'Figuras y Estatuillas',  isCollectible: true,  parentSlug: 'coleccionables' },
  { slug: 'monedas',           name: 'Monedas y Billetes',     isCollectible: true,  parentSlug: 'coleccionables' },
  { slug: 'estampillas',       name: 'Estampillas',            isCollectible: true,  parentSlug: 'coleccionables' },
  { slug: 'discos-vinilo',     name: 'Discos de Vinilo',       isCollectible: true,  parentSlug: 'coleccionables' },
  { slug: 'cartas-trading',    name: 'Cartas Coleccionables',  isCollectible: true,  parentSlug: 'coleccionables' },
  { slug: 'juguetes-antiguos', name: 'Juguetes Antiguos',      isCollectible: true,  parentSlug: 'coleccionables' },
  { slug: 'relojes',           name: 'Relojes',                isCollectible: true,  parentSlug: 'coleccionables' },
  { slug: 'arte',              name: 'Arte y Pinturas',        isCollectible: true,  parentSlug: 'coleccionables' },

  // Otros
  { slug: 'otros',             name: 'Otros',                  isCollectible: false, parentSlug: null },
]

export const COLLECTIBLE_ATTRIBUTES_SEED = [
  // Comics
  { categorySlug: 'comics', key: 'editorial', label: 'Editorial', type: 'select', options: ['Marvel','DC','Image','Dark Horse','Ivrea','La Marca','Otra'], isRequired: true,  sortOrder: 0 },
  { categorySlug: 'comics', key: 'condicion', label: 'Condición', type: 'select', options: ['Mint','Near Mint','Muy Bueno','Bueno','Regular'],             isRequired: true,  sortOrder: 1 },
  { categorySlug: 'comics', key: 'numero',    label: 'Número',    type: 'text',   options: null,                                                           isRequired: false, sortOrder: 2 },
  { categorySlug: 'comics', key: 'anio',      label: 'Año',       type: 'number', options: null,                                                           isRequired: false, sortOrder: 3 },
  { categorySlug: 'comics', key: 'idioma',    label: 'Idioma',    type: 'select', options: ['Español','Inglés','Otro'],                                    isRequired: false, sortOrder: 4 },

  // Figuras
  { categorySlug: 'figuras', key: 'marca',     label: 'Marca',      type: 'text',    options: null,                                                                isRequired: true,  sortOrder: 0 },
  { categorySlug: 'figuras', key: 'personaje', label: 'Personaje',  type: 'text',    options: null,                                                                isRequired: true,  sortOrder: 1 },
  { categorySlug: 'figuras', key: 'escala',    label: 'Escala',     type: 'select',  options: ['1:6','1:10','1:12','1:18','Funko Pop','Otra'],                    isRequired: false, sortOrder: 2 },
  { categorySlug: 'figuras', key: 'completa',  label: '¿Completa?', type: 'boolean', options: null,                                                                isRequired: true,  sortOrder: 3 },
  { categorySlug: 'figuras', key: 'en_caja',   label: '¿En caja?',  type: 'boolean', options: null,                                                                isRequired: false, sortOrder: 4 },

  // Monedas
  { categorySlug: 'monedas', key: 'pais',      label: 'País',       type: 'text',   options: null,                                                                 isRequired: true,  sortOrder: 0 },
  { categorySlug: 'monedas', key: 'anio',      label: 'Año',        type: 'number', options: null,                                                                 isRequired: true,  sortOrder: 1 },
  { categorySlug: 'monedas', key: 'condicion', label: 'Condición',  type: 'select', options: ['Sin Circular','Muy Buena','Buena','Regular'],                      isRequired: true,  sortOrder: 2 },
  { categorySlug: 'monedas', key: 'metal',     label: 'Metal',      type: 'select', options: ['Oro','Plata','Cobre','Aluminio','Bronce','Otro'],                  isRequired: false, sortOrder: 3 },

  // Discos de Vinilo
  { categorySlug: 'discos-vinilo', key: 'artista',   label: 'Artista',           type: 'text',   options: null,                              isRequired: true,  sortOrder: 0 },
  { categorySlug: 'discos-vinilo', key: 'disco',     label: 'Álbum',             type: 'text',   options: null,                              isRequired: true,  sortOrder: 1 },
  { categorySlug: 'discos-vinilo', key: 'anio',      label: 'Año',               type: 'number', options: null,                              isRequired: false, sortOrder: 2 },
  { categorySlug: 'discos-vinilo', key: 'condicion', label: 'Estado del vinilo', type: 'select', options: ['Mint','VG+','VG','G','Poor'],    isRequired: true,  sortOrder: 3 },
  { categorySlug: 'discos-vinilo', key: 'sello',     label: 'Sello discográfico',type: 'text',   options: null,                              isRequired: false, sortOrder: 4 },

  // Cartas trading
  { categorySlug: 'cartas-trading', key: 'juego',    label: 'Juego',              type: 'select', options: ['Magic: The Gathering','Pokémon','Yu-Gi-Oh!','Flesh and Blood','Otro'], isRequired: true,  sortOrder: 0 },
  { categorySlug: 'cartas-trading', key: 'edicion',  label: 'Edición/Set',        type: 'text',   options: null,                                                                      isRequired: false, sortOrder: 1 },
  { categorySlug: 'cartas-trading', key: 'rareza',   label: 'Rareza',             type: 'select', options: ['Común','Infrecuente','Rara','Muy Rara','Mítica'],                        isRequired: false, sortOrder: 2 },
  { categorySlug: 'cartas-trading', key: 'idioma',   label: 'Idioma',             type: 'select', options: ['Español','Inglés','Japonés','Portugués'],                                isRequired: false, sortOrder: 3 },
  { categorySlug: 'cartas-trading', key: 'cantidad', label: 'Cantidad de cartas', type: 'number', options: null,                                                                      isRequired: false, sortOrder: 4 },
]
