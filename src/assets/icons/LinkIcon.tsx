interface LinkIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export function LinkIcon({ className, width = 16, height = 16 }: Readonly<LinkIconProps>): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="currentColor"
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
    >
      <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l1.373-1.373a2 2 0 0 1 .144-.274l-.852-.854z" />
      <path d="M11.285 9.458 12.657 8.086a3 3 0 1 0-4.243-4.243L6.586 5.672a3 3 0 0 0 .415 4.314l.586-.586a1 1 0 0 0 .154-.199 2 2 0 0 1-.861-3.337L8.752 4.02a2 2 0 0 1 2.83 2.83L10.21 8.22a2 2 0 0 1-.144.274l.852.854z" />
    </svg>
  );
}
