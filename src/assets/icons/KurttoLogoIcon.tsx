interface KurttoLogoIconProps {
  className?: string;
  width?: number;
  height?: number;
}

/** Ícone de tesoura abstrata da marca Kurtto (lâminas formam um "K"). */
export function KurttoLogoIcon({
  className,
  width = 48,
  height = 32,
}: Readonly<KurttoLogoIconProps>): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 32"
      fill="none"
      width={width}
      height={height}
      className={className}
      aria-hidden
    >
      <g transform="translate(0, 16)">
        <path d="M0,0 L38,-12 L40,-6 L6,4 Z" fill="#E8593C" />
        <path d="M0,0 L38,12 L40,6 L6,-4 Z" fill="#D14520" />
        <circle cx="4" cy="0" r="3.5" fill="#fff" stroke="#E8593C" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
