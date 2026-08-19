export type BuildInfo = {
  version: string;
  buildNumber: string;
};

export function getBuildInfo(): BuildInfo {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
    buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER ?? "0",
  };
}

export const BUILD_LABEL = `v${getBuildInfo().version}.build ${getBuildInfo().buildNumber}`;