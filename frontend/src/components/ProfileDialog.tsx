import PhotoCameraIcon from '@mui/icons-material/PhotoCameraOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { UserAvatar } from './UserAvatar';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // mirrors the server limit

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setFile(null);
      setRemovePhoto(false);
      setError(null);
    }
  }, [open, user]);

  // Local preview of the picked file; revoke the blob URL when it changes.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!user) return null;

  function pickFile(picked: File | undefined) {
    if (!picked) return;
    if (!picked.type.startsWith('image/')) return setError('Please choose an image file.');
    if (picked.size > MAX_UPLOAD_BYTES) return setError('Image must be 5 MB or smaller.');
    setError(null);
    setRemovePhoto(false);
    setFile(picked);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      let updated = user;
      if (file) updated = await api.uploadAvatar(file);
      else if (removePhoto) updated = await api.removeAvatar();
      if (name.trim() !== user.name) updated = await api.updateProfile(name.trim());
      updateUser(updated);
      toast('Profile updated');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shownAvatar = removePhoto ? null : (preview ?? user.avatarUrl);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={save}>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} alignItems="center" sx={{ pt: 1 }}>
            <UserAvatar name={name || user.name} src={shownAvatar} size={112} />
            <Stack direction="row" spacing={1}>
              <Button component="label" variant="outlined" startIcon={<PhotoCameraIcon />}>
                {shownAvatar ? 'Change photo' : 'Upload photo'}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = ''; // allow re-picking the same file
                  }}
                />
              </Button>
              {shownAvatar && (
                <Button
                  color="error"
                  onClick={() => {
                    setFile(null);
                    setRemovePhoto(true);
                  }}
                >
                  Remove
                </Button>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              JPG, PNG, WebP or GIF up to 5 MB. We crop and resize it to 200×200.
            </Typography>
            <TextField
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField label="Email" value={user.email} disabled fullWidth />
            {error && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={busy}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
