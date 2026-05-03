/**
 * Spec Factory | Cliente Supabase Centralizado
 * Evita la creación de múltiples instancias de GoTrueClient
 */

const SUPABASE_URL = APP_CONFIG.SUPABASE.URL;
const SUPABASE_KEY = APP_CONFIG.SUPABASE.ANON_KEY;

// Inicialización única
export const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export default sbClient;
