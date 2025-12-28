import { supabase } from './supabaseClient';
import { ReferralRecord, ResellerEarning, User } from '../types';
import { arrayToCamelCase, objectToCamelCase } from './transformers';

const attachProfiles = async (referrals: ReferralRecord[]): Promise<ReferralRecord[]> => {
  const ids = referrals.map((referral) => referral.referredUserId);

  if (!supabase || ids.length === 0) {
    return referrals;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, company_name, plan')
      .in('id', ids);

    if (error || !data) {
      return referrals;
    }

    const profileMap = new Map<string, Pick<User, 'id' | 'name' | 'email' | 'companyName' | 'plan'>>();

    data.forEach((rawProfile) => {
      const profile = objectToCamelCase<Pick<User, 'id' | 'name' | 'email' | 'companyName' | 'plan'>>(
        rawProfile as Record<string, unknown>
      );
      profileMap.set(profile.id, profile);
    });

    return referrals.map((referral) => ({
      ...referral,
      clientProfile: profileMap.get(referral.referredUserId),
    }));
  } catch (err) {
    console.warn('Unable to attach client profiles (likely due to RLS):', err);
    return referrals;
  }
};

export const resellerService = {
  async fetchReferrals(resellerId: string): Promise<ReferralRecord[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('referrals')
      .select('id, reseller_id, referred_user_id, code, status, created_at')
      .eq('reseller_id', resellerId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching referrals:', error);
      return [];
    }

    const normalized = arrayToCamelCase<ReferralRecord>(data as Record<string, unknown>[]);
    return attachProfiles(normalized);
  },

  subscribeToReferrals(resellerId: string, onUpdate: (referrals: ReferralRecord[]) => void) {
    if (!supabase) return () => {};

    const refresh = async () => {
      const latest = await resellerService.fetchReferrals(resellerId);
      onUpdate(latest);
    };

    refresh();

    const channel = supabase
      .channel(`referrals-${resellerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referrals', filter: `reseller_id=eq.${resellerId}` },
        refresh
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  },

  async fetchEarnings(resellerId: string): Promise<ResellerEarning[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('reseller_earnings')
      .select('id, reseller_id, customer_id, amount, commission_rate, status, period_start, period_end, paid_at')
      .eq('reseller_id', resellerId)
      .order('period_end', { ascending: false });

    if (error || !data) {
      console.error('Error fetching earnings:', error);
      return [];
    }

    return arrayToCamelCase<ResellerEarning>(data as Record<string, unknown>[]);
  },
};
