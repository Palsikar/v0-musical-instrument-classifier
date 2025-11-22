import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getInstrumentFallbackInfo } from "@/lib/instrument-fallbacks"

// Initialize the Gemini model with the updated API key
const genAI = new GoogleGenerativeAI("AIzaSyBRRb8Q8u6clFeIqtk_TyDJjf2BGyFi8Ro")

export async function POST(request: Request) {
  try {
    const { instrumentName } = await request.json()

    if (!instrumentName) {
      return NextResponse.json({ error: "Instrument name is required" }, { status: 400 })
    }

    console.log(`Generating information about how to play: ${instrumentName}`)

    // Check if we have fallback content for this instrument
    const fallbackInfo = getInstrumentFallbackInfo(instrumentName)

    if (fallbackInfo) {
      console.log(`Using fallback information for ${instrumentName}`)
      return NextResponse.json({
        instrumentInfo: fallbackInfo.content,
        source: "fallback",
      })
    }

    // If no fallback, try to generate with AI
    try {
      console.log(`No fallback found for ${instrumentName}, trying AI generation...`)

      // Get the generative model - using flash model for better quota limits
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      // Generate detailed information about how to play the instrument using Gemini
      const prompt = `Provide detailed information about how to play the ${instrumentName}. Include:
1. A brief introduction to the instrument
2. Basic techniques for beginners
3. How to hold and position the instrument correctly
4. Common rhythms or patterns for beginners (if applicable)
5. Tips for practice and improvement

Format the response with clear headings using # and ## markdown syntax. Keep it concise but informative.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      console.log("Successfully generated instrument information with AI")

      return NextResponse.json({
        instrumentInfo: text,
        source: "gemini",
      })
    } catch (apiError) {
      console.error("Gemini API error:", apiError)

      // Check if it's a quota/rate limit error
      const errorString = apiError.toString()
      const isQuotaError =
        errorString.includes("429") ||
        errorString.includes("quota") ||
        errorString.includes("rate limit") ||
        errorString.includes("exceeded your current quota")

      if (isQuotaError) {
        console.log("Quota exceeded, using generic fallback information")
      } else {
        console.log("API error occurred, using generic fallback information")
      }

      // Always provide generic information if AI fails
      const genericInfo = `# How to Play the ${instrumentName}

## Introduction
The ${instrumentName} is a wonderful musical instrument with its own unique characteristics and sound. Learning to play it can be a rewarding and enjoyable experience that opens up new musical possibilities.

## Getting Started
To begin learning the ${instrumentName}:
- Familiarize yourself with the parts and components of the instrument
- Learn proper posture and holding techniques
- Start with basic exercises to develop fundamental skills
- Find quality instructional materials or consider working with a teacher

## Basic Techniques
When starting to learn the ${instrumentName}:
- Focus on proper technique from the beginning to avoid developing bad habits
- Start with simple exercises and gradually progress to more complex pieces
- Practice regularly, even if just for short periods each day
- Be patient with yourself as learning any instrument takes time and dedication

## Practice Tips
- **Consistency**: Regular practice sessions are more effective than occasional long sessions
- **Start Slow**: Begin at a comfortable tempo and gradually increase speed as you improve
- **Listen**: Pay attention to accomplished ${instrumentName} players for inspiration and learning
- **Record Yourself**: Recording your practice can help identify areas for improvement
- **Stay Motivated**: Set achievable goals and celebrate your progress along the way
- **Seek Guidance**: Consider lessons with a qualified instructor, especially when starting out

## Building Your Skills
As you progress with the ${instrumentName}:
- Learn fundamental scales and exercises appropriate for your instrument
- Practice pieces that challenge you but are within your current skill level
- Explore different musical styles and genres
- Join ensembles or groups when you're ready to play with others
- Continue learning throughout your musical journey

Remember that every musician's journey is unique. Be patient with yourself, enjoy the process of learning, and don't hesitate to seek help when needed. The ${instrumentName} has a rich musical tradition, and with dedication and practice, you can become part of that tradition.

For more specific and detailed information about playing the ${instrumentName}, consider consulting with a music teacher, looking up specialized tutorials, or finding method books designed for your instrument.`

      return NextResponse.json({
        instrumentInfo: genericInfo,
        source: "generic",
        notice: isQuotaError
          ? "API quota exceeded. This is generic information about the instrument."
          : "Unable to generate specific information. This is generic guidance for learning the instrument.",
      })
    }
  } catch (error) {
    console.error("Error generating instrument information:", error)

    // Even if there's a server error, provide generic information
    const instrumentName = "this instrument" // fallback if we can't get the name
    const genericInfo = `# How to Play Musical Instruments

## Introduction
Learning to play a musical instrument is a rewarding experience that can bring joy and fulfillment to your life.

## Getting Started
- Choose an instrument that interests you
- Find quality instructional materials
- Consider working with a qualified teacher
- Practice regularly and be patient with your progress

## Basic Practice Tips
- Start with proper posture and technique
- Practice regularly, even if just for short sessions
- Listen to accomplished musicians for inspiration
- Record yourself to track your progress
- Set achievable goals and celebrate improvements

For specific information about your instrument, please consult with a music teacher or look up specialized tutorials online.`

    return NextResponse.json({
      instrumentInfo: genericInfo,
      source: "error_fallback",
      notice:
        "There was an error generating specific information. This is general guidance for learning musical instruments.",
    })
  }
}
