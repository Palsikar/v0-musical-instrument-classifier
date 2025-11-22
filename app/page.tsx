"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  AlertCircle,
  Music,
  Upload,
  LinkIcon,
  Terminal,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { getInstrumentVideoId } from "@/lib/video-mappings"

export default function Home() {
  const [imageUrl, setImageUrl] = useState("")
  const [instrumentClass, setInstrumentClass] = useState<string | null>(null)
  const [instrumentInfo, setInstrumentInfo] = useState<string | null>(null)
  const [infoSource, setInfoSource] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("url")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [videoId, setVideoId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Log the instrument class whenever it changes
  useEffect(() => {
    if (instrumentClass) {
      console.log("DETECTED INSTRUMENT:", instrumentClass)

      // Check if we have a video for this instrument
      const foundVideoId = getInstrumentVideoId(instrumentClass)
      setVideoId(foundVideoId)

      generateInstrumentInfo(instrumentClass)
    }
  }, [instrumentClass])

  const generateInstrumentInfo = async (instrumentName: string) => {
    try {
      setLoadingInfo(true)
      setInstrumentInfo(null)
      setInfoError(null)
      setInfoSource(null)

      console.log(`Requesting information about how to play: ${instrumentName}`)

      const response = await fetch("/api/generate-instrument-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instrumentName }),
      })

      const text = await response.text()

      // Try to parse as JSON, but handle non-JSON responses
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error("Failed to parse response as JSON:", text)
        throw new Error("Received invalid response from server")
      }

      // Check if there's an error in the response
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      console.log("Received instrument information")
      setInstrumentInfo(data.instrumentInfo)
      setInfoSource(data.source || "unknown")

      if (data.notice) {
        console.log("Notice:", data.notice)
      }
    } catch (err) {
      console.error("Error generating instrument information:", err)
      setInfoError(
        err instanceof Error
          ? `Failed to generate information: ${err.message}`
          : "Failed to generate information about this instrument.",
      )
    } finally {
      setLoadingInfo(false)
    }
  }

  const detectInstrumentsFromUrl = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset states
    setInstrumentClass(null)
    setInstrumentInfo(null)
    setError(null)
    setInfoError(null)
    setRawResponse(null)
    setVideoId(null)

    // Validate URL
    if (!imageUrl || !imageUrl.trim()) {
      setError("Please enter a valid image URL")
      return
    }

    try {
      setLoading(true)
      setPreviewUrl(imageUrl)

      console.log("Sending request with URL:", imageUrl)

      // Make request to the Roboflow API
      const response = await fetch("/api/detect-instruments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl, type: "url" }),
      })

      await processApiResponse(response)
    } catch (err) {
      console.error("Error in detectInstrumentsFromUrl:", err)
      setError("Error detecting instruments. Please check the URL and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset states
    setInstrumentClass(null)
    setInstrumentInfo(null)
    setError(null)
    setInfoError(null)
    setRawResponse(null)
    setImageUrl("")
    setVideoId(null)

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    try {
      setLoading(true)

      // Create a preview URL
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Convert file to base64
      const base64 = await fileToBase64(file)

      console.log("Sending request with uploaded file")

      // Make request to the Roboflow API
      const response = await fetch("/api/detect-instruments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64,
          type: "base64",
        }),
      })

      await processApiResponse(response)
    } catch (err) {
      console.error("Error in handleFileChange:", err)
      setError("Error processing image. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const processApiResponse = async (response: Response) => {
    if (!response.ok) {
      const errorText = await response.text()
      console.error("API error response:", errorText)
      throw new Error("Failed to detect instruments")
    }

    const data = await response.json()
    console.log("API response:", JSON.stringify(data))

    // Store raw response for debugging
    setRawResponse(data.rawResponse)

    if (data.className) {
      console.log("Setting instrument class to:", data.className)
      setInstrumentClass(data.className)
    } else {
      console.error("No class name found in response")
      setError("No musical instruments detected in the image. Try a different image.")
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = reader.result.split(",")[1]
          resolve(base64)
        } else {
          reject(new Error("Failed to convert file to base64"))
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setError(null)
    setInfoError(null)
    setInstrumentClass(null)
    setInstrumentInfo(null)
    setPreviewUrl(null)
    setRawResponse(null)
    setVideoId(null)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Function to parse the content into sections
  const parseSections = (content: string) => {
    if (!content) return []

    const lines = content.split("\n")
    const sections: { title: string; content: string[]; level: number }[] = []
    let currentSection: { title: string; content: string[]; level: number } | null = null

    for (const line of lines) {
      if (line.startsWith("# ")) {
        // Main heading - start a new section
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = {
          title: line.replace(/^# /, ""),
          content: [],
          level: 1,
        }
      } else if (line.startsWith("## ") && currentSection) {
        // Subheading - create a new section
        sections.push(currentSection)
        currentSection = {
          title: line.replace(/^## /, ""),
          content: [],
          level: 2,
        }
      } else if (currentSection) {
        // Add content to current section
        currentSection.content.push(line)
      }
    }

    // Add the last section
    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  const getInstrumentColor = () => {
    if (!instrumentClass) return "bg-gradient-to-r from-purple-500 to-indigo-600"

    const instrument = instrumentClass.toLowerCase()

    if (instrument.includes("guitar")) return "bg-gradient-to-r from-amber-500 to-red-600"
    if (instrument.includes("piano")) return "bg-gradient-to-r from-blue-500 to-cyan-600"
    if (instrument.includes("drum")) return "bg-gradient-to-r from-red-500 to-orange-600"
    if (instrument.includes("violin")) return "bg-gradient-to-r from-amber-600 to-yellow-500"
    if (instrument.includes("saxophone")) return "bg-gradient-to-r from-yellow-500 to-amber-600"
    if (instrument.includes("trumpet")) return "bg-gradient-to-r from-yellow-400 to-orange-500"
    if (instrument.includes("flute")) return "bg-gradient-to-r from-sky-400 to-blue-500"
    if (instrument.includes("bongo")) return "bg-gradient-to-r from-orange-500 to-red-500"

    // Default gradient
    return "bg-gradient-to-r from-purple-500 to-indigo-600"
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center">
            <Music className="h-8 w-8 mr-2 text-purple-600" />
            Musical Instrument Detector
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload an image of a musical instrument and learn how to play it with detailed guides and video tutorials
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="overflow-hidden border-none shadow-lg">
                <CardHeader className={`${getInstrumentColor()} text-white`}>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-6 w-6" />
                    Detect an Instrument
                  </CardTitle>
                  <CardDescription className="text-white/80">Upload an image or provide a URL</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="url" className="flex items-center gap-1">
                        <LinkIcon className="h-4 w-4" />
                        Image URL
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="url" className="space-y-4">
                      <form onSubmit={detectInstrumentsFromUrl} className="space-y-4">
                        <div className="space-y-2">
                          <Input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            disabled={loading}
                            className="w-full border-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Detecting...
                            </>
                          ) : (
                            "Detect Instrument"
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-4">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          disabled={loading}
                        />
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={triggerFileInput}
                          className="border-2 border-dashed border-purple-300 rounded-lg p-8 w-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-500 transition-colors bg-purple-50"
                        >
                          <Upload className="h-12 w-12 text-purple-500" />
                          <p className="text-purple-700 font-medium">Click to upload an image</p>
                          <p className="text-xs text-purple-500">JPG, PNG, GIF up to 10MB</p>
                        </motion.div>
                        {loading && (
                          <div className="flex items-center gap-2 text-purple-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Processing image...</span>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {error && (
                    <Alert variant="destructive" className="mt-4 bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-600">{error}</AlertDescription>
                    </Alert>
                  )}

                  {previewUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 rounded-md overflow-hidden border bg-white shadow-md"
                    >
                      <div className="relative w-full h-64">
                        <Image
                          src={previewUrl || "/placeholder.svg"}
                          alt="Preview"
                          fill
                          className="object-contain"
                          onError={() => {
                            setError("Failed to load image. Please check the URL and try again.")
                            setPreviewUrl(null)
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </CardContent>
                {instrumentClass && (
                  <CardFooter className={`${getInstrumentColor()} p-4 flex justify-center`}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-white"
                    >
                      <h3 className="text-lg font-medium mb-1">Detected Instrument</h3>
                      <div className="text-3xl font-bold">{instrumentClass}</div>
                    </motion.div>
                  </CardFooter>
                )}
              </Card>
            </motion.div>

            {/* Console output */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 p-4 bg-gray-900 text-gray-100 rounded-md border text-sm font-mono overflow-auto max-h-48 shadow-md hidden md:block"
            >
              <div className="flex items-center gap-2 mb-2 text-gray-400">
                <Terminal className="h-4 w-4" />
                <span>Console Output</span>
              </div>
              {instrumentClass ? (
                <div>
                  <span className="text-green-400">DETECTED INSTRUMENT:</span> {instrumentClass}
                  {videoId && (
                    <div className="mt-1">
                      <span className="text-blue-400">VIDEO TUTORIAL:</span> Available
                    </div>
                  )}
                </div>
              ) : loading ? (
                <div className="text-yellow-400">Processing image...</div>
              ) : error ? (
                <div className="text-red-400">{error}</div>
              ) : (
                <div className="text-gray-500">No instrument detected yet. Submit an image to see results.</div>
              )}
            </motion.div>
          </div>

          {/* Instrument information section */}
          <div className="lg:col-span-7">
            {instrumentClass && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="space-y-6"
              >
                {/* Video Tutorial Section */}
                {videoId && (
                  <Card className="border-none shadow-lg overflow-hidden">
                    <CardHeader className={`${getInstrumentColor()} text-white`}>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Video Tutorial: How to Play the {instrumentClass}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={`How to play ${instrumentClass}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute top-0 left-0 w-full h-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-none shadow-lg overflow-hidden">
                  <CardHeader className={`${getInstrumentColor()} text-white`}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        How to Play the {instrumentClass}
                      </CardTitle>

                      {infoSource && (
                        <div className="flex items-center gap-1 text-xs text-white/80 bg-black/20 px-2 py-1 rounded-full">
                          <Info className="h-3 w-3" />
                          <span>
                            {infoSource === "fallback"
                              ? "Pre-written guide"
                              : infoSource === "gemini"
                                ? "AI generated"
                                : infoSource === "generic"
                                  ? "Generic information"
                                  : "Information"}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {loadingInfo && (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2 text-purple-600" />
                        <span className="text-purple-600 font-medium">Generating information...</span>
                      </div>
                    )}

                    {infoError && (
                      <Alert variant="destructive" className="m-4 bg-red-50 border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-600">{infoError}</AlertDescription>
                      </Alert>
                    )}

                    {instrumentInfo && (
                      <div className="divide-y divide-gray-100">
                        {parseSections(instrumentInfo).map((section, index) => (
                          <div key={index} className="bg-white">
                            <button
                              onClick={() => toggleSection(section.title)}
                              className={`w-full text-left px-6 py-4 flex justify-between items-center ${
                                section.level === 1 ? "bg-purple-50 font-bold text-lg" : "font-semibold"
                              }`}
                            >
                              <span>{section.title}</span>
                              {expandedSections[section.title] ? (
                                <ChevronUp className="h-5 w-5 text-purple-600" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-purple-600" />
                              )}
                            </button>
                            <AnimatePresence>
                              {(expandedSections[section.title] || section.level === 1) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-6 py-4 prose prose-sm max-w-none">
                                    {section.content.map((line, i) => {
                                      if (line.startsWith("- ")) {
                                        return (
                                          <div key={i} className="flex items-start mb-2">
                                            <div className="h-2 w-2 rounded-full bg-purple-500 mt-2 mr-2"></div>
                                            <p>{line.replace("- ", "")}</p>
                                          </div>
                                        )
                                      }
                                      if (line.startsWith("### ")) {
                                        return (
                                          <h4 key={i} className="font-bold mt-4 text-purple-800">
                                            {line.replace("### ", "")}
                                          </h4>
                                        )
                                      }
                                      if (line.trim() === "") return <div key={i} className="h-2"></div>
                                      return <p key={i}>{line}</p>
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
