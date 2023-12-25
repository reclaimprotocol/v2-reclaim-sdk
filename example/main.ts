import { Reclaim } from "../src/Reclaim";
import { ReclaimRequest } from "../src/interfaces";

function CallbackHandler(proof: any, error: any) {
    if (error) {
        console.log(error)
        return
    }
    console.log('Proof received')
    console.log(proof)
}

function main() {

    const request: ReclaimRequest = {
        title: "Test",
        requestedProofs: [
            {
                name: "Test",
                provider: {
                    url: "https://test.com",
                    method: "GET",
                    responseRedactions: [
                        {
                            xPath: "test",
                            jsonPath: "test",
                            regex: "test"
                        }
                    ],
                    responseMatches: [
                        {
                            type: "regex",
                            value: "test"
                        }
                    ]
                }
            }
        ]
    }


    const reclaim = new Reclaim()
    const templateWithLink = reclaim.requestProof(request, CallbackHandler, "https://test.com");
    console.log(templateWithLink)

}


main();