import { uuid } from 'uuidv4';
import { Template, ReclaimRequest, IReclaim, TemplateWithLink } from "./interfaces";
import { isValidURL } from './utils';
import { APP_CLIP_LINK } from './config';

export class Reclaim implements IReclaim {
    requestProof(request: ReclaimRequest, AppCallbackUrl: string): TemplateWithLink {
        if (!isValidURL(AppCallbackUrl)) {
            throw new Error("Invalid AppCallbackUrl format");
        }
        const id = uuid();
        const requestedProofs = request.requestedProofs;
        const context = JSON.stringify({
            contextMessage: request.contextMessage || '',
            contextAddress: request.contextAddress || '0x0'
        });

        const template: Template = {
            id: id,
            name: request.title,
            callbackUrl: AppCallbackUrl,
            claims: requestedProofs,
            context,
            requestorSignature: request.requestorSignature,
        };
        const link = APP_CLIP_LINK + encodeURIComponent(JSON.stringify(template));

        return { template, link };
    }
}
