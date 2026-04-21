interface ChevronDownIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export function ChevronDownIcon({
  className,
  width = 16,
  height = 16,
}: Readonly<ChevronDownIconProps>): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
