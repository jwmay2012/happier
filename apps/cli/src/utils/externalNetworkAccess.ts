/** Controls Happier-owned external integrations; private relay and provider processes are separate. */
export function isExternalNetworkAccessEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return String(env.HAPPIER_EXTERNAL_NETWORK_ACCESS ?? '1').trim() !== '0';
}
