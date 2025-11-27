"use client";

import { WalletOutlined } from "@ant-design/icons";
import { useGetUserCredits } from "@hooks/api/useUsersService";
import { Card, Spin, Typography } from "antd";
import { CreditsService } from "../../lib/creditsService";

const { Text } = Typography;

interface CreditsDisplayProps {
  /**
   * Additional CSS classes for container
   */
  className?: string;
  /**
   * Styles for container
   */
  style?: React.CSSProperties;
  /**
   * Display size (small, default, large)
   */
  size?: "small" | "default" | "large";
  /**
   * Whether to show wallet icon
   */
  showIcon?: boolean;
  /**
   * Whether to use API for credits data instead of local user data
   */
  useApi?: boolean;
}

/**
 * Component for displaying user credits information
 * Can use either local user data or API data
 * Automatically checks display necessity based on user role
 */
export default function CreditsDisplay({
  className,
  style,
  size = "default",
  showIcon = false,
  useApi = true,
}: CreditsDisplayProps) {
  const { data: creditsInfo, isLoading, error } = useGetUserCredits({
    enabled: useApi,
  });

  // If using API and still loading
  if (useApi && isLoading) {
    return (
      <Card
        className={className}
        style={{
          background: "#1f1f1f",
          border: "1px solid #434343",
          borderRadius: "6px",
          padding: "8px 12px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          ...style,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Spin size="small" />
        <Text
          style={{
            color: "#8c8c8c",
            fontSize: "14px",
            margin: 0,
          }}
        >
          Loading...
        </Text>
      </Card>
    );
  }

  // If using API and there's an error
  if (useApi && error) {
    console.warn("Failed to load credits info:", error);
    return null;
  }

  // Check if credits should be displayed
  const shouldDisplay = useApi 
    ? CreditsService.shouldDisplayCreditsFromApi(creditsInfo)
    : false; // For API version, we only support API mode

  if (!shouldDisplay) {
    return null;
  }

  const credits = useApi 
    ? CreditsService.getUserCreditsFromApi(creditsInfo)
    : 0;

  const formattedCredits = CreditsService.formatCredits(credits);

  // Define sizes based on size prop
  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          fontSize: "12px",
          padding: "4px 8px",
          borderRadius: "4px",
          iconSize: 12,
        };
      case "large":
        return {
          fontSize: "16px",
          padding: "12px 16px",
          borderRadius: "8px",
          iconSize: 18,
        };
      default:
        return {
          fontSize: "14px",
          padding: "8px 12px",
          borderRadius: "6px",
          iconSize: 14,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Card
      className={className}
      style={{
        background: "#1f1f1f",
        border: "1px solid #434343",
        borderRadius: sizeStyles.borderRadius,
        padding: sizeStyles.padding,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        ...style,
      }}
      styles={{ body: { padding: 0 } }}
    >
      {showIcon && (
        <WalletOutlined
          style={{
            color: "#58bfce",
            fontSize: sizeStyles.iconSize,
          }}
        />
      )}
      <Text
        style={{
          color: "#d9d9d9",
          fontSize: sizeStyles.fontSize,
          fontWeight: "500",
          margin: 0,
        }}
      >
        Credits: {formattedCredits}
      </Text>
    </Card>
  );
}
