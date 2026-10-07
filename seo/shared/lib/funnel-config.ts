// No destination is selected by default. Ownership/attribution must be approved before changing CTAs.
export function configuredFunnel(value: string | undefined): string | null {
  if (!value) return null;
  const url = new URL(value);
  if (url.origin !== "https://www.revoapp.ai" || !["/free-agent","/free-test","/free-trial"].includes(url.pathname) || url.search || url.hash) throw new Error("Unapproved funnel destination");
  return url.toString();
}

export function seoFunnelUrl(value?: string): string {
  // Approved locally by Jorge October 5; production publication remains pending.
  return configuredFunnel(value ?? "https://www.revoapp.ai/free-test")!;
}
export function funnelClickEvent(landing: string, placement: string, destination: string) {
  const path = landing.split(/[?#]/)[0];
  if (!/^\/[a-z0-9/-]*$/i.test(path)) throw new Error("Invalid landing path");
  return { landing_page: path, cta_placement: placement, destination_path: new URL(destination).pathname };
}

export function clickAnalyticsPayload(location: string,placement: string,destination: string) {
 const url=new URL(location),dimensions=funnelClickEvent(url.pathname,placement,destination);
 // Override automatic GA event context so query/referrer fields cannot reintroduce PII.
 return {...dimensions,page_location:`${url.origin}${dimensions.landing_page}`,page_referrer:""};
}
