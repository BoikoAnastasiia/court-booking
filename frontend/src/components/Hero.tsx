import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** Full-width photo banner with a title, like a venue's "Book a court" header. */
export function Hero({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <Box sx={{ position: 'relative', height: { xs: 200, sm: 280, md: 320 }, overflow: 'hidden', bgcolor: '#1b4f8a' }}>
      <Box
        component="img"
        // Photo by Wil Seaman on Unsplash, pre-cropped to banner ratios.
        src="/images/hero-courts-1920.webp"
        srcSet="/images/hero-courts-960.webp 960w, /images/hero-courts-1920.webp 1920w"
        sizes="100vw"
        alt=""
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Dark gradient so white text stays readable over the bright courts. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.05) 100%)',
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ color: 'common.white' }}>
          <Typography variant="h3" component="h1" fontWeight={800} sx={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ mt: 1, opacity: 0.9, maxWidth: 520 }}>{subtitle}</Typography>
          )}
        </Box>
      </Container>
      <Link
        href="https://unsplash.com/photos/aerial-photo-of-tennis-court-VDLtbWHNDoU"
        target="_blank"
        rel="noreferrer"
        variant="caption"
        underline="hover"
        sx={{ position: 'absolute', right: 12, bottom: 8, color: 'rgba(255,255,255,0.75)' }}
      >
        Photo: Wil Seaman / Unsplash
      </Link>
    </Box>
  );
}
