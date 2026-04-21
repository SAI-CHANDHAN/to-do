import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      console.log("OAuth token received:", token);
      localStorage.setItem("token", token);
      navigate("/dashboard");
    } else {
      console.error("No token found in OAuth redirect");
      navigate("/login");
    }
  }, [location, navigate]);

  return <div>Logging you in...</div>;
};

export default OAuthSuccess;
