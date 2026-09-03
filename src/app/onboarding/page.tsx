"use client"

import { useState, Suspense } from "react"
import { completeOnboarding } from "./actions"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

function OnboardingForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const [step, setStep] = useState(1)

  return (
    <Card className="w-full max-w-md shadow-xl shadow-slate-200/50 border-slate-200/60 rounded-2xl overflow-hidden relative">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 absolute top-0 left-0">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <CardHeader className="text-center pb-2 pt-8">
          <CardTitle className="text-2xl font-bold">Store Setup</CardTitle>
          <CardDescription className="text-base mt-1">
            {step === 1 && "Let's start with your basic details."}
            {step === 2 && "Link your social channels."}
            {step === 3 && "Configure your Seller Agent."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm mb-6 border border-destructive/20 text-center font-medium">
              {error}
            </div>
          )}

          <form action={completeOnboarding} id="onboarding-form">
            <div className="relative overflow-hidden min-h-[300px]">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex flex-col gap-4 absolute w-full"
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="fullName" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">Full Name</Label>
                      <Input id="fullName" name="fullName" required className="rounded-xl h-12 bg-slate-50/50" placeholder="Jane Doe" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="storeName" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">Store Name</Label>
                      <Input id="storeName" name="storeName" required className="rounded-xl h-12 bg-slate-50/50" placeholder="Saree Didi" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="niche" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">Store Niche</Label>
                      <Input id="niche" name="niche" required className="rounded-xl h-12 bg-slate-50/50" placeholder="Womens Ethnic Wear" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="phone" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">Primary Phone</Label>
                      <Input id="phone" name="phone" required className="rounded-xl h-12 bg-slate-50/50" placeholder="+91 9876543210" />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex flex-col gap-4 absolute w-full"
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="youtubeHandle" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">YouTube Handle</Label>
                      <Input id="youtubeHandle" name="youtubeHandle" className="rounded-xl h-12 bg-slate-50/50" placeholder="@sareedidi" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="youtubeUrl" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">YouTube Channel URL</Label>
                      <Input id="youtubeUrl" name="youtubeUrl" type="url" className="rounded-xl h-12 bg-slate-50/50" placeholder="https://youtube.com/@sareedidi" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="instagramHandle" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">Instagram Handle</Label>
                      <Input id="instagramHandle" name="instagramHandle" className="rounded-xl h-12 bg-slate-50/50" placeholder="sareedidi_official" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="address" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">Physical Address / City</Label>
                      <Input id="address" name="address" required className="rounded-xl h-12 bg-slate-50/50" placeholder="Mumbai, MH" />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex flex-col gap-4 absolute w-full"
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="agentPrompt" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">Agent Core Tone (Prompt)</Label>
                      <textarea 
                        id="agentPrompt" 
                        name="agentPrompt" 
                        required 
                        className="flex min-h-[160px] w-full rounded-xl border border-input bg-slate-50/50 px-3 py-3 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50" 
                        placeholder="You are Velvi, a friendly and polite seller for Saree Didi. You address buyers as 'didi' or 'ma'am' and always offer a 10% discount if they ask nicely." 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t border-slate-100 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setStep(step - 1)} 
            disabled={step === 1}
            className="rounded-xl font-semibold px-6"
          >
            Back
          </Button>
          
          {step < 3 ? (
            <Button 
              type="button" 
              onClick={() => setStep(step + 1)}
              className="rounded-xl font-semibold px-6 shadow-md"
            >
              Continue
            </Button>
          ) : (
            <Button 
              type="submit" 
              form="onboarding-form"
              className="rounded-xl font-semibold px-6 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Complete Setup
            </Button>
          )}
        </CardFooter>
      </Card>
  )
}

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <OnboardingForm />
      </Suspense>
    </main>
  )
}
