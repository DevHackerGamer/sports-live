// src/components/auth/SignInPage.jsx
import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import GlassAuthLayout from './GlassAuthLayout';
import clerkAppearanceGlass from '../../config/clerkAppearanceGlass';

function SignInPage() {
  return (
    <GlassAuthLayout>
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        appearance={clerkAppearanceGlass}
      />
    </GlassAuthLayout>
  );
}

export default SignInPage;