interface SearchOffIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export function SearchOffIcon({ className, width = 16, height = 16 }: Readonly<SearchOffIconProps>): JSX.Element {
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
      <path d="M10.344 11.742c-.361.257-.7.49-1 .694a.5.5 0 0 0-.166.655l.65 1.124a.5.5 0 0 0 .624.208l1.5-.63a.5.5 0 0 0 .234-.678c-.099-.218-.212-.42-.322-.607a.5.5 0 0 0-.52-.25l-1-.5.5-.5a.5.5 0 0 0 0-.707zM13 7.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0v-2z" />
      <path d="M6.5 0a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 1a5.5 5.5 0 1 1 0 11A5.5 5.5 0 0 1 6.5 1z" />
      <path d="M1 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1H2V4.5a.5.5 0 0 1-1 0V2.5z" />
      <path d="M6.5 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
    </svg>
  );
}
