import Link from "next/link"
import { signup } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const error = params.error as string | undefined

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl shadow-slate-200/50 border-slate-200/60 rounded-2xl">
        <CardHeader className="text-center pb-6">
          <img src="/logo.png" alt="Nokon Logo" className="h-14 w-14 rounded-2xl object-contain mx-auto mb-6 shadow-lg shadow-primary/20" />
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription className="text-base mt-2">
            Enter your details to get started
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm mb-6 border border-destructive/20 text-center font-medium">
              {error}
            </div>
          )}

          <form action={signup} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="rounded-xl h-12 px-4 bg-slate-50/50 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary"
                placeholder="seller@nokon.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-slate-500 uppercase tracking-wider text-xs font-semibold ml-1">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="rounded-xl h-12 px-4 bg-slate-50/50 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base mt-2 font-semibold shadow-md">
              Sign Up
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="justify-center border-t border-slate-100 pt-6">
          <Link
            href="/login"
            className="text-primary text-sm font-medium hover:underline underline-offset-4"
          >
            Already have an account? Sign in
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
