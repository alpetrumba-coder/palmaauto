import { createFactoryVoiceHandler } from "@/lib/factory-editor-voice";
import { getAdminPanelSession } from "@/lib/require-admin-panel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handle = createFactoryVoiceHandler({ getSession: getAdminPanelSession });
export const GET = handle;
export const POST = handle;
