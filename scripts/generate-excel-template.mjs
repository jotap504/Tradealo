// Generates a sample xlsx for testing the Excel import flow.
// Run: node scripts/generate-excel-template.mjs
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('C:/Users/user/Documents/trocalia/apps/api/');
const { utils, write } = require('xlsx');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'Logo', 'template-trocalia.xlsx');

const rows = [
  [
    'Titulo',
    'Descripcion',
    'Precio',
    'Moneda',
    'Condicion',
    'Categoria',
    'Imagenes',
    'SKU',
    'Stock',
  ],
  [
    'Auriculares inalambricos con cancelacion de ruido',
    'Modelo over-ear con bateria 30hs, microfono integrado, plegables.',
    45000,
    'ARS',
    'nuevo',
    'Electronica',
    'https://picsum.photos/seed/auri1/600/600 | https://picsum.photos/seed/auri2/600/600',
    'AUR-001',
    8,
  ],
  [
    'Bicicleta rodado 29 doble suspension',
    'Cuadro de aluminio, 21 cambios, frenos a disco. Poco uso, excelente estado.',
    280000,
    'ARS',
    'usado',
    'Deportes',
    'https://picsum.photos/seed/bici1/600/600 | https://picsum.photos/seed/bici2/600/600 | https://picsum.photos/seed/bici3/600/600',
    'BIC-MTB-29',
    1,
  ],
  [
    'Cafetera express manual restaurada',
    'Italiana, 2 brazos, vapor. Restaurada con repuestos originales.',
    95000,
    'ARS',
    'reacondicionado',
    'Hogar',
    'https://picsum.photos/seed/cafe1/600/600',
    'CAF-EXP-01',
    3,
  ],
  [
    'Notebook Lenovo Ideapad 5 - i5 11va',
    '16GB RAM, SSD 512GB, pantalla 15.6 FHD, bateria nueva.',
    750,
    'USD',
    'usado',
    'Computacion',
    'https://picsum.photos/seed/note1/600/600 | https://picsum.photos/seed/note2/600/600',
    'NOTE-LEN-001',
    1,
  ],
  [
    'Pelota futbol numero 5 oficial',
    'Reglamentaria FIFA, cosida a mano, ideal para canchas de cesped sintetico.',
    18500,
    'ARS',
    'nuevo',
    'Deportes',
    'https://picsum.photos/seed/pelota1/600/600',
    'PEL-F5-NEG',
    25,
  ],
];

const ws = utils.aoa_to_sheet(rows);
const wb = utils.book_new();
utils.book_append_sheet(wb, ws, 'Productos');
const buf = write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync(OUT, buf);
console.log(`Wrote ${OUT} (${buf.length} bytes, ${rows.length - 1} rows)`);
