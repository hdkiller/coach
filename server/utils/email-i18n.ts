export const LOCALIZED_SUBJECTS: Record<string, Record<string, string>> = {
  Welcome: {
    en: 'Welcome to Coach Watts!',
    hu: 'Üdvözlünk a Coach Watts platformon!',
    de: 'Willkommen bei Coach Watts!',
    es: '¡Bienvenido a Coach Watts!',
    fr: 'Bienvenue sur Coach Watts !'
  },
  WorkoutReceived: {
    en: 'Great shift: your workout is in the books',
    hu: 'Jó edzés: rögzítettük a legutóbbi edzésedet',
    de: 'Gute Leistung: Dein Training wurde erfasst',
    es: 'Gran trabajo: tu entrenamiento ha sido registrado',
    fr: 'Bravo : votre séance van bien été enregistrée'
  },
  WorkoutAnalysisReady: {
    en: 'Excellent work: your workout analysis is ready',
    hu: 'Kiváló munka: elkészült az edzésed elemzése',
    de: 'Hervorragend: Deine Trainingsanalyse ist fertig',
    es: 'Excelente trabajo: tu análisis de entrenamiento está listo',
    fr: 'Excellent travail : votre analyse de séance est prête'
  },
  ThresholdUpdateDetected: {
    en: 'Level Up! New Threshold Detected',
    hu: 'Szintlépés! Új küszöbértéket detektáltunk',
    de: 'Level Up! Neuer Schwellenwert erkannt',
    es: '¡Nivel arriba! Nuevo umbral detectado',
    fr: 'Niveau supérieur ! Nouveau seuil détecté'
  },
  DailyRecommendation: {
    en: "Today's Training",
    hu: 'Mai edzésajánlás',
    de: 'Heutiges Training',
    es: 'Entrenamiento de hoy',
    fr: 'Entraînement du jour'
  },
  SubscriptionStarted: {
    en: 'Welcome to Coach Watts Pro!',
    hu: 'Üdvözlünk a Coach Watts Pro-ban!',
    de: 'Willkommen bei Coach Watts Pro!',
    es: '¡Bienvenido a Coach Watts Pro!',
    fr: 'Bienvenue sur Coach Watts Pro !'
  },
  AccountDeletionScheduled: {
    en: 'Your Coach Watts account deletion has been scheduled',
    hu: 'Fiókod törlése ütemezve lett a Coach Watts rendszerében',
    de: 'Löschung Deines Coach Watts Kontos wurde geplant',
    es: 'Se ha programado la eliminación de tu cuenta en Coach Watts',
    fr: 'La suppression de votre compte Coach Watts a été programmée'
  },
  TrialEndingSoon: {
    en: 'Your Coach Watts performance trial ends soon',
    hu: 'Hamarosan véget ér a Coach Watts próbaidőszakod',
    de: 'Dein Coach Watts Testzeitraum endet bald',
    es: 'Tu prueba de rendimiento en Coach Watts termina pronto',
    fr: "Votre période d'essai Coach Watts se termine bientôt"
  },
  PaymentFailed: {
    en: 'Action Required: Payment failed for your Coach Watts subscription',
    hu: 'Intézkedés szükséges: Sikertelen fizetés a Coach Watts előfizetésednél',
    de: 'Handlungsbedarf: Zahlung für Dein Coach Watts Abonnement fehlgeschlagen',
    es: 'Acción requerida: Pago fallido para tu suscripción de Coach Watts',
    fr: 'Action requise : Échec du paiement de votre abonnement Coach Watts'
  },
  PaymentSucceeded: {
    en: 'Receipt for your Coach Watts subscription payment',
    hu: 'Bizonylat a Coach Watts előfizetési fizetésedről',
    de: 'Quittung für Deine Coach Watts Abonnementzahlung',
    es: 'Recibo de tu pago de suscripción a Coach Watts',
    fr: 'Reçu de paiement pour votre abonnement Coach Watts'
  },
  SubscriptionCanceled: {
    en: 'Your Coach Watts subscription has been canceled',
    hu: 'Coach Watts előfizetésed törölve lett',
    de: 'Dein Coach Watts Abonnement wurde gekündigt',
    es: 'Tu suscripción a Coach Watts ha sido cancelada',
    fr: 'Votre abonnement Coach Watts a été annulé'
  },
  CoachInvite: {
    en: 'You have been invited to Coach Watts',
    hu: 'Meghívást kaptál a Coach Watts platformra',
    de: 'Du wurdest zu Coach Watts eingeladen',
    es: 'Has sido invitado a Coach Watts',
    fr: 'Vous avez été invité sur Coach Watts'
  },
  TeamInvite: {
    en: 'You have been invited to join a team on Coach Watts',
    hu: 'Meghívást kaptál egy csapathoz a Coach Watts rendszerében',
    de: 'Du wurdest eingeladen, einem Team auf Coach Watts beizutreten',
    es: 'Has sido invitado a unirte a un equipo en Coach Watts',
    fr: 'Vous avez été invité à rejoindre une équipe sur Coach Watts'
  },
  OnboardingDripDay2: {
    en: 'Connect your training apps to unlock Coach Watts',
    hu: 'Csatlakoztasd az edzésalkalmazásaidat a Coach Watts használatához',
    de: 'Verbinde Deine Trainings-Apps, um Coach Watts freizuschalten',
    es: 'Conecta tus aplicaciones de entrenamiento para desbloquear Coach Watts',
    fr: "Connectez vos applications d'entraînement pour débloquer Coach Watts"
  },
  OnboardingDripDay7: {
    en: 'How was your first week with Coach Watts?',
    hu: 'Hogy telt az első heted a Coach Watts-szal?',
    de: 'Wie war Deine erste Woche bei Coach Watts?',
    es: '¿Cómo fue tu primera semana con Coach Watts?',
    fr: "Comment s'est passée votre première semaine avec Coach Watts ?"
  },
  MarketingBroadcast: {
    en: 'Coach Watts Update',
    hu: 'Coach Watts frissítés',
    de: 'Coach Watts Update',
    es: 'Actualización de Coach Watts',
    fr: 'Mise à jour Coach Watts'
  }
}

export function resolveEmailSubject(
  templateKey: string,
  lang?: string | null,
  fallbackSubject?: string
): string {
  const normLang = (lang || 'en').toLowerCase().slice(0, 2)
  const templateSubjects = LOCALIZED_SUBJECTS[templateKey]

  if (templateSubjects && templateSubjects[normLang]) {
    return templateSubjects[normLang]
  }

  if (templateSubjects && templateSubjects.en) {
    return templateSubjects.en
  }

  return fallbackSubject || 'Coach Watts'
}
