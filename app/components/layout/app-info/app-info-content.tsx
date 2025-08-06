import Image from "next/image"

export function AppInfoContent() {
  return (
    <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
      <div className="space-y-6 p-1">
        {/* Header with Logo */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-3 shadow-lg">
            <Image 
              src="/logocleo.png" 
              alt="Cleo Logo" 
              width={80}
              height={80}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-xl font-bold">Cleo</h3>
            <p className="text-muted-foreground text-sm">by Huminary Labs</p>
          </div>
        </div>

        {/* Main Description */}
        <div className="text-center">
          <p className="text-foreground leading-relaxed text-base">
            An emotionally intelligent AI assistant created to make your daily life easier and more fulfilling.
          </p>
        </div>
        
        {/* Mission, Vision, Building sections */}
        <div className="space-y-5">
          <div className="bg-muted/30 rounded-lg p-4 border">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Our Mission
            </h4>
            <p className="text-foreground/90 leading-relaxed text-sm">
              We believe AI should be more than just smart—it should be empathetic, 
              supportive, and genuinely helpful in making everyday tasks manageable and meaningful.
            </p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4 border">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              What We&apos;re Building
            </h4>
            <p className="text-foreground/90 leading-relaxed text-sm">
              Cleo combines cutting-edge AI technology with emotional intelligence 
              to create a personal assistant that understands not just what you need, but how you feel. 
              Whether you&apos;re managing tasks, seeking guidance, or simply need someone to talk 
              through ideas with, Cleo is designed to be your trusted daily companion.
            </p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4 border">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Our Vision
            </h4>
            <p className="text-foreground/90 leading-relaxed text-sm">
              We envision a future where AI assistants don&apos;t just process information—they 
              provide genuine support, encouragement, and practical solutions that help people 
              thrive in their personal and professional lives.
            </p>
          </div>
        </div>

        {/* Technical Features */}
        <div className="bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg p-4 border">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            Technical Features
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 bg-current rounded-full opacity-60"></span>
              <span className="text-foreground/80">Multi-model support (Claude, OpenAI, Gemini, local models)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 bg-current rounded-full opacity-60"></span>
              <span className="text-foreground/80">BYOK-ready and fully self-hostable</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 bg-current rounded-full opacity-60"></span>
              <span className="text-foreground/80">Advanced emotional intelligence capabilities</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 bg-current rounded-full opacity-60"></span>
              <span className="text-foreground/80">Privacy-focused with end-to-end encryption</span>
            </div>
          </div>
        </div>

        {/* GitHub Link */}
        <div className="text-center pt-2 border-t">
          <p className="text-foreground/80 text-sm">
            The code is available on{" "}
            <a
              href="https://github.com/LuisNSantana/cleo-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <span>GitHub</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
