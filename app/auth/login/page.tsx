export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold mb-4">Connexion</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        1 compte par foyer — le responsable gère tous les profils.
      </p>
      {/* TODO: formulaire email/mot de passe via supabase.auth.signInWithPassword */}
    </div>
  );
}
