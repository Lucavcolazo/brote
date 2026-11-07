// Traducciones: la clave es el texto en español; PT tiene la versión en portugués (Brasil).
// Para agregar un texto: usá t() con el texto en español y sumá la línea en PT. `npm run check:i18n` avisa si falta alguno.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "es" | "pt";
export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: "es", label: "Español", flag: "🇦🇷" },
  { id: "pt", label: "Português", flag: "🇧🇷" },
];

const PT: Record<string, string> = {
  // ---- Feira ----
  "Entrá a tu puesto": "Entre na sua barraca",
  "Email o contraseña incorrectos": "E-mail ou senha incorretos",
  "Demasiados intentos, esperá un minuto": "Muitas tentativas, espere um minuto",
  "No subiste fruta ni verdura el {date}": "Você não postou fruta nem verdura em {date}",
  "{name} no subió fruta ni verdura el {date}": "{name} não postou fruta nem verdura em {date}",
  "Vas ganando por {n}": "Você está ganhando por {n}",
  "Modo demo · datos inventados": "Modo demo · dados inventados",
  "Secciones": "Seções",
  "Marcador": "Placar",
  "Config": "Config",
  "Racha {n}": "Sequência {n}",
  "Gana": "Ganha",
  "Email": "E-mail",
  "Entrando…": "Entrando…",
  "¿Cómo te llamamos?": "Como a gente te chama?",
  "Empezar": "Começar",
  "Salir": "Sair",
  "Forma": "Forma",
  "Color": "Cor",
  "Ojos": "Olhos",
  "Boca": "Boca",
  "Extra": "Extra",
  "Tu avatar": "Seu avatar",
  "Deshacer cambios": "Desfazer mudanças",
  "Avatar al azar": "Avatar aleatório",
  "Parte del avatar": "Parte do avatar",
  "Cachetes": "Bochechas",
  "Notificaciones": "Notificações",
  "Notificaciones activadas": "Notificações ativadas",
  "Instalar en iPhone": "Instalar no iPhone",
  "Abrí Brote en Safari.": "Abra o Brote no Safari.",
  "Tocá Compartir.": "Toque em Compartilhar.",
  "Guardando…": "Salvando…",
  "Guardar cambios": "Salvar mudanças",
  "{name} gana por {n}": "{name} ganha por {n}",
  "Empate": "Empate",
  "Ya cumpliste hoy": "Você já cumpriu hoje",
  "Te falta hoy": "Falta você hoje",
  "{name} cumplió": "{name} cumpriu",
  "{name} no subió": "{name} não postou",
  "Todavía no hay fotos": "Ainda não tem fotos",
  "La primera foto abre el puesto.": "A primeira foto abre a barraca.",
  "Vale": "Vale",
  "No cuenta": "Não vale",
  "Foto archivada": "Foto arquivada",
  "Aprobada": "Aprovada",
  "Marcada: no cuenta": "Marcada: não vale",
  "Esperando a {name}": "Esperando {name}",
  "{name} la aprobó": "{name} aprovou",
  "{name} dice que no cuenta": "{name} disse que não vale",
  "Borrar": "Apagar",
  "Falta la foto": "Falta a foto",
  "Subida": "Postada",
  "Tipo": "Tipo",
  "Ej: manzana verde, ensalada de tomate": "Ex: maçã verde, salada de tomate",
  "Día": "Dia",
  "Ayer, hasta las 10": "Ontem, até as 10h",
  "Listo": "Pronto",
  "{name} tiene {n}": "{name} tem {n}",
  "Le debés a {name}": "Você deve para {name}",
  "Cumplido": "Cumprido",
  "Todavía no hay premios": "Ainda não tem prêmios",
  "Cargá lo que se puede ganar con puntos: una cena, elegir la peli, zafar de los platos.": "Cadastre o que dá para ganhar com pontos: um jantar, escolher o filme, escapar da louça.",
  "PTS": "PTS",
  "Canjear": "Trocar",
  "{n} pts": "{n} pts",
  "Te quedan {left} pts y a {name} le llega un aviso.": "Vão sobrar {left} pts e {name} recebe um aviso.",
  "Canjeado": "Trocado",
  "Canjear por {n} pts": "Trocar por {n} pts",
  "Menos": "Menos",
  "Más": "Mais",
  "Quitar": "Remover",
  "Ej: elijo la peli": "Ex: eu escolho o filme",
  "Cancelar": "Cancelar",
  "Desde el {date}": "Desde {date}",
  "Rachas": "Sequências",
  "día seguido": "dia seguido",
  "días seguidos": "dias seguidos",
  "Mejor racha: {n}": "Melhor sequência: {n}",
  "Esta semana": "Esta semana",
  "Cumplió": "Cumpriu",
  "Falló": "Falhou",
  "El primero llega el domingo a las 21.": "O primeiro chega no domingo às 21h.",
  "Nadie falló todavía.": "Ninguém falhou ainda.",
  "+{n} pts en la semana": "+{n} pts na semana",
  "Activadas en este celu": "Ativadas neste celular",
  "Las bloqueaste. Activalas en Ajustes del celu, Notificaciones, Brote.": "Você bloqueou. Ative em Ajustes do celular, Notificações, Brote.",
  "En iPhone primero agregá Brote a la pantalla de inicio.": "No iPhone, primeiro adicione o Brote à tela de início.",
  // login
  "¿Quién sos?": "Quem é você?",
  "Contraseña": "Senha",
  "Idioma": "Idioma",
  "Entrar": "Entrar",
  "Volver": "Voltar",
  "Falta configurar el email de {name} (VITE_{KEY}_EMAIL).": "Falta configurar o e-mail de {name} (VITE_{KEY}_EMAIL).",
  "Preparando todo…": "Preparando tudo…",
  // errores
  "No te alcanzan los puntos": "Você não tem pontos suficientes",
  "Ese premio ya no existe": "Esse prêmio não existe mais",
  "No podés revisar tu propia comida": "Você não pode avaliar sua própria comida",
  "Ese canje ya estaba cumplido": "Essa troca já foi cumprida",
  "La app ya tiene sus 2 usuarios": "O app já tem seus 2 usuários",
  "Ya no se puede cargar ese día": "Não dá mais para registrar esse dia",
  "No se pudo procesar la foto": "Não foi possível processar a foto",
  // tabs
  "Feed": "Feed",
  "Tienda": "Loja",
  "Semana": "Semana",
  "Yo": "Eu",
  "Subir comida": "Postar comida",
  "Modo demo · los datos son de mentira": "Modo demo · os dados são de mentira",
  // feed
  "Hoy": "Hoje",
  "Ayer": "Ontem",
  "¿Comieron algo verde?": "Comeram algo verde?",
  "Vos": "Você",
  "pts": "pts",
  "⏳ Todavía nada": "⏳ Ainda nada",
  "Subí lo de hoy": "Posta o de hoje",
  "Todavía no hay nada. ¡Arrancá vos!": "Ainda não tem nada. Começa você!",
  "Foto archivada (la data queda)": "Foto arquivada (os dados ficam)",
  "Foto no disponible": "Foto indisponível",
  "Marcado como que no cuenta": "Marcado como não vale",
  "cambiar": "mudar",
  "Cambiado": "Alterado",
  "borrar": "apagar",
  "¿Borrar esta comida?": "Apagar esta comida?",
  "Borrada": "Apagada",
  "Ver foto grande": "Ver foto grande",
  // nueva comida
  "¿Qué comiste?": "O que você comeu?",
  "Sacar foto": "Tirar foto",
  "Galería": "Galeria",
  "Procesando…": "Processando…",
  "Cambiar": "Trocar",
  "Fruta": "Fruta",
  "Verdura": "Verdura",
  "Las dos": "As duas",
  "Fruta + verdura": "Fruta + verdura",
  "¿Qué es?": "O que é?",
  "Ej: manzana verde, ensalada de tomate…": "Ex: maçã verde, salada de tomate…",
  "Ayer (hasta las 10)": "Ontem (até as 10h)",
  "Subir": "Postar",
  "Subiendo…": "Postando…",
  "Cerrar": "Fechar",
  // tienda
  "Canjeá tus puntos": "Troque seus pontos",
  "Tus puntos": "Seus pontos",
  "Ganás 1 punto cada día que {name} no come fruta ni verdura.": "Você ganha 1 ponto a cada dia que {name} não come fruta nem verdura.",
  "{name} te debe": "{name} te deve",
  "Canjeado {when}": "Trocado {when}",
  "Cumplí": "Cumpri",
  "Ya lo tuve": "Já recebi",
  "Marcado como cumplido": "Marcado como cumprido",
  "Premios": "Prêmios",
  "editar": "editar",
  "listo": "pronto",
  "¿Quitar \"{title}\" de la tienda?": "Remover \"{title}\" da loja?",
  "Quitado": "Removido",
  "Canjear · {cost}": "Trocar · {cost}",
  "{cost} pts": "{cost} pts",
  "Agregar premio": "Adicionar prêmio",
  "Historial": "Histórico",
  "¿Canjear?": "Trocar?",
  "Te quedan {left} pts · a {name} le llega un aviso": "Vão sobrar {left} pts · {name} recebe um aviso",
  "Canjear por {cost} pts": "Trocar por {cost} pts",
  "Canjeado {emoji}": "Trocado {emoji}",
  "Nuevo premio": "Novo prêmio",
  "Emoji": "Emoji",
  "Premio": "Prêmio",
  "Ej: helado de la esquina": "Ex: sorvete da esquina",
  "Cuesta": "Custa",
  "Agregar": "Adicionar",
  "Premio agregado": "Prêmio adicionado",
  // semana
  "Semana del {date}": "Semana de {date}",
  "Cómo vienen": "Como estão indo",
  "El domingo a la noche les llega el resumen. Las fotos se archivan el miércoles siguiente.":
    "No domingo à noite chega o resumo. As fotos são arquivadas na quarta-feira seguinte.",
  "Resúmenes": "Resumos",
  "El primero llega este domingo a las 21 hs.": "O primeiro chega neste domingo às 21h.",
  "Movimientos de puntos": "Movimentos de pontos",
  "Ajuste": "Ajuste",
  "días": "dias",
  "Nada esta semana.": "Nada nesta semana.",
  "Canje: {title}": "Troca: {title}",
  // yo
  "Editar": "Editar",
  "Nombre": "Nome",
  "Guardar": "Salvar",
  "Guardado": "Salvo",
  "En pareja con {name}": "Junto com {name}",
  "Activar notificaciones": "Ativar notificações",
  "No se activaron": "Não foram ativadas",
  "Todavía no las activaste en este celu": "Você ainda não ativou neste celular",
  "Las bloqueaste. Activalas desde Ajustes del celu > Notificaciones > Brote.":
    "Você bloqueou. Ative em Ajustes do celular > Notificações > Brote.",
  "En iPhone primero agregá la app a la pantalla de inicio (ver abajo).":
    "No iPhone, primeiro adicione o app à tela de início (veja abaixo).",
  "Este navegador no soporta notificaciones.": "Este navegador não suporta notificações.",
  "Falta configurar VITE_VAPID_PUBLIC_KEY.": "Falta configurar VITE_VAPID_PUBLIC_KEY.",
  "recordatorio si no subiste nada": "lembrete se você não postou nada",
  "última llamada": "última chamada",
  "se cierra el día anterior y se reparten puntos": "fecha o dia anterior e distribui os pontos",
  "Dom 21:00": "Dom 21:00",
  "resumen semanal": "resumo semanal",
  "Cada vez que tu pareja sube algo o canjea un premio": "Toda vez que seu par posta algo ou troca um prêmio",
  "Abrí la app en Safari.": "Abra o app no Safari.",
  "Tocá Compartir (el cuadrado con la flecha).": "Toque em Compartilhar (o quadrado com a seta).",
  "Elegí Agregar a pantalla de inicio.": "Escolha Adicionar à Tela de Início.",
  "Abrila desde el ícono y activá las notificaciones acá.": "Abra pelo ícone e ative as notificações aqui.",
  "Cerrar sesión": "Sair",
  "Brote · las fotos se archivan solas cada miércoles, los puntos y comidas quedan.":
    "Brote · as fotos são arquivadas toda quarta, os pontos e comidas ficam.",
  // tiempos
  "recién": "agora",
  "hace {n} min": "há {n} min",
  "hace {n} h": "há {n} h",
  "ayer": "ontem",
  "hace {n} días": "há {n} dias",
};

export const DICTS: Record<Lang, Record<string, string>> = { es: {}, pt: PT };

export type T = (key: string, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Los errores de la base vienen como códigos; acá se pasan a texto. */
export function errorKey(raw: string): string {
  if (/not_enough_points/.test(raw)) return "No te alcanzan los puntos";
  if (/item_not_found/.test(raw)) return "Ese premio ya no existe";
  if (/cannot_review/.test(raw)) return "No podés revisar tu propia comida";
  if (/not_pending/.test(raw)) return "Ese canje ya estaba cumplido";
  if (/app_full/.test(raw)) return "La app ya tiene sus 2 usuarios";
  if (/Invalid login credentials/i.test(raw)) return "Email o contraseña incorrectos";
  if (/rate limit|too many/i.test(raw)) return "Demasiados intentos, esperá un minuto";
  if (/row-level security/i.test(raw)) return "Ya no se puede cargar ese día";
  return raw;
}

const STORAGE_KEY = "brote-lang";

export function storedLang(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "es" || v === "pt" ? v : null;
  } catch {
    return null;
  }
}

interface I18n {
  lang: Lang;
  locale: string;
  setLang: (l: Lang) => void;
  t: T;
}

const Ctx = createContext<I18n>({ lang: "es", locale: "es-AR", setLang: () => {}, t: (k) => k });
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => storedLang() ?? (navigator.language.startsWith("pt") ? "pt" : "es"));
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l === "pt" ? "pt-BR" : "es";
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* sin storage */
    }
  }, []);
  const value = useMemo<I18n>(
    () => ({ lang, setLang, locale: lang === "pt" ? "pt-BR" : "es-AR", t: (k, v) => translate(lang, k, v) }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
