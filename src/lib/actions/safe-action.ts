/* En producción, Next.js oculta a propósito el mensaje real de cualquier
   error que escape sin atrapar de un Server Action — lo cambia por
   "Minified React error #441" con solo un digest, para no filtrar detalles
   del servidor al cliente. Es la razón por la que ActionFeedbackForm podía
   atrapar el error pero mostrar un texto genérico e inútil: el mensaje ya
   venía borrado antes de llegar al cliente.

   La única forma de que el mensaje real llegue es no dejar que el error
   cruce esa frontera como una promesa rechazada: se atrapa aquí, dentro del
   propio Server Action, y se devuelve como dato normal. `redirect()` de
   Next.js también lanza (así implementa la redirección), así que ese caso
   se vuelve a lanzar para no romperlo. */

export type ActionResult = { error?: string } | void;

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function safeAction<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void>,
): (...args: Args) => Promise<ActionResult> {
  return async (...args: Args) => {
    try {
      await fn(...args);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      return {
        error:
          error instanceof Error && error.message
            ? error.message
            : "No se pudo guardar el cambio. No se aplicó ningún cambio.",
      };
    }
  };
}
