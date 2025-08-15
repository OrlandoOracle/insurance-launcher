import { notFound } from 'next/navigation'
import { getContact } from '@/app/actions/contacts'
import { ContactDetail } from '@/components/contact-detail'

export default async function ContactPage({ params }: { params: { id: string } }) {
  const contact = await getContact(params.id)
  
  if (!contact) {
    notFound()
  }
  
  return <ContactDetail contact={contact} />
}