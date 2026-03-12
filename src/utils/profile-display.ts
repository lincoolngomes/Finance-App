type UserMetadata = Record<string, unknown> | null | undefined

export interface ProfileDisplayData {
  nome?: string | null
  name?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  avatar_url?: string | null
  cpf?: string | null
  nascimento?: string | null
}

export interface AuthUserDataLike {
  email?: string | null
  user_metadata?: UserMetadata
}

const KNOWN_DISPLAY_NAMES_BY_EMAIL: Record<string, string> = {
  'lincoolngomes@gmail.com': 'Lincoln Cesar Gomes',
}

const NAME_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

const sanitizeText = (value?: string | null) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

const normalizeForComparison = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const titleCaseName = (value: string) =>
  sanitizeText(value)
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      const lowerWord = word.toLowerCase()
      if (index > 0 && NAME_PARTICLES.has(lowerWord)) {
        return lowerWord
      }

      return `${lowerWord.charAt(0).toUpperCase()}${lowerWord.slice(1)}`
    })
    .join(' ')

const readMetadataString = (metadata: UserMetadata, key: string) => {
  const value = metadata && typeof metadata === 'object' ? metadata[key] : undefined
  return typeof value === 'string' ? sanitizeText(value) : ''
}

export const getEmailLocalPart = (email?: string | null) => {
  const normalizedEmail = sanitizeText(email)
  if (!normalizedEmail.includes('@')) {
    return normalizedEmail
  }

  return normalizedEmail.split('@')[0]
}

export const isGeneratedProfileName = (name?: string | null, email?: string | null) => {
  const cleanedName = sanitizeText(name)
  const localPart = getEmailLocalPart(email)

  if (!cleanedName) {
    return true
  }

  if (!localPart) {
    return false
  }

  return normalizeForComparison(cleanedName) === normalizeForComparison(localPart)
}

const formatIdentifierAsName = (value: string) =>
  titleCaseName(
    value
      .replace(/[._-]+/g, ' ')
      .replace(/\d+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )

export const deriveDisplayName = ({
  profile,
  user,
  email,
}: {
  profile?: ProfileDisplayData | null
  user?: AuthUserDataLike | null
  email?: string | null
}) => {
  const resolvedEmail = sanitizeText(email || profile?.email || user?.email || '')
  const metadata = user?.user_metadata
  const candidates = [
    sanitizeText(profile?.nome),
    sanitizeText(profile?.name),
    sanitizeText(profile?.full_name),
    readMetadataString(metadata, 'nome'),
    readMetadataString(metadata, 'name'),
    readMetadataString(metadata, 'full_name'),
  ]

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    if (isGeneratedProfileName(candidate, resolvedEmail)) {
      continue
    }

    return titleCaseName(candidate)
  }

  const knownName = resolvedEmail ? KNOWN_DISPLAY_NAMES_BY_EMAIL[resolvedEmail.toLowerCase()] : ''
  if (knownName) {
    return knownName
  }

  const inferredName = formatIdentifierAsName(getEmailLocalPart(resolvedEmail))
  return inferredName || 'Usuario'
}

export const deriveFirstName = (value?: string | null) => {
  const fullName = sanitizeText(value)
  return fullName.split(' ')[0] || 'Usuario'
}

export const deriveInitials = (value?: string | null) => {
  const fullName = sanitizeText(value)

  if (!fullName) {
    return 'U'
  }

  return fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export const deriveProfileSubtitle = ({
  profile,
  user,
}: {
  profile?: ProfileDisplayData | null
  user?: AuthUserDataLike | null
}) => sanitizeText(profile?.phone || profile?.whatsapp || profile?.email || user?.email || '') || 'Conta local'

export const buildProfileFromUser = (
  user: AuthUserDataLike,
  profile?: ProfileDisplayData | null
) => {
  const metadata = user.user_metadata

  return {
    email: sanitizeText(profile?.email || user.email || ''),
    nome: deriveDisplayName({ profile, user }),
    phone: sanitizeText(profile?.phone || readMetadataString(metadata, 'telefone') || readMetadataString(metadata, 'phone')),
    cpf: sanitizeText(profile?.cpf || readMetadataString(metadata, 'cpf')),
    nascimento: sanitizeText(profile?.nascimento || readMetadataString(metadata, 'nascimento')),
  }
}
