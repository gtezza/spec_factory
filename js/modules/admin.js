/**
 * Spec Factory | Panel de Administración y Aprobaciones
 */

import { state, elements } from './state.js';
import { showToast } from './ui.js';
import { sbClient } from './supabase.js';

export function initAdmin() {
    console.log('Inicializando módulo de Administración de Gobernanza...');
}

export async function loadAdminTriage() {
    console.log('Cargando solicitudes de triage en administración...');
}
