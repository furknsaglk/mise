import Link from "next/link";
import styles from "./Button.module.css";

// Renders a link when `href` is given, otherwise a regular button.
export default function Button({ href, variant = "primary", size = "md", className = "", children, ...rest }) {
  const cls = `${styles.button} ${styles[variant]} ${styles[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
