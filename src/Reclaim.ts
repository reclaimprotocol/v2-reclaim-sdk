import { uuid } from 'uuidv4';
import { Template, ReclaimRequest, IReclaim, TemplateWithLink } from "./interfaces";
import { isValidURL } from './utils';
import { APP_CLIP_LINK } from './config';

export class Reclaim implements IReclaim {
    public timer?: number;

    // Constructor to initialize the accessKey property
    constructor(private accessKey?: string) { }

    // Method to request proof with a callback and optional custom AppCallbackUrl
    requestProof(request: ReclaimRequest, CallbackHandler: () => void, AppCallbackUrl?: string): TemplateWithLink {
        // Default callbackUrl to a hosted URL if AppCallbackUrl is not provided
        let callbackUrl = AppCallbackUrl || 'https://hosted.reclaimprotocol.com';

        // If AppCallbackUrl is not provided, modify the callbackUrl with accessKey and sessionKey
        if (AppCallbackUrl === undefined) {
            const accessKey = this.getAccessKey();
            const sessionKey = uuid();
            callbackUrl = `${callbackUrl}/?accessKey=${accessKey}&sessionKey=${sessionKey}`;
        }

        // Check if the final callbackUrl is a valid URL
        if (!isValidURL(callbackUrl)) {
            throw new Error("Invalid AppCallbackUrl format");
        }

        // Generate a unique ID for the template
        const id = uuid();
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
        this.timer = setInterval(async () => {
            const response = await fetch(callbackUrl);
            if (response.ok) {
                // If the response is successful, trigger the callback and stop the timer
                CallbackHandler();
                clearInterval(this.timer);
            }
        }, 3000);

        // Return the template and link
        return { template, link };
    }

    // Method to get the access key, defaulting to an empty string if not provided
    getAccessKey(): string {
        return this.accessKey || '';
    }
}
