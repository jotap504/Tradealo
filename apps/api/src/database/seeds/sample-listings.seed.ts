import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../schema';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL env variable is not set!');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    // 1. Create or Find Seller Beto
    console.log('👤 Checking for seller beto@gmail.com...');
    let sellerId: string;
    const [existingSeller] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, 'beto@gmail.com'))
      .limit(1);

    if (existingSeller) {
      sellerId = existingSeller.id;
      console.log(`  ✓ Seller exists with ID: ${sellerId}`);
      // Update password to match 'Test1234'
      const passwordHash = bcrypt.hashSync('Test1234', 10);
      await db
        .update(schema.users)
        .set({ passwordHash })
        .where(eq(schema.users.id, sellerId));
      console.log(`  ✓ Seller password updated to Test1234`);
    } else {
      console.log('  ▶ Creating seller beto@gmail.com...');
      const passwordHash = bcrypt.hashSync('Test1234', 10);
      const [newSeller] = await db
        .insert(schema.users)
        .values({
          email: 'beto@gmail.com',
          passwordHash,
          role: 'verified_user',
          status: 'active',
          kycLevel: 1,
          emailVerified: true,
          phoneVerified: true,
          countryCode: 'AR',
        })
        .returning({ id: schema.users.id });
      
      sellerId = newSeller.id;

      // Create Profile
      await db
        .insert(schema.userProfiles)
        .values({
          userId: sellerId,
          username: 'beto',
          firstName: 'Beto',
          lastName: 'Vendedor',
          whatsapp: '+5491123456789',
          showPhone: true,
          province: 'Capital Federal',
          city: 'Palermo',
          completenessPct: 100,
        });

      // Create Wallet
      await db
        .insert(schema.wallets)
        .values({
          userId: sellerId,
          balance: 500,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        });

      // Create Reputation Scores
      await db
        .insert(schema.reputationScores)
        .values({
          userId: sellerId,
          asSellerAvg: '4.80',
          asSellerCount: 5,
          asBuyerAvg: '5.00',
          asBuyerCount: 3,
        });

      console.log(`  ✓ Seller created successfully with ID: ${sellerId}`);
    }

    // 2. Fetch Categories
    console.log('📁 Fetching categories from DB...');
    const allCategories = await db.select().from(schema.categories);
    const categoryMap = new Map<string, string>();
    for (const cat of allCategories) {
      categoryMap.set(cat.slug, cat.id);
    }

    // 3. Define the product data blueprint for all 26 categories
    console.log('📦 Defining product templates for all 26 categories...');
    const IMAGE_POOLS: Record<string, string[]> = {
      'celulares': ['1511707171634-5f897ff02aa9', '1598327105666-5b89351aff97', '1565849906660-ad936cca268e', '1580910051074-3eb694886505', '1616348436168-de43ad0db179'],
      'computadoras': ['1603302576837-37561b2e2302', '1588872657578-7efd1f1555ed', '1496181130204-755241544e3f', '1541807084-5c52b6b3adef', '1525547719571-a2d4ac8945e2'],
      'tablets': ['1544244015-0df4b3ffc6b0', '1561154464-82e9adf32764', '1589739900243-4b52cd9b104e', '1585518419759-7fe2e0f3137e', '1527698266440-12104e498b76'],
      'audio': ['1505740420928-5e560c06d30e', '1546435770-a3e426bf472b', '1484704849700-f032a568e944', '1583394838336-acd977736f90', '1545454675-3531b543be5d'],
      'gaming': ['1607604276583-eef5d076aa5f', '1538481199705-c710c4e965fc', '1592155977996-9566c5e4a8cf', '1600861195091-690c92f1d2cc', '1612287230202-1bf1d85d1bdf'],
      'camaras': ['1516035069371-29a1b244cc32', '1502920917128-1aa500764cbd', '1526170375885-4d8ecf77b99f', '1510127034890-ba27508e9f1c', '1495707902641-75cac588d2e9'],
      'autos': ['1503376780353-7e6692767b70', '1552519507-da3b142c6e3d', '1494976388531-d1058494cdd8', '1542282088-fe8426682b8f', '1525609004556-c46c7d6cf0a3'],
      'motos': ['1558981806-ec527fa84c39', '1568772585407-9361f9bf3a87', '1449426468159-d96dbf08f19f', '1599819811279-d5ad9cccf838', '1558981403-c5f9899a28bc'],
      'bicicletas': ['1485965120184-e220f721d03e', '1532298229144-0ec0c57515c7', '1571068316344-75bc76f77891', '1507035895480-2b3156c31fc8', '1487800940032-1cf211187aea'],
      'ropa-mujer': ['1509319117193-57bab727e09d', '1541099649105-f69ad21f3246', '1483985988355-763728e1935b', '1529139574466-a303027c1d8b', '1496747611176-843222e1e57c'],
      'ropa-hombre': ['1492562080023-ab3db95bfbce', '1516257984-b1b4d707412e', '1617137968427-85924c800a22', '1602810318383-e386cc2a3ccf', '1507679799987-c73779587ccf'],
      'calzado': ['1549298916-b41d501d3772', '1595950653106-6c9ebd614d3a', '1542291026-7eec264c27ff', '1608231387042-66d1773070a5', '1539185441755-769473a23570'],
      'muebles': ['1586023492125-27b2c045efd7', '1555041469-a586c61ea9bc', '1581428982868-e410dd047a90', '1592078615290-033ee584e267', '1524758631624-e2822e304c36'],
      'electrodomesticos': ['1584622650111-993a426fbf0a', '1574269909862-7e1d70bb8078', '1583847268964-b28dc8f51f92', '1601737487795-dab272f52420', '1522338242992-e1a54906a8da'],
      'deportes': ['1517838277536-f5f99be501cd', '1461896836934-ffe607ba8211', '1530541930197-ff16ac917b0e', '1508098682722-e99c43a406b2', '1519766304817-4f37bda74a27'],
      'instrumentos': ['1510915361894-db8b60106cb1', '1520523839897-bd0b52f945a0', '1564186763535-ebb21ef5278f', '1511192336575-5a79af67a629', '1573871666457-7c7329415cf0'],
      'comics': ['1588497859490-85d1c17db26d', '1612036782180-6f0b6cd846fe', '1601647998804-984435889cb7', '1618519764620-7403abdbfee9', '1569003339405-ea396a5a8a90'],
      'figuras': ['1608889175123-8ec330b86f84', '1594787318286-3d835c1d207f', '1566577134770-3d85bb3a9cc4', '1559535332-db99e537c624', '1608889175250-c3b0c1667d3a'],
      'monedas': ['1621416894569-0f39ed31d247', '1589758438368-0ad531db3366', '1607604760461-912a76f28ba2', '1585832770485-e289c1788bb5', '1618042164219-62c820f10723'],
      'estampillas': ['1579783902614-a3fb3927b6a5', '1580136579312-94651dfd596d', '1544005313-94ddf0286df2', '1579783928621-7a13d66a6211', '1594744803329-e58b31de215f'],
      'discos-vinilo': ['1539628399243-73401140326b', '1489641499596-9a36bd47b254', '1519677100203-ab026f5f3184', '1506157786151-b8491531f063', '1542208998-f6dbbb27a72f'],
      'cartas-trading': ['1607604276583-eef5d076aa5f', '1613771404724-17c1fd0a0ecf', '1601647998804-984435889cb7', '1569003339405-ea396a5a8a90', '1618519764620-7403abdbfee9'],
      'juguetes-antiguos': ['1558060370-d644479cb6f7', '1566577134770-3d85bb3a9cc4', '1534447677768-be436bb09401', '1596461404969-9ae70f2830c1', '1515488042361-404e9250afef'],
      'relojes': ['1524592094714-0f0654e20314', '1547996160-81dfa63595aa', '1522312346375-d1a52e2b99b3', '1614162692292-7ac56d7f7f1e', '1612817288484-6f916006741a'],
      'arte': ['1579783900882-c0d3dad7b119', '1579783928621-7a13d66a6211', '1541701494587-cb58502866ab', '1513364776144-60967b0f800f', '1460661419201-fd4cecdf8a8b'],
      'otros': ['1544816155-12df9643f363', '1523275335684-37898b6baf30', '1572635196237-14b3f281503f', '1505740420928-5e560c06d30e', '1526170375885-4d8ecf77b99f']
    };

    // Standard high-quality Argentine cities for locations
    const LOCATIONS = [
      { text: 'Av. Cabildo 2200, Belgrano, CABA', city: 'CABA', province: 'Capital Federal', lat: -34.5612, lng: -58.4563 },
      { text: 'Av. Corrientes 3400, Almagro, CABA', city: 'CABA', province: 'Capital Federal', lat: -34.6033, lng: -58.4109 },
      { text: 'Pellegrini 1500, Rosario, Santa Fe', city: 'Rosario', province: 'Santa Fe', lat: -32.9520, lng: -60.6565 },
      { text: 'Av. Colón 600, Córdoba', city: 'Córdoba', province: 'Córdoba', lat: -31.4135, lng: -64.1810 },
      { text: 'Av. Colón 2300, Mar del Plata, Buenos Aires', city: 'Mar del Plata', province: 'Buenos Aires', lat: -38.0055, lng: -57.5426 },
      { text: 'Calle 50 entre 6 y 7, La Plata, Buenos Aires', city: 'La Plata', province: 'Buenos Aires', lat: -34.9205, lng: -57.9540 }
    ];

    const getProductsForCategory = (slug: string): Array<{
      title: string;
      description: string;
      price: number;
      condition: 'new' | 'used' | 'refurbished';
      collectibleAttributes?: Record<string, any>;
    }> => {
      switch (slug) {
        case 'celulares': return [
          {
            title: 'iPhone 13 Pro Max 128GB - Impecable Grafito',
            description: 'Se vende iPhone 13 Pro Max de 128GB en excelente estado estético y de funcionamiento. Batería al 89% de vida útil original. Sin rayones significativos, siempre se usó con funda y vidrio templado. Libre de fábrica y de iCloud. Se entrega con caja original y cable de carga.',
            price: 950000,
            condition: 'used'
          },
          {
            title: 'Samsung Galaxy S23 Ultra 256GB - Nuevo en Caja',
            description: 'Samsung Galaxy S23 Ultra de 256GB de almacenamiento interno y 12GB de memoria RAM. Sellado de fábrica con garantía oficial de Samsung Argentina por 12 meses. Color Phantom Black. Incluye su respectivo S-Pen original.',
            price: 1350000,
            condition: 'new'
          },
          {
            title: 'Xiaomi Redmi Note 12 Pro 5G 128GB - Nuevo Sellado',
            description: 'Xiaomi Redmi Note 12 Pro 5G en color Azul Cielo. 8GB de memoria RAM y 128GB de espacio de almacenamiento. Pantalla AMOLED de 120Hz súper fluida y cámara de 50MP. Versión global de fábrica. Excelente rendimiento y autonomía de batería.',
            price: 360000,
            condition: 'new'
          },
          {
            title: 'Motorola Edge 40 Neo 256GB - Usado Excelente',
            description: 'Motorola Edge 40 Neo color Caneel Bay (Azul). Cuenta con 256GB de almacenamiento y 8GB de RAM. Pantalla curva pOLED y protección al agua IP68. Tiene 3 meses de uso, se entrega en perfectas condiciones con cargador TurboPower de 68W original.',
            price: 490000,
            condition: 'used'
          },
          {
            title: 'Google Pixel 7 Pro 128GB Obsidian - Reacondicionado Clase A',
            description: 'Google Pixel 7 Pro de 128GB color Obsidian. Dispositivo reacondicionado oficial Clase A (estéticamente y funcionalmente como nuevo). Cámaras increíbles con procesamiento de imagen de Google. Se entrega con cargador rápido compatible de regalo.',
            price: 680000,
            condition: 'refurbished'
          }
        ];
        case 'computadoras': return [
          {
            title: 'MacBook Pro M2 14" 512GB SSD - Poco Uso',
            description: 'Apple MacBook Pro de 14 pulgadas con procesador Chip M2, 16GB de RAM y 512GB SSD. Tiene solo 35 ciclos de batería, la salud de la misma está al 100%. Teclado en español. Una verdadera máquina para programar, diseñar o editar vídeo pesado. Impecable.',
            price: 2450000,
            condition: 'used'
          },
          {
            title: 'Notebook ASUS Zenbook 14 OLED - Nueva en Caja',
            description: 'Notebook de última generación ASUS Zenbook 14 OLED. Procesador Intel Core i7 13va Gen, 16GB de memoria RAM LPDDR5 y 1TB SSD NVMe. Pantalla táctil de 2.8K OLED con colores hiper realistas. Super liviana y fina, ideal para llevar de viaje o trabajo.',
            price: 1650000,
            condition: 'new'
          },
          {
            title: 'PC Gamer Armada Ryzen 7 - RTX 4070 - Componentes Nuevos',
            description: 'Computadora de escritorio gamer armada con componentes premium nuevos de primera línea: Procesador AMD Ryzen 7 5700X, Placa de Video Nvidia RTX 4070 de 12GB GDDR6, Memoria RAM de 32GB Kingston Fury RGB y disco sólido SSD de 1TB NVMe. Gabinete Corsair templado.',
            price: 1980000,
            condition: 'new'
          },
          {
            title: 'Lenovo ThinkPad T14 Gen 3 Core i5 - Reacondicionada Corporativa',
            description: 'Computadora corporativa Lenovo ThinkPad T14 Gen 3. Procesador Intel Core i5 de 12va generación, 16GB de memoria RAM (expandible) y 512GB SSD. Totalmente testeada, se encuentra en excelente estado con batería original con buena autonomía. Garantía de 6 meses.',
            price: 850000,
            condition: 'refurbished'
          },
          {
            title: 'iMac 24" Apple M1 8-Core 256GB Azul - Excelente Estado',
            description: 'Apple iMac de 24 pulgadas con Chip M1 (GPU de 8 núcleos), 8GB de RAM y 256GB SSD. Color Azul. Se vende con su Magic Keyboard con TouchID y Magic Mouse azul originales correspondientes. Sonido e imagen impecables para toda la familia u oficina.',
            price: 1550000,
            condition: 'used'
          }
        ];
        case 'tablets': return [
          {
            title: 'iPad Pro 11" M2 128GB Wi-Fi - Gris Espacial Nuevo',
            description: 'Apple iPad Pro de 11 pulgadas de 4ta Generación con Chip M2. 128GB de memoria de almacenamiento, color Gris Espacial. Caja sellada original con garantía oficial de Apple por 1 año. Ideal para dibujo profesional, diseño, y tareas exigentes.',
            price: 1250000,
            condition: 'new'
          },
          {
            title: 'Samsung Galaxy Tab S8 128GB + S-Pen - Muy Buen Estado',
            description: 'Tablet de gama alta Samsung Galaxy Tab S8 de 128GB en color Plata. Pantalla espectacular y gran velocidad de procesamiento. Se encuentra en excelente estado estético, incluye su lápiz óptico S-Pen original que funciona de maravilla y cargador original.',
            price: 650000,
            condition: 'used'
          },
          {
            title: 'iPad Air 5 64GB M1 Azul - Reacondicionado Garantizado',
            description: 'Apple iPad Air de 5ta Generación con el potente Chip M1 de Apple. 64GB de capacidad, color Azul. Reacondicionado a nuevo (Clase A), funciona al 100% y tiene una batería impecable. Ideal para estudiantes y creadores de contenido.',
            price: 780000,
            condition: 'refurbished'
          },
          {
            title: 'Xiaomi Pad 6 128GB 8GB RAM Gravity Gray - Nueva Sellada',
            description: 'Tablet Xiaomi Pad 6 de 128GB de almacenamiento y 8GB de RAM. Color Gris Gravedad. Pantalla WQHD+ de 11 pulgadas a 144Hz súper fluida y sonido Dolby Atmos de 4 altavoces. Ideal para consumo multimedia intensivo y productividad.',
            price: 490000,
            condition: 'new'
          },
          {
            title: 'Lenovo Tab P11 Pro Gen 2 128GB - Con Teclado y Lápiz',
            description: 'Tablet Lenovo Tab P11 Pro de 2da generación de 128GB de almacenamiento. Se vende el combo completo original que incluye teclado magnético en español y lápiz óptico Lenovo Precision Pen 3. Pantalla OLED cinematográfica. En caja impecable.',
            price: 590000,
            condition: 'used'
          }
        ];
        case 'audio': return [
          {
            title: 'Auriculares Sony WH-1000XM5 Cancelación de Ruido - Nuevos',
            description: 'Auriculares inalámbricos de diadema Sony WH-1000XM5 en color Negro. Cuentan con la mejor cancelación de ruido activa del mercado, sonido de alta resolución y micrófonos premium para llamadas. Nuevos en caja sellada con garantía Sony Argentina.',
            price: 450000,
            condition: 'new'
          },
          {
            title: 'Parlante Bluetooth Portátil JBL Charge 5 Squad - Nuevo',
            description: 'Parlante portátil e impermeable JBL Charge 5 original en su llamativa edición camuflada (Squad). Sonido potente con bajos profundos y batería integrada que sirve como powerbank para cargar tus dispositivos. Nuevo en caja cerrada.',
            price: 230000,
            condition: 'new'
          },
          {
            title: 'Apple AirPods Pro 2da Generación (USB-C) - Usado Como Nuevo',
            description: 'Auriculares in-ear inalámbricos Apple AirPods Pro de 2da Generación con estuche de carga MagSafe (conector USB-C). Cuentan con cancelación de ruido adaptativa y audio espacial. Tienen 2 meses de uso impecable, con almohadillas extras sin usar.',
            price: 340000,
            condition: 'used'
          },
          {
            title: 'Parlante Inteligente Amazon Echo Dot 5ta Gen Negro - Nuevo',
            description: 'Asistente de voz inteligente Amazon Echo Dot de 5ta Generación en color Negro. Controla tus luces, escucha música con mejor sonido que las generaciones anteriores y hazle preguntas a Alexa. Nuevo en caja sellada.',
            price: 650000,
            condition: 'new'
          },
          {
            title: 'Auriculares Inalámbricos Bose QuietComfort 45 - Impecables',
            description: 'Auriculares inalámbricos Bose QuietComfort 45 color Blanco Humo. Máximo confort de almohadillas y una de las firmas acústicas más limpias y cancelaciones de sonido del mundo. Muy poco uso, se entregan con su estuche rígido de viaje original.',
            price: 380000,
            condition: 'used'
          }
        ];
        case 'gaming': return [
          {
            title: 'Consola Sony PlayStation 5 Standard Edition 825GB - Nueva',
            description: 'Consola PS5 con lectora de discos físicos de 825GB de almacenamiento SSD de ultra alta velocidad. Modelo CFI-1200 original con mejor refrigeración. Caja sellada original con 1 joystick DualSense y garantía oficial de PlayStation Argentina por 12 meses.',
            price: 950000,
            condition: 'new'
          },
          {
            title: 'Nintendo Switch OLED 64GB Neon - Completa Excelente',
            description: 'Consola Nintendo Switch versión OLED de 64GB color Azul/Rojo Neón. Pantalla de colores vibrantes y soporte trasero ajustable. Muy bien cuidada, la pantalla no tiene rayas, se usó siempre con templado. Se entrega completa en caja original.',
            price: 490000,
            condition: 'used'
          },
          {
            title: 'Joystick PS5 Sony DualSense Inalámbrico Blanco - Nuevo',
            description: 'Control de mandos inalámbrico Sony DualSense original de color Blanco para consola PlayStation 5 y PC. Dispone de gatillos adaptativos y vibración háptica inmersiva. En caja sellada de fábrica, garantía oficial.',
            price: 95000,
            condition: 'new'
          },
          {
            title: 'Consola Microsoft Xbox Series X 1TB - Usada Impecable',
            description: 'Consola de gama premium Microsoft Xbox Series X de 1TB de almacenamiento. Corre juegos a 4K nativo y hasta 120 FPS. Tiene 6 meses de uso muy tranquilo. Se entrega con su caja, cables originales y un joystick inalámbrico Xbox.',
            price: 880000,
            condition: 'used'
          },
          {
            title: 'Volante Logitech G29 Force Feedback + Shifter - Reacondicionado',
            description: 'Volante Logitech G29 Driving Force con pedalera de metal y palanca de cambios Logitech Driving Force Shifter. Reacondicionado a nuevo, calibrado al 100%. Compatible con PlayStation 5, PlayStation 4 y PC. Ideal para juegos de simulación de carreras.',
            price: 390000,
            condition: 'refurbished'
          }
        ];
        case 'camaras': return [
          {
            title: 'Cámara Mirrorless Sony Alpha 7 IV Solo Cuerpo - Muy Poco Uso',
            description: 'Sony Alpha 7 IV (a7 IV), cámara híbrida profesional mirrorless de 33 Megapíxeles. Graba vídeo en 4K a 60p. Solo tiene 4500 disparos hechos en estudio de fotografía. Sensor impecable sin marcas ni polvo. Se entrega completa con batería y correa.',
            price: 2650000,
            condition: 'used'
          },
          {
            title: 'Cámara DSLR Canon EOS Rebel T7 + Lente 18-55mm IS II - Usada',
            description: 'Cámara réflex Canon Rebel T7 en excelente estado con lente de kit Canon EF-S 18-55mm con estabilizador de imagen IS II. Perfecta para comenzar en la fotografía o filmación. Tiene 12000 disparos de uso familiar. Incluye bolso de transporte, batería y cargador.',
            price: 520000,
            condition: 'used'
          },
          {
            title: 'Cámara de Acción GoPro Hero 11 Black - Nueva Sellada',
            description: 'GoPro Hero 11 Black, la cámara de acción más potente del mundo con video de resolución 5.3K y estabilización de imagen HyperSmooth 5.0. Totalmente sumergible de fábrica sin carcasa. Nueva en su embalaje sellado original con garantía.',
            price: 490000,
            condition: 'new'
          },
          {
            title: 'Lente Sony FE 50mm f/1.8 Prime Lens - Como Nuevo',
            description: 'Lente de distancia focal fija Sony FE 50mm f/1.8 original de montura E (Full Frame y APS-C). Ideal para retratos artísticos y fotografía callejera con un hermoso efecto bokeh desenfocado de fondo. Cristales perfectos sin hongos ni marcas.',
            price: 240000,
            condition: 'used'
          },
          {
            title: 'Cámara Compacta Fujifilm X100V Silver - Reacondicionada A+',
            description: 'Fujifilm X100V en su edición clásica plateada. Cámara compacta premium con visor híbrido y lente fijo de 23mm f/2. Reacondicionada a nuevo por especialistas oficiales de Fujifilm. Calidad fotográfica única con filtros de simulación de película clásica analógica.',
            price: 1850000,
            condition: 'refurbished'
          }
        ];
        case 'autos': return [
          {
            title: 'Volkswagen Gol Trend 1.6 MSI Trendline 2018 - Excelente Estado',
            description: 'Se vende Volkswagen Gol Trend 2018, motor 1.6 MSI nafta muy económico y confiable. Tiene 82,000 kilómetros reales de fábrica. Service de correa de distribución realizado recientemente. Cubiertas en un 80% de vida útil. Aire acondicionado congelando. Papeles listos para transferir.',
            price: 8800000,
            condition: 'used'
          },
          {
            title: 'Ford Focus 2.0 Titanium Hatchback 2017 - Manual Impecable',
            description: 'Ford Focus Titanium Hatchback 2017, motor 2.0 Duratec naftero, caja manual. 94,000 km. La versión más equipada de la gama con tapizados de cuero, techo solar eléctrico, sensores de estacionamiento, cámara de marcha atrás, climatizador bizona y llantas de 17 pulgadas. Service oficiales.',
            price: 12500000,
            condition: 'used'
          },
          {
            title: 'Peugeot 208 1.6 Feline Tiptronic 2021 - Único Dueño',
            description: 'Espectacular Peugeot 208 modelo Feline año 2021. Caja automática secuencial Tiptronic. Motor 1.6 nafta, tiene 42,000 km. Climatizador, pantalla táctil integrada con Apple CarPlay y Android Auto, tapizados de cuero, faros full LED y techo panorámico. Pintura e interiores 100% originales.',
            price: 16500000,
            condition: 'used'
          },
          {
            title: 'Toyota Corolla 1.8 SEG CVT 2019 - Services Oficiales Toyota',
            description: 'Toyota Corolla versión SEG de gama alta año 2019 con caja automática CVT. Cuenta con 105,000 kilómetros. Todos los mantenimientos realizados estrictamente en concesionario oficial Toyota. Tapizado de cuero, control de velocidad crucero adaptativo y frenado autónomo. Confiabilidad garantizada.',
            price: 15900000,
            condition: 'used'
          },
          {
            title: 'Chevrolet Cruze II 1.4T LTZ Sedan 2020 - Impecable',
            description: 'Chevrolet Cruze II Sedan del año 2020. Motor 1.4 Turbo naftero, muy ágil y económico. Tiene 68,000 km. Equipado con tapizados de cuero, pantalla táctil, climatizador y conectividad total OnStar. Excelente confort de marcha. Grabado de autopartes y verificación técnica al día.',
            price: 14800000,
            condition: 'used'
          }
        ];
        case 'motos': return [
          {
            title: 'Honda Wave 110S Base 2023 - Excelente Estado General',
            description: 'Se vende moto Honda Wave 110S año 2023, color Negro. Tiene solo 4,200 kilómetros de uso puramente urbano. Patente al día, primer dueño directo. Services oficiales en concesionario de compra para mantener la garantía activa. Excelente andar y nulo consumo.',
            price: 1950000,
            condition: 'used'
          },
          {
            title: 'Yamaha YBR 125 ED 2022 - Lista Para Transferir',
            description: 'Yamaha YBR 125 ED, versión con arranque eléctrico y freno a disco delantero. Año 2022 color Rojo. Cuenta con 12,500 km. Cubiertas Pirelli City Cross colocadas nuevas hace poco. Funciona absolutamente todo de manera suave. Se entrega transferida sin deudas de multas.',
            price: 2450000,
            condition: 'used'
          },
          {
            title: 'Bajaj Rouser NS 200 Fi ABS 2021 - Impecable Cuidado',
            description: 'Bajaj Rouser NS 200 con inyección electrónica Fi y frenos ABS delanteros. Año 2021 color Blanco. Tiene 18,000 km. Excelente estado de motor y plásticos, sin caídas ni golpes. Services realizados cada 2,500 km con aceite Motul de primera. Alarma de presencia colocada.',
            price: 3200000,
            condition: 'used'
          },
          {
            title: 'Kawasaki Ninja 400 ABS 2020 - Excelente Deportiva',
            description: 'Espectacular moto deportiva Kawasaki Ninja 400 del año 2020 color Verde KRT Edition. Cuenta con 14,000 kilómetros reales. Frenos ABS de doble canal, motor bicilíndrico súper potente y divertido. Lista para disfrutar en ruta o pista. Papeles al día y lista para transferir.',
            price: 9800000,
            condition: 'used'
          },
          {
            title: 'Benelli TNT 15 2022 - Muy Cuidada Solo Paseo',
            description: 'Moto Benelli TNT 15 del año 2022 en color Blanco. Tiene 7,800 kilómetros. Usada únicamente los fines de semana para pasear, muy cuidada, guardada siempre bajo techo en garaje cerrado. Funciona todo de maravilla. Se vende por falta de uso.',
            price: 1750000,
            condition: 'used'
          }
        ];
        case 'bicicletas': return [
          {
            title: 'Bicicleta Mountain Bike Venzo Talon R29 Aluminio - Nueva',
            description: 'Bicicleta Venzo Talon Rodado 29 nueva sin uso. Cuadro de aluminio liviano talle M. Transmisión Shimano de 21 velocidades, frenos a disco mecánico Shimano y horquilla con suspensión delantera con bloqueo. Una gran bicicleta para iniciarse en cicloturismo o andar urbano.',
            price: 490000,
            condition: 'new'
          },
          {
            title: 'Bicicleta Fija de Spinning Randers ARG-890SP - Poco Uso',
            description: 'Bicicleta de spinning profesional Randers ARG-890SP. Volante de inercia de 18 kg para un pedaleo fluido y exigente. Consola digital que mide tiempo, velocidad, distancia y calorías consumidas. Manubrio y asiento regulables. Poco uso en hogar.',
            price: 320000,
            condition: 'used'
          },
          {
            title: 'Bicicleta de Ruta Specialized Allez Sport - Usada Impecable',
            description: 'Bicicleta de carrera de ruta Specialized Allez Sport. Cuadro de aluminio Specialized E5 premium super liviano con horquilla delantera de fibra de carbono Fact. Grupo de transmisión Shimano Sora de 18 velocidades. Talle 54 (M). Cubiertas impecables.',
            price: 1450000,
            condition: 'used'
          },
          {
            title: 'Bicicleta Plegable Aurorita R20 Classic - Reacondicionada',
            description: 'Bicicleta plegable clásica Aurorita original Rodado 20. Cuadro totalmente restaurado y reacondicionado a nuevo: pintura a fuego celeste brillante, cubiertas y cámaras nuevas, asiento y puños retro de cuero marrón y frenos nuevos de gran calidad. Plegado cómodo.',
            price: 280000,
            condition: 'refurbished'
          },
          {
            title: 'Bicicleta Urbana Zenith Citta - Excelente Andar Rodado 28',
            description: 'Bicicleta de paseo y urbana Zenith Citta. Rodado 28 de rodar ágil y cómodo. Cuadro Zenith de aluminio de excelente calidad de soldadura. Transmisión Shimano de 24 velocidades. Guardabarros y portaequipajes de fábrica. Muy cómoda y rápida para ir a trabajar.',
            price: 390000,
            condition: 'used'
          }
        ];
        case 'ropa-mujer': return [
          {
            title: 'Tapado de Paño Largo Importado con Cinturón - Nuevo',
            description: 'Elegante tapado de paño largo importado de primera calidad para mujer. Forrado por dentro con tela suave de satén, cuello con solapa clásica y cinturón de ajuste de paño del mismo tono Camel. Talle único de corte holgado que abarca talles S a L. Nuevo con etiqueta.',
            price: 85000,
            condition: 'new'
          },
          {
            title: 'Jean Mom Cargo Rígido Azul Oscuro - Nuevo',
            description: 'Pantalón jean estilo Mom Cargo rígido para mujer. Confeccionado en tela de jean de alto gramaje que no estira, color azul oscuro clásico. Dispone de bolsillos laterales amplios tipo cargo y tiro súper alto súper cómodo. Disponible en talles 36 al 44.',
            price: 38000,
            condition: 'new'
          },
          {
            title: 'Blazer Sastrero Negro Clásico Forrado - Nuevo Premium',
            description: 'Blazer sastrero entallado color negro para mujer. Confección artesanal de alta calidad, forrado íntegramente por dentro con forrería de raso a tono. Ideal para conjuntos formales de oficina, eventos corporativos o looks casuales finos con jeans.',
            price: 59000,
            condition: 'new'
          },
          {
            title: 'Vestido de Fiesta Largo con Lentejuelas Importado - Usado una vez',
            description: 'Hermoso vestido de fiesta largo importado. Todo bordado artesanalmente con lentejuelas brillosas color oro viejo sobre tul negro de alta calidad. Escote en V profundo y falda con gran caída fluida. Talle M (38-40). Usado una sola vez en casamiento, limpio de tintorería.',
            price: 120000,
            condition: 'used'
          },
          {
            title: 'Sweater de Lana de Hilo Tejido Premium - Nuevo',
            description: 'Sweater de hilo y lana suave tejido premium de punto ochos clásico para mujer. Color crudo natural. Super calentito e ideal para media estación y época invernal fría. No pica ni encoge al lavar en frío. Corte oversize talle único súper cómodo.',
            price: 32000,
            condition: 'new'
          }
        ];
        case 'ropa-hombre': return [
          {
            title: 'Campera de Cuero Legítimo Negra Estilo Motoquero - Usada',
            description: 'Campera de cuero vacuno legítimo de primerísima calidad de industria argentina. Color negro clásico con cierres metálicos robustos e interiores forrados. Diseño estilo motoquero o rockero. Talle L, tiene un par de años pero está en excelente estado.',
            price: 180000,
            condition: 'used'
          },
          {
            title: 'Buzo Hoodie Oversize de Algodón Rústico - Nuevo',
            description: 'Buzo con capucha estilo Hoodie de corte Oversize holgado unisex para hombre. Confeccionado en algodón rústico peinado premium de tacto súper suave y abrigado. Bolsillo canguro frontal amplio y puños reforzados. Disponible en talles S, M, L y XL.',
            price: 29000,
            condition: 'new'
          },
          {
            title: 'Camisa Leñadora Importada a Cuadros Algodón - Nueva',
            description: 'Camisa estilo leñadora importada de corte regular fit para hombre. Confeccionada en viyela gruesa de puro algodón, color rojo y negro a cuadros grandes tradicionales. Súper abrigada para invierno. Dispone de dos bolsillos frontales con solapa.',
            price: 36000,
            condition: 'new'
          },
          {
            title: 'Saco de Vestir Entallado Moderno Gris Melange - Usado',
            description: 'Saco sastrero sport de vestir entallado de corte moderno slim fit. Color gris melange clásico, ideal para combinar con pantalones chinos y camisa. Talle 48 (equivalente a M). Usado en dos eventos formales familiares cortos, en óptimas condiciones.',
            price: 75000,
            condition: 'used'
          },
          {
            title: 'Pantalón Chino Gabardina Elastizada Premium - Nuevo',
            description: 'Pantalón tipo chino para hombre confeccionado en gabardina de algodón peinado con elastano súper confortable. Corte moderno recto y tiro medio cómodo. Costuras reforzadas para máxima durabilidad. Colores: Beige y Azul Marino. Talles 40 al 48.',
            price: 32000,
            condition: 'new'
          }
        ];
        case 'calzado': return [
          {
            title: 'Zapatillas Nike Air Force 1 Blancas Originales - Nuevas',
            description: 'Zapatillas de moda urbana Nike Air Force 1 originales en su clásica combinación de cuero color blanco integral. Nuevas sin estrenar, se entregan en su caja original de Nike. Talle 42 de Argentina (US 9.5). Comodidad y estilo atemporal para todos los días.',
            price: 145000,
            condition: 'new'
          },
          {
            title: 'Borceguíes de Cuero Vacuno Premium Artesanales - Nuevos',
            description: 'Borceguíes artesanales de cuero vacuno legítimo de primera calidad. Color marrón chocolate. Suela de goma de alta tracción y costura reforzada de tipo militar. Interiores acolchados súper cómodos para caminatas o uso urbano diario de invierno.',
            price: 88000,
            condition: 'new'
          },
          {
            title: 'Zapatillas Adidas Forum Low Core Black Originales - Nuevas',
            description: 'Zapatillas retro Adidas Forum Low en cuero de color negro mate. Cuentan con la tradicional tira de velcro ajustable en el tobillo. Nuevas en caja Adidas original con todas sus etiquetas y cordones de repuesto. Talle 41 AR (US 8.5).',
            price: 130000,
            condition: 'new'
          },
          {
            title: 'Zapatos de Vestir Estilo Oxford Cuero Vacuno Negro - Nuevos',
            description: 'Elegantes zapatos sastreros de vestir de diseño Oxford formal para hombre. Confeccionados en cuero vacuno natural color negro con acabado de lustre fino. Suela de cuero de vestir cosida de manera artesanal. Ideales para casamientos u oficinas finas.',
            price: 95000,
            condition: 'new'
          },
          {
            title: 'Zapatillas Puma Slipstream Retro Leather - Usadas Impecables',
            description: 'Zapatillas de estilo basquetbolero retro Puma Slipstream. Confeccionadas en cuero y gamuza con detalles en azul y blanco. Tienen 3 posturas, están impecables casi sin marcas de uso en la suela. Súper cómodas. Talle 43 AR (US 10.5).',
            price: 78000,
            condition: 'used'
          }
        ];
        case 'muebles': return [
          {
            title: 'Sillón Sofá Escandinavo 3 Cuerpos Chenille Gris - Nuevo',
            description: 'Sillón sofá de diseño nórdico escandinavo de 3 cuerpos amplios. Tapizado en tela Chenille premium de alta resistencia con tratamiento antimanchas de color gris claro. Estructura súper firme de madera maciza y patas de madera de paraíso macizo barnizado.',
            price: 380000,
            condition: 'new'
          },
          {
            title: 'Mesa de Comedor Eames Vidrio 120cm + 4 Sillas - Nuevo Combo',
            description: 'Combo moderno para comedor: Mesa redonda de vidrio templado de alta resistencia de 120 cm de diámetro con patas de madera de haya maciza y varillas de acero negro + Juego de 4 Sillas de diseño Eames blancas con patas de madera haciendo juego. Todo nuevo.',
            price: 245000,
            condition: 'new'
          },
          {
            title: 'Rack Mesa de TV Flotante Estilo Nórdico Madera - Nuevo',
            description: 'Mueble bajo rack organizador para TV de hasta 65 pulgadas. Diseño moderno flotante de estilo nórdico escandinavo. Fabricado en melamina de alta calidad de 18mm texturada en roble y puertas laqueadas color blanco. Sistema de apertura push de puertas.',
            price: 110000,
            condition: 'new'
          },
          {
            title: 'Cómoda Cajonera de Madera Maciza de Pino - Usada Impecable',
            description: 'Cajonera cómoda rústica de madera de pino macizo. Cuenta con 4 cajones grandes con guías metálicas reforzadas y tiradores redondos de madera. Está en excelente estado estético, pintada con barniz protector semimate que resalta la veta natural.',
            price: 95000,
            condition: 'used'
          },
          {
            title: 'Escritorio de Oficina Industrial Hierro y Madera - Nuevo',
            description: 'Escritorio de estudio u oficina de diseño moderno industrial. Estructura firme de caño de hierro estructural de 40x40 color negro pintado a fuego y tapa de madera maciza de pino elliotis de 30mm de espesor pulida y laqueada con poliuretano de alta resistencia.',
            price: 85000,
            condition: 'new'
          }
        ];
        case 'electrodomesticos': return [
          {
            title: 'Cafetera Espresso Smart Automática 15 Bares - Nueva',
            description: 'Cafetera espresso italiana automática de alta gama. Cuenta con bomba de presión de 15 bares reales para un café cremoso perfecto. Tanque de leche integrado con espumador automático de leche para preparar Cappuccino o Latte con un solo botón. Nueva en caja.',
            price: 290000,
            condition: 'new'
          },
          {
            title: 'Microondas BGH Quick Chef 20L Digital - Usado Como Nuevo',
            description: 'Microondas digital marca BGH Quick Chef de 20 litros de capacidad útil. Dispone de menús automáticos programables, bloqueo para niños y función descongelado rápido por peso. Muy poco uso familiar en perfecto estado de funcionamiento e higiene.',
            price: 110000,
            condition: 'used'
          },
          {
            title: 'Pava Eléctrica Regulable Acero Inoxidable - Nueva Digital',
            description: 'Pava eléctrica de acero inoxidable de diseño elegante. Cuenta con base digital táctil selectora de temperatura de 70 a 100 grados, ideal para preparar mate a la temperatura correcta. Filtro de agua antisarro desmontable. Capacidad de 1.7 litros. Nueva.',
            price: 49000,
            condition: 'new'
          },
          {
            title: 'Licuadora de Mano Mixer Philips Daily 550W - Nueva',
            description: 'Licuadora de mano tipo Mixer Philips Daily de 550 Watts de potencia de licuado. Tecnología ProMix de flujo de alimentos óptimo para picar y procesar verduras o carnes blandas en segundos. Incluye vaso medidor graduado. Nueva sellada de fábrica.',
            price: 62000,
            condition: 'new'
          },
          {
            title: 'Tostadora Eléctrica Vintage Acero Inoxidable - Nueva',
            description: 'Tostadora de diseño vintage retro color beige pastel con terminaciones metálicas de acero inoxidable brillante. Dispone de dos ranuras anchas para panes gruesos, 6 niveles de tostado regulables y función descongelado. Bandeja juntamigas extraíble. Nueva.',
            price: 54000,
            condition: 'new'
          }
        ];
        case 'deportes': return [
          {
            title: 'Mancuernas Regulables Kit 20kg Hierro Con Estuche - Nuevo',
            description: 'Kit completo de mancuernas regulables de hierro fundido de 20 kg en total. Incluye 2 barras de acero con rosca y mariposas de seguridad cromadas + Set de discos de hierro fundido de varios pesos. Viene con su respectivo estuche rígido para transporte y orden.',
            price: 85000,
            condition: 'new'
          },
          {
            title: 'Mat Colchoneta de Yoga Alta Densidad 10mm TPE - Nueva',
            description: 'Colchoneta Mat antideslizante para Yoga o Pilates confeccionada en material eco-friendly TPE de alta densidad de 10mm de espesor. Amortiguación superior para articulaciones durante entrenamientos en el piso. No tóxica, lavable y súper duradera. Nueva.',
            price: 24000,
            condition: 'new'
          },
          {
            title: 'Pelota de Fútbol Oficial N5 Cosida a Mano - Nueva',
            description: 'Pelota de fútbol profesional Rodado número 5. Confeccionada con cuero sintético PU de alta resistencia y paneles cosidos a mano con hilo encerado reforzado de gran durabilidad. Cámara de butilo de excelente retención de aire. Apta césped sintético o natural.',
            price: 28000,
            condition: 'new'
          },
          {
            title: 'Raqueta de Tenis Babolat Pure Drive Grip 3 - Usada Impecable',
            description: 'Raqueta de tenis profesional Babolat Pure Drive de 300 gramos. Tamaño de puño Grip 3 (4 3/8). Muy bien cuidada, solo tiene marcas superficiales menores del roce del juego en el protector superior de plástico. Encordado de copoliéster a 52 libras fresco. En su funda.',
            price: 210000,
            condition: 'used'
          },
          {
            title: 'Mochila de Trekking Impermeable 60 Litros - Usada en un Viaje',
            description: 'Mochila técnica de montañismo y trekking de 60 litros de capacidad. Confeccionada en tela de cordura ultra resistente e impermeable a la lluvia con cubremochila integrado en bolsillo inferior. Espaldar anatómico acolchado regulable. Usada solo en un viaje al sur.',
            price: 85000,
            condition: 'used'
          }
        ];
        case 'instrumentos': return [
          {
            title: 'Guitarra Eléctrica Squier Fender Stratocaster - Usada Impecable',
            description: 'Se vende guitarra eléctrica Squier by Fender modelo Bullet Stratocaster color Sunburst clásico. En excelente estado estético y de calibración, tiene cuerdas D\'Addario nuevas y acción súper cómoda al tacto. Se entrega con su funda acolchada y cable de conexión.',
            price: 340000,
            condition: 'used'
          },
          {
            title: 'Teclado Sintetizador Yamaha PSR-E373 Sensitivo - Nuevo',
            description: 'Teclado organeta Yamaha PSR-E373 de 61 teclas sensitivas con respuesta dinámica. Incluye cientos de voces de instrumentos realistas de gran calidad de muestreo de Yamaha, acompañamiento rítmico automático y atril para partituras. Nuevo con su transformador original.',
            price: 390000,
            condition: 'new'
          },
          {
            title: 'Guitarra Criolla Clásica de Estudio Media Caja - Nueva',
            description: 'Guitarra criolla clásica clásica de estudio talle estándar. Diseño de media caja súper cómodo con mástil de madera fina de cedro y clavijero de niquelado de buena precisión de afinación. Ideal para comenzar a tomar clases de música o tocar en asados.',
            price: 78000,
            condition: 'new'
          },
          {
            title: 'Amplificador de Guitarra Eléctrica Fender Frontman 15G - Usado',
            description: 'Amplificador de guitarra eléctrica tipo combo Fender Frontman 15G de 15 Watts RMS de potencia reales. Cuenta con canal limpio y canal Overdrive integrado (distorsión de rock clásica), ecualización de agudos y graves y salida para auriculares. Muy buen estado.',
            price: 110000,
            condition: 'used'
          },
          {
            title: 'Ukelele Soprano de Madera Natural + Funda + Púas - Nuevo',
            description: 'Ukelele soprano acústico de estudio confeccionado en madera genuina de sapeli natural con acabado mate súper suave. Clavijeros abiertos de engranaje metálico fino. Gran afinación y sonido dulce tradicional. Incluye funda de transporte de regalo y 3 púas.',
            price: 38000,
            condition: 'new'
          }
        ];
        case 'comics': return [
          {
            title: 'Comic Spider-Man: Blue - Edición de Colección Tapa Dura',
            description: 'Espectacular novela gráfica clásica de colección Spider-Man: Blue en formato de Tapa Dura de Editorial Ovni Press en español. Historia de amor y melancolía escrita por Jeph Loeb e ilustrada por Tim Sale. Excelente estado sin detalles en esquinas.',
            price: 28000,
            condition: 'used',
            collectibleAttributes: { editorial: 'Otra', condicion: 'Near Mint', numero: '1', anio: 2021, idioma: 'Español' }
          },
          {
            title: 'Batman: The Dark Knight Returns - Colección Ivrea',
            description: 'Novela gráfica legendaria de Batman: El Regreso del Caballero Oscuro de Frank Miller editada en dos tomos en español por Editorial Ivrea. En perfectas condiciones guardado siempre con folio protector libre de humedad. Imprescindible para coleccionistas.',
            price: 32000,
            condition: 'used',
            collectibleAttributes: { editorial: 'Ivrea', condicion: 'Mint', numero: '1-2', anio: 2018, idioma: 'Español' }
          },
          {
            title: 'Watchmen de Alan Moore - Edición de Lujo Tapa Dura - Nueva',
            description: 'Novela gráfica completa de Watchmen, la obra maestra absoluta de Alan Moore y Dave Gibbons. Edición de lujo de colección en Tapa Dura de gran tamaño, papel satinado premium brillante. Libro nuevo sellado de fábrica en su folio plástico original.',
            price: 68000,
            condition: 'new',
            collectibleAttributes: { editorial: 'DC', condicion: 'Mint', numero: 'Único', anio: 2023, idioma: 'Español' }
          },
          {
            title: 'Sandman Tomo 1: Preludios y Nocturnos - Novela Gráfica Usada',
            description: 'Tomo número 1 de la mítica saga literaria de Neil Gaiman Sandman: Preludios y Nocturnos en español. Encuadernación rústica de calidad, en muy buenas condiciones generales de lectura y almacenamiento. Tapas y hojas perfectas sin marcas.',
            price: 24000,
            condition: 'used',
            collectibleAttributes: { editorial: 'DC', condicion: 'Muy Bueno', numero: '1', anio: 2015, idioma: 'Español' }
          },
          {
            title: 'Comic Genuino Spawn #1 (1992) Primera Edición en Inglés',
            description: 'Comic Spawn #1 original publicado por Image Comics en Mayo de 1992. Creado por Todd McFarlane. Primera edición en inglés importada. Se entrega en bolsa libre de ácido con cartón protector especial para coleccionistas de comics retro clásicos.',
            price: 150000,
            condition: 'used',
            collectibleAttributes: { editorial: 'Image', condicion: 'Near Mint', numero: '1', anio: 1992, idioma: 'Inglés' }
          }
        ];
        case 'figuras': return [
          {
            title: 'Figura de Colección Hot Toys Iron Man Mark 85 1/6 - Nueva',
            description: 'Espectacular figura de acción de colección de gama ultra premium Hot Toys de Iron Man Mark LXXXV (Mark 85) escala 1:6 de la película Avengers: Endgame. Nueva en su caja original sellada de fábrica con todos sus accesorios intercambiables.',
            price: 680000,
            condition: 'new',
            collectibleAttributes: { marca: 'Hot Toys', personaje: 'Iron Man', escala: '1:6', completa: true, en_caja: true }
          },
          {
            title: 'Funko Pop Batman 80th Anniversary - Nuevo en Caja',
            description: 'Funko Pop coleccionable original de Batman 1989 celebrando el 80 Aniversario del personaje de DC. Caja e interiores de plástico en perfectas condiciones 10/10, ideal para coleccionistas exigentes que no abren los muñecos del empaque original.',
            price: 28000,
            condition: 'new',
            collectibleAttributes: { marca: 'Funko', personaje: 'Batman', escala: 'Funko Pop', completa: true, en_caja: true }
          },
          {
            title: 'Figura Anime Goku Super Saiyan Escala 1/10 - Muy Buen Estado',
            description: 'Figura de colección de anime y manga Son Goku Super Saiyan en escala 1:10 de Banpresto original. Escultura pintada a mano con un nivel de detalles fantástico en el sombreado de pelo y ropa de pelea. Se encuentra en muy buen estado sin caja.',
            price: 45000,
            condition: 'used',
            collectibleAttributes: { marca: 'Banpresto', personaje: 'Goku', escala: '1:10', completa: true, en_caja: false }
          },
          {
            title: 'Nendoroid Link: Breath of the Wild Deluxe Edition - Usado',
            description: 'Figura de acción articulada de colección japonesa Nendoroid de Link de The Legend of Zelda: Breath of the Wild de Good Smile Company. Edición Deluxe completa con todos sus rostros extras, armas, accesorios y base original en caja.',
            price: 78000,
            condition: 'used',
            collectibleAttributes: { marca: 'Good Smile Company', personaje: 'Link', escala: 'Otra', completa: true, en_caja: true }
          },
          {
            title: 'Figura Star Wars Darth Vader Hasbro Black Series - Nueva',
            description: 'Figura articulada de acción Darth Vader de la prestigiosa serie Black Series de Hasbro a escala 1:12 (6 pulgadas). Incluye su sable de luz característico. Nueva y cerrada en su caja original sellada de fábrica de colección.',
            price: 65000,
            condition: 'new',
            collectibleAttributes: { marca: 'Hasbro', personaje: 'Darth Vader', escala: '1:12', completa: true, en_caja: true }
          }
        ];
        case 'monedas': return [
          {
            title: 'Moneda de Oro Argentina 5 Pesos Argentino 1888 - Excelente',
            description: 'Excepcional moneda histórica de oro ley Argentina de 5 Pesos Argentino del año 1888 del Gobierno de Julio A. Roca. Peso oficial de 8.06 gramos de oro fino ley 900 de acuñación en Buenos Aires. Espectacular brillo original e historia.',
            price: 1200000,
            condition: 'used',
            collectibleAttributes: { pais: 'Argentina', anio: 1888, condicion: 'Muy Buena', metal: 'Oro' }
          },
          {
            title: 'Moneda Antigua de Plata 1 Peso 1882 "Patacón" - Genuina',
            description: 'Moneda de colección de plata ley original de 1 Peso Argentina conocida popularmente como "Patacón" del año 1882 de acuñación nacional. Contenido de plata de alta pureza. Excelente relieve de busto de la Libertad clásica.',
            price: 320000,
            condition: 'used',
            collectibleAttributes: { pais: 'Argentina', anio: 1882, condicion: 'Buena', metal: 'Plata' }
          },
          {
            title: 'Set de Monedas de Bronce y Cobre Coloniales del Río de la Plata',
            description: 'Conjunto de 3 monedas coloniales de cobre y bronce circuladas en la región del Río de la Plata durante el Virreinato de finales del siglo XVIII. Estado de conservación regular pero legibles. Ideales para iniciarse en la numismática antigua.',
            price: 85000,
            condition: 'used',
            collectibleAttributes: { pais: 'España / Virreinato', anio: 1792, condicion: 'Regular', metal: 'Cobre' }
          },
          {
            title: 'Billete Antiguo de 1 Millón de Pesos Ley 18.188 - Impecable',
            description: 'Billete histórico coleccionable de la moneda argentina de denominación 1.000.000 (Un Millón) de Pesos Ley 18.188 emitido en la década de 1980 en plena hiperinflación. Serie A correlativos sin circular en excelente estado de papel crujiente.',
            price: 18000,
            condition: 'used',
            collectibleAttributes: { pais: 'Argentina', anio: 1981, condicion: 'Sin Circular', metal: 'Otro' }
          },
          {
            title: 'Moneda Colonial Española de Plata 8 Reales 1796 - Genuina',
            description: 'Espectacular moneda de plata histórica de 8 Reales ("Real de a 8") de Carlos IV del año 1796 de la Ceca de Potosí. Moneda global utilizada durante la época colonial española americana en perfectas condiciones y gran pátina antigua.',
            price: 450000,
            condition: 'used',
            collectibleAttributes: { pais: 'España (Potosí)', anio: 1796, condicion: 'Muy Buena', metal: 'Plata' }
          }
        ];
        case 'estampillas': return [
          {
            title: 'Estampilla Rara Próceres Argentinos de 1890 - Usada Histórica',
            description: 'Estampilla filatélica histórica de la famosa serie Próceres de la República Argentina de 1890 con efigie grabada clásica. Sello postal matasellado auténtico en excelente estado de conservación e integridad de dientes de borde.',
            price: 45000,
            condition: 'used'
          },
          {
            title: 'Estampilla Conmemorativa Apolo 11 Misión Lunar 1969 - Genuina',
            description: 'Sello postal histórico filatélico conmemorativo emitido por el correo oficial de Estados Unidos en 1969 para celebrar la legendaria Misión Apolo 11 y la llegada del hombre a la luna. Sin uso, con pegamento original intacto.',
            price: 32000,
            condition: 'used'
          },
          {
            title: 'Colección de Estampillas de Países Europeos Siglo XX - Set x50',
            description: 'Hermosa colección de 50 estampillas postales variadas de diferentes países del continente europeo (Alemania, Italia, Francia, España, etc.) emitidas a lo largo de todo el siglo XX. Excelente estado ideal para regalar o iniciar álbum filatélico.',
            price: 54000,
            condition: 'used'
          },
          {
            title: 'Estampilla Antigua del Correo Argentino Año 1910 - Centenario',
            description: 'Sello filatélico argentino histórico conmemorativo del Centenario de la Revolución de Mayo emitido en el año 1910. Hermoso diseño grabado artesanal clásico. Matasellado original de la época en perfecto estado.',
            price: 38000,
            condition: 'used'
          },
          {
            title: 'Plancha de Estampillas Históricas Nacionales sin Usar',
            description: 'Plancha filatélica completa con 10 estampillas históricas nacionales argentinas del siglo pasado en impecable estado de conservación y brillo original de papel sin marcas. Conserva el engomado original intacto en el reverso.',
            price: 75000,
            condition: 'used'
          }
        ];
        case 'discos-vinilo': return [
          {
            title: 'Vinilo Pink Floyd - The Dark Side of the Moon Edición US',
            description: 'Espectacular disco de vinilo clásico LP original importado de EE.UU. de la icónica banda Pink Floyd: "El lado oscuro de la luna". Excelente sonido estéreo analógico. Edición remasterizada de alto gramaje audiófilo. Incluye posters clásicos en el interior.',
            price: 85000,
            condition: 'used',
            collectibleAttributes: { artista: 'Pink Floyd', disco: 'The Dark Side of the Moon', anio: 2016, condicion: 'Mint', sello: 'Harvest / Columbia' }
          },
          {
            title: 'Vinilo The Beatles - Abbey Road Edición Original UK - Usado',
            description: 'Auténtica joya de colección musical de época: disco de vinilo LP original fabricado en el Reino Unido de The Beatles: Abbey Road (1969). Sonido analógico increíble con mínimos ruidos de púa típicos del buen uso del disco. Tapa gatefold original.',
            price: 180000,
            condition: 'used',
            collectibleAttributes: { artista: 'The Beatles', disco: 'Abbey Road', anio: 1969, condicion: 'VG', sello: 'Apple Records' }
          },
          {
            title: 'Vinilo Soda Stereo - Doble Vida Edición Argentina 1988',
            description: 'Disco de vinilo de colección nacional: álbum clásico "Doble Vida" de la banda Soda Stereo en su edición original argentina del año 1988 bajo el sello CBS. Estado estético de tapa y contraportada excelente, sonido de época impecable.',
            price: 95000,
            condition: 'used',
            collectibleAttributes: { artista: 'Soda Stereo', disco: 'Doble Vida', anio: 1988, condicion: 'VG+', sello: 'CBS' }
          },
          {
            title: 'Vinilo Queen - A Night at the Opera Edición Remasterizada',
            description: 'Disco de vinilo LP de la espectacular ópera rock de la banda británica Queen: "A Night at the Opera" que contiene la obra maestra Bohemian Rhapsody. Grabado en vinilo de 180g para máxima fidelidad acústica en reproductores modernos. Nuevo.',
            price: 78000,
            condition: 'new',
            collectibleAttributes: { artista: 'Queen', disco: 'A Night at the Opera', anio: 2020, condicion: 'Mint', sello: 'Virgin EMI' }
          },
          {
            title: 'Vinilo Charly García - Clics Modernos Remasterizado - Nuevo',
            description: 'Disco de vinilo LP nuevo de Charly García: "Clics Modernos", una de las obras más influyentes e importantes de la historia del rock en español. Edición especial remasterizada del año 2021 que suena increíblemente nítida. Nuevo y sellado.',
            price: 68000,
            condition: 'new',
            collectibleAttributes: { artista: 'Charly García', disco: 'Clics Modernos', anio: 2021, condicion: 'Mint', sello: 'Sony Music' }
          }
        ];
        case 'cartas-trading': return [
          {
            title: 'Carta Magic The Gathering - Black Lotus Proxy de Colección',
            description: 'Réplica proxy coleccionable de la carta más famosa e icónica del juego de cartas Magic: The Gathering (MTG) - Black Lotus de la edición Alpha clásica. Nivel de detalle de impresión hiperrealista, ideal para decoración de salas de juegos.',
            price: 18000,
            condition: 'used',
            collectibleAttributes: { juego: 'Magic: The Gathering', edicion: 'Alpha Proxy', rareza: 'Mítica', idioma: 'Inglés', cantidad: 1 }
          },
          {
            title: 'Carta Pokémon Charizard Holográfica Base Set 1999 - Genuina',
            description: 'Leyenda absoluta de cartas coleccionables Pokémon: carta Charizard Holográfica clásica original del Base Set de Wizards of the Coast (1999) en idioma español. Conservación excelente en folio rígido (Sleeve), sin dobleces.',
            price: 650000,
            condition: 'used',
            collectibleAttributes: { juego: 'Pokémon', edicion: 'Base Set 1999', rareza: 'Muy Rara', idioma: 'Español', cantidad: 1 }
          },
          {
            title: 'Mazo de Cartas Yu-Gi-Oh! Baraja de Inicio Yugi - Nueva Cerrada',
            description: 'Baraja de cartas de inicio oficial (Starter Deck Yugi) clásica del juego de cartas Yu-Gi-Oh! en español. Contiene el Mago Oscuro clásico original holográfico. Nueva y sellada de fábrica en su empaque original de colección retro.',
            price: 36000,
            condition: 'new',
            collectibleAttributes: { juego: 'Yu-Gi-Oh!', edicion: 'Starter Deck', rareza: 'Común', idioma: 'Español', cantidad: 40 }
          },
          {
            title: 'Carta Magic The Gathering - Jace, the Mind Sculptor - Foil',
            description: 'Carta coleccionable original foil brillante de Magic: The Gathering del personaje "Jace, el Escultor Mental" de la clásica edición Worldwake original en idioma inglés. Excelente estado sin roces en bordes (Near Mint).',
            price: 95000,
            condition: 'used',
            collectibleAttributes: { juego: 'Magic: The Gathering', edicion: 'Worldwake', rareza: 'Mítica', idioma: 'Inglés', cantidad: 1 }
          },
          {
            title: 'Booster Pack Pokémon Escarlata y Púrpura TCG - Nuevo Sellado',
            description: 'Sobre cerrado booster pack con 10 cartas coleccionables oficiales originales del juego de cartas Pokémon TCG correspondientes a la expansión moderna Escarlata y Púrpura. Nueva sellada con código digital de regalo.',
            price: 9800,
            condition: 'new',
            collectibleAttributes: { juego: 'Pokémon', edicion: 'Escarlata y Púrpura', rareza: 'Común', idioma: 'Español', cantidad: 10 }
          }
        ];
        case 'juguetes-antiguos': return [
          {
            title: 'Auto de Juguete de Chapa Litografiada Duravit Años 60',
            description: 'Vehículo de juguete retro clásico confeccionado con chapa litografiada y ruedas de goma marca Duravit original de la década de 1960. Pintura original de fábrica conservada con marcas de uso lógicas que realzan el estilo vintage.',
            price: 78000,
            condition: 'used'
          },
          {
            title: 'Muñeco Mecánico Antiguo de Cuerda de Chapa - Funciona',
            description: 'Juguete mecánico retro clásico de cuerda hecho con chapa pintada. Dispone de mecanismo de resorte de metal con llave integrada que funciona perfectamente haciendo que camine con andares chistosos. Conservado en muy buen estado.',
            price: 54000,
            condition: 'used'
          },
          {
            title: 'Oso de Peluche Vintage Años 50 Relleno de Paja Clásico',
            description: 'Auténtico oso de peluche clásico retro de la década de 1950. Relleno de paja tradicional de época y confeccionado en felpa suave desgastada. Ojos de vidrio cosidos a mano originales. Ideal para ambientación antigua de interiores.',
            price: 65000,
            condition: 'used'
          },
          {
            title: 'Juego de Mesa Clásico Cerebro Mágico Retro Completo 1970',
            description: 'Mítico y clásico juego de mesa infantil didáctico de preguntas y respuestas "Cerebro Mágico" original del año 1970 de industria nacional. Set completo con todas sus planchas de preguntas de cartón e instalación eléctrica funcionando.',
            price: 32000,
            condition: 'used'
          },
          {
            title: 'Soldaditos de Plomo Antiguos Set x10 Pintados a Mano',
            description: 'Set histórico de 10 figuras de soldados militares de plomo antiguos confeccionados y pintados a mano artesanalmente en la década de 1940. Muy buen nivel de detalles de uniformes y armamento militar tradicional de la época.',
            price: 49000,
            condition: 'used'
          }
        ];
        case 'relojes': return [
          {
            title: 'Reloj Rolex Oyster Perpetual Datejust Vintage 1975',
            description: 'Espectacular reloj clásico de colección e inversión Rolex Oyster Perpetual Datejust del año 1975 de 36mm. Esfera color champagne brillante y caja de acero inoxidable con bisel de oro. Funciona con precisión automática suiza ideal. Sin caja.',
            price: 4850000,
            condition: 'used'
          },
          {
            title: 'Reloj Seiko 5 Automático de Acero Inoxidable - Clásico',
            description: 'Reloj clásico automático japonés Seiko 5 con movimiento mecánico de 21 rubíes de excelente precisión diaria. Esfera color azul oscuro con doble fechero en español e inglés. Caja y correa de acero inoxidable pulido. Muy buen estado.',
            price: 180000,
            condition: 'used'
          },
          {
            title: 'Reloj Casio G-Shock Origin Tough Solar - Nuevo Completo',
            description: 'Reloj deportivo ultra resistente Casio G-Shock en su clásico diseño cuadrado original. Cuenta con carga solar Tough Solar y sincronización automática multibanda. Nuevo en su caja de metal de colección con manuales oficiales.',
            price: 195000,
            condition: 'new'
          },
          {
            title: 'Reloj Vintage Omega Seamaster Cal. 1020 Automático',
            description: 'Reloj clásico de lujo suizo Omega Seamaster de la década de 1980 con calibre automático de manufactura propia 1020. Todo en acero inoxidable con hermosa pátina original en agujas. Mantiene la hora de manera perfecta diaria.',
            price: 890000,
            condition: 'used'
          },
          {
            title: 'Reloj Inteligente Smartwatch Samsung Galaxy Watch 5 Pro',
            description: 'Reloj inteligente de última tecnología Samsung Galaxy Watch 5 Pro. Caja de titanio negro súper resistente y pantalla de cristal de zafiro de excelente dureza. Cuenta con monitoreo de salud completo. Tiene 4 meses de uso excelente.',
            price: 320000,
            condition: 'used'
          }
        ];
        case 'arte': return [
          {
            title: 'Cuadro Pintura al Óleo Original de Paisaje Patagónico',
            description: 'Espectacular pintura al óleo original sobre lienzo que retrata un paisaje otoñal del Nahuel Huapi en Bariloche, Patagonia Argentina. Firmado por artista plástico local en el año 1993. Hermoso marco de madera tallada de paraíso. Listo para colgar.',
            price: 145000,
            condition: 'used'
          },
          {
            title: 'Obra de Arte Abstracto Moderno Pintura Acrílica - Nueva',
            description: 'Pintura moderna decorativa de estilo abstracto y expresivo sobre bastidor de madera de gran tamaño (100x80cm). Realizada con pinturas acrílicas profesionales con gran relieve y texturas arenosas. Colores vivos para salones modernos.',
            price: 88000,
            condition: 'new'
          },
          {
            title: 'Escultura de Bronce de Colección Clásica Firmada',
            description: 'Escultura de bronce fundido artesanal que representa la figura de un caballo salvaje galopando de forma dinámica. Colocada sobre base pesada de mármol negro veteado. Firmada por escultor académico de renombre nacional de los años 70.',
            price: 280000,
            condition: 'used'
          },
          {
            title: 'Grabado Original Numerado y Firmado - Edición Limitada',
            description: 'Espectacular obra de grabado clásico realizada en xilografía tradicional de dos tintas sobre papel de algodón especial. Edición limitada de solo 20 copias numeradas. Firmada y numerada a mano con lápiz por la artista de renombre. Impecable.',
            price: 54000,
            condition: 'used'
          },
          {
            title: 'Dibujo a Carbón de Retrato Expresivo Vintage',
            description: 'Espectacular retrato clásico realizado a carbonilla y lápiz de tiza blanca sobre papel canson de color ocre suave de época. Impresionante nivel de realismo y de expresión en la mirada y sombras. Enmarcado fino de madera vidriada.',
            price: 38000,
            condition: 'used'
          }
        ];
        case 'otros': return [
          {
            title: 'Lentes de Sol Ray-Ban Wayfarer Classic G-15 Originales - Usados',
            description: 'Gafas y lentes de sol Ray-Ban modelo Wayfarer clásico italiano. Cristal color verde mineral G-15 clásico antirreflex y marco de acetato negro resistente. Tiene un año de uso familiar muy cuidado sin rayones. Con su estuche de cuero marrón original.',
            price: 120000,
            condition: 'used'
          },
          {
            title: 'Set de Termo Stanley Adventure 1L + Mate Acero Original - Nuevo',
            description: 'Kit de mate Stanley original para salidas y viajes. Incluye Termo clásico Stanley Adventure de 1 litro de acero inoxidable color verde tradicional + Mate térmico Stanley de acero inoxidable haciendo juego. Conserva el agua caliente por 24hs. Nuevos en caja.',
            price: 95000,
            condition: 'new'
          },
          {
            title: 'Perfume Importado Hugo Boss Bottled EDT 100ml Original - Nuevo',
            description: 'Fragancia clásica para hombres de alta perfumería Hugo Boss Bottled en su versión Eau de Toilette de 100ml de volumen. Nueva, original en su caja de empaque termosellada con celofán de fábrica con sello AFIP de importación.',
            price: 135000,
            condition: 'new'
          },
          {
            title: 'Set de Valijas Rígidas de Viaje con Ruedas 360 x3 - Nuevas',
            description: 'Espectacular set completo de 3 valijas de viaje de tamaños chica (cabina), mediana y grande de material plástico rígido ABS de excelente flexibilidad ante impactos. 4 ruedas dobles con giro 360 grados suaves. Nuevas con sus etiquetas.',
            price: 195000,
            condition: 'new'
          },
          {
            title: 'Encendedor Zippo de Colección Grabado Cromado - Usado',
            description: 'Encendedor metálico de nafta clásico de la prestigiosa marca Zippo original con grabado de diseño águila clásica en cromo satinado pulido. Fabricado en EE.UU. Funciona a la perfección, solo requiere carga de bencina común. En estuche.',
            price: 49000,
            condition: 'used'
          }
        ];
        default: return [];
      }
    };

    const LEAF_CATEGORIES = Array.from(categoryMap.keys()).filter(slug => slug !== 'electronica' && slug !== 'vehiculos' && slug !== 'ropa' && slug !== 'hogar' && slug !== 'coleccionables');

    console.log(`🚀 Found ${LEAF_CATEGORIES.length} leaf categories to seed:`, LEAF_CATEGORIES);

    let listingsCount = 0;
    let imagesCount = 0;

    for (const slug of LEAF_CATEGORIES) {
      const categoryId = categoryMap.get(slug);
      if (!categoryId) continue;

      const products = getProductsForCategory(slug);
      if (products.length === 0) {
        console.warn(`  ⚠️ Warning: No product templates found for category ${slug}`);
        continue;
      }

      console.log(`🎬 Seeding ${products.length} products in category: ${slug}...`);

      const imgPool = IMAGE_POOLS[slug] || IMAGE_POOLS['otros'];

      for (let i = 0; i < products.length; i++) {
        const prod = products[i];

        // 1. Resolve geometry point and location details from LOCATIONS array
        const loc = LOCATIONS[i % LOCATIONS.length];
        const locationSql = sql`ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326)`;

        // 2. Insert Listing
        const [listing] = await db
          .insert(schema.listings)
          .values({
            userId: sellerId,
            categoryId: categoryId,
            type: 'standard',
            status: 'active',
            isCollectible: slug === 'comics' || slug === 'figuras' || slug === 'monedas' || slug === 'estampillas' || slug === 'discos-vinilo' || slug === 'cartas-trading' || slug === 'juguetes-antiguos' || slug === 'relojes' || slug === 'arte',
            title: prod.title,
            description: prod.description,
            price: String(prod.price),
            currency: 'ARS',
            priceNegotiable: false,
            condition: prod.condition,
            saleType: 'stock',
            stock: 5 + i * 2, // Stock system: positive integer
            location: locationSql as unknown as string, // direct insert of ST_MakePoint geometry
            locationText: loc.text,
            city: loc.city,
            province: loc.province,
            countryCode: 'AR',
            paymentMethods: ['transferencia', 'efectivo', 'mercadopago'],
            shippingOptions: ['correo_argentino', 'retiro_en_persona', 'envio_express'],
            shippingDescription: 'Se realizan envíos a todo el país. Los despachos se realizan dentro de las 24 horas hábiles tras la compra. También se puede retirar en persona de lunes a sábados de 10 a 19 hs.',
            collectibleAttributes: prod.collectibleAttributes || null,
            durationDays: 30,
            creditsSpent: 1,
            wasFreeQuota: false,
            moderationStatus: 'approved',
            riskScore: 0,
            publishedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          })
          .returning({ id: schema.listings.id });

        listingsCount++;

        // 3. Insert exactly 3 images per listing
        const imgIndexes = [i % 5, (i + 1) % 5, (i + 2) % 5];
        for (let j = 0; j < 3; j++) {
          const imgId = imgPool[imgIndexes[j]];
          const url = `https://images.unsplash.com/photo-${imgId}?auto=format&fit=crop&w=800&q=80`;
          const thumbnailUrl = `https://images.unsplash.com/photo-${imgId}?auto=format&fit=crop&w=300&q=70`;
          const r2Key = `listings/${listing.id}/sample_${j}.jpg`;

          await db
            .insert(schema.listingImages)
            .values({
              listingId: listing.id,
              url,
              thumbnailUrl,
              r2Key,
              sortOrder: j,
              isPrimary: j === 0,
            });

          imagesCount++;
        }
      }
    }

    console.log(`🎉 Seeding completed successfully!`);
    console.log(`  ✓ Total Listings Created: ${listingsCount}`);
    console.log(`  ✓ Total Images Created: ${imagesCount}`);

  } catch (err) {
    console.error('❌ Error during seeding process:', err);
  } finally {
    await pool.end();
  }
}

main();
