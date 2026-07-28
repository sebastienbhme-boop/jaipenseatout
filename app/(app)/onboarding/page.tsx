export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-4">Bienvenue</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Étape 1 : indiquez votre commune pour découvrir les risques qui vous
        concernent, puis créez les profils des membres de votre foyer.
      </p>
      {/* TODO: formulaire commune (autocomplete INSEE) + création du foyer + profils */}
    </div>
  );
}
