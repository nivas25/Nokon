"use client"

import { useState, useTransition } from "react"
import { updateProfile } from "@/app/dashboard/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, CheckCircle2, Store, Globe, Bot, ShieldCheck, Save } from "lucide-react"

export type SellerProfile = {
  id: string
  email?: string | null
  full_name: string
  store_name: string
  niche: string
  phone_number: string
  address: string | null
  youtube_handle: string | null
  instagram_handle: string | null
  whatsapp_phone_number_id?: string | null
  global_agent_prompt: string | null
  created_at?: string | null
}

export function SettingsView({ seller }: { seller: SellerProfile }) {
  const [isPending, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      try {
        await updateProfile(formData)
        setSuccessMessage("Settings saved successfully!")
        setTimeout(() => setSuccessMessage(null), 3500)
      } catch (err: any) {
        alert(err.message || "Failed to update settings")
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="space-y-1.5 pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 font-medium">
          Manage your store profile, AI agent, and connected social accounts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Success Notification */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3.5 rounded-xl flex items-center gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Store Information */}
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Store className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg text-slate-900">Store Information</CardTitle>
            </div>
            <CardDescription className="text-slate-500 mt-1">
              Update your brand and contact details shown to customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label htmlFor="storeName" className="font-semibold text-slate-700">Store Name</Label>
                <Input 
                  id="storeName" 
                  name="storeName" 
                  defaultValue={seller.store_name || ""} 
                  required 
                  className="rounded-lg h-11 bg-slate-50/50 focus:bg-white" 
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="niche" className="font-semibold text-slate-700">Category / Niche</Label>
                <Input 
                  id="niche" 
                  name="niche" 
                  defaultValue={seller.niche || ""} 
                  required 
                  className="rounded-lg h-11 bg-slate-50/50 focus:bg-white" 
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="fullName" className="font-semibold text-slate-700">Owner Name</Label>
                <Input 
                  id="fullName" 
                  name="fullName" 
                  defaultValue={seller.full_name || ""} 
                  required 
                  className="rounded-lg h-11 bg-slate-50/50 focus:bg-white" 
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="phoneNumber" className="font-semibold text-slate-700">Support Phone (WhatsApp)</Label>
                <Input 
                  id="phoneNumber" 
                  name="phoneNumber" 
                  defaultValue={seller.phone_number || ""} 
                  required 
                  className="rounded-lg h-11 bg-slate-50/50 focus:bg-white font-mono text-sm" 
                />
              </div>
            </div>
            <div className="space-y-2.5 pt-2">
              <Label htmlFor="address" className="font-semibold text-slate-700">Business Address</Label>
              <Textarea 
                id="address" 
                name="address" 
                defaultValue={seller.address || ""} 
                rows={3} 
                className="rounded-lg resize-none bg-slate-50/50 focus:bg-white leading-relaxed" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Connected Channels */}
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Globe className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg text-slate-900">Connected Channels</CardTitle>
            </div>
            <CardDescription className="text-slate-500 mt-1">
              Link your social profiles and API integration identifiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label htmlFor="youtubeHandle" className="font-semibold text-slate-700">YouTube Handle</Label>
                <Input 
                  id="youtubeHandle" 
                  name="youtubeHandle" 
                  defaultValue={seller.youtube_handle || ""} 
                  placeholder="@storename" 
                  className="rounded-lg h-11 bg-slate-50/50 focus:bg-white" 
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="instagramHandle" className="font-semibold text-slate-700">Instagram Handle</Label>
                <Input 
                  id="instagramHandle" 
                  name="instagramHandle" 
                  defaultValue={seller.instagram_handle || ""} 
                  placeholder="@storename_official" 
                  className="rounded-lg h-11 bg-slate-50/50 focus:bg-white" 
                />
              </div>
              <div className="space-y-2.5 md:col-span-2">
                <Label htmlFor="whatsappPhoneNumberId" className="font-semibold text-slate-700">Meta WhatsApp Phone Number ID</Label>
                <Input 
                  id="whatsappPhoneNumberId" 
                  name="whatsappPhoneNumberId" 
                  defaultValue={seller.whatsapp_phone_number_id || ""} 
                  placeholder="e.g. 109283746501928" 
                  className="rounded-lg h-11 bg-slate-50/50 focus:bg-white font-mono text-sm max-w-md" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Sales Agent Brain */}
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                <Bot className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg text-slate-900">AI Agent Persona</CardTitle>
            </div>
            <CardDescription className="text-slate-500 mt-1">
              Provide system instructions that define how your automated assistant behaves.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2.5">
              <Label htmlFor="globalAgentPrompt" className="font-semibold text-slate-700">Agent Instructions (System Prompt)</Label>
              <Textarea 
                id="globalAgentPrompt" 
                name="globalAgentPrompt" 
                defaultValue={seller.global_agent_prompt || ""} 
                rows={6}
                placeholder="You are a helpful and polite sales assistant for our store. Provide quick, accurate answers..."
                className="rounded-lg bg-slate-50/50 focus:bg-white leading-relaxed font-sans"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg text-slate-900">Account Credentials</CardTitle>
            </div>
            <CardDescription className="text-slate-500 mt-1">
              Your read-only technical identifiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              <div className="space-y-2.5">
                <Label className="font-semibold text-slate-700">Account Email</Label>
                <Input 
                  value={seller.email || ""} 
                  disabled 
                  className="rounded-lg h-11 bg-slate-100 cursor-not-allowed text-slate-500" 
                />
              </div>
              <div className="space-y-2.5">
                <Label className="font-semibold text-slate-700">System Seller ID</Label>
                <Input 
                  value={seller.id} 
                  disabled 
                  className="rounded-lg h-11 bg-slate-100 cursor-not-allowed text-slate-500 font-mono text-sm" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Floating / Bottom Action Bar */}
        <div className="flex items-center justify-end pt-4 pb-12">
          <Button 
            type="submit" 
            disabled={isPending}
            className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm font-semibold text-base transition-all active:scale-[0.98]"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
