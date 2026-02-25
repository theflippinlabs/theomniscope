import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import oracleLogo from '@/assets/oracle-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Mail, Lock, Plus, Copy, Check, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  const verifyCredentials = async () => {
    setLoginError('');
    const { data, error } = await supabase.functions.invoke('verify-admin-pin', {
      body: { email: email.trim(), password: password.trim() },
    });
    if (error || !data?.valid) {
      setLoginError(t('admin.loginError'));
      return;
    }
    setAuthenticated(true);
    localStorage.setItem('oracle_admin_session', Date.now().toString());
  };

  useEffect(() => {
    const session = localStorage.getItem('oracle_admin_session');
    if (session && Date.now() - parseInt(session) < 3600000) {
      setAuthenticated(true);
    }
  }, []);

  const fetchCodes = useCallback(async () => {
    const { data } = await supabase
      .from('invitation_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCodes(data);
  }, []);

  useEffect(() => {
    if (authenticated) fetchCodes();
  }, [authenticated, fetchCodes]);

  const createCode = async () => {
    setLoading(true);
    const code = generateCode();
    await supabase.from('invitation_codes').insert({ code });
    await fetchCodes();
    setLoading(false);
  };

  const deleteCode = async (id: string) => {
    await supabase.from('invitation_codes').delete().eq('id', id);
    await fetchCodes();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background gradient-hero flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <img src={oracleLogo} alt="Oracle" className="w-20 h-20 mx-auto object-contain" />
          <h1 className="text-xl font-display font-bold text-foreground">{t('admin.title')}</h1>
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('admin.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={t('admin.passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyCredentials()}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="pl-10"
              />
            </div>
            {loginError && <p className="text-sm text-danger">{loginError}</p>}
            <Button className="w-full" onClick={verifyCredentials} disabled={!email || !password}>
              {t('admin.access')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-display font-bold text-foreground">{t('admin.invitationCodes')}</h1>
        <div className="w-10" />
      </div>

      <Button className="w-full mb-6 gap-2" onClick={createCode} disabled={loading}>
        <Plus className="w-4 h-4" />
        {t('admin.generate')}
      </Button>

      <div className="space-y-2">
        {codes.map(c => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
          >
            <span className="font-mono text-sm font-semibold text-foreground flex-1 tracking-wider">
              {c.code}
            </span>
            <Badge
              className={
                c.is_used
                  ? 'bg-success/10 text-success border-success/20 text-[10px]'
                  : 'bg-muted text-muted-foreground border-border text-[10px]'
              }
            >
              {c.is_used ? t('admin.used') : t('admin.available')}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(c.code, c.id)}>
              {copiedId === c.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCode(c.id)}>
              <Trash2 className="w-4 h-4 text-danger" />
            </Button>
          </motion.div>
        ))}

        {codes.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t('admin.noCodes')}
          </p>
        )}
      </div>
    </div>
  );
}
