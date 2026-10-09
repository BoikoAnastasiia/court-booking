import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/**
 * Default avatar glyph ("user-filled" from SVG Repo). Inlined as a path
 * instead of an <img> so it inherits `currentColor` and follows the theme.
 */
export function UserIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 512 512" {...props}>
      <path
        transform="translate(85.333333, 42.666667)"
        d="M170.666667,170.666667 C217.794965,170.666667 256,132.461632 256,85.3333333 C256,38.2050347 217.794965,0 170.666667,0 C123.538368,0 85.3333333,38.2050347 85.3333333,85.3333333 C85.3333333,132.461632 123.538368,170.666667 170.666667,170.666667 Z M213.333333,213.333333 L128,213.333333 C57.307552,213.333333 0,270.640885 0,341.333333 L0,426.666667 L341.333333,426.666667 L341.333333,341.333333 C341.333333,270.640885 284.025781,213.333333 213.333333,213.333333 Z"
      />
    </SvgIcon>
  );
}
