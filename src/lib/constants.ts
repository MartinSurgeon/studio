import { QrCode, MapPin, Fingerprint, Camera, CreditCard, UserCheck } from 'lucide-react';
import type { VerificationMethod } from './types';

export const VERIFICATION_METHODS: { key: VerificationMethod; label: string; icon?: React.ElementType }[] = [
  { key: 'QR', label: 'QR Code', icon: QrCode },
  { key: 'Location', label: 'Location', icon: MapPin },
  { key: 'Biometric', label: 'Biometric', icon: Fingerprint },
  { key: 'Facial', label: 'Facial Recognition', icon: Camera },
  { key: 'NFC', label: 'NFC', icon: CreditCard },
  { key: 'Manual', label: 'Manual', icon: UserCheck },
]; 