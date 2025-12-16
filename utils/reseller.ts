import { PLANS, RESELLER_TIERS } from '../constants';
import { ReferralRecord, ResellerEarning, ResellerStats } from '../types';

const resolveTierCommission = (clientCount: number): number => {
  const tier = RESELLER_TIERS.find((t) => clientCount >= t.min && clientCount <= t.max) ?? RESELLER_TIERS[0];
  return tier.commission;
};

const calculateFallbackRevenue = (referrals: ReferralRecord[]): number =>
  referrals.reduce((total, referral) => {
    const plan = referral.clientProfile?.plan;
    const planPrice = plan ? PLANS[plan]?.price ?? 0 : 0;
    return total + planPrice;
  }, 0);

export const computeResellerStats = (
  referrals: ReferralRecord[],
  earnings: ResellerEarning[]
): ResellerStats => {
  const activeClients = referrals.filter((referral) => referral.status !== 'canceled').length;
  const commissionRate = resolveTierCommission(activeClients);

  const grossFromEarnings = earnings.reduce((total, earning) => total + Number(earning.amount || 0), 0);
  const grossRevenue = grossFromEarnings > 0 ? grossFromEarnings : calculateFallbackRevenue(referrals);

  const pendingPayout = earnings
    .filter((earning) => earning.status === 'pending')
    .reduce((total, earning) => total + Number(earning.amount || 0) * (earning.commissionRate || commissionRate), 0);

  const arrears = earnings
    .filter((earning) => earning.status === 'failed')
    .reduce((total, earning) => total + Number(earning.amount || 0) * (earning.commissionRate || commissionRate), 0);

  return {
    totalClients: activeClients,
    totalRevenue: grossRevenue,
    commissionRate,
    pendingPayout: pendingPayout || grossRevenue * commissionRate,
    addOnCommission: 0,
    arrears,
  };
};
