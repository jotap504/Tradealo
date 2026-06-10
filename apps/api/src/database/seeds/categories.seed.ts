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
];

// Back-compat alias for the run-seeds.ts loader (it imports the legacy name).
export const COLLECTIBLE_ATTRIBUTES_SEED = CATEGORY_ATTRIBUTES_SEED;
