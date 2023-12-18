# Reclaim SDK v2

Designed to request proofs from the Reclaim protocol and manage the flow of claims and witness interactions.

## Interfaces:

- ### Reclaim Interface

  - #### `requestProof(request: ProofRequest, AppCallbackUrl: string): Template`

    Requests proof using the provided proof request.

    **Parameters:**

    - `request`: ProofRequest (The proof request object)
    - `AppCallbackUrl`: callback url which will receive the proof from AppClip/InstantApp

    **Returns:**

    - `Template`: A template instance based on the proof request.

- ### ProofRequest Interface

  - **title:** `string` - Title of the request
  - **requestedProofs:** `ProviderV2[]` - Proofs requested by the application
  - **contextMessage?:** `string` - Context message for the proof request
  - **contextAddress?:** `string` - Context address for the proof request
  - **requestorSignature?:** `string` - Signature of the requestor

- ### Template Interface:

  - **id:** `string`
  - **sessionId:** `string`
  - **name:** `string`
  - **callbackUrl:** `string`
  - **claims:** `Claim[]`
  - **requestorAddress?:** `string`
  - **requestorPublicKey?:** `string`

- ### Claim Interface:

  - **templateClaimId:** `string`
  - **context:** `string`
  - **provider:** `ProviderParams`

- ### ProviderParams Interface:

  - **provider:** `string` - The provider type, e.g google-login
  - **payload:** `Map<string, Object>` - The payload corresponding to the provider type

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
