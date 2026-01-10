"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useI18n } from "@/lib/i18n"

const icons = [
  { name: "Google", src: "/icons/google.png", size: 40, radius: 100, duration: 25, delay: 0 },
  { name: "Gmail", src: "/icons/gmail-icon.svg", size: 36, radius: 100, duration: 25, delay: 4 },
  { name: "Drive", src: "/icons/google-drive.svg", size: 36, radius: 100, duration: 25, delay: 8 },
  { name: "Docs", src: "/icons/google_docs.png", size: 36, radius: 100, duration: 25, delay: 12 },
  { name: "Sheets", src: "/icons/sheets.png", size: 36, radius: 100, duration: 25, delay: 16 },
  { name: "Slides", src: "/icons/slides.png", size: 36, radius: 100, duration: 25, delay: 20 },
  
  { name: "X", src: "/icons/x_twitter.png", size: 32, radius: 180, duration: 35, delay: 0 },
  { name: "Telegram", src: "/icons/telegram.png", size: 36, radius: 180, duration: 35, delay: 5 },
  { name: "Notion", src: "/icons/notion-icon.svg", size: 36, radius: 180, duration: 35, delay: 10 },
  { name: "Outlook", src: "/icons/outlook.png", size: 36, radius: 180, duration: 35, delay: 15 },
  { name: "Dropbox", src: "/icons/dropbox.png", size: 36, radius: 180, duration: 35, delay: 20 },
  { name: "Shopify", src: "/icons/shopify.png", size: 36, radius: 180, duration: 35, delay: 25 },
  { name: "WordPress", src: "/icons/wordpress.png", size: 36, radius: 180, duration: 35, delay: 30 },
]

export function IntegrationsSection() {
  const { t, locale } = useI18n()

  // Inline translations for integrations section
  const integrationsText = {
    title: locale === 'es' ? 'Integra con tus herramientas favoritas' 
         : locale === 'pt' ? 'Integre com suas ferramentas favoritas'
         : 'Integrate with your favorite tools',
    description: locale === 'es' 
      ? 'Conecta Ankie con las apps que usas cada día. Automatiza flujos de trabajo en todo tu ecosistema.'
      : locale === 'pt'
      ? 'Conecte Ankie com os apps que você usa todos os dias. Automatize fluxos de trabalho em todo o seu ecossistema.'
      : 'Connect Ankie with the apps you use every day. Automate workflows across your entire ecosystem.',
    description2: locale === 'es'
      ? 'Ya sea sincronizando documentos, gestionando emails o actualizando tu CRM, los agentes de Ankie trabajan perfectamente con tus herramientas existentes.'
      : locale === 'pt'
      ? 'Seja sincronizando documentos, gerenciando emails ou atualizando seu CRM, os agentes Ankie trabalham perfeitamente com suas ferramentas existentes.'
      : "Whether it's syncing documents, managing emails, or updating your CRM, Ankie's agents work seamlessly with your existing tools.",
  }

  return (
    <section className="relative w-full overflow-hidden bg-background py-24 sm:py-32">
      <div className="container relative mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <motion.h2 
            className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span suppressHydrationWarning>{integrationsText.title}</span>
          </motion.h2>
          <motion.p 
            className="mx-auto max-w-2xl text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <span suppressHydrationWarning>{integrationsText.description}</span>
            <br className="hidden sm:block" />
            <span suppressHydrationWarning>{integrationsText.description2}</span>
          </motion.p>
        </div>

        <div className="relative flex min-h-[450px] items-center justify-center">
          {/* Central Logo */}
          <motion.div 
            className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-2xl shadow-brand-cyan/20 ring-1 ring-black/5 dark:bg-[#0C1020] dark:ring-white/10"
            initial={{ scale: 0.5, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 0.8 }}
          >
            <Image 
              src="/img/logoankie.png" 
              alt="Ankie" 
              width={64} 
              height={64} 
              className="h-16 w-auto object-contain"
            />
            
            {/* Pulse effect */}
            <div className="absolute inset-0 -z-10 animate-ping rounded-3xl bg-brand-cyan/20 duration-3000" />
          </motion.div>

          {/* Orbits */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Inner Orbit */}
            <div className="absolute h-[200px] w-[200px] rounded-full border border-dashed border-border/60 opacity-50" />
            
            {/* Outer Orbit */}
            <div className="absolute h-[360px] w-[360px] rounded-full border border-dashed border-border/60 opacity-50" />

            {/* Icons */}
            {icons.map((icon, index) => (
              <OrbitingIcon key={icon.name} icon={icon} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function OrbitingIcon({ icon }: { icon: typeof icons[0] }) {
  return (
    <motion.div
      className="absolute flex items-center justify-center"
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: icon.duration,
        repeat: Infinity,
        ease: "linear",
        delay: -icon.delay * (icon.duration / (icon.radius === 140 ? 6 : 7)), // Distribute evenly based on count
      }}
      style={{
        width: icon.radius * 2,
        height: icon.radius * 2,
      }}
    >
      <motion.div
        className="absolute top-0 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/20 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-[#0C1020]/80 dark:border-white/10"
        style={{ width: icon.size + 16, height: icon.size + 16 }}
        // Counter-rotate to keep icon upright
        animate={{ rotate: -360 }}
        transition={{ duration: icon.duration, repeat: Infinity, ease: "linear" }}
      >
        <Image
          src={icon.src}
          alt={icon.name}
          width={icon.size}
          height={icon.size}
          className="object-contain"
        />
      </motion.div>
    </motion.div>
  )
}
