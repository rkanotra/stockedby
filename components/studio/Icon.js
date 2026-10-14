export default function Icon({ name = "spark", size = 18, ...props }) {
  const paths = {
    spark: (
      <>
        <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" />
        <path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6Z" />
      </>
    ),
    brief: (
      <>
        <path d="M6 3h9l3 3v15H6Z" />
        <path d="M14 3v5h4M9 12h6M9 16h6" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 10 5-10 5L2 8ZM3 12l9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    flow: (
      <>
        <rect x="8" y="2" width="8" height="5" rx="1" />
        <rect x="2" y="17" width="7" height="5" rx="1" />
        <rect x="15" y="17" width="7" height="5" rx="1" />
        <path d="M12 7v5M5 17v-5h14v5" />
      </>
    ),
    screen: (
      <>
        <rect x="3" y="3" width="18" height="14" rx="2" />
        <path d="M8 21h8M12 17v4M3 7h18" />
      </>
    ),
    stories: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    export: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    grip: (
      <>
        <circle cx="8" cy="6" r="1" />
        <circle cx="16" cy="6" r="1" />
        <circle cx="8" cy="12" r="1" />
        <circle cx="16" cy="12" r="1" />
        <circle cx="8" cy="18" r="1" />
        <circle cx="16" cy="18" r="1" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" />
        <path d="m8 11 3 3 5-5" />
      </>
    ),
    folder: <path d="M3 6h7l2 3h9v11H3ZM3 6V4h7l2 2h7v3" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    play: <path d="m8 4 13 8-13 8Z" />,
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
      </>
    ),
    link: (
      <>
        <path d="m9 15 6-6M9 7l3-3a5 5 0 0 1 7 7l-3 3M15 17l-3 3a5 5 0 0 1-7-7l3-3" />
      </>
    ),
    edit: (
      <>
        <path d="m4 16 12-12 4 4L8 20H4ZM13 7l4 4" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    undo: (
      <>
        <path d="m9 4-6 6 6 6M3 10h11a6 6 0 0 1 6 6v4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.spark}
    </svg>
  );
}
