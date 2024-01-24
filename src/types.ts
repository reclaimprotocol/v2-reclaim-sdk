import type { ProviderClaimData } from './interfaces';
import type { ParsedQs } from 'qs';

export type ClaimID = ProviderClaimData['identifier'];

export type ClaimInfo = Pick<
  ProviderClaimData,
  'context' | 'provider' | 'parameters'
>;

export type AnyClaimInfo =
  | ClaimInfo
  | {
      identifier: ClaimID;
    };

export type CompleteClaimData = Pick<
  ProviderClaimData,
  'owner' | 'timestampS' | 'epoch'
> &
  AnyClaimInfo;

export type SignedClaim = {
  claim: CompleteClaimData;
  signatures: Uint8Array[];
};

export type QueryParams = ParsedQs;

// @needsAudit @docsMissing
export type ParsedURL = {
  scheme: string | null;
  hostname: string | null;
  /**
   * The path into the app specified by the URL.
   */
  path: string | null;
  /**
   * The set of query parameters specified by the query string of the url used to open the app.
   */
  queryParams: QueryParams | null;
};
