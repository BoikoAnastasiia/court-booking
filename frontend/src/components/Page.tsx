import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';

/** Standard page body: centred, max-width, vertical rhythm between sections. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Stack spacing={3}>{children}</Stack>
    </Container>
  );
}
