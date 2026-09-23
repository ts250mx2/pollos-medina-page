export type EstadoPoyito = "idle" | "pensando" | "hablando" | "senalando" | "celebrando";

type Props = {
  estado?: EstadoPoyito;
  compacta?: boolean;
};

/**
 * Mascota 3D de Poyito. El render mantiene una silueta limpia y los elementos
 * decorativos independientes permiten expresar cada estado sin cargar la UI.
 */
export function PoyitoMascota({ estado = "idle", compacta = false }: Props) {
  return (
    <span
      className={`poyito-mascota poyito-mascota--3d${compacta ? " poyito-mascota--compacta" : ""}`}
      data-estado={estado}
      aria-hidden="true"
    >
      <span className="poyito-mascota__halo" />
      <span className="poyito-mascota__sombra" />
      <img
        className="poyito-mascota__render"
        src="/assets/img/pollito/poyito-3d.png"
        alt=""
        draggable={false}
      />
      <span className="poyito-mascota__pensar"><i /><i /><i /></span>
      <span className="poyito-mascota__grito"><i /><i /><i /></span>
    </span>
  );
}
