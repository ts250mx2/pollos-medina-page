// ============================================================
//  Mascota vectorial de poyito con ESTADO.
//  El SVG está "rigged" por partes (cabeza, ojos, pico, alas, cresta) y el
//  atributo data-estado elige la animación en CSS (globals.css):
//    idle       baila suave, parpadea
//    pensando   mira arriba, aletea mientras espera al modelo
//    hablando   el pico se mueve al ritmo del texto/voz
//    senalando  extiende el ala hacia las tarjetas de productos
//    celebrando salta y grita al registrar el pedido
// ============================================================

export type EstadoPoyito = "idle" | "pensando" | "hablando" | "senalando" | "celebrando";

type Props = {
  estado?: EstadoPoyito;
  compacta?: boolean;
};

export function PoyitoMascota({ estado = "idle", compacta = false }: Props) {
  return (
    <span
      className={`poyito-mascota${compacta ? " poyito-mascota--compacta" : ""}`}
      data-estado={estado}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 150" role="img">
        <defs>
          <radialGradient id="poyitoBody" cx="32%" cy="22%" r="78%"><stop offset="0" stopColor="#fff7a8"/><stop offset=".42" stopColor="#ffd832"/><stop offset="1" stopColor="#e99c05"/></radialGradient>
          <radialGradient id="poyitoHead" cx="34%" cy="25%" r="72%"><stop offset="0" stopColor="#fffbd0"/><stop offset=".38" stopColor="#ffe45d"/><stop offset="1" stopColor="#efad08"/></radialGradient>
          <linearGradient id="poyitoWing" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe96c"/><stop offset="1" stopColor="#e9a407"/></linearGradient>
          <linearGradient id="poyitoBeak" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffb637"/><stop offset="1" stopColor="#e96816"/></linearGradient>
          <filter id="poyitoSoft" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#6b3b00" floodOpacity=".28"/></filter>
        </defs>
        <ellipse className="poyito-mascota__sombra" cx="79" cy="137" rx="43" ry="8" />
        <g className="poyito-mascota__grito"><path d="M126 27l12-11M132 39l17-2M116 20l3-15" /></g>
        <g className="poyito-mascota__pensar"><circle cx="128" cy="30" r="3.5"/><circle cx="137" cy="20" r="5"/><circle cx="149" cy="8" r="6.5"/></g>
        <g className="poyito-mascota__personaje" filter="url(#poyitoSoft)">
          <g className="poyito-mascota__patas">
            <path d="M61 120v13m-10 1 10-1 8 4M101 119v14m-9 3 9-3 9 2" />
          </g>
          <ellipse className="poyito-mascota__cuerpo" cx="80" cy="96" rx="45" ry="37" />
          <path className="poyito-mascota__ala poyito-mascota__ala--izq" d="M45 78C25 70 15 84 23 103c5 12 18 13 30 2-7-7-9-16-8-27Z" />
          <path className="poyito-mascota__ala poyito-mascota__ala--der" d="M114 78c20-8 30 7 21 25-5 10-15 12-27 3 7-9 8-18 6-28Z" />
          <ellipse className="poyito-mascota__panza" cx="80" cy="105" rx="26" ry="20" />
          <g className="poyito-mascota__cabeza">
            <path className="poyito-mascota__cresta" d="M57 43c-10-15 6-24 16-12 2-18 23-18 25-1 12-10 28 5 16 18" />
            <circle className="poyito-mascota__cara" cx="80" cy="62" r="39" />
            <ellipse className="poyito-mascota__mejilla" cx="50" cy="72" rx="9" ry="5" />
            <ellipse className="poyito-mascota__mejilla" cx="111" cy="72" rx="9" ry="5" />
            <g className="poyito-mascota__ojo poyito-mascota__ojo--izq"><ellipse cx="64" cy="58" rx="8" ry="10"/><circle cx="61" cy="54" r="2.8"/></g>
            <g className="poyito-mascota__ojo poyito-mascota__ojo--der"><ellipse cx="96" cy="58" rx="8" ry="10"/><circle cx="93" cy="54" r="2.8"/></g>
            <path className="poyito-mascota__ceja" d="M55 43q9-6 17 0M89 42q9-5 17 2" />
            <g className="poyito-mascota__pico"><path d="M70 68q10-11 21 0L80 78Z"/><path d="M71 69h19L80 84Z"/></g>
          </g>
          <path className="poyito-mascota__luz" d="M52 82c-8 9-8 22-2 29" />
        </g>
      </svg>
    </span>
  );
}
