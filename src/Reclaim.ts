import type { ProviderV2, Proof, RequestedProofs, Context, RequestedClaim } from './interfaces'
import { getIdentifierFromClaimInfo } from './witness'
import type { SignedClaim } from './types'
import { v4 } from 'uuid'
import { ethers } from 'ethers'
import canonicalize from 'canonicalize'
import { getWitnessesForClaim, assertValidSignedClaim } from './utils'

const DEFAULT_RECLAIM_CALLBACK_URL =
    'https://api.reclaimprotocol.org/v2/callback?callbackId='
const DEFAULT_RECLAIM_STATUS_URL =
    'https://api.reclaimprotocol.org/v2/session/'
const RECLAIM_SHARE_URL = 'https://share.reclaimprotocol.org/instant/?template='

export class ReclaimClient {
    applicationId: string
    signature?: string
    appCallbackUrl?: string
    statusUrl?: string
    sessionId: string = ''
    requestedProofs?: RequestedProofs
    context: Context = { contextAddress: '0x0', contextMessage: '' }
    verificationRequest?: ReclaimVerficationRequest

    constructor(applicationId: string, sessionId?: string) {
        this.applicationId = applicationId
        if (sessionId) {
            this.sessionId = sessionId
        } else {
            this.sessionId = v4().toString()
        }
    }

    async createVerificationRequest(providers: string[]) {
        const template = await this.createLinkRequest(providers)
        this.verificationRequest = new ReclaimVerficationRequest(
            this.sessionId,
            this.getStatusUrl(),
            template
        )

        return this.verificationRequest
    }

    async createLinkRequest(providers: string[]) {
        const appCallbackUrl = await this.getAppCallbackUrl()
        const providersV2 = await this.buildHttpProviderV2ByName(providers)
        if (!this.requestedProofs) {
            await this.buildRequestedProofs(providersV2, appCallbackUrl)
        }

        if (!this.signature) {
            throw new Error('Signature is not set')
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
            .toLowerCase()

        if (ethers.getAddress(appId) !== ethers.getAddress(this.applicationId)) {
            throw new Error('Invalid signature')
        }


        const templateData = { ...this.requestedProofs, signature: this.signature }
        const template = `${RECLAIM_SHARE_URL}${encodeURIComponent(
            JSON.stringify(templateData)
        )}`

        return template
    }

    setAppCallbackUrl(url: string) {
        this.appCallbackUrl = url
    }

    async getAppCallbackUrl() {
        let appCallbackUrl = this.appCallbackUrl
        if (!appCallbackUrl) {
            appCallbackUrl = `${DEFAULT_RECLAIM_CALLBACK_URL}${this.sessionId}`
        }
        return appCallbackUrl
    }

    setStatusUrl(url: string) {
        this.statusUrl = url
    }

    getStatusUrl() {
        let statusUrl = this.statusUrl
        if (!statusUrl) {
            statusUrl = `${DEFAULT_RECLAIM_STATUS_URL}${this.sessionId}`
        }
        return statusUrl
    }

    setSignature(signature: string) {
        this.signature = signature
    }

    // @dev Use this function only in development environments
    async getSignature(
        requestedProofs: RequestedProofs,
        applicationSecret: string
    ): Promise<string> {
        const wallet = new ethers.Wallet(applicationSecret)
        const signature = await wallet.signMessage(
            ethers.getBytes(
                ethers.keccak256(
                    new TextEncoder().encode(canonicalize(requestedProofs)!)
                )
            )
        )

        return signature
    }

    async buildHttpProviderV2ByName(
        providerNames: string[]
    ): Promise<ProviderV2[]> {
        try {
            const reclaimServerUrl =
                'https://api.reclaimprotocol.org/get/httpsproviders'
            const response = await fetch(reclaimServerUrl)

            if (!response.ok) {
                throw new Error('Failed to fetch HTTP providers')
            }

            const providers = (await response.json()).providers as ProviderV2[]

            const filteredProviders = providers.filter(provider => {
                return providerNames.includes(provider.name)
            })

            return filteredProviders
        } catch (error) {
            console.error('Error fetching HTTP providers:', error)
            throw error
        }
    }

    buildRequestedProofs(
        providers: ProviderV2[],
        callbackUrl: string,
        statusUrl?: string
    ): RequestedProofs {
        const claims = providers.map(provider => {
            return {
                provider: provider.name,
                context: JSON.stringify(this.context),
                templateClaimId: provider.id,
                payload: {
                    metadata: {
                        name: provider.name,
                        logoUrl: provider.logoUrl
                    },
                    url: provider.url,
                    urlType: provider.urlType as "CONSTANT" | "REGEX",
                    method: provider.method as "GET" | "POST",
                    login: {
                        url: provider.loginUrl
                    },
                    parameters: {},
                    responseSelections: provider.responseSelections,
                    customInjection: provider.customInjection,
                    bodySniff: provider.bodySniff,
                    userAgent: provider.userAgent,
                    useZk: true
                }
            } as RequestedClaim;
        });

        this.requestedProofs = {
            id: v4().toString(),
            sessionId: this.sessionId,
            name: 'web-SDK',
            callbackUrl: callbackUrl,
            statusUrl: statusUrl ? statusUrl : this.getStatusUrl(),
            claims: claims
        };

        return this.requestedProofs!;
    }

    addContext(address: string, message: string) {
        // TODO: sync data on backend
        this.context = {
            contextAddress: address,
            contextMessage: message
        }
        return this.context
    }

    static async verifySignedProof(proof: Proof) {
        if (!proof.signatures.length) {
            throw new Error('No signatures')
        }
        const witnesses = await getWitnessesForClaim(
            proof.claimData.epoch,
            proof.identifier,
            proof.claimData.timestampS
        )

        try {
            // then hash the claim info with the encoded ctx to get the identifier
            const calculatedIdentifier = getIdentifierFromClaimInfo({
                parameters: JSON.parse(
                    canonicalize(proof.claimData.parameters) as string
                ),
                provider: proof.claimData.provider,
                context: proof.claimData.context
            })
            proof.identifier = proof.identifier.replace('"', '')
            proof.identifier = proof.identifier.replace('"', '')
            // check if the identifier matches the one in the proof
            if (calculatedIdentifier !== proof.identifier) {
                throw new Error('Identifier Mismatch')
            }

            const signedClaim: SignedClaim = {
                claim: {
                    ...proof.claimData
                },
                signatures: proof.signatures.map(signature => {
                    return ethers.getBytes(signature)
                })
            }

            // verify the witness signature
            assertValidSignedClaim(signedClaim, witnesses)
        } catch (e: Error | unknown) {
            console.error(e)
            return false
        }

        return true
    }
}

class ReclaimVerficationRequest {
    onSuccessCallback?: (data: Proof | Error | unknown) => void | unknown
    onFailureCallback?: (data: Proof | Error | unknown) => void | unknown
    sessionId: string
    template: string
    statusUrl: string
    intervals: Map<string, NodeJS.Timer> = new Map()

    constructor(sessionId: string, statusUrl: string, template: string) {
        this.sessionId = sessionId
        this.statusUrl = statusUrl
        this.template = template
    }

    on(
        event: string,
        callback: (data: Proof | Error | unknown) => void | unknown
    ) {
        if (event === 'success') {
            this.onSuccessCallback = callback
        }
        if (event === 'error') {
            this.onFailureCallback = callback
        }
        return this
    }

    async start() {
        if (this.statusUrl && this.sessionId) {
            const interval = setInterval(async () => {
                try {
                    const res = await fetch(this.statusUrl)
                    const data = await res.json()

                    if (!data.session) return

                    data.session.proofs.forEach(async (proof: Proof) => {
                        const verified = await ReclaimClient.verifySignedProof(proof)
                        if (!verified) {
                            throw new Error('Proof not verified')
                        }
                    })
                    if (this.onSuccessCallback) {
                        this.onSuccessCallback(data.session.proofs)
                    }
                    clearInterval(this.intervals.get(this.sessionId!))
                } catch (e: Error | unknown) {
                    if (this.onFailureCallback) {
                        this.onFailureCallback(e)
                    }
                    clearInterval(this.intervals.get(this.sessionId!))
                }
            }, 3000)
            this.intervals.set(this.sessionId, interval)
            return this.template
        }
    }
}
