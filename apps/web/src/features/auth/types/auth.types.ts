export type AuthFormProps = {
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export type AuthContentProps = {
  image?: {
    src: string;
    alt: string;
  };
  quote?: {
    text: string;
    author: string;
  };
};

export type AuthPageProps = {
  signInContent?: AuthContentProps;
  signUpContent?: AuthContentProps;
};




export type AuthFormContainerProps = {
  isSignIn: boolean;
  onToggle: () => void;
  isSubmitting: boolean;
  error: string | null;
  onSignIn: (event: React.FormEvent<HTMLFormElement>) => void;
  onSignUp: (event: React.FormEvent<HTMLFormElement>) => void;
};
