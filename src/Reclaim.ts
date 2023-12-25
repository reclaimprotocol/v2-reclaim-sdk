import { v4 } from 'uuid';
import { Template, ReclaimRequest, IReclaim, TemplateWithLink } from "./interfaces";
import { isValidURL } from './utils';
import { APP_CLIP_LINK } from './config';


export class Reclaim implements IReclaim {

    public timers: Map<string, NodeJS.Timer> = new Map()

    constructor(private accessKey?: string) { }

    requestProof(request: ReclaimRequest, CallbackHandler: (proof: any, error: any) => void, AppCallbackUrl?: string): TemplateWithLink {

        // Default callbackUrl to a hosted URL if AppCallbackUrl is not provided
        let callbackUrl = AppCallbackUrl || 'https://hosted.reclaimprotocol.com';
        const sessionKey = v4();

        // If AppCallbackUrl is not provided, modify the callbackUrl with accessKey and sessionKey
        if (AppCallbackUrl === undefined) {
            const accessKey = this.getAccessKey();
            callbackUrl = `${callbackUrl}/?accessKey=${accessKey}&sessionKey=${sessionKey}`;
        }

        // Check if the final callbackUrl is a valid URL
        if (!isValidURL(callbackUrl)) {
            throw new Error("Invalid AppCallbackUrl format");
        }

        // Generate a unique ID for the template
        const id = v4();
        const requestedProofs = request.requestedProofs;
        const context = JSON.stringify({
            contextMessage: request.contextMessage || '',
            contextAddress: request.contextAddress || '0x0'
        });

        // Create the template object with the provided information
        const template: Template = {
            id: id,
            name: request.title,
            callbackUrl: callbackUrl,
            claims: requestedProofs,
            context,
            requestorSignature: request.requestorSignature,
        };

        // Generate a link for the template
        const link = APP_CLIP_LINK + encodeURIComponent(JSON.stringify(template));

        // Set up a timer to periodically check the callbackUrl for a response
        const intervalId = setInterval(async () => {
            try {
                console.log('Checking callbackUrl for proof...');
                const response = await fetch(callbackUrl);
                if (response.ok) {
                    const proofs = await response.json();
                    // If the response is successful, trigger the callback and stop the timer
                    CallbackHandler(proofs, undefined);
                    clearInterval(this.timers.get(sessionKey));
                }
            } catch (error) {
                // If the response is not successful, trigger the callback with an error and stop the timer
                CallbackHandler(undefined, error);
                clearInterval(this.timers.get(sessionKey));
            }
        }, 3000);

        this.timers.set(sessionKey, intervalId);

        // Return the template and link
        return { template, link };
    }

    // Method to get the access key, defaulting to an empty string if not provided
    getAccessKey(): string {
        return this.accessKey || '';
    }
}
