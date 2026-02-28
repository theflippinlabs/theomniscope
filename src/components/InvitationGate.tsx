import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import oracleLogo from '@/assets/oracle-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

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
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useI18n();

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

    const { data } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', trimmed)
      .limit(1);

    if (!data || data.length === 0) {
      setError(t('gate.invalidCode'));
      setLoading(false);
      return;
    }

    const invitation = data[0];

    if (invitation.is_used && invitation.device_id === deviceId) {
      onGranted();
      return;
    }

    if (invitation.is_used && invitation.device_id !== deviceId) {
      setError(t('gate.alreadyUsed'));
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('invitation_codes')
      .update({ is_used: true, device_id: deviceId, used_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      setError(t('gate.error'));
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
    <div className="min-h-screen bg-background gradient-hero flex flex-col items-center justify-center px-6 relative">
      <button
        onClick={toggleLang}
        className="absolute top-6 right-6 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-muted/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50"
      >
        <span className={lang === 'en' ? 'text-foreground font-semibold' : ''}>EN</span>
        <span className="text-muted-foreground/40">|</span>
        <span className={lang === 'fr' ? 'text-foreground font-semibold' : ''}>FR</span>
      </button>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-8 text-center"
      >
        <div className="space-y-4">
          <img src={oracleLogo} alt="Oracle" className="w-64 h-64 mx-auto object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">ORACLE</h1>
          <p className="text-sm text-muted-foreground">{t('gate.subtitle')}</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('gate.placeholder')}
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
            {t('gate.submit')}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">{t('gate.byLabs')}</p>
      </motion.div>
    </div>
  );
}
