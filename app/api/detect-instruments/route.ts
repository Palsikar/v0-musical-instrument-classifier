import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("API route called")
    const body = await request.json()
    const { imageUrl, imageBase64, type } = body

    console.log("Request type:", type)

    if (type !== "url" && type !== "base64") {
      return NextResponse.json({ error: "Invalid input type" }, { status: 400 })
    }

    if (type === "url" && !imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    if (type === "base64" && !imageBase64) {
      return NextResponse.json({ error: "Image base64 data is required" }, { status: 400 })
    }

    const apiKey = "TZyZDZMPn6gbwgzPfzGU"
    const modelId = "musical-instrument-classifier-cceky/1"

    let requestUrl: string
    let fetchOptions: RequestInit

    if (type === "url") {
      requestUrl = `https://serverless.roboflow.com/${modelId}?api_key=${apiKey}&image=${encodeURIComponent(imageUrl)}`
      fetchOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    } else {
      const base64Data = imageBase64.split(",")[1] || imageBase64
      const binaryData = Buffer.from(base64Data, "base64")

      const formData = new FormData()
      const blob = new Blob([binaryData], { type: "image/jpeg" })
      formData.append("file", blob)

      requestUrl = `https://serverless.roboflow.com/${modelId}?api_key=${apiKey}`
      fetchOptions = {
        method: "POST",
        body: formData,
      }
    }

    console.log("Making request to Roboflow API with model:", modelId)

    // Make request to Roboflow API
    const response = await fetch(requestUrl, fetchOptions)

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Roboflow API error:", errorData)
      return NextResponse.json({ error: "Failed to detect instruments" }, { status: response.status })
    }

    const data = await response.json()

    // Log the entire response for debugging
    console.log("FULL ROBOFLOW API RESPONSE:", JSON.stringify(data))

    // Extract the class name with simplified logic
    let className = null

    try {
      // Try to extract from the complex nested structure
      if (data.outputs && data.outputs[0] && data.outputs[0].predictions) {
        const predictions = data.outputs[0].predictions

        if (predictions.dynamic_crop && predictions.dynamic_crop.top) {
          className = predictions.dynamic_crop.top
          console.log("Found class name in dynamic_crop.top:", className)
        } else if (
          predictions.dynamic_crop &&
          predictions.dynamic_crop.predictions &&
          predictions.dynamic_crop.predictions[0]
        ) {
          className = predictions.dynamic_crop.predictions[0].class
          console.log("Found class name in dynamic_crop.predictions[0].class:", className)
        }
      }

      // Fallback to simpler structures
      if (!className && data.predictions && data.predictions[0]) {
        className = data.predictions[0].class
        console.log("Found class name in predictions[0].class:", className)
      }

      if (!className && data.top) {
        className = data.top
        console.log("Found class name in top:", className)
      }

      // If we still don't have a class name, try to find it anywhere in the response
      if (!className) {
        console.log("Could not find class name in expected locations, searching entire response...")
        const responseStr = JSON.stringify(data)

        // Look for patterns like "class":"something" or "top":"something"
        const classMatch = responseStr.match(/"class":"([^"]+)"/)
        const topMatch = responseStr.match(/"top":"([^"]+)"/)

        if (classMatch && classMatch[1]) {
          className = classMatch[1]
          console.log("Found class name using regex from class field:", className)
        } else if (topMatch && topMatch[1]) {
          className = topMatch[1]
          console.log("Found class name using regex from top field:", className)
        }
      }
    } catch (err) {
      console.error("Error extracting class name:", err)
    }

    // Final result logging
    console.log("FINAL EXTRACTED CLASS NAME:", className)

    // Return the class name
    return NextResponse.json({
      className,
      // Include raw response for debugging
      rawResponse: data,
    })
  } catch (error) {
    console.error("Error in detect-instruments API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
