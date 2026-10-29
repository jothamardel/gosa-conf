/**
 * Authorized Desk Administrators & Permission Configuration
 *
 * Defines the whitelisted desk officials permitted to access the GOSA Admin Dashboard,
 * along with granular permissions (Desk Admins can scan, verify, check-in, and register
 * walk-ins, but are strictly prohibited from dispatching bulk broadcast messages).
 */

export interface AuthorizedAdmin {
  id: string;
  name: string;
  phone: string; // E.164 formatted (+234...)
  displayPhone: string;
  role: 'desk_admin' | 'super_admin';
  canBroadcast: boolean;
  pin?: string;
}

export const AUTHORIZED_DESK_ADMINS: AuthorizedAdmin[] = [
  {
    id: 'admin_godson_nanlung',
    name: 'Godson Nanlung',
    phone: '+2348070601835',
    displayPhone: '+234 807 060 1835',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '72799',
  },
  {
    id: 'admin_ritshinen_mark',
    name: 'Ritshinen Mark',
    phone: '+2349038753205',
    displayPhone: '09038753205',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '53205',
  },
  {
    id: 'admin_khirnan_nanle',
    name: 'Khirnan Nanle',
    phone: '+2347037025500',
    displayPhone: '+234 703 702 5500',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '25500',
  },
  {
    id: 'admin_kyenpia_kyesmen',
    name: 'Kyenpia Kyesmen',
    phone: '+2349137776923',
    displayPhone: '+234 913 777 6923',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '76923',
  },
  {
    id: 'admin_mercy_madugu',
    name: 'Mercy Madugu',
    phone: '+2349040163682',
    displayPhone: '+234 904 016 3682',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '23232',
  },
  {
    id: 'admin_nancy_dasat',
    name: 'Nancy Dasat',
    phone: '+2349027331255',
    displayPhone: '+234 902 733 1255',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '31255',
  },
  {
    id: 'admin_shansikmwa_tokke',
    name: 'Shansikmwa Tokke',
    phone: '+2349073527576',
    displayPhone: '+234 907 352 7576',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '27576',
  },
  {
    id: 'admin_balkwak_daful',
    name: 'Balkwak Daful',
    phone: '+2349133105194',
    displayPhone: '+234 913 310 5194',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '05194',
  },
  {
    id: 'admin_onfi_adudu',
    name: 'Onfi Adudu',
    phone: '+2348056337492',
    displayPhone: '+234 805 633 7492',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '37492',
  },
  {
    id: 'admin_joseph_rwang',
    name: 'Joseph Rwang',
    phone: '+2348142760055',
    displayPhone: '08142760055',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '60055',
  },
  {
    id: 'admin_dandoh_danyam',
    name: 'Dandoh Danyam',
    phone: '+2347041107419',
    displayPhone: '+234 704 110 7419',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '07419',
  },
  {
    id: 'admin_trust_jacob',
    name: 'Trust Jacob',
    phone: '+2349037817406',
    displayPhone: '09037817406',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '17406',
  },
  {
    id: 'admin_zenret_emmanuel',
    name: 'Zenret Emmanuel',
    phone: '+2349127211038',
    displayPhone: '09127211038',
    role: 'desk_admin',
    canBroadcast: false,
    pin: '11038',
  },
];

/**
 * Normalizes any user-entered phone number into standard international format +234...
 */
export function normalizeAdminPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const clean = rawPhone.replace(/\D/g, '');
  if (!clean) return '';

  if (clean.startsWith('0') && clean.length === 11) {
    return `+234${clean.slice(1)}`;
  } else if (clean.length === 10 && /^[789]/.test(clean)) {
    return `+234${clean}`;
  } else if (clean.startsWith('234') && clean.length >= 13) {
    return `+${clean}`;
  }
  return `+${clean}`;
}

/**
 * Looks up an authorized desk admin by phone number.
 */
export function findAuthorizedAdminByPhone(rawPhone: string): AuthorizedAdmin | null {
  const normalized = normalizeAdminPhone(rawPhone);
  if (!normalized) return null;

  return (
    AUTHORIZED_DESK_ADMINS.find((admin) => {
      const adminNormalized = normalizeAdminPhone(admin.phone);
      return adminNormalized === normalized;
    }) || null
  );
}

/**
 * Returns true if the phone belongs to an authorized desk admin.
 */
export function isDeskAdmin(rawPhone: string): boolean {
  return !!findAuthorizedAdminByPhone(rawPhone);
}
