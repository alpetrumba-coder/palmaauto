import marker from "../../../lib/factory-site-release.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json({version: marker.version, releaseId: marker.releaseId, operation: marker.operation, sourceCommit: marker.sourceCommit, patchDigest: marker.patchDigest}, {headers: {"Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff"}});
}
