export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="font-heading text-3xl font-bold text-tradealo-text">Centro de ayuda</h1>
      <p className="text-tradealo-text-muted text-sm">Â¿TenÃ©s alguna duda? AcÃ¡ encontrÃ¡s las respuestas mÃ¡s frecuentes.</p>
      <div className="space-y-6">
        <div className="border border-tradealo-border rounded-xl p-5 space-y-2">
          <h2 className="font-heading font-semibold text-base">Â¿CÃ³mo publico un artÃ­culo?</h2>
          <p className="text-sm text-tradealo-text-muted">IniciÃ¡ sesiÃ³n, hacÃ© clic en &quot;Publicar un anuncio&quot; y seguÃ­ los 6 pasos del formulario. Â¡Es gratis para la primera publicaciÃ³n estÃ¡ndar!</p>
        </div>
        <div className="border border-tradealo-border rounded-xl p-5 space-y-2">
          <h2 className="font-heading font-semibold text-base">Â¿Para quÃ© sirven los tokens?</h2>
          <p className="text-sm text-tradealo-text-muted">Los tokens son la moneda interna de Tradealo. Se usan para publicar anuncios premium y extender la duraciÃ³n de tus publicaciones.</p>
        </div>
        <div className="border border-tradealo-border rounded-xl p-5 space-y-2">
          <h2 className="font-heading font-semibold text-base">Â¿CÃ³mo verifico mi identidad (KYC)?</h2>
          <p className="text-sm text-tradealo-text-muted">IngresÃ¡ a tu perfil y seleccionÃ¡ &quot;Verificar identidad&quot;. NecesitarÃ¡s tu DNI y una selfie. La verificaciÃ³n aumenta la confianza en tus publicaciones.</p>
        </div>
        <div className="border border-tradealo-border rounded-xl p-5 space-y-2">
          <h2 className="font-heading font-semibold text-base">Â¿CÃ³mo contacto a Tradealo?</h2>
          <p className="text-sm text-tradealo-text-muted">Escribinos a <a href="mailto:hola@trocalia.com.ar" className="text-tradealo-primary hover:underline">hola@trocalia.com.ar</a>. Respondemos en 24â€“48 horas hÃ¡biles.</p>
        </div>
      </div>
    </div>
  );
}

