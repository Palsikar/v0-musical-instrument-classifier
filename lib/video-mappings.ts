// Video mappings for specific instruments
export const instrumentVideoMappings: Record<string, string> = {
  "bongo drum": "zlljHJtVaPw",
  "bongo drums": "zlljHJtVaPw",
  bongo: "zlljHJtVaPw",
  bongos: "zlljHJtVaPw",
  piano: "827jmswqnEA",
  drums: "et9hU7QMDYU",
  drum: "et9hU7QMDYU",
  "drum kit": "et9hU7QMDYU",
  "steel drums": "ZgJIiors6LI",
  "steel drum": "ZgJIiors6LI",
  guitar: "BBz-Jyr23M4",
  "acoustic guitar": "BBz-Jyr23M4",
  "electric guitar": "BBz-Jyr23M4",
  violin: "K4SbVKA5JHw",
  flute: "CyGMAjzryLs",
  accordion: "EjhkEqapObA",
  acordian: "EjhkEqapObA", // Common misspelling
  alphorn: "pypGqLp2uNE",
  bagpipes: "Sz4HdOq_Q-Y",
  bagpipe: "Sz4HdOq_Q-Y",
  banjo: "Tm4ZJWTQXng",
  saxophone: "ky716yPvrKE",
  sax: "ky716yPvrKE",
  "alto saxophone": "ky716yPvrKE",
  "tenor saxophone": "ky716yPvrKE",
  sitar: "I3onhR6meQ0",
  tambourine: "KAYibD5FE6U",
}

/**
 * Get video ID for a specific instrument
 * @param instrumentName The name of the instrument
 * @returns Video ID if available, null otherwise
 */
export function getInstrumentVideoId(instrumentName: string): string | null {
  // Normalize the instrument name for comparison
  const normalizedName = instrumentName.toLowerCase().trim()

  console.log(`Looking for video for instrument: "${normalizedName}"`)

  // Check for exact matches first
  if (instrumentVideoMappings[normalizedName]) {
    console.log(`Found exact video match for: ${normalizedName}`)
    return instrumentVideoMappings[normalizedName]
  }

  // Check for partial matches - instrument name contains mapping key
  for (const [key, value] of Object.entries(instrumentVideoMappings)) {
    if (normalizedName.includes(key)) {
      console.log(`Found partial video match: "${normalizedName}" contains "${key}"`)
      return value
    }
  }

  // Check for partial matches - mapping key contains instrument name
  for (const [key, value] of Object.entries(instrumentVideoMappings)) {
    if (key.includes(normalizedName)) {
      console.log(`Found reverse partial video match: "${key}" contains "${normalizedName}"`)
      return value
    }
  }

  console.log(`No video found for instrument: ${normalizedName}`)
  return null
}
