'use client'
import React, { useEffect } from 'react'

import { ReclaimClient } from 'v2-reclaim-sdk'
import { useQRCode } from 'next-qrcode'

export default function Home () {
  const APP_ID = '0xa1da33c9ed80e050130abe3482bc05ae82dab512'
  const reclaimClient = new ReclaimClient(APP_ID)
  const [verificationReq, setVerificationReq] = React.useState<any>(null)
  const [extracted, setExtracted] = React.useState<any>(null)
  const { Canvas } = useQRCode()
  useEffect(() => {
    const getVerificationReq = async () => {
      const providers = ['Steam Username V2']
      const PRIVATE_KEY =
        '016179b9820f8bb49972208e4ab4ef165bb57190888bff53e5f47c440696c13a'

      const providerV2 = await reclaimClient.buildHttpProviderV2ByName(
        providers
      )

      const requestProofs = await reclaimClient.buildRequestedProofs(
        providerV2,
        await reclaimClient.getAppCallbackUrl()
      )

      reclaimClient.setSignature(
        await getSignature(requestProofs, PRIVATE_KEY) // in prod, getSignature will retrieve signature from backend
      )

      const req = await reclaimClient.createVerificationRequest(providers)
      console.log('req', req.template)
      req.on('success', (data: any) => {
        if (data) {
          const proof = data
          console.log('success', proof.extractedParameterValues)

          setExtracted(JSON.stringify(proof.extractedParameterValues))
        }
      })
      setVerificationReq(req)
      await req.start()
    }

    const getSignature = async (requestProofs: any, appSecret: string) => {
      const signature = await reclaimClient.getSignature(
        requestProofs,
        appSecret
      )
      return signature
    }

    getVerificationReq()
  }, [])

  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      
      <div className='max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex'>
        Reclaim DEMO
        { verificationReq && (
          <Canvas
            text={verificationReq.template}
            options={{
              errorCorrectionLevel: 'M',
              margin: 3,
              scale: 10,
              width: 400,
              color: {
                dark: '#010599FF',
                light: '#1f1'
              }
            }}
          />)
          }
          {
            extracted && (
              <div className='text-center'>
                <h1 className='text-5xl'>
                  {extracted}
                </h1>
              </div>
            )
          }
        
      </div>
    </main>
  )
}
