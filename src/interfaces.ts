export interface ReclaimRequest {
    title: string;
    requestedProofs: RequestedProof[];
    contextMessage?: string;
    contextAddress?: string;
    requestorSignature?: string;
}

export interface RequestedProof {
    name: string;
    provider: ProviderV2;
    metadata?: { logoUri?: string, description?: string };
}

export interface ProviderV2 {
    headers?: Map<string, string>;
    url: string;
    method: 'GET' | 'POST';
    body?: string | Uint8Array;
    responseRedactions: ResponseRedaction[];
    responseMatches: ResponseMatch[];
    geoLocation?: string;
}

export interface IReclaim {
    requestProof(request: ReclaimRequest, CallbackHandler: () => void, AppCallbackUrl: string | undefined): TemplateWithLink;
}

export interface ResponseMatch {
    type: 'regex' | 'contains';
    value: string;
}

export interface ResponseRedaction {
    xPath?: string;
    jsonPath?: string;
    regex?: string;
}

export interface TemplateWithLink {
    template: Template;
    link: string;
}

export interface Template {
    id: string;
    name: string;
    callbackUrl: string;
    claims: RequestedProof[];
    context: string;
    requestorSignature?: string,
}
