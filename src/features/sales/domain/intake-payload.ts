type CompanyInput = {
  name: string; industry?: string; email?: string; phone?: string; whatsapp?: string; website?: string; city?: string
  legalName?: string; taxId?: string; instagramUrl?: string; facebookUrl?: string; linkedinUrl?: string
}

type ContactInput = {
  firstName: string; lastName?: string; companyId?: string; email?: string; phone?: string; whatsapp?: string
  preferredChannel?: 'whatsapp' | 'email' | 'phone' | 'linkedin'; influence?: 'decision_maker' | 'influencer' | 'user' | 'other'; jobTitle?: string
}

export function companyIntakePayload(input: CompanyInput) {
  return {
    name: input.name, industry: input.industry, email: input.email, phone: input.phone, whatsapp: input.whatsapp, website: input.website, city: input.city,
    legal_name: input.legalName, tax_id: input.taxId, instagram_url: input.instagramUrl, facebook_url: input.facebookUrl, linkedin_url: input.linkedinUrl,
  }
}

export function contactIntakePayload(input: ContactInput) {
  return {
    first_name: input.firstName, last_name: input.lastName, company_id: input.companyId, email: input.email, phone: input.phone, whatsapp: input.whatsapp,
    preferred_channel: input.preferredChannel, influence: input.influence, job_title: input.jobTitle,
  }
}
