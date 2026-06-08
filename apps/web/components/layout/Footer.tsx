import Link from 'next/link';
import Image from 'next/image';
import { Mail, Globe, Share2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-tradealo-footer-bg text-tradealo-footer-text mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Image
              src="/logo.png"
              alt="Tradealo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="font-heading font-bold text-xl text-white">
              Tradealo
            </span>
          </div>
          <p className="text-sm leading-relaxed max-w-xs">
            El marketplace argentino donde lo que ya no usás se transforma en
            algo que sí. Trueque, compra y venta entre vecinos.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <a
              href="mailto:hola@trocalia.com.ar"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Contacto por email"
            >
              <Mail size={16} />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Instagram"
            >
              <Globe size={16} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Twitter"
            >
              <Share2 size={16} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-white font-heading font-semibold text-sm mb-4 uppercase tracking-wide">
            Plataforma
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/listings" className="hover:text-white transition-colors">
                Explorar publicaciones
              </Link>
            </li>
            <li>
              <Link href="/my-listings/new" className="hover:text-white transition-colors">
                Publicar un anuncio
              </Link>
            </li>
            <li>
              <Link href="/wallet/buy-tokens" className="hover:text-white transition-colors">
                Comprar tokens
              </Link>
            </li>
            <li>
              <Link href="/kyc" className="hover:text-white transition-colors">
                Verificá tu identidad
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-heading font-semibold text-sm mb-4 uppercase tracking-wide">
            Legal
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/community" className="hover:text-white transition-colors">
                Reglas de la comunidad
              </Link>
            </li>
            <li>
              <Link href="/help" className="hover:text-white transition-colors">
                Centro de ayuda
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span>© 2026 Tradealo — Hecho en Argentina</span>
          <span>Marketplace C2C de intercambio · Solo Argentina</span>
        </div>
      </div>
    </footer>
  );
}
