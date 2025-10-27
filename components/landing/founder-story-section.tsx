"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Sparkles, Heart, Lightbulb, Rocket, Code, Users } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export function FounderStorySection() {
  const { t, locale } = useI18n()

  const timeline = [
    {
      date: locale === 'es' ? 'Agosto 2024' : locale === 'pt' ? 'Agosto 2024' : locale === 'fr' ? 'Août 2024' : 'August 2024',
      icon: Lightbulb,
      title: locale === 'es' ? 'La Chispa' : locale === 'pt' ? 'A Centelha' : locale === 'fr' ? 'L\'Étincelle' : 'The Spark',
      description: locale === 'es' 
        ? 'Una madrugada en Madrid, pensando en cómo hacer la vida de las personas más fácil. La idea de un asistente emocional nació.'
        : locale === 'pt'
        ? 'Uma madrugada em Madrid, pensando em como tornar a vida das pessoas mais fácil. A ideia de um assistente emocional nasceu.'
        : locale === 'fr'
        ? 'Une nuit à Madrid, en pensant à comment rendre la vie des gens plus facile. L\'idée d\'un assistant émotionnel est née.'
        : 'A late night in Madrid, thinking about how to make people\'s lives easier. The idea of an emotional assistant was born.',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      date: locale === 'es' ? 'Sep - Nov 2024' : locale === 'pt' ? 'Set - Nov 2024' : locale === 'fr' ? 'Sep - Nov 2024' : 'Sep - Nov 2024',
      icon: Code,
      title: locale === 'es' ? 'El Despertar' : locale === 'pt' ? 'O Despertar' : locale === 'fr' ? 'L\'Éveil' : 'The Awakening',
      description: locale === 'es'
        ? '2.5 meses construyendo Cleo v1.0. Sin darme cuenta, había creado un agente antes de que el concepto fuera popular.'
        : locale === 'pt'
        ? '2,5 meses construindo Cleo v1.0. Sem perceber, criei um agente antes que o conceito se tornasse popular.'
        : locale === 'fr'
        ? '2,5 mois à construire Cleo v1.0. Sans m\'en rendre compte, j\'avais créé un agent avant que le concept ne soit populaire.'
        : '2.5 months building Cleo v1.0. Without realizing it, I had created an agent before the concept became popular.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      date: locale === 'es' ? 'Principios 2025' : locale === 'pt' ? 'Início de 2025' : locale === 'fr' ? 'Début 2025' : 'Early 2025',
      icon: Users,
      title: locale === 'es' ? 'Huminary Labs' : 'Huminary Labs',
      description: locale === 'es'
        ? 'Lancé Huminary Labs, una startup dedicada a desarrollar agentes que faciliten la vida de las personas.'
        : locale === 'pt'
        ? 'Lancei Huminary Labs, uma startup dedicada a desenvolver agentes que facilitem a vida das pessoas.'
        : locale === 'fr'
        ? 'J\'ai lancé Huminary Labs, une startup dédiée au développement d\'agents qui facilitent la vie des gens.'
        : 'Launched Huminary Labs, a startup dedicated to developing agents that make people\'s lives easier.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      date: locale === 'es' ? 'Octubre 2025' : locale === 'pt' ? 'Outubro 2025' : locale === 'fr' ? 'Octobre 2025' : 'October 2025',
      icon: Rocket,
      title: locale === 'es' ? 'Cleo v3.0' : 'Cleo v3.0',
      description: locale === 'es'
        ? 'Después de meses de investigación y desarrollo, nace la versión que estás probando hoy. Un equipo completo de agentes especializados.'
        : locale === 'pt'
        ? 'Após meses de pesquisa e desenvolvimento, nasce a versão que você está testando hoje. Uma equipe completa de agentes especializados.'
        : locale === 'fr'
        ? 'Après des mois de recherche et développement, la version que vous testez aujourd\'hui est née. Une équipe complète d\'agents spécialisés.'
        : 'After months of research and development, the version you\'re testing today is born. A complete team of specialized agents.',
      color: 'from-green-500 to-emerald-500'
    }
  ]

  const title = locale === 'es' ? 'La Historia Detrás de Cleo' 
    : locale === 'pt' ? 'A História Por Trás de Cleo'
    : locale === 'fr' ? 'L\'Histoire Derrière Cleo'
    : 'The Story Behind Cleo'

  const subtitle = locale === 'es' ? 'De una idea nocturna en Madrid a tu asistente de IA favorito'
    : locale === 'pt' ? 'De uma ideia noturna em Madrid ao seu assistente de IA favorito'
    : locale === 'fr' ? 'D\'une idée nocturne à Madrid à votre assistant IA préféré'
    : 'From a late-night idea in Madrid to your favorite AI assistant'

  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-gradient-to-b from-background via-muted/20 to-background py-24 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 blur-3xl opacity-20">
          <div className="h-[500px] w-[800px] rounded-full bg-gradient-to-r from-primary/30 via-purple-500/30 to-pink-500/30" />
        </div>
      </div>

  <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
            whileHover={{ scale: 1.05 }}
          >
            <Heart className="h-4 w-4" />
            <span>{locale === 'es' ? 'Nuestra Historia' : locale === 'pt' ? 'Nossa História' : locale === 'fr' ? 'Notre Histoire' : 'Our Story'}</span>
          </motion.div>

          <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {subtitle}
          </p>
        </motion.div>

        {/* Intro narrative – focus on the story, not the name */}
        <motion.div
          className="mx-auto mt-16 max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/30 to-background/50 p-8 backdrop-blur-sm">
            <div className="prose prose-invert mx-auto max-w-none">
              <p className="text-lg leading-relaxed text-foreground/90">
                {locale === 'es'
                  ? 'Agosto de 2024, Madrid. Una de esas noches donde no puedes dormir porque tienes una idea dando vueltas en la cabeza. Me preguntaba: ¿y si existiera algo que realmente te entienda? No solo que procese lo que dices, sino que capte lo que necesitas.'
                  : locale === 'pt'
                  ? 'Agosto de 2024, Madrid. Uma daquelas noites em que você não consegue dormir porque tem uma ideia girando na cabeça. Me perguntava: e se existisse algo que realmente te entenda? Não apenas processe o que você diz, mas capte o que você precisa.'
                  : locale === 'fr'
                  ? 'Août 2024, Madrid. Une de ces nuits où vous ne pouvez pas dormir parce qu\'une idée tourne dans votre tête. Je me demandais : et si quelque chose vous comprenait vraiment ? Pas seulement traiter ce que vous dites, mais saisir ce dont vous avez besoin.'
                  : 'August 2024, Madrid. One of those nights when you can\'t sleep because an idea keeps spinning in your head. I wondered: what if something could truly understand you? Not just process what you say, but grasp what you need.'}
              </p>
              <p className="mt-4 text-lg leading-relaxed text-foreground/80">
                {locale === 'es'
                  ? 'Empecé construyendo un asistente emocional. Quería que fuera cercano, humano, cálido. Pero mientras lo construía, pasó algo que no esperaba. No era solo un chat que respondía—era algo que tomaba acción, que resolvía problemas de verdad, que convertía tus ideas en realidad.'
                  : locale === 'pt'
                  ? 'Comecei construindo um assistente emocional. Queria que fosse próximo, humano, caloroso. Mas enquanto o construía, aconteceu algo que eu não esperava. Não era apenas um chat que respondia—era algo que tomava ação, que resolvia problemas de verdade, que convertia suas ideias em realidade.'
                  : locale === 'fr'
                  ? 'J\'ai commencé par construire un assistant émotionnel. Je voulais qu\'il soit proche, humain, chaleureux. Mais pendant que je le construisais, quelque chose s\'est produit que je n\'attendais pas. Ce n\'était pas seulement un chat qui répondait—c\'était quelque chose qui prenait des mesures, qui résolvait de vrais problèmes, qui transformait vos idées en réalité.'
                  : 'I started building an emotional assistant. I wanted it to be close, human, warm. But while building it, something happened that I didn\'t expect. It wasn\'t just a chat that responded—it was something that took action, that solved real problems, that turned your ideas into reality.'}
              </p>
              <p className="mt-4 text-lg leading-relaxed text-foreground/80">
                {locale === 'es'
                  ? 'Pasé dos meses y medio viviendo y respirando código. Pruebas, errores, más pruebas. Sin darme cuenta, había creado un agente antes de que todo el mundo empezara a hablar de agentes. Luego paré. Respiré. Investigué. Aprendí de los mejores. Me di cuenta de que esto podía ser mucho más grande.'
                  : locale === 'pt'
                  ? 'Passei dois meses e meio vivendo e respirando código. Testes, erros, mais testes. Sem perceber, tinha criado um agente antes de todo mundo começar a falar de agentes. Então parei. Respirei. Pesquisei. Aprendi com os melhores. Percebi que isso poderia ser muito maior.'
                  : locale === 'fr'
                  ? 'J\'ai passé deux mois et demi à vivre et respirer du code. Tests, erreurs, plus de tests. Sans m\'en rendre compte, j\'avais créé un agent avant que tout le monde ne commence à parler d\'agents. Puis j\'ai arrêté. Respiré. Recherché. Appris des meilleurs. J\'ai réalisé que cela pouvait être beaucoup plus grand.'
                  : 'I spent two and a half months living and breathing code. Tests, errors, more tests. Without realizing it, I had created an agent before everyone started talking about agents. Then I stopped. Breathed. Researched. Learned from the best. I realized this could be much bigger.'}
              </p>
              <p className="mt-4 text-lg leading-relaxed text-primary font-medium">
                {locale === 'es'
                  ? 'Y entonces me pregunté: ¿por qué conformarse con un solo agente cuando puedes tener todo un equipo? Así nació Huminary Labs y la visión de Cleo v3.0. Agentes que se especializan, que colaboran entre ellos, que se pasan tareas como lo haría tu equipo de trabajo ideal. Pero mejor. Sin límites. Sin horarios. Siempre listos.'
                  : locale === 'pt'
                  ? 'E então me perguntei: por que se contentar com um único agente quando você pode ter uma equipe inteira? Assim nasceu a Huminary Labs e a visão de Cleo v3.0. Agentes que se especializam, que colaboram entre si, que passam tarefas como sua equipe de trabalho ideal faria. Mas melhor. Sem limites. Sem horários. Sempre prontos.'
                  : locale === 'fr'
                  ? 'Et puis je me suis demandé : pourquoi se contenter d\'un seul agent quand vous pouvez avoir toute une équipe ? Ainsi sont nés Huminary Labs et la vision de Cleo v3.0. Des agents qui se spécialisent, qui collaborent entre eux, qui se passent des tâches comme le ferait votre équipe de travail idéale. Mais mieux. Sans limites. Sans horaires. Toujours prêts.'
                  : 'And then I asked myself: why settle for just one agent when you can have a whole team? That\'s how Huminary Labs and the vision of Cleo v3.0 were born. Agents that specialize, that collaborate with each other, that hand off tasks like your ideal work team would. But better. Without limits. Without schedules. Always ready.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Timeline */}
        <div className="mx-auto mt-20 max-w-5xl">
          <div className="space-y-8">
            {timeline.map((item, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className={`flex items-start gap-6 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Icon */}
                  <motion.div
                    className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <item.icon className="h-8 w-8 text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className={`flex-1 rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm ${index % 2 === 0 ? 'text-left' : 'text-right'}`}>
                    <div className="mb-2 text-sm font-semibold text-primary">
                      {item.date}
                    </div>
                    <h4 className="mb-2 text-xl font-bold">{item.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Connecting line */}
                {index < timeline.length - 1 && (
                  <div className={`absolute top-20 h-12 w-px bg-gradient-to-b from-border to-transparent ${index % 2 === 0 ? 'left-8' : 'right-8'}`} />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Closing reflection - quote with avatar signature below */}
        <motion.div
          className="relative mx-auto mt-20 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 p-10 backdrop-blur-sm">
            {/* Quote */}
            <blockquote className="text-center">
              <p className="text-xl sm:text-2xl italic font-medium text-foreground/90 leading-relaxed">
                {locale === 'es'
                  ? '"De un asistente emocional a un equipo completo de agentes especializados. De una idea nocturna a una plataforma que transforma vidas. Lo que ves hoy es solo el comienzo. El futuro del trabajo ya está aquí, y tiene nombre: Cleo."'
                  : locale === 'pt'
                  ? '"De um assistente emocional a uma equipe completa de agentes especializados. De uma ideia noturna a uma plataforma que transforma vidas. O que você vê hoje é apenas o começo. O futuro do trabalho já está aqui, e tem nome: Cleo."'
                  : locale === 'fr'
                  ? '"D\'un assistant émotionnel à une équipe complète d\'agents spécialisés. D\'une idée nocturne à une plateforme qui transforme des vies. Ce que vous voyez aujourd\'hui n\'est que le début. L\'avenir du travail est déjà là, et il a un nom : Cleo."'
                  : '"From an emotional assistant to a complete team of specialized agents. From a late-night idea to a platform transforming lives. What you see today is just the beginning. The future of work is already here, and it has a name: Cleo."'}
              </p>
            </blockquote>

            {/* Avatar and name signature - BELOW the quote */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="relative">
                {/* Subtle glow effect */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary/30 via-purple-500/20 to-pink-500/20 blur-md" />
                <Avatar className="relative size-12 border-2 border-background/80 shadow-lg">
                  <AvatarImage src="/img/ceo_profile.jpeg" alt="Luis Nayib Santana" className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-sm font-semibold">LN</AvatarFallback>
                </Avatar>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground/90">Luis Nayib Santana</p>
                <p className="text-xs text-muted-foreground">
                  {locale === 'es' ? 'Fundador, Huminary Labs' 
                    : locale === 'pt' ? 'Fundador, Huminary Labs'
                    : locale === 'fr' ? 'Fondateur, Huminary Labs'
                    : 'Founder, Huminary Labs'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
