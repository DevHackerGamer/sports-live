// src/config/clerkAppearanceGlass.js
const clerkAppearanceGlass = {
  layout: {
    logoPlacement: "none",
    socialButtonsVariant: "iconButton",
    helpPageUrl: "https://support.sportslive.com",
  },
  variables: {
    colorPrimary: "#e63946",
    colorText: "#f5f5f5",
    colorBackground: "rgba(30, 30, 30, 0.8)",
    colorInputBackground: "rgba(255, 255, 255, 0.1)",
    colorNeutral: "rgba(255, 255, 255, 0.1)",
    fontFamily: "'Arial', sans-serif",
    borderRadius: "12px",
  },
  elements: {
    card: {
      backgroundColor: "rgba(30, 30, 30, 0.6)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      padding: "32px",
      maxWidth: "420px",
    },
    formButtonPrimary: {
      backgroundColor: "var(--primary)",
      background: "var(--gradient-primary)",
      color: "#fff",
      border: "none",
      borderRadius: "var(--radius-md)",
      fontWeight: "600",
      fontSize: "14px",
      padding: "12px 24px",
      transition: "var(--transition)",
      boxShadow: "var(--shadow-md)",
    },
    formButtonPrimary__hover: {
      backgroundColor: "var(--primary-dark)",
      background: "linear-gradient(135deg, var(--primary-dark), var(--primary))",
      transform: "translateY(-2px)",
      boxShadow: "var(--shadow-lg)",
    },
    footerActionLink: {
      color: "var(--primary-light)",
      fontWeight: "500",
      transition: "var(--transition)",
    },
    footerActionLink__hover: {
      color: "var(--accent)",
    },
    headerTitle: {
      color: "#f5f5f5",
      fontWeight: "700",
      fontSize: "1.5rem",
      textAlign: "center",
      marginBottom: "8px",
    },
    headerSubtitle: {
      color: "rgba(245, 245, 245, 0.8)",
      textAlign: "center",
    },
    formFieldInput: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "var(--radius-md)",
      color: "#f5f5f5",
      padding: "12px 16px",
      transition: "var(--transition)",
      backdropFilter: "blur(10px)",
    },
    formFieldInput__focus: {
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderColor: "var(--primary)",
      boxShadow: "0 0 0 3px rgba(230, 57, 70, 0.2)",
      transform: "translateY(-1px)",
    },
    socialButtonsBlockButton: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "var(--radius-md)",
      color: "#f5f5f5",
      backdropFilter: "blur(10px)",
      transition: "var(--transition)",
    },
    socialButtonsBlockButton__hover: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderColor: "rgba(255, 255, 255, 0.3)",
      transform: "translateY(-2px)",
      boxShadow: "var(--shadow-md)",
    },
    dividerLine: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    dividerText: {
      color: "rgba(245, 245, 245, 0.7)",
      backgroundColor: "rgba(30, 30, 30, 0.8)",
    },
    formFieldLabel: {
      color: "rgba(245, 245, 245, 0.9)",
    },
    identityPreviewEditButton: {
      color: "var(--primary-light)",
    },
  },
};

export default clerkAppearanceGlass;