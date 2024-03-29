# Reclaim SDK v2

Designed to request proofs from the Reclaim protocol and manage the flow of claims and witness interactions.

## Interfaces:

- ### Reclaim Interface

  - #### `requestProof(request: ReclaimRequest, AppCallbackUrl: string): TemplateWithLink`

    Requests proof using the provided proof request.

    **Parameters:**

    - `request`: ReclaimRequest (The proof request object)
    - `AppCallbackUrl`: callback url which will receive the proof from AppClip/InstantApp

    **Returns:**

    - `TemplateWithLink`: A link to AppClip/AppInstant with Template Data

- ### ReclaimRequest Interface

  - **title:** `string` - Title of the request
  - **requestedProofs:** `RequestedProof[]` - Proofs requested by the application
  - **contextMessage?:** `string` - Context message for the proof request
  - **contextAddress?:** `string` - Context address for the proof request
  - **requestorSignature?:** `string` - Signature of the requestor

- ### RequestedProof interface

  - **name:** `string` - Title of the request
  - **provider:** `ProviderV2` - Proof requested by the application
  - **metadata**: {logoUri?: string, description?: string} - Metadata of the proof provider

- ### TemplateWithLink Interface:

  - **template**: `Template`
  - **link**: `string`

- ### Template Interface:

  - **id:** `string`
  - **name:** `string`
  - **callbackUrl:** `string`
  - **claims:** `RequestedProof[]`
  - **context:** `string`
  - **requestorSignature?:** `string`

- ### ProviderV2 Interface:

  - **headers?:** `Map<string, string>` _(Any additional headers to be sent with the request)_
  - **url:** `string` _(URL to make the request to, e.g., "https://amazon.in/orders?q=abcd")_
  - **method:** `'GET' | 'POST'` _(HTTP method)_
  - **body?:** `string | Uint8Array` _(Body of the request, used only if the method is POST)_
  - **responseRedactions:** `ResponseRedaction[]` _(Portions to select from a response for redaction)_
  - **responseMatches:** `ResponseMatch[]` _(List to check that the redacted response matches provided strings/regexes)_
  - **geoLocation?:** `string` \_(Geographical location from where to proxy the request)

- ### ResponseRedaction Interface:

  - **xPath?:** `string` _(XPath for HTML response)_
  - **jsonPath?:** `string` _(JSONPath for JSON response)_
  - **regex?:** `string` _(Regex for response matching)_

- ### ResponseMatch Interface:

  - **type:** `'regex' | 'contains'` _("regex" or "contains" indicating the matching type)_
  - **value:** `string` _(The string/regex to match against)_

## Usage Flow

<img src='./readme/usage-flow-3.svg' width='900' />

## Dependency Diagram

<img src='./readme/depemdency-diagram.svg' width='600' />

## Error Codes

- `Malformed proof request`: The proof request is structurally incorrect or missing required elements.

- `Invalid AppCallbackUrl format`: The provided AppCallbackUrl is not in the expected format.

## Create ProofRequest Example

```typescript
const privateKey = 'YOUR_PRIVATE_KEY'

const proofRequest: ProofRequest = {
  title: 'Example Proof Request',
  requestedProofs: [
    {
      url: 'https://api.example.com/data',
      method: 'GET',
      responseRedactions: [
        { start: 10, end: 20 },
        { start: 30, end: 40 }
      ],
      responseMatches: [
        { type: 'string', value: 'important-data' },
        { type: 'regex', pattern: '\\d{3}-\\d{2}-\\d{4}' }
      ],
      geoLocation: '37.7749,-122.4194'
    }
  ],
  contextMessage: 'Please provide the necessary proofs for verification.',
  contextAddress: '0x0'
}

const dataToSign = JSON.stringify(proofRequest)

const signature = signData(dataToSign, privateKey)

const proofRequestWithSignature: ProofRequest = {
  ...proofRequestWithoutSensitiveHeaders,
  requestorSignature: signature
}

// Send the proof request to the AppClip/InstantApp
// Verify the signature on the AppClip side
const isSignatureValid = verifySignature(dataToSign, signature)
```
