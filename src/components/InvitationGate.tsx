import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import oracleLogo from '@/assets/oracle-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2 } from 'lucide-react';

function getDeviceId(): string {
  let id = localStorage.getItem('oracle_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('oracle_device_id', id);
  }
  return id;
}

export default function InvitationGate({ onGranted }: { onGranted: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if this device already has access
  useEffect(() => {
    (async () => {
      const deviceId = getDeviceId();
      const { data } = await supabase
        .from('invitation_codes')
        .select('id')
        .eq('device_id', deviceId)
        .eq('is_used', true)
        .limit(1);

      if (data && data.length > 0) {
        onGranted();
      }
      setLoading(false);
    })();
  }, [onGranted]);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setError('');
    setLoading(true);

    const deviceId = getDeviceId();
    const trimmed = code.trim().toUpperCase();

    // Check if code exists and is not used OR already used by this device
    const { data } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', trimmed)
      .limit(1);

    if (!data || data.length === 0) {
      setError('Code invalide.');
      setLoading(false);
      return;
    }

    const invitation = data[0];

    // Already used by this device → grant access
    if (invitation.is_used && invitation.device_id === deviceId) {
      onGranted();
      return;
    }

    // Already used by another device
    if (invitation.is_used && invitation.device_id !== deviceId) {
      setError('Ce code a déjà été utilisé.');
      setLoading(false);
      return;
    }

    // Not used yet → claim it
    const { error: updateError } = await supabase
      .from('invitation_codes')
      .update({ is_used: true, device_id: deviceId, used_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      setError('Erreur, réessayez.');
      setLoading(false);
      return;
    }

    onGranted();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background gradient-hero flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-8 text-center"
      >
        <div className="space-y-4">
          <img src={oracleLogo} alt="Oracle" className="w-48 h-48 mx-auto object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">ORACLE</h1>
          <p className="text-sm text-muted-foreground">Accès sur invitation uniquement</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Entrez votre code d'invitation"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="pl-10 text-center font-mono tracking-widest uppercase"
              maxLength={12}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-danger"
            >
              {error}
            </motion.p>
          )}

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={!code.trim()}
          >
            Accéder
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">by The Flippin' Labs</p>
      </motion.div>
    </div>
  );
}
