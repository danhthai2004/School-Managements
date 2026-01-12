import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";

export default function GoogleLoginButton({
  onIdToken,
  onError,
}: {
  onIdToken: (idToken: string) => void;
  onError?: (msg: string) => void;
}) {
  const handleSuccess = (credentialResponse: CredentialResponse) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      onError?.("Không nhận được Google credential.");
      return;
    }
    onIdToken(idToken);
  };

  return (
    <div className="flex justify-center">
      <GoogleLogin onSuccess={handleSuccess} onError={() => onError?.("Google Login Failed")} />
    </div>
  );
}
