"use client";

import { Avatar } from "antd";
import type { CSSProperties } from "react";
import { useState } from "react";

export function companyInitials(name: string | null | undefined): string {
	if (!name) return "--";
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "--";
	const first = words[0] ?? "";
	if (first.length <= 4) return first.toUpperCase();
	return words
		.slice(0, 2)
		.map((word) => word[0] ?? "")
		.join("")
		.toUpperCase();
}

interface CompanyLogoProps {
	name: string | null | undefined;
	logoUrl: string | null | undefined;
	size: number;
	className?: string;
	avatarClassName?: string;
	style?: CSSProperties;
	avatarStyle?: CSSProperties;
	logoBackground?: string;
	fallbackBackground?: string;
}

export default function CompanyLogo({
	name,
	logoUrl,
	size,
	className,
	avatarClassName,
	style,
	avatarStyle,
	logoBackground = "rgba(255, 255, 255, 0.92)",
	fallbackBackground,
}: CompanyLogoProps) {
	const normalizedLogoUrl = logoUrl?.trim() || null;
	const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
	const showLogo =
		Boolean(normalizedLogoUrl) && failedLogoUrl !== normalizedLogoUrl;

	return (
		<span
			className={className}
			style={{
				width: size,
				height: size,
				background: showLogo ? logoBackground : fallbackBackground,
				...style,
			}}
		>
			{showLogo ? (
				<Avatar
					src={normalizedLogoUrl ?? ""}
					alt={name ? `${name} logo` : ""}
					shape="square"
					size={size}
					className={avatarClassName}
					onError={() => {
						setFailedLogoUrl(normalizedLogoUrl);
						return false;
					}}
					style={{
						width: "100%",
						height: "100%",
						background: "transparent",
						...avatarStyle,
					}}
				/>
			) : (
				companyInitials(name)
			)}
		</span>
	);
}
