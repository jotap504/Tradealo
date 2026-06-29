// Trocalia category tree (3 levels) + attributes per category.
//
// Slug stability: existing listings reference categories by slug/id, so all
// slugs that already shipped are preserved. New roots are added.

export interface CategorySeed {
  slug: string;
  name: string;
  isCollectible: boolean;
  parentSlug: string | null;
}

export interface CategoryAttributeSeed {
  categorySlug: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[] | null;
  isRequired?: boolean;
  isVariant?: boolean;
  sortOrder?: number;
}

export const CATEGORIES_SEED: CategorySeed[] = [
  // ── ELECTRONICA ─────────────────────────────────────────────────────────
  {
    slug: 'electronica',
    name: 'Electrónica',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'celulares',
    name: 'Celulares',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'computadoras',
    name: 'Computadoras',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'laptops',
    name: 'Notebooks',
    isCollectible: false,
    parentSlug: 'computadoras',
  },
  {
    slug: 'desktops',
    name: 'PC de escritorio',
    isCollectible: false,
    parentSlug: 'computadoras',
  },
  {
    slug: 'monitores',
    name: 'Monitores',
    isCollectible: false,
    parentSlug: 'computadoras',
  },
  {
    slug: 'tablets',
    name: 'Tablets',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'audio',
    name: 'Audio y Sonido',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'auriculares',
    name: 'Auriculares',
    isCollectible: false,
    parentSlug: 'audio',
  },
  {
    slug: 'parlantes',
    name: 'Parlantes',
    isCollectible: false,
    parentSlug: 'audio',
  },
  {
    slug: 'tv',
    name: 'TV y Video',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'gaming',
    name: 'Videojuegos',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'consolas',
    name: 'Consolas',
    isCollectible: false,
    parentSlug: 'gaming',
  },
  {
    slug: 'videojuegos-titulos',
    name: 'Juegos',
    isCollectible: false,
    parentSlug: 'gaming',
  },
  {
    slug: 'camaras',
    name: 'Cámaras y Fotografía',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'smartwatches',
    name: 'Smartwatches',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'accesorios-tech',
    name: 'Accesorios Tech',
    isCollectible: false,
    parentSlug: 'electronica',
  },
  {
    slug: 'almacenamiento',
    name: 'Almacenamiento',
    isCollectible: false,
    parentSlug: 'accesorios-tech',
  },

  // ── VEHICULOS ───────────────────────────────────────────────────────────
  {
    slug: 'vehiculos',
    name: 'Vehículos',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'autos',
    name: 'Autos',
    isCollectible: false,
    parentSlug: 'vehiculos',
  },
  {
    slug: 'motos',
    name: 'Motos',
    isCollectible: false,
    parentSlug: 'vehiculos',
  },
  {
    slug: 'nautica',
    name: 'Náutica',
    isCollectible: false,
    parentSlug: 'vehiculos',
  },
  {
    slug: 'cuatriciclos',
    name: 'Cuatriciclos',
    isCollectible: false,
    parentSlug: 'vehiculos',
  },

  // ── ROPA ────────────────────────────────────────────────────────────────
  { slug: 'ropa', name: 'Ropa', isCollectible: false, parentSlug: null },
  {
    slug: 'ropa-mujer',
    name: 'Mujer',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'ropa-hombre',
    name: 'Hombre',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'ropa-ninas',
    name: 'Niñas',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'ropa-ninos',
    name: 'Niños',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'ropa-bebes',
    name: 'Ropa Bebés',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'remeras',
    name: 'Remeras',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'pantalones',
    name: 'Pantalones',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'camisas',
    name: 'Camisas',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'vestidos',
    name: 'Vestidos',
    isCollectible: false,
    parentSlug: 'ropa',
  },
  {
    slug: 'abrigos',
    name: 'Abrigos',
    isCollectible: false,
    parentSlug: 'ropa',
  },

  // ── CALZADO ─────────────────────────────────────────────────────────────
  { slug: 'calzado', name: 'Calzado', isCollectible: false, parentSlug: null },
  {
    slug: 'zapatillas',
    name: 'Zapatillas Deportivas',
    isCollectible: false,
    parentSlug: 'calzado',
  },
  { slug: 'botas', name: 'Botas', isCollectible: false, parentSlug: 'calzado' },
  {
    slug: 'sandalias',
    name: 'Sandalias',
    isCollectible: false,
    parentSlug: 'calzado',
  },
  {
    slug: 'zapatos-vestir',
    name: 'Zapatos de Vestir',
    isCollectible: false,
    parentSlug: 'calzado',
  },
  {
    slug: 'calzado-ninos',
    name: 'Calzado para Niños',
    isCollectible: false,
    parentSlug: 'calzado',
  },

  // ── HOGAR ───────────────────────────────────────────────────────────────
  {
    slug: 'hogar',
    name: 'Hogar y Jardín',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'muebles',
    name: 'Muebles',
    isCollectible: false,
    parentSlug: 'hogar',
  },
  {
    slug: 'electrodomesticos',
    name: 'Electrodomésticos',
    isCollectible: false,
    parentSlug: 'hogar',
  },
  { slug: 'cocina', name: 'Cocina', isCollectible: false, parentSlug: 'hogar' },
  { slug: 'banio', name: 'Baño', isCollectible: false, parentSlug: 'hogar' },
  {
    slug: 'decoracion',
    name: 'Decoración',
    isCollectible: false,
    parentSlug: 'hogar',
  },
  {
    slug: 'iluminacion',
    name: 'Iluminación',
    isCollectible: false,
    parentSlug: 'hogar',
  },
  { slug: 'jardin', name: 'Jardín', isCollectible: false, parentSlug: 'hogar' },

  // ── DEPORTES ────────────────────────────────────────────────────────────
  {
    slug: 'deportes',
    name: 'Deportes y Aire Libre',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'bicicletas',
    name: 'Bicicletas',
    isCollectible: false,
    parentSlug: 'deportes',
  },
  {
    slug: 'bicicletas-mtb',
    name: 'Mountain Bike',
    isCollectible: false,
    parentSlug: 'bicicletas',
  },
  {
    slug: 'bicicletas-ruta',
    name: 'Ruta',
    isCollectible: false,
    parentSlug: 'bicicletas',
  },
  {
    slug: 'bicicletas-bmx',
    name: 'BMX',
    isCollectible: false,
    parentSlug: 'bicicletas',
  },
  {
    slug: 'bicicletas-fixie',
    name: 'Fixie/Urbana',
    isCollectible: false,
    parentSlug: 'bicicletas',
  },
  {
    slug: 'bicicletas-electricas',
    name: 'Eléctricas',
    isCollectible: false,
    parentSlug: 'bicicletas',
  },
  {
    slug: 'running',
    name: 'Running',
    isCollectible: false,
    parentSlug: 'deportes',
  },
  {
    slug: 'camping',
    name: 'Camping',
    isCollectible: false,
    parentSlug: 'deportes',
  },
  {
    slug: 'futbol',
    name: 'Fútbol',
    isCollectible: false,
    parentSlug: 'deportes',
  },
  {
    slug: 'nautico-deporte',
    name: 'Náutico',
    isCollectible: false,
    parentSlug: 'deportes',
  },
  {
    slug: 'gym',
    name: 'Gym y Fitness',
    isCollectible: false,
    parentSlug: 'deportes',
  },
  { slug: 'yoga', name: 'Yoga', isCollectible: false, parentSlug: 'deportes' },
  {
    slug: 'pesca',
    name: 'Pesca',
    isCollectible: false,
    parentSlug: 'deportes',
  },
  {
    slug: 'snow-ski',
    name: 'Snow / Ski',
    isCollectible: false,
    parentSlug: 'deportes',
  },

  // ── MASCOTAS ────────────────────────────────────────────────────────────
  {
    slug: 'mascotas',
    name: 'Mascotas',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'perros',
    name: 'Perros',
    isCollectible: false,
    parentSlug: 'mascotas',
  },
  {
    slug: 'gatos',
    name: 'Gatos',
    isCollectible: false,
    parentSlug: 'mascotas',
  },
  {
    slug: 'peces',
    name: 'Peces',
    isCollectible: false,
    parentSlug: 'mascotas',
  },
  { slug: 'aves', name: 'Aves', isCollectible: false, parentSlug: 'mascotas' },

  // ── SERVICIOS ───────────────────────────────────────────────────────────
  {
    slug: 'servicios',
    name: 'Servicios',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'servicios-educacion',
    name: 'Educación',
    isCollectible: false,
    parentSlug: 'servicios',
  },
  {
    slug: 'servicios-hogar',
    name: 'Hogar',
    isCollectible: false,
    parentSlug: 'servicios',
  },
  {
    slug: 'servicios-belleza',
    name: 'Belleza',
    isCollectible: false,
    parentSlug: 'servicios',
  },
  {
    slug: 'servicios-eventos',
    name: 'Eventos',
    isCollectible: false,
    parentSlug: 'servicios',
  },
  {
    slug: 'servicios-diseno',
    name: 'Diseño',
    isCollectible: false,
    parentSlug: 'servicios',
  },
  {
    slug: 'servicios-salud',
    name: 'Salud',
    isCollectible: false,
    parentSlug: 'servicios',
  },
  {
    slug: 'servicios-mascotas',
    name: 'Mascotas (Servicios)',
    isCollectible: false,
    parentSlug: 'servicios',
  },

  // ── SALUD Y BIENESTAR ───────────────────────────────────────────────────
  {
    slug: 'salud',
    name: 'Salud y Bienestar',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'suplementos',
    name: 'Suplementos',
    isCollectible: false,
    parentSlug: 'salud',
  },
  {
    slug: 'equipamiento-medico',
    name: 'Equipamiento médico',
    isCollectible: false,
    parentSlug: 'salud',
  },
  {
    slug: 'higiene',
    name: 'Higiene personal',
    isCollectible: false,
    parentSlug: 'salud',
  },

  // ── JUGUETES ────────────────────────────────────────────────────────────
  {
    slug: 'juguetes',
    name: 'Juguetes',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'juguetes-0-3',
    name: '0 a 3 años',
    isCollectible: false,
    parentSlug: 'juguetes',
  },
  {
    slug: 'juguetes-3-8',
    name: '3 a 8 años',
    isCollectible: false,
    parentSlug: 'juguetes',
  },
  {
    slug: 'juguetes-8plus',
    name: '8 años en adelante',
    isCollectible: false,
    parentSlug: 'juguetes',
  },
  {
    slug: 'juguetes-construccion',
    name: 'Construcción',
    isCollectible: false,
    parentSlug: 'juguetes',
  },
  {
    slug: 'juguetes-educativos',
    name: 'Educativos',
    isCollectible: false,
    parentSlug: 'juguetes',
  },

  // ── LIBROS Y CULTURA ────────────────────────────────────────────────────
  {
    slug: 'libros-cultura',
    name: 'Libros y Cultura',
    isCollectible: false,
    parentSlug: null,
  },
  {
    slug: 'libros',
    name: 'Libros',
    isCollectible: false,
    parentSlug: 'libros-cultura',
  },
  {
    slug: 'musica',
    name: 'Música',
    isCollectible: false,
    parentSlug: 'libros-cultura',
  },
  {
    slug: 'peliculas',
    name: 'Películas',
    isCollectible: false,
    parentSlug: 'libros-cultura',
  },

  // ── BEBES ───────────────────────────────────────────────────────────────
  { slug: 'bebes', name: 'Bebés', isCollectible: false, parentSlug: null },
  {
    slug: 'carriolas',
    name: 'Carriolas',
    isCollectible: false,
    parentSlug: 'bebes',
  },
  { slug: 'cunas', name: 'Cunas', isCollectible: false, parentSlug: 'bebes' },
  {
    slug: 'paniales',
    name: 'Pañales',
    isCollectible: false,
    parentSlug: 'bebes',
  },
  {
    slug: 'alimentacion-bebe',
    name: 'Alimentación',
    isCollectible: false,
    parentSlug: 'bebes',
  },

  // ── INSTRUMENTOS (legacy preserved) ─────────────────────────────────────
  {
    slug: 'instrumentos',
    name: 'Instrumentos Musicales',
    isCollectible: false,
    parentSlug: null,
  },

  // ── COLECCIONABLES ──────────────────────────────────────────────────────
  {
    slug: 'coleccionables',
    name: 'Coleccionables',
    isCollectible: true,
    parentSlug: null,
  },
  {
    slug: 'comics',
    name: 'Comics y Historietas',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },
  {
    slug: 'figuras',
    name: 'Figuras y Estatuillas',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },
  {
    slug: 'monedas',
    name: 'Monedas y Billetes',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },
  {
    slug: 'estampillas',
    name: 'Estampillas',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },
  {
    slug: 'discos-vinilo',
    name: 'Discos de Vinilo',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },
  {
    slug: 'cartas-trading',
    name: 'Cartas Coleccionables',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },
  {
    slug: 'juguetes-antiguos',
    name: 'Juguetes Antiguos',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },
  {
    slug: 'relojes',
    name: 'Relojes',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },
  {
    slug: 'arte',
    name: 'Arte y Pinturas',
    isCollectible: true,
    parentSlug: 'coleccionables',
  },

  // ── OTROS ───────────────────────────────────────────────────────────────
  { slug: 'otros', name: 'Otros', isCollectible: false, parentSlug: null },
];

export const CATEGORY_ATTRIBUTES_SEED: CategoryAttributeSeed[] = [
  // ── CALZADO ─────────────────────────────────────────────────────────────
  {
    categorySlug: 'zapatillas',
    key: 'marca',
    label: 'Marca',
    type: 'text',
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'zapatillas',
    key: 'talle',
    label: 'Talle',
    type: 'select',
    options: [
      '35',
      '36',
      '37',
      '38',
      '39',
      '40',
      '41',
      '42',
      '43',
      '44',
      '45',
      '46',
    ],
    isRequired: true,
    isVariant: true,
    sortOrder: 1,
  },
  {
    categorySlug: 'zapatillas',
    key: 'color',
    label: 'Color',
    type: 'select',
    options: [
      'Negro',
      'Blanco',
      'Gris',
      'Rojo',
      'Azul',
      'Verde',
      'Amarillo',
      'Rosa',
      'Beige',
      'Marrón',
      'Multicolor',
    ],
    isVariant: true,
    sortOrder: 2,
  },
  {
    categorySlug: 'zapatillas',
    key: 'deporte',
    label: 'Deporte',
    type: 'select',
    options: [
      'Running',
      'Trail',
      'Fútbol',
      'Básquet',
      'Tenis',
      'Skate',
      'Casual',
      'Trekking',
    ],
    sortOrder: 3,
  },

  // ── REMERAS ────────────────────────────────────────────────────────────
  {
    categorySlug: 'remeras',
    key: 'marca',
    label: 'Marca',
    type: 'text',
    sortOrder: 0,
  },
  {
    categorySlug: 'remeras',
    key: 'talle',
    label: 'Talle',
    type: 'select',
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    isRequired: true,
    isVariant: true,
    sortOrder: 1,
  },
  {
    categorySlug: 'remeras',
    key: 'color',
    label: 'Color',
    type: 'select',
    options: [
      'Negro',
      'Blanco',
      'Gris',
      'Rojo',
      'Azul',
      'Verde',
      'Amarillo',
      'Rosa',
      'Beige',
    ],
    isVariant: true,
    sortOrder: 2,
  },
  {
    categorySlug: 'remeras',
    key: 'genero',
    label: 'Para',
    type: 'select',
    options: ['Mujer', 'Hombre', 'Unisex', 'Niña', 'Niño'],
    sortOrder: 3,
  },

  // ── CELULARES ─────────────────────────────────────────────────────────
  {
    categorySlug: 'celulares',
    key: 'marca',
    label: 'Marca',
    type: 'select',
    options: ['Samsung', 'Apple', 'Xiaomi', 'Motorola', 'Huawei', 'Otra'],
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'celulares',
    key: 'almacenamiento',
    label: 'Almacenamiento',
    type: 'select',
    options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'],
    isVariant: true,
    sortOrder: 1,
  },
  {
    categorySlug: 'celulares',
    key: 'color',
    label: 'Color',
    type: 'select',
    options: ['Negro', 'Blanco', 'Azul', 'Verde', 'Rojo', 'Dorado', 'Otro'],
    isVariant: true,
    sortOrder: 2,
  },
  {
    categorySlug: 'celulares',
    key: 'ram',
    label: 'RAM',
    type: 'select',
    options: ['2GB', '4GB', '6GB', '8GB', '12GB', '16GB'],
    sortOrder: 3,
  },
  {
    categorySlug: 'celulares',
    key: 'estado_bateria',
    label: 'Estado batería',
    type: 'select',
    options: ['90-100%', '80-89%', '70-79%', 'Menos del 70%'],
    sortOrder: 4,
  },

  // ── ALMACENAMIENTO ─────────────────────────────────────────────────────
  {
    categorySlug: 'almacenamiento',
    key: 'marca',
    label: 'Marca',
    type: 'text',
    sortOrder: 0,
  },
  {
    categorySlug: 'almacenamiento',
    key: 'capacidad',
    label: 'Capacidad',
    type: 'select',
    options: [
      '8GB',
      '16GB',
      '32GB',
      '64GB',
      '128GB',
      '256GB',
      '512GB',
      '1TB',
      '2TB',
    ],
    isRequired: true,
    isVariant: true,
    sortOrder: 1,
  },
  {
    categorySlug: 'almacenamiento',
    key: 'velocidad',
    label: 'Velocidad',
    type: 'text',
    sortOrder: 2,
  },

  // ── BICICLETAS ─────────────────────────────────────────────────────────
  {
    categorySlug: 'bicicletas-mtb',
    key: 'rodado',
    label: 'Rodado',
    type: 'select',
    options: ['12', '16', '20', '24', '26', '27.5', '29'],
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'bicicletas-mtb',
    key: 'genero',
    label: 'Para',
    type: 'select',
    options: ['Hombre', 'Mujer', 'Unisex', 'Niño', 'Niña'],
    sortOrder: 1,
  },
  {
    categorySlug: 'bicicletas-mtb',
    key: 'cuadro',
    label: 'Cuadro',
    type: 'select',
    options: ['Aluminio', 'Acero', 'Carbono'],
    sortOrder: 2,
  },
  {
    categorySlug: 'bicicletas-mtb',
    key: 'cambios',
    label: 'Cambios',
    type: 'number',
    sortOrder: 3,
  },
  {
    categorySlug: 'bicicletas-mtb',
    key: 'frenos',
    label: 'Frenos',
    type: 'select',
    options: ['Disco mecánico', 'Disco hidráulico', 'V-Brake'],
    sortOrder: 4,
  },
  {
    categorySlug: 'bicicletas-ruta',
    key: 'rodado',
    label: 'Rodado',
    type: 'select',
    options: ['26', '27.5', '28', '29', '700c'],
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'bicicletas-fixie',
    key: 'rodado',
    label: 'Rodado',
    type: 'select',
    options: ['26', '27.5', '28', '29', '700c'],
    sortOrder: 0,
  },
  {
    categorySlug: 'bicicletas-bmx',
    key: 'rodado',
    label: 'Rodado',
    type: 'select',
    options: ['16', '18', '20'],
    isRequired: true,
    sortOrder: 0,
  },

  // ── MASCOTAS ───────────────────────────────────────────────────────────
  {
    categorySlug: 'perros',
    key: 'edad',
    label: 'Etapa',
    type: 'select',
    options: ['Cachorro', 'Adulto', 'Senior'],
    sortOrder: 0,
  },
  {
    categorySlug: 'perros',
    key: 'peso',
    label: 'Peso del envase',
    type: 'select',
    options: ['1kg', '3kg', '7.5kg', '15kg', '20kg'],
    isVariant: true,
    sortOrder: 1,
  },

  // ── JUGUETES ───────────────────────────────────────────────────────────
  {
    categorySlug: 'juguetes-0-3',
    key: 'marca',
    label: 'Marca',
    type: 'text',
    sortOrder: 0,
  },
  {
    categorySlug: 'juguetes-3-8',
    key: 'marca',
    label: 'Marca',
    type: 'text',
    sortOrder: 0,
  },

  // ── SERVICIOS ──────────────────────────────────────────────────────────
  {
    categorySlug: 'servicios-educacion',
    key: 'modalidad',
    label: 'Modalidad',
    type: 'select',
    options: ['Presencial', 'Online', 'Híbrido'],
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'servicios-educacion',
    key: 'duracion',
    label: 'Duración',
    type: 'text',
    sortOrder: 1,
  },

  // ── LIBROS ─────────────────────────────────────────────────────────────
  {
    categorySlug: 'libros',
    key: 'autor',
    label: 'Autor',
    type: 'text',
    sortOrder: 0,
  },
  {
    categorySlug: 'libros',
    key: 'editorial',
    label: 'Editorial',
    type: 'text',
    sortOrder: 1,
  },
  {
    categorySlug: 'libros',
    key: 'idioma',
    label: 'Idioma',
    type: 'select',
    options: ['Español', 'Inglés', 'Portugués', 'Otro'],
    sortOrder: 2,
  },
  {
    categorySlug: 'libros',
    key: 'formato',
    label: 'Formato',
    type: 'select',
    options: ['Tapa blanda', 'Tapa dura', 'Bolsillo', 'Digital'],
    sortOrder: 3,
  },

  // ── COLECCIONABLES (preserved) ─────────────────────────────────────────
  {
    categorySlug: 'comics',
    key: 'editorial',
    label: 'Editorial',
    type: 'select',
    options: [
      'Marvel',
      'DC',
      'Image',
      'Dark Horse',
      'Ivrea',
      'La Marca',
      'Otra',
    ],
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'comics',
    key: 'condicion',
    label: 'Condición',
    type: 'select',
    options: ['Mint', 'Near Mint', 'Muy Bueno', 'Bueno', 'Regular'],
    isRequired: true,
    sortOrder: 1,
  },
  {
    categorySlug: 'comics',
    key: 'numero',
    label: 'Número',
    type: 'text',
    sortOrder: 2,
  },
  {
    categorySlug: 'comics',
    key: 'anio',
    label: 'Año',
    type: 'number',
    sortOrder: 3,
  },
  {
    categorySlug: 'comics',
    key: 'idioma',
    label: 'Idioma',
    type: 'select',
    options: ['Español', 'Inglés', 'Otro'],
    sortOrder: 4,
  },

  {
    categorySlug: 'figuras',
    key: 'marca',
    label: 'Marca',
    type: 'text',
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'figuras',
    key: 'personaje',
    label: 'Personaje',
    type: 'text',
    isRequired: true,
    sortOrder: 1,
  },
  {
    categorySlug: 'figuras',
    key: 'escala',
    label: 'Escala',
    type: 'select',
    options: ['1:6', '1:10', '1:12', '1:18', 'Funko Pop', 'Otra'],
    sortOrder: 2,
  },
  {
    categorySlug: 'figuras',
    key: 'completa',
    label: '¿Completa?',
    type: 'boolean',
    isRequired: true,
    sortOrder: 3,
  },
  {
    categorySlug: 'figuras',
    key: 'en_caja',
    label: '¿En caja?',
    type: 'boolean',
    sortOrder: 4,
  },

  {
    categorySlug: 'monedas',
    key: 'pais',
    label: 'País',
    type: 'text',
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'monedas',
    key: 'anio',
    label: 'Año',
    type: 'number',
    isRequired: true,
    sortOrder: 1,
  },
  {
    categorySlug: 'monedas',
    key: 'condicion',
    label: 'Condición',
    type: 'select',
    options: ['Sin Circular', 'Muy Buena', 'Buena', 'Regular'],
    isRequired: true,
    sortOrder: 2,
  },
  {
    categorySlug: 'monedas',
    key: 'metal',
    label: 'Metal',
    type: 'select',
    options: ['Oro', 'Plata', 'Cobre', 'Aluminio', 'Bronce', 'Otro'],
    sortOrder: 3,
  },

  {
    categorySlug: 'discos-vinilo',
    key: 'artista',
    label: 'Artista',
    type: 'text',
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'discos-vinilo',
    key: 'disco',
    label: 'Álbum',
    type: 'text',
    isRequired: true,
    sortOrder: 1,
  },
  {
    categorySlug: 'discos-vinilo',
    key: 'anio',
    label: 'Año',
    type: 'number',
    sortOrder: 2,
  },
  {
    categorySlug: 'discos-vinilo',
    key: 'condicion',
    label: 'Estado del vinilo',
    type: 'select',
    options: ['Mint', 'VG+', 'VG', 'G', 'Poor'],
    isRequired: true,
    sortOrder: 3,
  },
  {
    categorySlug: 'discos-vinilo',
    key: 'sello',
    label: 'Sello discográfico',
    type: 'text',
    sortOrder: 4,
  },

  {
    categorySlug: 'cartas-trading',
    key: 'juego',
    label: 'Juego',
    type: 'select',
    options: [
      'Magic: The Gathering',
      'Pokémon',
      'Yu-Gi-Oh!',
      'Flesh and Blood',
      'Otro',
    ],
    isRequired: true,
    sortOrder: 0,
  },
  {
    categorySlug: 'cartas-trading',
    key: 'edicion',
    label: 'Edición/Set',
    type: 'text',
    sortOrder: 1,
  },
  {
    categorySlug: 'cartas-trading',
    key: 'rareza',
    label: 'Rareza',
    type: 'select',
    options: ['Común', 'Infrecuente', 'Rara', 'Muy Rara', 'Mítica'],
    sortOrder: 2,
  },
  {
    categorySlug: 'cartas-trading',
    key: 'idioma',
    label: 'Idioma',
    type: 'select',
    options: ['Español', 'Inglés', 'Japonés', 'Portugués'],
    sortOrder: 3,
  },
  {
    categorySlug: 'cartas-trading',
    key: 'cantidad',
    label: 'Cantidad de cartas',
    type: 'number',
    sortOrder: 4,
  },

  // ── ESTAMPILLAS ─────────────────────────────────────────────────────────────
  { categorySlug: 'estampillas', key: 'pais', label: 'País de origen', type: 'select', options: ['Argentina','Brasil','Uruguay','Chile','México','España','Francia','Alemania','EE.UU.','Otro'], sortOrder: 1 },
  { categorySlug: 'estampillas', key: 'anio', label: 'Año de emisión', type: 'number', sortOrder: 2 },
  { categorySlug: 'estampillas', key: 'estado', label: 'Estado', type: 'select', options: ['Mint (sin usar)','Usada','Con matasellos'], sortOrder: 3 },
  { categorySlug: 'estampillas', key: 'tema', label: 'Temática', type: 'select', options: ['Fauna','Flora','Deportes','Personajes','Historia','Arte','Transporte','Otro'], sortOrder: 4 },
  { categorySlug: 'estampillas', key: 'cantidad', label: 'Cantidad', type: 'number', sortOrder: 5 },

  // ── JUGUETES ANTIGUOS ────────────────────────────────────────────────────────
  { categorySlug: 'juguetes-antiguos', key: 'decada', label: 'Década', type: 'select', options: ['1920s','1930s','1940s','1950s','1960s','1970s','1980s','1990s'], sortOrder: 1 },
  { categorySlug: 'juguetes-antiguos', key: 'marca', label: 'Marca', type: 'text', sortOrder: 2 },
  { categorySlug: 'juguetes-antiguos', key: 'material', label: 'Material', type: 'select', options: ['Hojalata','Madera','Baquelita','Plástico duro','Metal'], sortOrder: 3 },
  { categorySlug: 'juguetes-antiguos', key: 'estado', label: 'Estado', type: 'select', options: ['Excelente','Muy bueno','Bueno','Regular','Para restaurar'], sortOrder: 4 },
  { categorySlug: 'juguetes-antiguos', key: 'con_caja', label: 'Con caja original', type: 'boolean', sortOrder: 5 },

  // ── RELOJES ─────────────────────────────────────────────────────────────────
  { categorySlug: 'relojes', key: 'marca', label: 'Marca', type: 'text', isRequired: true, sortOrder: 1 },
  { categorySlug: 'relojes', key: 'tipo', label: 'Tipo', type: 'select', options: ['Cuarzo','Automático','Mecánico manual','Cronógrafo','Digital','Smartwatch'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'relojes', key: 'genero', label: 'Para', type: 'select', options: ['Hombre','Mujer','Unisex'], sortOrder: 3 },
  { categorySlug: 'relojes', key: 'material_caja', label: 'Material caja', type: 'select', options: ['Acero inoxidable','Oro','Plata','Titanio','Plástico','Cerámica'], sortOrder: 4 },
  { categorySlug: 'relojes', key: 'material_correa', label: 'Material correa', type: 'select', options: ['Cuero','Acero','Caucho','Silicona','Tela','Malla milanesa'], sortOrder: 5 },
  { categorySlug: 'relojes', key: 'diametro_mm', label: 'Diámetro (mm)', type: 'number', sortOrder: 6 },
  { categorySlug: 'relojes', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado','Usado - con detalles'], sortOrder: 7 },
  { categorySlug: 'relojes', key: 'con_caja', label: 'Con caja y papeles', type: 'boolean', sortOrder: 8 },

  // ── ARTE ────────────────────────────────────────────────────────────────────
  { categorySlug: 'arte', key: 'tecnica', label: 'Técnica', type: 'select', options: ['Óleo','Acrílico','Acuarela','Dibujo/Grafito','Pastel','Fotografía','Digital','Escultura','Grabado','Mixta'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'arte', key: 'soporte', label: 'Soporte', type: 'select', options: ['Tela/Canvas','Papel','Madera','Metal','Cerámica','Fotografía impresa','Otro'], sortOrder: 2 },
  { categorySlug: 'arte', key: 'alto_cm', label: 'Alto (cm)', type: 'number', sortOrder: 3 },
  { categorySlug: 'arte', key: 'ancho_cm', label: 'Ancho (cm)', type: 'number', sortOrder: 4 },
  { categorySlug: 'arte', key: 'con_marco', label: 'Con marco', type: 'boolean', sortOrder: 5 },
  { categorySlug: 'arte', key: 'firmada', label: 'Firmada', type: 'boolean', sortOrder: 6 },
  { categorySlug: 'arte', key: 'certificado', label: 'Con certificado de autenticidad', type: 'boolean', sortOrder: 7 },

  // ── LAPTOPS / NOTEBOOKS ──────────────────────────────────────────────────────
  { categorySlug: 'laptops', key: 'marca', label: 'Marca', type: 'select', options: ['Apple','Lenovo','HP','Dell','ASUS','Acer','Samsung','MSI','Toshiba','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'laptops', key: 'procesador', label: 'Procesador', type: 'select', options: ['Intel Core i3','Intel Core i5','Intel Core i7','Intel Core i9','AMD Ryzen 3','AMD Ryzen 5','AMD Ryzen 7','AMD Ryzen 9','Apple M1','Apple M2','Apple M3','Apple M4'], sortOrder: 2 },
  { categorySlug: 'laptops', key: 'ram_gb', label: 'RAM (GB)', type: 'select', options: ['4','8','16','32','64'], isRequired: true, isVariant: true, sortOrder: 3 },
  { categorySlug: 'laptops', key: 'almacenamiento_gb', label: 'Almacenamiento (GB)', type: 'select', options: ['128','256','512','1000','2000'], isRequired: true, isVariant: true, sortOrder: 4 },
  { categorySlug: 'laptops', key: 'pantalla_pulgadas', label: 'Pantalla (pulgadas)', type: 'select', options: ['11','12','13','14','15','15.6','16','17'], sortOrder: 5 },
  { categorySlug: 'laptops', key: 'sistema_operativo', label: 'Sistema operativo', type: 'select', options: ['Windows 11','Windows 10','macOS','Linux','Chrome OS','Sin OS'], sortOrder: 6 },
  { categorySlug: 'laptops', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Refurbished','Usado - como nuevo','Usado - buen estado','Usado - con detalles'], isRequired: true, sortOrder: 7 },
  { categorySlug: 'laptops', key: 'gpu', label: 'Tarjeta gráfica', type: 'select', options: ['Integrada','NVIDIA GTX','NVIDIA RTX','AMD Radeon','Apple GPU'], sortOrder: 8 },

  // ── DESKTOPS / PC DE ESCRITORIO ─────────────────────────────────────────────
  { categorySlug: 'desktops', key: 'marca', label: 'Marca / armado', type: 'select', options: ['HP','Dell','Lenovo','ASUS','Acer','Ensamblado a medida','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'desktops', key: 'procesador', label: 'Procesador', type: 'select', options: ['Intel Core i3','Intel Core i5','Intel Core i7','Intel Core i9','AMD Ryzen 3','AMD Ryzen 5','AMD Ryzen 7','AMD Ryzen 9'], sortOrder: 2 },
  { categorySlug: 'desktops', key: 'ram_gb', label: 'RAM (GB)', type: 'select', options: ['4','8','16','32','64','128'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'desktops', key: 'almacenamiento_gb', label: 'Almacenamiento (GB)', type: 'select', options: ['256','512','1000','2000','4000'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'desktops', key: 'gpu', label: 'Tarjeta gráfica', type: 'select', options: ['Integrada','NVIDIA GTX 1050','NVIDIA GTX 1060','NVIDIA RTX 2060','NVIDIA RTX 3060','NVIDIA RTX 4060','NVIDIA RTX 4070','AMD Radeon RX 580','AMD Radeon RX 6600','Otra'], sortOrder: 5 },
  { categorySlug: 'desktops', key: 'incluye_monitor', label: 'Incluye monitor', type: 'boolean', sortOrder: 6 },
  { categorySlug: 'desktops', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado','Usado - con detalles'], isRequired: true, sortOrder: 7 },

  // ── MONITORES ───────────────────────────────────────────────────────────────
  { categorySlug: 'monitores', key: 'marca', label: 'Marca', type: 'select', options: ['Samsung','LG','Dell','HP','ASUS','Acer','Philips','MSI','AOC','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'monitores', key: 'pulgadas', label: 'Tamaño (pulgadas)', type: 'select', options: ['21','22','24','27','28','32','34','38','49'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'monitores', key: 'resolucion', label: 'Resolución', type: 'select', options: ['Full HD (1080p)','2K (1440p)','4K (2160p)','Ultrawide 1080p','Ultrawide 1440p'], sortOrder: 3 },
  { categorySlug: 'monitores', key: 'hz', label: 'Tasa de refresco (Hz)', type: 'select', options: ['60','75','100','120','144','165','240','360'], sortOrder: 4 },
  { categorySlug: 'monitores', key: 'panel', label: 'Tipo de panel', type: 'select', options: ['IPS','VA','TN','OLED','QLED'], sortOrder: 5 },
  { categorySlug: 'monitores', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - sin detalles','Usado - con detalles'], isRequired: true, sortOrder: 6 },

  // ── TABLETS ─────────────────────────────────────────────────────────────────
  { categorySlug: 'tablets', key: 'marca', label: 'Marca', type: 'select', options: ['Apple','Samsung','Lenovo','Xiaomi','Huawei','Amazon','ASUS','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'tablets', key: 'almacenamiento_gb', label: 'Almacenamiento (GB)', type: 'select', options: ['16','32','64','128','256','512'], isRequired: true, isVariant: true, sortOrder: 2 },
  { categorySlug: 'tablets', key: 'pantalla_pulgadas', label: 'Pantalla (pulgadas)', type: 'select', options: ['7','8','8.3','10','10.5','11','12','12.9','13'], sortOrder: 3 },
  { categorySlug: 'tablets', key: 'conectividad', label: 'Conectividad', type: 'select', options: ['Solo Wi-Fi','Wi-Fi + 4G','Wi-Fi + 5G'], sortOrder: 4 },
  { categorySlug: 'tablets', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Reacondicionado','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 5 },
  { categorySlug: 'tablets', key: 'incluye_lapiz', label: 'Incluye lápiz/stylus', type: 'boolean', sortOrder: 6 },

  // ── AURICULARES ─────────────────────────────────────────────────────────────
  { categorySlug: 'auriculares', key: 'marca', label: 'Marca', type: 'select', options: ['Sony','Bose','Apple','Samsung','JBL','Sennheiser','Audio-Technica','Xiaomi','Anker','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'auriculares', key: 'tipo', label: 'Tipo', type: 'select', options: ['Over-ear','On-ear','In-ear/Intra-aurales','True Wireless (TWS)'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'auriculares', key: 'conexion', label: 'Conexión', type: 'select', options: ['Bluetooth','Cable 3.5mm','Cable USB-C','Inalámbrico (dongle)'], sortOrder: 3 },
  { categorySlug: 'auriculares', key: 'cancelacion_ruido', label: 'Cancelación activa de ruido (ANC)', type: 'boolean', sortOrder: 4 },
  { categorySlug: 'auriculares', key: 'color', label: 'Color', type: 'select', options: ['Negro','Blanco','Gris','Beige','Azul','Rojo','Otro'], isVariant: true, sortOrder: 5 },
  { categorySlug: 'auriculares', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 6 },

  // ── PARLANTES ───────────────────────────────────────────────────────────────
  { categorySlug: 'parlantes', key: 'marca', label: 'Marca', type: 'select', options: ['JBL','Sony','Bose','Marshall','Harman Kardon','Samsung','LG','Xiaomi','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'parlantes', key: 'tipo', label: 'Tipo', type: 'select', options: ['Portátil Bluetooth','Soundbar','Torre','Subwoofer','Estéreo de escritorio','Columna'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'parlantes', key: 'potencia_w', label: 'Potencia (W)', type: 'number', sortOrder: 3 },
  { categorySlug: 'parlantes', key: 'resistencia_agua', label: 'Resistencia al agua (IP)', type: 'boolean', sortOrder: 4 },
  { categorySlug: 'parlantes', key: 'color', label: 'Color', type: 'select', options: ['Negro','Blanco','Gris','Camuflado','Rojo','Azul','Otro'], isVariant: true, sortOrder: 5 },
  { categorySlug: 'parlantes', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 6 },

  // ── TV ──────────────────────────────────────────────────────────────────────
  { categorySlug: 'tv', key: 'marca', label: 'Marca', type: 'select', options: ['Samsung','LG','Sony','TCL','Hisense','Philips','Noblex','RCA','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'tv', key: 'pulgadas', label: 'Tamaño (pulgadas)', type: 'select', options: ['32','40','43','50','55','65','75','85'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'tv', key: 'resolucion', label: 'Resolución', type: 'select', options: ['HD (720p)','Full HD (1080p)','4K (2160p)','8K'], sortOrder: 3 },
  { categorySlug: 'tv', key: 'smart', label: 'Smart TV', type: 'boolean', sortOrder: 4 },
  { categorySlug: 'tv', key: 'sistema', label: 'Sistema operativo', type: 'select', options: ['Android TV','Tizen','webOS','Roku TV','Google TV','Fire TV','Otro'], sortOrder: 5 },
  { categorySlug: 'tv', key: 'panel', label: 'Tecnología de pantalla', type: 'select', options: ['LED','OLED','QLED','Neo QLED','Mini-LED'], sortOrder: 6 },
  { categorySlug: 'tv', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado','Usado - con detalles'], isRequired: true, sortOrder: 7 },

  // ── CONSOLAS ─────────────────────────────────────────────────────────────────
  { categorySlug: 'consolas', key: 'marca', label: 'Marca', type: 'select', options: ['Sony PlayStation','Microsoft Xbox','Nintendo','Sega','Atari','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'consolas', key: 'modelo', label: 'Modelo', type: 'select', options: ['PlayStation 5','PlayStation 4','PlayStation 3','Xbox Series X','Xbox Series S','Xbox One','Nintendo Switch','Nintendo Switch OLED','Nintendo Switch Lite','Game Boy','Otra'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'consolas', key: 'almacenamiento_gb', label: 'Almacenamiento (GB)', type: 'select', options: ['128','256','512','1000','2000'], sortOrder: 3 },
  { categorySlug: 'consolas', key: 'incluye_juegos', label: 'Incluye juegos', type: 'boolean', sortOrder: 4 },
  { categorySlug: 'consolas', key: 'controles_incluidos', label: 'Cantidad de controles', type: 'number', sortOrder: 5 },
  { categorySlug: 'consolas', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado','Usado - con detalles'], isRequired: true, sortOrder: 6 },

  // ── VIDEOJUEGOS TÍTULOS ──────────────────────────────────────────────────────
  { categorySlug: 'videojuegos-titulos', key: 'plataforma', label: 'Plataforma', type: 'select', options: ['PlayStation 5','PlayStation 4','PlayStation 3','Xbox Series','Xbox One','Nintendo Switch','PC (clave digital)','PC (disco)'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'videojuegos-titulos', key: 'genero', label: 'Género', type: 'select', options: ['Acción','Aventura','RPG','Deportes','Carreras','Shooter','Terror','Estrategia','Simulación','Plataformas','Otro'], sortOrder: 2 },
  { categorySlug: 'videojuegos-titulos', key: 'formato', label: 'Formato', type: 'select', options: ['Físico (disco)','Digital (clave)'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'videojuegos-titulos', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado'], sortOrder: 4 },
  { categorySlug: 'videojuegos-titulos', key: 'region', label: 'Región', type: 'select', options: ['LATAM','USA','Europa','Japón','Sin región'], sortOrder: 5 },

  // ── CÁMARAS ─────────────────────────────────────────────────────────────────
  { categorySlug: 'camaras', key: 'marca', label: 'Marca', type: 'select', options: ['Canon','Nikon','Sony','Fujifilm','Olympus','Panasonic','Leica','GoPro','DJI','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'camaras', key: 'tipo', label: 'Tipo', type: 'select', options: ['DSLR / Réflex','Mirrorless','Compacta','Acción (GoPro)','Drone','Instantánea','Análoga'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'camaras', key: 'megapixeles', label: 'Megapíxeles', type: 'number', sortOrder: 3 },
  { categorySlug: 'camaras', key: 'montura', label: 'Montura', type: 'select', options: ['Canon EF','Canon RF','Nikon F','Nikon Z','Sony E','Sony A','Fujifilm X','Micro 4/3','Otra'], sortOrder: 4 },
  { categorySlug: 'camaras', key: 'incluye_lente', label: 'Incluye lente', type: 'boolean', sortOrder: 5 },
  { categorySlug: 'camaras', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado','Usado - con detalles'], isRequired: true, sortOrder: 6 },

  // ── SMARTWATCHES ─────────────────────────────────────────────────────────────
  { categorySlug: 'smartwatches', key: 'marca', label: 'Marca', type: 'select', options: ['Apple','Samsung','Garmin','Xiaomi','Huawei','Fitbit','Amazfit','Polar','Suunto','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'smartwatches', key: 'modelo', label: 'Modelo', type: 'text', sortOrder: 2 },
  { categorySlug: 'smartwatches', key: 'color_caja', label: 'Color caja', type: 'select', options: ['Negro','Plateado','Dorado','Titanio','Blanco','Otro'], isVariant: true, sortOrder: 3 },
  { categorySlug: 'smartwatches', key: 'material_correa', label: 'Material correa', type: 'select', options: ['Silicona','Acero inoxidable','Cuero','Malla milanesa','Nylon'], sortOrder: 4 },
  { categorySlug: 'smartwatches', key: 'compatibilidad', label: 'Compatible con', type: 'select', options: ['iOS','Android','Ambos'], sortOrder: 5 },
  { categorySlug: 'smartwatches', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 6 },

  // ── ACCESORIOS TECH ──────────────────────────────────────────────────────────
  { categorySlug: 'accesorios-tech', key: 'tipo', label: 'Tipo de accesorio', type: 'select', options: ['Funda','Protector de pantalla','Cargador','Cable','Hub USB','Teclado','Mouse','Mousepad','Webcam','Micrófono','Soporte','Router','Switch','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'accesorios-tech', key: 'compatibilidad', label: 'Compatible con', type: 'text', sortOrder: 2 },
  { categorySlug: 'accesorios-tech', key: 'marca', label: 'Marca', type: 'text', sortOrder: 3 },
  { categorySlug: 'accesorios-tech', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 4 },

  // ── AUTOS ────────────────────────────────────────────────────────────────────
  { categorySlug: 'autos', key: 'marca', label: 'Marca', type: 'select', options: ['Volkswagen','Ford','Chevrolet','Toyota','Renault','Peugeot','Fiat','Honda','Hyundai','Kia','Nissan','Mercedes-Benz','BMW','Audi','Jeep','Mitsubishi','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'autos', key: 'modelo', label: 'Modelo', type: 'text', isRequired: true, sortOrder: 2 },
  { categorySlug: 'autos', key: 'anio', label: 'Año', type: 'number', isRequired: true, sortOrder: 3 },
  { categorySlug: 'autos', key: 'km', label: 'Kilómetros', type: 'number', isRequired: true, sortOrder: 4 },
  { categorySlug: 'autos', key: 'combustible', label: 'Combustible', type: 'select', options: ['Nafta','Diesel','GNC','Híbrido','Eléctrico','Flex'], sortOrder: 5 },
  { categorySlug: 'autos', key: 'transmision', label: 'Transmisión', type: 'select', options: ['Manual','Automática','CVT','Secuencial'], sortOrder: 6 },
  { categorySlug: 'autos', key: 'color', label: 'Color', type: 'select', options: ['Blanco','Negro','Gris','Plata','Rojo','Azul','Verde','Marrón','Otro'], sortOrder: 7 },
  { categorySlug: 'autos', key: 'puertas', label: 'Cantidad de puertas', type: 'select', options: ['2','3','4','5'], sortOrder: 8 },
  { categorySlug: 'autos', key: 'gnc', label: 'Con GNC', type: 'boolean', sortOrder: 9 },
  { categorySlug: 'autos', key: 'unico_dueno', label: 'Único dueño', type: 'boolean', sortOrder: 10 },

  // ── MOTOS ────────────────────────────────────────────────────────────────────
  { categorySlug: 'motos', key: 'marca', label: 'Marca', type: 'select', options: ['Honda','Yamaha','Kawasaki','Suzuki','BMW','Harley-Davidson','KTM','Royal Enfield','Bajaj','Beta','Zanella','Guerrero','Motomel','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'motos', key: 'modelo', label: 'Modelo', type: 'text', isRequired: true, sortOrder: 2 },
  { categorySlug: 'motos', key: 'anio', label: 'Año', type: 'number', isRequired: true, sortOrder: 3 },
  { categorySlug: 'motos', key: 'cc', label: 'Cilindrada (cc)', type: 'select', options: ['50','110','125','150','200','250','300','400','500','600','750','1000','Más de 1000'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'motos', key: 'km', label: 'Kilómetros', type: 'number', sortOrder: 5 },
  { categorySlug: 'motos', key: 'tipo', label: 'Tipo', type: 'select', options: ['Calle/Naked','Deportiva','Trail/Enduro','Custom/Chopper','Scooter','Eléctrica'], sortOrder: 6 },
  { categorySlug: 'motos', key: 'color', label: 'Color', type: 'select', options: ['Negro','Blanco','Rojo','Azul','Naranja','Verde','Gris','Otro'], sortOrder: 7 },

  // ── CUATRICICLOS ─────────────────────────────────────────────────────────────
  { categorySlug: 'cuatriciclos', key: 'marca', label: 'Marca', type: 'select', options: ['Yamaha','Honda','Can-Am','Kawasaki','Suzuki','Polaris','CF Moto','Otra'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'cuatriciclos', key: 'cc', label: 'Cilindrada (cc)', type: 'select', options: ['50','70','90','110','125','150','200','250','300','400','500','700','850','Más de 1000'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'cuatriciclos', key: 'anio', label: 'Año', type: 'number', sortOrder: 3 },
  { categorySlug: 'cuatriciclos', key: 'tipo', label: 'Tipo', type: 'select', options: ['ATV Sport','ATV Utilitario','UTV/Side by Side','Infantil'], sortOrder: 4 },
  { categorySlug: 'cuatriciclos', key: 'traccion', label: 'Tracción', type: 'select', options: ['2WD','4WD','4WD seleccionable'], sortOrder: 5 },

  // ── PANTALONES ───────────────────────────────────────────────────────────────
  { categorySlug: 'pantalones', key: 'talle', label: 'Talle', type: 'select', options: ['XS','S','M','L','XL','XXL','XXXL','28','29','30','31','32','33','34','36','38','40','42','44'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'pantalones', key: 'color', label: 'Color', type: 'select', options: ['Negro','Blanco','Gris','Azul','Azul marino','Beige','Verde','Rojo','Estampado','Otro'], isVariant: true, sortOrder: 2 },
  { categorySlug: 'pantalones', key: 'tipo', label: 'Tipo', type: 'select', options: ['Jean','Chino','Cargo','Deportivo/Jogging','Formal','Short','Bermuda','Calza'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'pantalones', key: 'genero', label: 'Para', type: 'select', options: ['Hombre','Mujer','Unisex'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'pantalones', key: 'material', label: 'Material', type: 'select', options: ['Jean/Denim','Algodón','Poliéster','Lino','Cuero','Elastizado'], sortOrder: 5 },
  { categorySlug: 'pantalones', key: 'marca', label: 'Marca', type: 'text', sortOrder: 6 },

  // ── CAMISAS Y REMERAS ────────────────────────────────────────────────────────
  { categorySlug: 'camisas', key: 'talle', label: 'Talle', type: 'select', options: ['XS','S','M','L','XL','XXL','XXXL'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'camisas', key: 'color', label: 'Color', type: 'select', options: ['Blanco','Negro','Gris','Azul','Celeste','Rojo','Verde','Estampado','Otro'], isVariant: true, sortOrder: 2 },
  { categorySlug: 'camisas', key: 'tipo', label: 'Tipo', type: 'select', options: ['Remera manga corta','Remera manga larga','Camisa','Polo','Musculosa','Buzo','Hoodie'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'camisas', key: 'genero', label: 'Para', type: 'select', options: ['Hombre','Mujer','Unisex'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'camisas', key: 'material', label: 'Material', type: 'select', options: ['Algodón 100%','Algodón/Poliéster','Poliéster','Lino','Lana','Otro'], sortOrder: 5 },
  { categorySlug: 'camisas', key: 'marca', label: 'Marca', type: 'text', sortOrder: 6 },

  // ── VESTIDOS ─────────────────────────────────────────────────────────────────
  { categorySlug: 'vestidos', key: 'talle', label: 'Talle', type: 'select', options: ['XS','S','M','L','XL','XXL','34','36','38','40','42','44'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'vestidos', key: 'color', label: 'Color', type: 'select', options: ['Negro','Blanco','Rojo','Azul','Verde','Rosa','Estampado','Multicolor','Otro'], isVariant: true, sortOrder: 2 },
  { categorySlug: 'vestidos', key: 'tipo', label: 'Tipo', type: 'select', options: ['Casual','Formal/Fiesta','Playero','Deportivo','Midi','Maxi','Mini','Conjunto'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'vestidos', key: 'largo', label: 'Largo', type: 'select', options: ['Mini (por encima rodilla)','Midi (hasta rodilla)','Maxi (hasta tobillo)','Largo (hasta el piso)'], sortOrder: 4 },
  { categorySlug: 'vestidos', key: 'material', label: 'Material', type: 'select', options: ['Algodón','Tul','Seda/Satén','Lino','Jersey','Viscosa','Otro'], sortOrder: 5 },
  { categorySlug: 'vestidos', key: 'marca', label: 'Marca', type: 'text', sortOrder: 6 },

  // ── ABRIGOS ──────────────────────────────────────────────────────────────────
  { categorySlug: 'abrigos', key: 'talle', label: 'Talle', type: 'select', options: ['XS','S','M','L','XL','XXL','XXXL'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'abrigos', key: 'color', label: 'Color', type: 'select', options: ['Negro','Gris','Beige','Marrón','Azul','Rojo','Verde','Otro'], isVariant: true, sortOrder: 2 },
  { categorySlug: 'abrigos', key: 'tipo', label: 'Tipo', type: 'select', options: ['Campera','Tapado','Piloto/Impermeable','Chaleco','Buzo con capucha','Polar','Plumas/Down'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'abrigos', key: 'genero', label: 'Para', type: 'select', options: ['Hombre','Mujer','Unisex'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'abrigos', key: 'material', label: 'Material', type: 'select', options: ['Poliéster','Cuero','Cuero vegano','Lana','Plumas','Polar','Impermeable','Otro'], sortOrder: 5 },
  { categorySlug: 'abrigos', key: 'marca', label: 'Marca', type: 'text', sortOrder: 6 },

  // ── ROPA NIÑAS ───────────────────────────────────────────────────────────────
  { categorySlug: 'ropa-ninas', key: 'talle', label: 'Talle / Edad', type: 'select', options: ['0-3 meses','3-6 meses','6-9 meses','9-12 meses','12-18 meses','2 años','3 años','4 años','5 años','6 años','7 años','8 años','10 años','12 años','14 años','16 años'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'ropa-ninas', key: 'tipo', label: 'Tipo de prenda', type: 'select', options: ['Vestido','Remera','Pantalón','Conjunto','Enterito','Campera','Calza','Pijama','Traje de baño','Ropa interior'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'ropa-ninas', key: 'color', label: 'Color', type: 'select', options: ['Rosa','Violeta','Blanco','Negro','Rojo','Azul','Estampado','Multicolor','Otro'], isVariant: true, sortOrder: 3 },
  { categorySlug: 'ropa-ninas', key: 'marca', label: 'Marca', type: 'text', sortOrder: 4 },

  // ── ROPA NIÑOS ───────────────────────────────────────────────────────────────
  { categorySlug: 'ropa-ninos', key: 'talle', label: 'Talle / Edad', type: 'select', options: ['0-3 meses','3-6 meses','6-9 meses','9-12 meses','12-18 meses','2 años','3 años','4 años','5 años','6 años','7 años','8 años','10 años','12 años','14 años','16 años'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'ropa-ninos', key: 'tipo', label: 'Tipo de prenda', type: 'select', options: ['Remera','Pantalón','Conjunto','Enterito','Campera','Short','Buzo','Pijama','Ropa interior'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'ropa-ninos', key: 'color', label: 'Color', type: 'select', options: ['Azul','Gris','Rojo','Verde','Negro','Blanco','Estampado','Multicolor','Otro'], isVariant: true, sortOrder: 3 },
  { categorySlug: 'ropa-ninos', key: 'marca', label: 'Marca', type: 'text', sortOrder: 4 },

  // ── ROPA BEBÉS ───────────────────────────────────────────────────────────────
  { categorySlug: 'ropa-bebes', key: 'talle', label: 'Talle / Meses', type: 'select', options: ['RN (recién nacido)','0-3 meses','3-6 meses','6-9 meses','9-12 meses','12-18 meses','18-24 meses'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'ropa-bebes', key: 'tipo', label: 'Tipo', type: 'select', options: ['Body','Pijama','Enterito','Conjunto','Mameluco','Camperín','Medias','Sombrero/Gorro'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'ropa-bebes', key: 'genero', label: 'Para', type: 'select', options: ['Nena','Nene','Unisex'], sortOrder: 3 },
  { categorySlug: 'ropa-bebes', key: 'material', label: 'Material', type: 'select', options: ['Algodón 100%','Interlock','Polar','Jersey','Otro'], sortOrder: 4 },

  // ── BOTAS ────────────────────────────────────────────────────────────────────
  { categorySlug: 'botas', key: 'talle', label: 'Talle (ARG)', type: 'select', options: ['33','34','35','36','37','38','39','40','41','42','43','44','45','46'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'botas', key: 'color', label: 'Color', type: 'select', options: ['Negro','Marrón','Beige','Blanco','Bordo','Gris','Otro'], isVariant: true, sortOrder: 2 },
  { categorySlug: 'botas', key: 'tipo', label: 'Tipo', type: 'select', options: ['Bota corta','Bota larga/caña alta','Borcego','Bota de lluvia','Bota de moto','Bota de montaña'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'botas', key: 'genero', label: 'Para', type: 'select', options: ['Mujer','Hombre','Unisex','Niño/a'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'botas', key: 'material', label: 'Material', type: 'select', options: ['Cuero','Cuero vegano','Goma','Gamuza','Sintético','Combinado'], sortOrder: 5 },
  { categorySlug: 'botas', key: 'taco', label: 'Taco', type: 'select', options: ['Sin taco (plano)','Bajo (1-3 cm)','Medio (4-6 cm)','Alto (7+ cm)','Taco bloque','Stiletto'], sortOrder: 6 },
  { categorySlug: 'botas', key: 'marca', label: 'Marca', type: 'text', sortOrder: 7 },

  // ── SANDALIAS ────────────────────────────────────────────────────────────────
  { categorySlug: 'sandalias', key: 'talle', label: 'Talle (ARG)', type: 'select', options: ['33','34','35','36','37','38','39','40','41','42','43','44'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'sandalias', key: 'color', label: 'Color', type: 'select', options: ['Negro','Blanco','Beige','Dorado','Plateado','Marrón','Otro'], isVariant: true, sortOrder: 2 },
  { categorySlug: 'sandalias', key: 'tipo', label: 'Tipo', type: 'select', options: ['Sandalia plana','Sandalia con taco','Ojotas','Plataforma','Birkenstock style','Cuña'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'sandalias', key: 'genero', label: 'Para', type: 'select', options: ['Mujer','Hombre','Unisex','Niño/a'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'sandalias', key: 'marca', label: 'Marca', type: 'text', sortOrder: 5 },

  // ── ZAPATOS DE VESTIR ────────────────────────────────────────────────────────
  { categorySlug: 'zapatos-vestir', key: 'talle', label: 'Talle (ARG)', type: 'select', options: ['33','34','35','36','37','38','39','40','41','42','43','44','45','46'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'zapatos-vestir', key: 'color', label: 'Color', type: 'select', options: ['Negro','Marrón','Bordo','Beige','Blanco','Dorado','Otro'], isVariant: true, sortOrder: 2 },
  { categorySlug: 'zapatos-vestir', key: 'tipo', label: 'Tipo', type: 'select', options: ['Oxford','Derby','Mocasin','Slip-on','Stiletto','Escarpín','Balerinas','Plataforma'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'zapatos-vestir', key: 'genero', label: 'Para', type: 'select', options: ['Hombre','Mujer','Unisex'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'zapatos-vestir', key: 'material', label: 'Material', type: 'select', options: ['Cuero','Cuero vegano','Gamuzado','Charol','Sintético'], sortOrder: 5 },
  { categorySlug: 'zapatos-vestir', key: 'marca', label: 'Marca', type: 'text', sortOrder: 6 },

  // ── CALZADO NIÑOS ────────────────────────────────────────────────────────────
  { categorySlug: 'calzado-ninos', key: 'talle', label: 'Talle', type: 'select', options: ['15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35'], isRequired: true, isVariant: true, sortOrder: 1 },
  { categorySlug: 'calzado-ninos', key: 'tipo', label: 'Tipo', type: 'select', options: ['Zapatilla','Bota','Sandalia','Ojota','Escolar','Botín'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'calzado-ninos', key: 'genero', label: 'Para', type: 'select', options: ['Niña','Niño','Unisex'], sortOrder: 3 },
  { categorySlug: 'calzado-ninos', key: 'marca', label: 'Marca', type: 'text', sortOrder: 4 },

  // ── MUEBLES ─────────────────────────────────────────────────────────────────
  { categorySlug: 'muebles', key: 'tipo', label: 'Tipo de mueble', type: 'select', options: ['Silla','Sillón/Sofa','Mesa de comedor','Mesa ratona','Escritorio','Cama','Sommier','Ropero/Placard','Cómoda','Biblioteca','Mesa de luz','Aparador','Rack TV','Espejo','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'muebles', key: 'material', label: 'Material', type: 'select', options: ['Madera maciza','Madera laminada/MDF','Metal','Hierro forjado','Rattan','Tela','Cuero','Vidrio','Mixto'], sortOrder: 2 },
  { categorySlug: 'muebles', key: 'color', label: 'Color/Terminación', type: 'select', options: ['Natural madera','Blanco','Negro','Gris','Marrón','Roble/Nogal','Otro'], sortOrder: 3 },
  { categorySlug: 'muebles', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado','Usado - necesita reparación'], isRequired: true, sortOrder: 4 },
  { categorySlug: 'muebles', key: 'armado', label: 'Requiere armado', type: 'boolean', sortOrder: 5 },

  // ── ELECTRODOMÉSTICOS ────────────────────────────────────────────────────────
  { categorySlug: 'electrodomesticos', key: 'tipo', label: 'Tipo', type: 'select', options: ['Heladera','Lavarropas','Secarropas','Lavarropa/Secarropa combo','Microondas','Horno eléctrico','Air fryer','Cafetera','Aspiradora','Plancha','Ventilador','Aire acondicionado','Calefactor','Licuadora','Procesadora','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'electrodomesticos', key: 'marca', label: 'Marca', type: 'select', options: ['Samsung','LG','Whirlpool','Electrolux','Mabe','Gafa','Patrick','Peabody','Philips','Oster','BGH','Drean','Otra'], sortOrder: 2 },
  { categorySlug: 'electrodomesticos', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - funcionando perfecto','Usado - con detalles estéticos','Necesita reparación'], isRequired: true, sortOrder: 3 },
  { categorySlug: 'electrodomesticos', key: 'con_garantia', label: 'Con garantía', type: 'boolean', sortOrder: 4 },

  // ── COCINA ───────────────────────────────────────────────────────────────────
  { categorySlug: 'cocina', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Olla','Sartén','Set de utensilios','Cuchillos','Set cocina','Vajilla','Fuente para horno','Aceitera/Vinagrería','Tabla de corte','Mortar/Pilón','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'cocina', key: 'material', label: 'Material', type: 'select', options: ['Acero inoxidable','Hierro fundido','Aluminio antiadherente','Vidrio','Cerámica','Madera','Plástico','Silicona'], sortOrder: 2 },
  { categorySlug: 'cocina', key: 'marca', label: 'Marca', type: 'text', sortOrder: 3 },
  { categorySlug: 'cocina', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 4 },

  // ── DECORACIÓN ───────────────────────────────────────────────────────────────
  { categorySlug: 'decoracion', key: 'tipo', label: 'Tipo', type: 'select', options: ['Cuadro/Pintura','Escultura','Maceta/Planta','Alfombra','Cortina','Cojín','Vela/Aromaterapia','Reloj de pared','Espejo decorativo','Portafotos','Floreros','Figura/Estatuilla','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'decoracion', key: 'estilo', label: 'Estilo', type: 'select', options: ['Moderno/Minimalista','Rústico','Boho','Industrial','Clásico','Escandinavo','Vintage','Otro'], sortOrder: 2 },
  { categorySlug: 'decoracion', key: 'material', label: 'Material', type: 'select', options: ['Madera','Cerámica','Vidrio','Metal','Tela','Plástico','Natural (mimbre, yute)','Otro'], sortOrder: 3 },
  { categorySlug: 'decoracion', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 4 },

  // ── ILUMINACIÓN ──────────────────────────────────────────────────────────────
  { categorySlug: 'iluminacion', key: 'tipo', label: 'Tipo', type: 'select', options: ['Lámpara de pie','Lámpara de escritorio','Lámpara de techo','Aplique de pared','Tira LED','Velador','Araña','Farola exterior','Reflector'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'iluminacion', key: 'tipo_luz', label: 'Tipo de luz', type: 'select', options: ['LED','Incandescente','Fluorescente','Halógena','Smart/RGB'], sortOrder: 2 },
  { categorySlug: 'iluminacion', key: 'color_luz', label: 'Temperatura de color', type: 'select', options: ['Cálida (amarilla)','Neutra (blanca)','Fría (azulada)','RGB/Multicolor'], sortOrder: 3 },
  { categorySlug: 'iluminacion', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - funcionando','Usado - necesita revisión'], isRequired: true, sortOrder: 4 },

  // ── JARDÍN ───────────────────────────────────────────────────────────────────
  { categorySlug: 'jardin', key: 'tipo', label: 'Tipo', type: 'select', options: ['Mueble de jardín','Herramienta de jardín','Plantas y semillas','Maceta exterior','Parrilla/BBQ','Pileta/Jacuzzi','Riego','Carretilla','Cortadora de césped','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'jardin', key: 'material', label: 'Material (si aplica)', type: 'select', options: ['Acero inoxidable','Aluminio','Plástico UV','Hierro','Madera tratada','Rattan sintético'], sortOrder: 2 },
  { categorySlug: 'jardin', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - buen estado','Usado - con detalles'], isRequired: true, sortOrder: 3 },

  // ── BICICLETAS ELÉCTRICAS ────────────────────────────────────────────────────
  { categorySlug: 'bicicletas-electricas', key: 'rodado', label: 'Rodado', type: 'select', options: ['20','24','26','27.5','28','29'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'bicicletas-electricas', key: 'potencia_w', label: 'Potencia motor (W)', type: 'select', options: ['250','350','500','750','1000','1500'], isRequired: true, sortOrder: 2 },
  { categorySlug: 'bicicletas-electricas', key: 'autonomia_km', label: 'Autonomía estimada (km)', type: 'number', sortOrder: 3 },
  { categorySlug: 'bicicletas-electricas', key: 'tipo', label: 'Tipo', type: 'select', options: ['Urbana/City','Mountain (E-MTB)','Plegable','Cargo','Fat Bike'], sortOrder: 4 },
  { categorySlug: 'bicicletas-electricas', key: 'marca', label: 'Marca', type: 'text', sortOrder: 5 },
  { categorySlug: 'bicicletas-electricas', key: 'estado', label: 'Estado', type: 'select', options: ['Nueva','Usada - como nueva','Usada - buen estado'], isRequired: true, sortOrder: 6 },

  // ── RUNNING ─────────────────────────────────────────────────────────────────
  { categorySlug: 'running', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Zapatillas running','Ropa técnica','Reloj GPS','Auriculares running','Mochila/Chaleco','Accesorios'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'running', key: 'marca', label: 'Marca', type: 'select', options: ['Nike','Adidas','Asics','New Balance','Brooks','Saucony','On Running','Hoka','Puma','Otro'], sortOrder: 2 },
  { categorySlug: 'running', key: 'genero', label: 'Para', type: 'select', options: ['Hombre','Mujer','Unisex'], sortOrder: 3 },
  { categorySlug: 'running', key: 'talle', label: 'Talle (si aplica)', type: 'select', options: ['XS','S','M','L','XL','XXL','35','36','37','38','39','40','41','42','43','44','45'], isVariant: true, sortOrder: 4 },
  { categorySlug: 'running', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 5 },

  // ── CAMPING ─────────────────────────────────────────────────────────────────
  { categorySlug: 'camping', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Carpa','Bolsa de dormir','Colchoneta/Mat','Mochila','Lámpara/Linterna','Cocinilla','Heladera portátil','Hacha/Navaja','Primeros auxilios','Bastón trekking','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'camping', key: 'marca', label: 'Marca', type: 'text', sortOrder: 2 },
  { categorySlug: 'camping', key: 'capacidad', label: 'Capacidad (personas/litros)', type: 'text', sortOrder: 3 },
  { categorySlug: 'camping', key: 'estacion', label: 'Estación (para carpa/bolsa)', type: 'select', options: ['1 estación','2 estaciones','3 estaciones','4 estaciones'], sortOrder: 4 },
  { categorySlug: 'camping', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 5 },

  // ── FÚTBOL ───────────────────────────────────────────────────────────────────
  { categorySlug: 'futbol', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Camiseta','Pantalón short','Botines','Pelota','Canillera','Guantes de arquero','Bolso deportivo','Pechera','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'futbol', key: 'club', label: 'Club/Selección (camiseta)', type: 'text', sortOrder: 2 },
  { categorySlug: 'futbol', key: 'talle', label: 'Talle', type: 'select', options: ['XS','S','M','L','XL','XXL','35','36','37','38','39','40','41','42','43','44','45'], isVariant: true, sortOrder: 3 },
  { categorySlug: 'futbol', key: 'temporada', label: 'Temporada (camiseta)', type: 'text', sortOrder: 4 },
  { categorySlug: 'futbol', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 5 },

  // ── GYM ──────────────────────────────────────────────────────────────────────
  { categorySlug: 'gym', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Mancuernas','Barra y discos','Banco','Máquina cardio','Elíptica','Cinta de correr','Bicicleta fija','Remo','Kettle bell','Bandas elásticas','Mat de yoga/pilates','Ropa deportiva','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'gym', key: 'marca', label: 'Marca', type: 'text', sortOrder: 2 },
  { categorySlug: 'gym', key: 'peso_kg', label: 'Peso (kg, si aplica)', type: 'number', sortOrder: 3 },
  { categorySlug: 'gym', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado','Necesita revisión'], isRequired: true, sortOrder: 4 },

  // ── YOGA ─────────────────────────────────────────────────────────────────────
  { categorySlug: 'yoga', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Mat/Colchoneta','Bloques','Correa','Bolster','Rueda de yoga','Ropa de yoga','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'yoga', key: 'marca', label: 'Marca', type: 'text', sortOrder: 2 },
  { categorySlug: 'yoga', key: 'material', label: 'Material (mat)', type: 'select', options: ['TPE','PVC','Caucho natural','Yute','Microfibra'], sortOrder: 3 },
  { categorySlug: 'yoga', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 4 },

  // ── PESCA ────────────────────────────────────────────────────────────────────
  { categorySlug: 'pesca', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Caña','Reel','Línea/Sedal','Señuelo/Lure','Anzuelo','Caja de pesca','Silla/Banco','Red','Embarcación inflable','Pilotín','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'pesca', key: 'modalidad', label: 'Modalidad de pesca', type: 'select', options: ['Río/Lago','Mar','Mosca','Spinning','Carpa','Trolling'], sortOrder: 2 },
  { categorySlug: 'pesca', key: 'marca', label: 'Marca', type: 'text', sortOrder: 3 },
  { categorySlug: 'pesca', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 4 },

  // ── SNOW / SKI ───────────────────────────────────────────────────────────────
  { categorySlug: 'snow-ski', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Esquís','Tabla de snowboard','Botas de esquí','Botas snowboard','Casco','Gafas/Antiparras','Traje de nieve','Bastones','Guantes','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'snow-ski', key: 'nivel', label: 'Nivel', type: 'select', options: ['Principiante','Intermedio','Avanzado','Competición'], sortOrder: 2 },
  { categorySlug: 'snow-ski', key: 'talle', label: 'Talle/Medida', type: 'text', isVariant: true, sortOrder: 3 },
  { categorySlug: 'snow-ski', key: 'marca', label: 'Marca', type: 'text', sortOrder: 4 },
  { categorySlug: 'snow-ski', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - pocos días','Usado - buen estado','Usado - con detalles'], isRequired: true, sortOrder: 5 },

  // ── GATOS ────────────────────────────────────────────────────────────────────
  { categorySlug: 'gatos', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Alimento seco','Alimento húmedo','Arena/Sanitario','Rascador','Juguete para gato','Camita/Cucha','Arnés/Correa','Transportín','Antiparasitario','Accesorios'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'gatos', key: 'marca', label: 'Marca', type: 'text', sortOrder: 2 },
  { categorySlug: 'gatos', key: 'edad_gato', label: 'Para gatos', type: 'select', options: ['Gatito (0-1 año)','Adulto (1-7 años)','Senior (7+ años)','Todas las edades'], sortOrder: 3 },
  { categorySlug: 'gatos', key: 'peso_kg', label: 'Peso del producto (kg)', type: 'number', isVariant: true, sortOrder: 4 },

  // ── PECES ────────────────────────────────────────────────────────────────────
  { categorySlug: 'peces', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Acuario/Pecera','Filtro','Calefactor','Iluminación acuario','Alimento','Decoración acuario','Sustrato','Plantas artificiales','Bomba de aire','Accesorios'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'peces', key: 'tipo_agua', label: 'Tipo de agua', type: 'select', options: ['Agua dulce','Agua salada','Agua fría','Universal'], sortOrder: 2 },
  { categorySlug: 'peces', key: 'litros', label: 'Capacidad (litros)', type: 'number', sortOrder: 3 },
  { categorySlug: 'peces', key: 'marca', label: 'Marca', type: 'text', sortOrder: 4 },
  { categorySlug: 'peces', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - funcionando','Usado - con detalles'], sortOrder: 5 },

  // ── AVES ─────────────────────────────────────────────────────────────────────
  { categorySlug: 'aves', key: 'tipo', label: 'Tipo de artículo', type: 'select', options: ['Jaula','Comedero/Bebedero','Alimento','Percha','Nido','Juguete para aves','Transportín','Accesorios'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'aves', key: 'tipo_ave', label: 'Para qué ave', type: 'select', options: ['Canario','Periquito/Perico','Loro','Cotorra','Cacatúa','Diamante','Otro'], sortOrder: 2 },
  { categorySlug: 'aves', key: 'marca', label: 'Marca', type: 'text', sortOrder: 3 },
  { categorySlug: 'aves', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - buen estado'], sortOrder: 4 },

  // ── SERVICIOS HOGAR ──────────────────────────────────────────────────────────
  { categorySlug: 'servicios-hogar', key: 'tipo_servicio', label: 'Tipo de servicio', type: 'select', options: ['Plomería','Electricidad','Carpintería','Albañilería','Pintura','Limpieza','Mudanzas','Reparación electrodomésticos','Cerrajería','Jardinería','Refrigeración/AA','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'servicios-hogar', key: 'modalidad', label: 'Modalidad', type: 'select', options: ['Presencial','A domicilio','Virtual/Remoto'], sortOrder: 2 },
  { categorySlug: 'servicios-hogar', key: 'zona', label: 'Zona de cobertura', type: 'text', sortOrder: 3 },
  { categorySlug: 'servicios-hogar', key: 'urgencia', label: 'Disponibilidad urgente', type: 'boolean', sortOrder: 4 },

  // ── SERVICIOS BELLEZA ─────────────────────────────────────────────────────────
  { categorySlug: 'servicios-belleza', key: 'tipo_servicio', label: 'Tipo de servicio', type: 'select', options: ['Peluquería','Coloración','Manicura/Pedicura','Depilación','Maquillaje','Pestañas','Cejas','Masajes','Spa','Estética corporal','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'servicios-belleza', key: 'modalidad', label: 'Modalidad', type: 'select', options: ['En local','A domicilio'], sortOrder: 2 },
  { categorySlug: 'servicios-belleza', key: 'zona', label: 'Zona', type: 'text', sortOrder: 3 },

  // ── SERVICIOS EVENTOS ─────────────────────────────────────────────────────────
  { categorySlug: 'servicios-eventos', key: 'tipo_servicio', label: 'Tipo de servicio', type: 'select', options: ['Fotografía','Video/Filmación','DJ/Música','Animación infantil','Decoración','Catering/Comida','Salon de fiestas','Shows/Espectáculos','Maestro de ceremonias','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'servicios-eventos', key: 'tipo_evento', label: 'Tipo de evento', type: 'select', options: ['Cumpleaños','Casamiento','15 años','Bautismo','Corporativo','Egresados','Otro'], sortOrder: 2 },
  { categorySlug: 'servicios-eventos', key: 'zona', label: 'Zona', type: 'text', sortOrder: 3 },

  // ── SERVICIOS DISEÑO ──────────────────────────────────────────────────────────
  { categorySlug: 'servicios-diseno', key: 'tipo_servicio', label: 'Tipo de servicio', type: 'select', options: ['Logo/Identidad visual','Diseño web','Diseño gráfico','Edición de video','Fotografía de producto','Contenido para redes','Ilustración','Motion graphics','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'servicios-diseno', key: 'modalidad', label: 'Modalidad', type: 'select', options: ['Remoto','Presencial'], sortOrder: 2 },
  { categorySlug: 'servicios-diseno', key: 'entrega_dias', label: 'Tiempo de entrega estimado (días)', type: 'number', sortOrder: 3 },

  // ── SERVICIOS SALUD ───────────────────────────────────────────────────────────
  { categorySlug: 'servicios-salud', key: 'tipo_servicio', label: 'Tipo de servicio', type: 'select', options: ['Nutricionista','Psicología','Kinesiología','Odontología','Medicina general','Pediatría','Dermatología','Oftalmología','Enfermería a domicilio','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'servicios-salud', key: 'modalidad', label: 'Modalidad', type: 'select', options: ['Presencial','Teleconsulta','A domicilio'], sortOrder: 2 },
  { categorySlug: 'servicios-salud', key: 'obra_social', label: 'Acepta obra social', type: 'boolean', sortOrder: 3 },

  // ── SERVICIOS MASCOTAS ───────────────────────────────────────────────────────
  { categorySlug: 'servicios-mascotas', key: 'tipo_servicio', label: 'Tipo de servicio', type: 'select', options: ['Veterinaria','Peluquería canina','Paseo de perros','Hotel/Guardería','Adiestramiento','Transporte de mascotas','Cremación','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'servicios-mascotas', key: 'animal', label: 'Para qué animal', type: 'select', options: ['Perro','Gato','Ambos','Otros'], sortOrder: 2 },
  { categorySlug: 'servicios-mascotas', key: 'zona', label: 'Zona', type: 'text', sortOrder: 3 },
  { categorySlug: 'servicios-mascotas', key: 'a_domicilio', label: 'A domicilio', type: 'boolean', sortOrder: 4 },

  // ── SUPLEMENTOS ──────────────────────────────────────────────────────────────
  { categorySlug: 'suplementos', key: 'tipo', label: 'Tipo', type: 'select', options: ['Proteína Whey','Caseína','Creatina','Pre-entreno','BCAA','Vitaminas/Minerales','Omega 3','Colágeno','Quemador de grasa','Gainers','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'suplementos', key: 'marca', label: 'Marca', type: 'text', isRequired: true, sortOrder: 2 },
  { categorySlug: 'suplementos', key: 'sabor', label: 'Sabor', type: 'select', options: ['Chocolate','Vainilla','Frutilla','Sin sabor','Caramelo','Frutas tropicales','Menta','Otro'], isVariant: true, sortOrder: 3 },
  { categorySlug: 'suplementos', key: 'peso_g', label: 'Peso del envase (g)', type: 'select', options: ['250','500','1000','2000','3000','5000'], isVariant: true, sortOrder: 4 },
  { categorySlug: 'suplementos', key: 'sellado', label: 'Sellado/Nuevo', type: 'boolean', sortOrder: 5 },

  // ── EQUIPAMIENTO MÉDICO ───────────────────────────────────────────────────────
  { categorySlug: 'equipamiento-medico', key: 'tipo', label: 'Tipo', type: 'select', options: ['Silla de ruedas','Andador','Muletas','Nebulizador','Oxímetro','Tensiómetro','Glucómetro','Cama ortopédica','Bastón','TENS/Electro','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'equipamiento-medico', key: 'marca', label: 'Marca', type: 'text', sortOrder: 2 },
  { categorySlug: 'equipamiento-medico', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - funcionando','Usado - necesita revisión'], isRequired: true, sortOrder: 3 },

  // ── HIGIENE PERSONAL ─────────────────────────────────────────────────────────
  { categorySlug: 'higiene', key: 'tipo', label: 'Tipo', type: 'select', options: ['Cepillo eléctrico','Irrigador dental','Afeitadora eléctrica','Depiladora eléctrica','Plancha de pelo','Secador de pelo','Rizador','Cepillo alisador','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'higiene', key: 'marca', label: 'Marca', type: 'select', options: ['Oral-B','Philips','Remington','Braun','Babyliss','Rowenta','Panasonic','Otra'], sortOrder: 2 },
  { categorySlug: 'higiene', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 3 },

  // ── JUGUETES 8+ AÑOS ─────────────────────────────────────────────────────────
  { categorySlug: 'juguetes-8plus', key: 'tipo', label: 'Tipo', type: 'select', options: ['LEGO/Bloques','Juego de mesa','Juego de cartas','Rompecabezas','Muñecos/Figuras de acción','Juguete electrónico','Radio control','Experimentos','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'juguetes-8plus', key: 'marca', label: 'Marca', type: 'text', sortOrder: 2 },
  { categorySlug: 'juguetes-8plus', key: 'edad_min', label: 'Edad mínima recomendada', type: 'select', options: ['8','9','10','12','14'], sortOrder: 3 },
  { categorySlug: 'juguetes-8plus', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - completo','Usado - con piezas faltantes'], isRequired: true, sortOrder: 4 },

  // ── JUGUETES DE CONSTRUCCIÓN ──────────────────────────────────────────────────
  { categorySlug: 'juguetes-construccion', key: 'tipo', label: 'Tipo', type: 'select', options: ['LEGO','Duplo','Mega Bloks','Magnéticos','Madera encajable','K\'Nex','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'juguetes-construccion', key: 'piezas', label: 'Cantidad de piezas', type: 'number', sortOrder: 2 },
  { categorySlug: 'juguetes-construccion', key: 'marca', label: 'Marca', type: 'text', sortOrder: 3 },
  { categorySlug: 'juguetes-construccion', key: 'edad', label: 'Edad recomendada', type: 'select', options: ['1-2 años','2-3 años','3-5 años','5-8 años','8-12 años','12+ años'], sortOrder: 4 },
  { categorySlug: 'juguetes-construccion', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - completo','Usado - con piezas faltantes'], isRequired: true, sortOrder: 5 },

  // ── JUGUETES EDUCATIVOS ──────────────────────────────────────────────────────
  { categorySlug: 'juguetes-educativos', key: 'tipo', label: 'Tipo', type: 'select', options: ['Abecedario/Números','Instrumentos musicales infantiles','Ciencia y experimentos','Geografía/Mapas','Memoria y concentración','Rompecabezas educativo','Lectura y escritura','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'juguetes-educativos', key: 'edad', label: 'Edad recomendada', type: 'select', options: ['0-1 año','1-2 años','2-3 años','3-5 años','5-8 años','8+ años'], sortOrder: 2 },
  { categorySlug: 'juguetes-educativos', key: 'marca', label: 'Marca', type: 'text', sortOrder: 3 },
  { categorySlug: 'juguetes-educativos', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - completo','Usado - con detalles'], isRequired: true, sortOrder: 4 },

  // ── CARRIOLAS / COCHECITOS ───────────────────────────────────────────────────
  { categorySlug: 'carriolas', key: 'tipo', label: 'Tipo', type: 'select', options: ['Cochecito full size','Silla de paseo','Silla paraguas','Travel system (con huevito)','Triciclo/Empuje','Doble (mellizos/hermanos)'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'carriolas', key: 'marca', label: 'Marca', type: 'select', options: ['Graco','Chicco','Baby Trend','Combi','Silver Cross','Bugaboo','Maclaren','Infanti','Otro'], sortOrder: 2 },
  { categorySlug: 'carriolas', key: 'plegable', label: 'Sistema de plegado', type: 'select', options: ['Un solo movimiento','Dos movimientos','Compacto para equipaje'], sortOrder: 3 },
  { categorySlug: 'carriolas', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado','Usado - con detalles'], isRequired: true, sortOrder: 4 },

  // ── CUNAS ────────────────────────────────────────────────────────────────────
  { categorySlug: 'cunas', key: 'tipo', label: 'Tipo', type: 'select', options: ['Cuna fija','Cuna con moisés','Cuna corral','Minicuna/Colecho','Cuna portátil','Cama de transición'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'cunas', key: 'material', label: 'Material', type: 'select', options: ['Madera','Metal','Plástico','Mixto'], sortOrder: 2 },
  { categorySlug: 'cunas', key: 'incluye_colchon', label: 'Incluye colchón', type: 'boolean', sortOrder: 3 },
  { categorySlug: 'cunas', key: 'marca', label: 'Marca', type: 'text', sortOrder: 4 },
  { categorySlug: 'cunas', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado - como nuevo','Usado - buen estado'], isRequired: true, sortOrder: 5 },

  // ── PAÑALES ──────────────────────────────────────────────────────────────────
  { categorySlug: 'paniales', key: 'tipo', label: 'Tipo', type: 'select', options: ['Descartable','Tela/Ecológico','Pull-up/Calzón'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'paniales', key: 'talle', label: 'Talle/Tamaño', type: 'select', options: ['RN (hasta 4 kg)','P (3-6 kg)','M (4-8 kg)','G (7-11 kg)','XG (9-14 kg)','XXG (12+ kg)'], isRequired: true, isVariant: true, sortOrder: 2 },
  { categorySlug: 'paniales', key: 'marca', label: 'Marca', type: 'select', options: ['Pampers','Huggies','MamyPoko','Naturella','Babysec','Cotidian','Otro'], sortOrder: 3 },
  { categorySlug: 'paniales', key: 'unidades', label: 'Cantidad de unidades', type: 'number', sortOrder: 4 },

  // ── ALIMENTACIÓN BEBÉ ────────────────────────────────────────────────────────
  { categorySlug: 'alimentacion-bebe', key: 'tipo', label: 'Tipo', type: 'select', options: ['Leche de fórmula','Papilla/Puré envasado','Mamadera','Chupon/Chupete','Babero','Plato/Cubiertos bebé','Procesadora para papillas','Esterilizador','Termómetro de agua','Otro'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'alimentacion-bebe', key: 'edad', label: 'Etapa/Edad', type: 'select', options: ['0-6 meses (solo leche)','6-12 meses','1-3 años','Todas las edades'], sortOrder: 2 },
  { categorySlug: 'alimentacion-bebe', key: 'marca', label: 'Marca', type: 'text', sortOrder: 3 },

  // ── MÚSICA (libros-cultura) ───────────────────────────────────────────────────
  { categorySlug: 'musica', key: 'formato', label: 'Formato', type: 'select', options: ['Vinilo LP','CD','Cassette','DVD musical','Blu-ray musical','Digital (código)'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'musica', key: 'genero_musical', label: 'Género musical', type: 'select', options: ['Rock','Pop','Cumbia','Tango','Folklore','Jazz','Clásica','Metal','Hip-Hop','Electrónica','Reggaeton','Otro'], sortOrder: 2 },
  { categorySlug: 'musica', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo (sellado)','Como nuevo','Buen estado','Con detalles'], isRequired: true, sortOrder: 3 },

  // ── PELÍCULAS ────────────────────────────────────────────────────────────────
  { categorySlug: 'peliculas', key: 'formato', label: 'Formato', type: 'select', options: ['DVD','Blu-ray','4K UHD','VHS','Streaming (código)'], isRequired: true, sortOrder: 1 },
  { categorySlug: 'peliculas', key: 'genero', label: 'Género', type: 'select', options: ['Acción','Comedia','Drama','Terror','Ciencia ficción','Animación','Documental','Romance','Suspenso','Otro'], sortOrder: 2 },
  { categorySlug: 'peliculas', key: 'idioma', label: 'Idioma', type: 'select', options: ['Español (doblado)','Español latino','Inglés','Subtitulado','Multilingüe'], sortOrder: 3 },
  { categorySlug: 'peliculas', key: 'estado', label: 'Estado', type: 'select', options: ['Nuevo (sellado)','Como nuevo','Buen estado','Con detalles'], isRequired: true, sortOrder: 4 },
];

// Back-compat alias for the run-seeds.ts loader (it imports the legacy name).
export const COLLECTIBLE_ATTRIBUTES_SEED = CATEGORY_ATTRIBUTES_SEED;
