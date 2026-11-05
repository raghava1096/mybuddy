// money helpers. we keep everything as integer paise (1 rupee = 100 paise).

// "1,250.5" -> 125050. parses the string by hand so 0.1 + 0.2 issues never show up.
export function toPaise(input: string | number): number {
  const text = String(input).replace(/,/g, '').trim()
  if (!/^\d+(\.\d{0,2})?$/.test(text)) {
    throw new Error(`invalid amount: ${input}`)
  }
  const [rupees, decimals = ''] = text.split('.')
  return Number(rupees) * 100 + Number(decimals.padEnd(2, '0'))
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

export function formatINR(paise: number): string {
  return inr.format(paise / 100)
}
