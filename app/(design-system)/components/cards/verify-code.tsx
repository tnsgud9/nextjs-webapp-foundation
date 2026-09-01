"use client"

import * as React from "react"
import { REGEXP_ONLY_DIGITS } from "input-otp"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Toaster, createToastManager } from "@/components/ui/toast"

const notifications = createToastManager()

export function VerifyCode() {
  const [code, setCode] = React.useState("")

  const verify = () => {
    if (code.length < 6) {
      notifications.add({
        type: "error",
        title: "Code incomplete",
        description: "Enter all six digits.",
      })
      return
    }
    notifications.add({
      type: "success",
      title: "Verified",
      description: `Code ${code} accepted.`,
    })
    setCode("")
  }

  return (
    <Toaster toastManager={notifications}>
      <Card>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Enter the six-digit code we sent you.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <InputOTP
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={code}
            onChange={setCode}
            aria-label="Verification code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              notifications.add({
                type: "info",
                title: "Code sent",
                description: "Check your inbox for a new code.",
              })
            }
          >
            Resend
          </Button>
          <Button className="flex-1" onClick={verify}>
            Verify
          </Button>
        </CardFooter>
      </Card>
    </Toaster>
  )
}
