export interface CreatedUserClerkResponse {
  data: Data;
  event_attributes: EventAttributes;
  instance_id: string;
  object: string;
  timestamp: number;
  type: string;
}

export interface Data {
  backup_code_enabled: boolean;
  banned: boolean;
  create_organization_enabled: boolean;
  create_organizations_limit: unknown;
  created_at: number;
  delete_self_enabled: boolean;
  email_addresses: EmailAddressDto[];
  enterprise_accounts: unknown[];
  external_accounts: unknown[];
  external_id: unknown;
  first_name: string;
  has_image: boolean;
  id: string;
  image_url: string;
  last_active_at: number;
  last_name: string;
  last_sign_in_at: number;
  legal_accepted_at: number;
  locked: boolean;
  lockout_expires_in_seconds: unknown;
  mfa_disabled_at: unknown;
  mfa_enabled_at: unknown;
  object: string;
  passkeys: unknown[];
  password_enabled: boolean;
  phone_numbers: unknown[];
  primary_email_address_id: string;
  primary_phone_number_id: unknown;
  primary_web3_wallet_id: unknown;
  private_metadata: unknown;
  profile_image_url: string;
  saml_accounts: unknown[];
  totp_enabled: boolean;
  two_factor_enabled: boolean;
  updated_at: number;
  username: unknown;
  verification_attempts_remaining: unknown;
  web3_wallets: unknown[];
}

export interface EmailAddressDto {
  created_at: number
  email_address: string
  id: string
  linked_to: string[]
  matches_sso_connection: boolean
  object: string
  reserved: boolean
  updated_at: number
  verification: Verification
}

export interface Verification {
  attempts: number
  expire_at: number
  object: string
  status: string
  strategy: string
}


export interface EventAttributes {
  http_request: HttpRequest;
}

export interface HttpRequest {
  client_ip: string;
  user_agent: string;
}
