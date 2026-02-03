import { Breadcrumb } from "antd";
import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function DeepDiveBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Breadcrumb
      style={{ marginBottom: 8 }}
      items={items.map((item, index) => {
        const isLast = index === items.length - 1;
        return {
          title: item.href && !isLast ? (
            <Link href={item.href} style={{ color: "#58bfce" }}>
              {item.label}
            </Link>
          ) : (
            <span style={{ color: "#8c8c8c" }}>{item.label}</span>
          ),
        };
      })}
    />
  );
}
