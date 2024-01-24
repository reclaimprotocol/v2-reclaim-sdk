import type { ProviderV2, Proof, RequestedProofs, Context } from './interfaces';
import { getIdentifierFromClaimInfo } from './witness';
import type { QueryParams, SignedClaim } from './types';
import uuid from 'uuid';
import { ethers } from 'ethers';
import { parse } from './utils';
import canonicalize from 'canonicalize';
import { getWitnessesForClaim, assertValidSignedClaim } from './utils';

export class ReclaimClient {
  applicationId: string;
  signature?: string;
  appCallbackUrl?: string | null;
  sessionId: string = '';
  deepLinkData?: QueryParams | null;
  requestedProofs?: RequestedProofs;
  context: Context = { contextAddress: '0x0', contextMessage: '' };
  verificationRequest?: ReclaimVerficationRequest;

  constructor(applicationId: string, sessionId?: string) {
    this.applicationId = applicationId;
    if (sessionId) {
      this.sessionId = sessionId;
    } else {
      this.sessionId = uuid.v4().toString();
    }
  }

  async createVerificationRequest(providers: string[]) {
    const appCallbackUrl = await this.getAppCallbackUrl();
    const providersV2 = await this.buildHttpProviderV2ByName(providers);

    const reclaimDeepLink = await this.createLinkRequest(providers);

    this.verificationRequest = new ReclaimVerficationRequest(
      providersV2,
      appCallbackUrl,
      reclaimDeepLink,
      this.sessionId
    );

    this.registerHandlers();
    return this.verificationRequest;
  }

  async createLinkRequest(providers: string[]) {
    const appCallbackUrl = await this.getAppCallbackUrl();
    const providersV2 = await this.buildHttpProviderV2ByName(providers);
    if (!this.requestedProofs) {
      await this.buildRequestedProofs(providersV2, appCallbackUrl);
    }

    if (!this.signature) {
      throw new Error('Signature is not set');
    }

    const appId = ethers
      .verifyMessage(
        ethers.getBytes(
          ethers.keccak256(
            new TextEncoder().encode(canonicalize(this.requestedProofs)!)
          )
        ),
        ethers.hexlify(this.signature)
      )
      .toLowerCase();

    if (appId !== this.applicationId) {
      throw new Error('Invalid signature');
    }

    const deepLink = 'reclaimprotocol://requestedProofs';
    const deepLinkUrl = `${deepLink}/${encodeURIComponent(
      JSON.stringify({ ...this.requestedProofs, signature: this.signature })
    )}`;
    return deepLinkUrl;
  }

  setAppCallbackUrl(url: string) {
    this.appCallbackUrl = url;
  }

  async getAppCallbackUrl() {
    let appCallbackUrl = this.appCallbackUrl;
    if (!appCallbackUrl) {
      appCallbackUrl = `/${this.sessionId}`;
    }
    return appCallbackUrl;
  }

  setSignature(signature: string) {
    this.signature = signature;
  }

  // @dev Use this function only in development environments
  async getSignature(
    requestedProofs: RequestedProofs,
    applicationSecret: string
  ): Promise<string> {
    const wallet = new ethers.Wallet(applicationSecret);
    const signature = await wallet.signMessage(
      ethers.getBytes(
        ethers.keccak256(
          new TextEncoder().encode(canonicalize(requestedProofs)!)
        )
      )
    );

    return signature;
  }

  async buildHttpProviderV2ByName(
    providerNames: string[]
  ): Promise<ProviderV2[]> {
    try {
      const reclaimServerUrl =
        'https://api.reclaimprotocol.org/get/httpsproviders';
      const response = await fetch(reclaimServerUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch HTTP providers');
      }

      const providers = (await response.json()).providers as ProviderV2[];

      const filteredProviders = providers.filter((provider) => {
        return providerNames.includes(provider.name);
      });

      return filteredProviders;
    } catch (error) {
      console.error('Error fetching HTTP providers:', error);
      throw error;
    }
  }

  buildRequestedProofs(
    providers: ProviderV2[],
    callbackUrl: string
  ): RequestedProofs {
    const claims = providers.map((provider) => {
      return {
        provider: provider.name,
        context: JSON.stringify(this.context),
        payload: {
          metadata: {
            name: provider.name,
            logoUrl: provider.logoUrl,
          },
          url: provider.url,
          urlType: provider.urlType,
          method: provider.Method,
          login: {
            url: provider.loginUrl,
          },
          parameter: {},
          responseSelections: provider.responseSelections,
          templateClaimId: provider.id,
          headers: provider.loginHeaders,
          customInjection: provider.customInjection,
          bodySniff: provider.bodySniff,
          userAgent: provider.userAgent,
        },
      };
    });

    this.requestedProofs = {
      id: uuid.v4().toString(),
      sessionId: this.sessionId,
      name: 'RN-SDK',
      callbackUrl: callbackUrl,
      //@ts-ignore
      claims: claims,
    };

    return this.requestedProofs!;
  }

  registerHandlers() {
    Linking.addEventListener('url', this.handleDeepLinkEvent.bind(this));
  }

  async handleDeepLinkEvent(event: { url: string }) {
    try {
      const receivedDeepLinkUrl = event.url;
      const res = parse(receivedDeepLinkUrl);
      const proof = (res.queryParams as unknown as Proof) ?? null;

      if (proof) {
        this.deepLinkData = res.queryParams;

        //@ts-ignore
        proof.claimData = JSON.parse(proof.claimData);
        //@ts-ignore
        proof.signatures = JSON.parse(proof.signatures);

        if (this.verificationRequest?.onSuccessCallback) {
          const verified = await this.verifySignedProof(proof);
          if (!verified) {
            throw new Error('Proof not verified');
          }
          this.verificationRequest?.onSuccessCallback(proof);
        }
      }
    } catch (e: Error | unknown) {
      if (this.verificationRequest?.onFailureCallback) {
        this.verificationRequest?.onFailureCallback(e);
      }
    }
  }

  addContext(address: string, message: string) {
    // TODO: sync data on backend
    this.context = {
      contextAddress: address,
      contextMessage: message,
    };
    return this.context;
  }

  async verifySignedProof(proof: Proof) {
    if (!proof.signatures.length) {
      throw new Error('No signatures');
    }
    const witnesses = await getWitnessesForClaim(
      proof.claimData.epoch,
      proof.identifier,
      proof.claimData.timestampS
    );

    try {
      // then hash the claim info with the encoded ctx to get the identifier
      const calculatedIdentifier = getIdentifierFromClaimInfo({
        parameters: JSON.parse(
          canonicalize(proof.claimData.parameters) as string
        ),
        provider: proof.claimData.provider,
        context: proof.claimData.context,
      });
      proof.identifier = proof.identifier.replace('"', '');
      proof.identifier = proof.identifier.replace('"', '');
      // check if the identifier matches the one in the proof
      if (calculatedIdentifier !== proof.identifier) {
        throw new Error('Identifier Mismatch');
      }

      const signedClaim: SignedClaim = {
        claim: {
          ...proof.claimData,
        },
        signatures: proof.signatures.map((signature) => {
          return ethers.getBytes(signature);
        }),
      };

      // verify the witness signature
      assertValidSignedClaim(signedClaim, witnesses);
    } catch (e: Error | unknown) {
      console.error(e);
      return false;
    }

    return true;
  }
}

class ReclaimVerficationRequest {
  onSuccessCallback?: (data: Proof | Error | unknown) => void | unknown;
  onFailureCallback?: (data: Proof | Error | unknown) => void | unknown;
  providers: ProviderV2[];
  appCallbackUrl: string;
  reclaimDeepLink?: string;
  sessionId?: string;

  constructor(
    providers: ProviderV2[],
    appCallbackUrl: string,
    reclaimDeepLink: string,
    sessionId: string
  ) {
    this.providers = providers;
    this.appCallbackUrl = appCallbackUrl;
    this.reclaimDeepLink = reclaimDeepLink;
    this.sessionId = sessionId;
  }

  on(
    event: string,
    callback: (data: Proof | Error | unknown) => void | unknown
  ) {
    if (event === 'success') {
      this.onSuccessCallback = callback;
    }
    if (event === 'error') {
      this.onFailureCallback = callback;
    }
    return this;
  }

  async start() {
    if (this.reclaimDeepLink) {
      await Linking.openURL(this.reclaimDeepLink);
    }
  }
}
