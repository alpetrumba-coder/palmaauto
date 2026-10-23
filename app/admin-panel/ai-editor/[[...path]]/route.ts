import { createFactoryAdminHandler } from "@/lib/factory-admin-bridge";
import { getAdminPanelSession } from "@/lib/require-admin-panel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handle = createFactoryAdminHandler({ getSession: getAdminPanelSession });

export const GET = handle;
export const POST = handle;
