"use client";

import { Modal } from "antd";
import type { ModalProps } from "antd";

interface FormModalShellProps extends Omit<ModalProps, "onOk"> {
	onSubmit: () => void;
}

export function FormModalShell({
	onSubmit,
	children,
	...modalProps
}: FormModalShellProps) {
	return (
		<Modal {...modalProps} onOk={onSubmit}>
			{children}
		</Modal>
	);
}
