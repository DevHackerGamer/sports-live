// src/components/auth/SignUpPage.jsx
import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import GlassAuthLayout from './GlassAuthLayout';
import clerkAppearanceGlass from '../../config/clerkAppearanceGlass';

function SignUpPage() {
  return (
    <GlassAuthLayout>
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard/home"
        appearance={clerkAppearanceGlass}
      />
    </GlassAuthLayout>
  );
}

export default SignUpPage;