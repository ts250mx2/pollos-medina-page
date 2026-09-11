import { sesionPedidosActiva, pinConfigurado } from "@/lib/auth-pedidos";
import PedidosLogin from "@/components/PedidosLogin";
import PedidosGestion from "@/components/PedidosGestion";
import "./pedidos.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mostrador de pedidos · Pollo Medina",
  robots: { index: false, follow: false },
};

export default async function PedidosPage() {
  const activa = await sesionPedidosActiva();
  if (!activa) return <PedidosLogin configurado={pinConfigurado()} />;
  return <PedidosGestion />;
}
