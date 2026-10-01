import { Button } from "@/components/ui/button";
import PasswordInput from "./password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFormProps } from "../types/auth.types";

export default function SignUpForm({ isSubmitting, error, onSubmit }: AuthFormProps) {
  return (
    <form onSubmit={onSubmit} autoComplete="on" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your details below to sign up
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1">
          <Label htmlFor="signup-name">Full Name</Label>
          <Input
            id="signup-name"
            name="name"
            type="text"
            placeholder="John Doe"
            required
            autoComplete="name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
            autoComplete="email"
          />
        </div>

        <PasswordInput
          name="password"
          label="Password"
          required
          autoComplete="new-password"
          placeholder="Password"
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </Button>
      </div>
    </form>
  );
}