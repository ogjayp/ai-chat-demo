"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

export function AuthButtons() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="h-8 w-24" />;
  }

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "size-8",
          },
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button type="button" variant="ghost">
          Log in
        </Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button type="button">Sign up</Button>
      </SignUpButton>
    </div>
  );
}
