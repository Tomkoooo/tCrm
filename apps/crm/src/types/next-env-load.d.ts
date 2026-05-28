declare module '@next/env' {
  export function loadEnvConfig(
    dir: string,
    dev?: boolean,
    log?: boolean
  ): { combinedEnv: Record<string, string>; loadedEnvFiles: string[] };
}
