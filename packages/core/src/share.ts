import { formatINR } from './money'

// links that open whatsapp or the mail app with a ready message.
// no server needed, the user just hits send.

export function settleMessage(toName: string, fromName: string, amount: number, planName: string) {
  return `Hi ${fromName}, for "${planName}" you owe ${toName} ${formatINR(amount)}. Sent from MyBuddy.`
}

export function whatsappLink(phone: string | null, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(text)}`
}

export function mailLink(email: string | null, subject: string, body: string): string {
  return `mailto:${email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
