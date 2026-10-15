import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GoogleSignIn({ onLogin }) {
  const handleSuccess = async (response) => {
    try {
      if (!response.credential) {
        throw new Error("Google did not return a credential.");
      }

      const result = await axios.post(`${API_URL}/api/auth/google`, {
        credential: response.credential,
      });

        const { token, user } = result.data;
        console.log("CityPulse logged-in user:", user);

      if (!token || !user) {
        throw new Error("Backend did not return a token and user.");
      }

      // App.jsx updates the login state and stores the token.
      onLogin?.({ user, token });
    } catch (error) {
      console.error(
        "Google sign-in failed:",
        error.response?.data || error.message,
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Unable to sign in with Google. Please try again.",
      );
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => console.error("Google sign-in was unsuccessful.")}
      text="continue_with"
      shape="rectangular"
      theme="outline"
      width="280"
    />
  );
}
