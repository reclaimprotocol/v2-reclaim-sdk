export interface ProviderV2 {
  id: string;
  name: string;
  logoUrl: string;
  url: string;
  urlType: string;
  method: 'GET' | 'POST';
  Body: Object | null;
  loginUrl: string;
  loginCookies: string[];
  loginHeaders: string[];
  isActive: boolean;
  responseSelections: ResponseSelection[];
  completedTrigger: string;
  customInjection: string;
  bodySniff: BodySniff;
  userAgent: string | null;
  isApproved: boolean;
}

export interface ResponseSelection {
  JSONPath: string;
  XPath: string;
  responseMatch: string;
}

export interface BodySniff {
  enabled: boolean;
  regex: string;
}

export interface Proof {
  identifier: string;
  claimData: ProviderClaimData;
  signatures: string[];
  witnesses: WitnessData[];
  extractedParameterValues: any;
}

export interface WitnessData {
  id: string;
  url: string;
}

export interface ProviderClaimData {
  provider: string;
  parameters: string;
  owner: string;
  timestampS: number;
  context: string;
  /**
   * identifier of the claim;
   * Hash of (provider, parameters, context)
   *
   * This is different from the claimId returned
   * from the smart contract
   */
  identifier: string;
  epoch: number;
}

export interface RequestedProofs {
  id: string;
  sessionId: string;
  name: string;
  callbackUrl: string;
  claims: RequestedClaim[];
}
export interface RequestedClaim {
  provider: string;
  context: string;
  templateClaimId: string;
  payload: Payload;
}
export interface Payload {
  metadata: {
    name: string;
    logoUrl: string;
  };
  url: string;
  urlType: 'CONSTANT' | 'REGEX';
  method: 'GET' | 'POST';
  login: {
    url: string;
  };
  responseSelections: {
    responseMatch: string;
    xPath?: string;
    jsonPath?: string;
  }[];
  parameters: {
    [key: string]: string;
  };
  headers?: { [key: string]: string };
  customInjection?: string;
  bodySniff?: {
    enabled: boolean;
    regex?: string;
  };
  userAgent?: {
    ios?: string;
    android?: string;
  };
  useZk?: boolean;
}

export interface Context {
  contextAddress: string;
  contextMessage: string;
}

export interface Beacon {
  /**
   * Get the witnesses for the epoch specified
   * or the current epoch if none is specified
   */
  getState(epoch?: number): Promise<BeaconState>;

  close?(): Promise<void>;
}

export type BeaconState = {
  witnesses: WitnessData[];
  epoch: number;
  witnessesRequiredForClaim: number;
  nextEpochTimestampS: number;
};
