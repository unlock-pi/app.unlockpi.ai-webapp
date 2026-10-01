"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/client";
import { getSafeRedirectTarget } from "@/lib/safe-redirect";
import LogInForm from "./login-form";
import SignUpForm from "./signup-form";
import Typewriter from "@/components/typewriter-text";
import { AuthFormContainerProps, AuthPageProps } from "../types/auth.types";
import { getAuthErrorMessage, withAuthTimeout } from "../lib/auth-errors";
import {
  ONBOARDING_QUERY_PARAM,
  ONBOARDING_QUERY_VALUE,
} from "@/features/onboarding/lib/onboarding-tour";


const defaultSignInContent = {
  image: {
    src: "/light-down.jpg",
    alt: "A beautiful interior design for sign-in",
  },
  quote: {
    text: "Welcome Back! ",
    author: "UnlockPi AI",
  },
};

const defaultSignUpContent = {
  image: {
    src: "https://i.ibb.co/HTZ6DPsS/original-33b8479c324a5448d6145b3cad7c51e7-removebg-preview.png",
    alt: "A vibrant, modern space for new beginnings",
  },
  quote: {
    text: "Create an account. A new chapter awaits.",
    author: "EaseMize UI",
  },
};






function AuthFormContainer({
  isSignIn,
  onToggle,
  isSubmitting,
  error,
  onSignIn,
  onSignUp,
}: AuthFormContainerProps) {
  return (
    <div className="mx-auto grid w-[350px] gap-2">
      {isSignIn ? (
        <LogInForm
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={onSignIn}
        />
      ) : (
        <SignUpForm
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={onSignUp}
        />
      )}

      {/* <div className="text-center text-sm">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
        <Button
          variant="link"
          className="pl-1 text-foreground"
          onClick={onToggle}
          type="button"
          disabled={isSubmitting}
        >
          {isSignIn ? "Sign up" : "Sign in"}
        </Button>
      </div>

      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          Or continue with
        </span>
      </div>

      <Button variant="outline" type="button" disabled>
        <img
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          alt="Google icon"
          className="mr-2 h-4 w-4"
        />
        Continue with Google
      </Button> */}
    </div>
  );
}

export function AuthPage({
  signInContent = {},
  signUpContent = {},
}: AuthPageProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to send the user once they're signed in — the route they
  // originally asked for before the auth gate bounced them here, or
  // /dashboard if there wasn't one (e.g. they landed on /auth/login
  // directly). Validated so a crafted `redirectTo` can't send them off-site.
  const redirectTarget = getSafeRedirectTarget(
    searchParams.get("redirectTo"),
    "/dashboard",
  );
  // A brand-new account with nowhere specific to be (no explicit
  // `redirectTo`, e.g. an invite link) lands on Projects with the
  // onboarding tour armed, rather than the generic dashboard home. An
  // explicit redirect is still honored — the tour just tags along.
  const signUpDestination = searchParams.get("redirectTo")
    ? redirectTarget
    : "/dashboard/projects";
  const signUpDestinationWithTour = `${signUpDestination}${
    signUpDestination.includes("?") ? "&" : "?"
  }${ONBOARDING_QUERY_PARAM}=${ONBOARDING_QUERY_VALUE}`;

  useEffect(() => {
    let isMounted = true;

    // Use getUser() (validated against Supabase) rather than getSession()
    // (cache-only from localStorage). A stale localStorage session would
    // otherwise bounce us to /dashboard, where the server's own getUser()
    // sees nothing valid and bounces us right back — an infinite loop.
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (user && !userError) {
          router.replace(redirectTarget);
        }
      } finally {
        if (isMounted) {
          setIsSubmitting(false);
        }
      }
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [redirectTarget, router]);

  const handleToggle = () => {
    setError(null);
    setIsSignIn((previous) => !previous);
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Clear any previous error messages
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const supabase = createClient();
      const { error: signInError } = await withAuthTimeout(
        supabase.auth.signInWithPassword({ email, password }),
      );

      if (signInError) {
        throw signInError;
      }

      router.replace(redirectTarget);
    } catch (unknownError) {
      setError(
        getAuthErrorMessage(
          unknownError,
          "Invalid email or password. Please try again.",
        ),
      );
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await withAuthTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        }),
      );

      if (signUpError) {
        throw signUpError;
      }

      if (!data.session) {
        setIsSignIn(true);
        setError(
          "Account created. Please check your email to verify your account, then sign in.",
        );
        setIsSubmitting(false);
        return;
      }

      router.replace(signUpDestinationWithTour);
    } catch (unknownError) {
      setError(
        getAuthErrorMessage(
          unknownError,
          "Could not create account. Please verify details and try again.",
        ),
      );
      setIsSubmitting(false);
    }
  };

  const currentContent = isSignIn
    ? {
        image: { ...defaultSignInContent.image, ...signInContent.image },
        quote: { ...defaultSignInContent.quote, ...signInContent.quote },
      }
    : {
        image: { ...defaultSignUpContent.image, ...signUpContent.image },
        quote: { ...defaultSignUpContent.quote, ...signUpContent.quote },
      };

  return (
    <div className="min-h-screen w-full md:grid md:grid-cols-2">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      <div className="flex h-screen items-center justify-center p-6 md:h-auto md:p-0 md:py-12">
        <AuthFormContainer
          isSignIn={isSignIn}
          onToggle={handleToggle}
          isSubmitting={isSubmitting}
          error={error}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
      </div>

      <div
        className="relative hidden bg-cover bg-center transition-all duration-500 ease-in-out md:block"
        style={{ backgroundImage: `url(${currentContent.image.src})` }}
        key={currentContent.image.src}
      >
        <div className="absolute inset-x-0 bottom-0 h-[100px] bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 flex h-full flex-col items-center justify-end p-2 pb-6">
          <blockquote className="space-y-2 text-center text-foreground">
            <p className="text-lg font-medium text-white!">
              <span aria-hidden="true">&ldquo;</span>
              <Typewriter
                key={currentContent.quote.text}
                text={currentContent.quote.text}
                speed={60}
              />
              <span aria-hidden="true">&rdquo;</span>
            </p>
            <cite className="block text-sm font-light text-muted-foreground not-italic">
              - {currentContent.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
