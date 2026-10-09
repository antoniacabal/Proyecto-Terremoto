/* Base de datos del mapa de apoyo

    Reglas para agregar o cambiar un recurso:
    - Solo datos reales, revisados en la página oficial de la institución o en un medio confiable.
    - Cada recurso guarda su fuente y la fecha en que se revisó. Si un dato no se pudo confirmar, se deja en null
      (la tarjeta le pide a la persona que llame antes de ir) en vez de inventarlo.
    - Las coordenadas salen de OpenStreetMap (búsqueda por nombre de la institución). aprox: true = punto aproximado.

    tipo: psicologica | emergencia | hospital | desastres | apoyo
*/

export const REVISADO = '6 de octubre de 2026'

export const TIPOS = {
    psicologica: { nombre: 'Atención psicológica', icono: '🧠' },
    emergencia: { nombre: 'Atención de emergencia', icono: '🚑' },
    hospital: { nombre: 'Hospital / centro de salud', icono: '🏥' },
    desastres: { nombre: 'Atención y prevención de desastres', icono: '🧯' },
    apoyo: { nombre: 'Línea o institución de apoyo', icono: '🤝' }
}

// Filtros de arriba del mapa: cada uno muestra uno o varios tipos
export const FILTROS = [
    { id: 'todos', nombre: 'Todos', tipos: Object.keys(TIPOS) },
    { id: 'psicologico', nombre: 'Apoyo psicológico', tipos: ['psicologica', 'apoyo'] },
    { id: 'salud', nombre: 'Salud', tipos: ['hospital'] },
    { id: 'emergencias', nombre: 'Emergencias', tipos: ['emergencia'] },
    { id: 'prevencion', nombre: 'Prevención', tipos: ['desastres'] }
]

// Lugares con dirección (van en el mapa)
// telefonos: [texto que se ve, número para marcar]
export const LUGARES = [
    {
        id: 'psiquiatrico', tipo: 'psicologica',
        nombre: 'Hospital Psiquiátrico Universitario del Valle',
        direccion: 'Calle 5 # 80-00, Cali',
        telefonos: [['(602) 322 3232', '+576023223232'], ['WhatsApp citas: 316 294 2701', 'https://wa.me/573162942701']],
        horario: 'Oficinas: lunes y viernes de 7:30 a. m. a 5:00 p. m.; martes a jueves de 7:30 a. m. a 5:30 p. m.',
        nota: 'Hospital público especializado en salud mental.',
        web: 'https://psiquiatricocali.gov.co/wp/',
        lat: 3.3877108, lng: -76.5455656,
        fuente: ['Página oficial del hospital', 'https://psiquiatricocali.gov.co/wp/']
    },
    {
        id: 'ucc', tipo: 'psicologica',
        nombre: 'Consultorio psicológico · Universidad Cooperativa de Colombia',
        direccion: 'Carrera 73 # 2A-80, barrio Buenos Aires, Cali',
        telefonos: [['(602) 486 4444, ext. 2600', '+576024864444,2600']],
        horario: 'Durante el periodo académico, con cita previa.',
        nota: 'Atención psicológica gratuita, hasta seis meses, por estudiantes en práctica supervisados por docentes.',
        web: null,
        lat: 3.3907428, lng: -76.5509161,
        fuente: ['El País Cali (2024)', 'https://www.elpais.com.co/cali-incluyente/atencion-psicologica-gratuita-para-todos-y-todas-2808.html']
    },
    {
        id: 'huv', tipo: 'hospital',
        nombre: 'Hospital Universitario del Valle «Evaristo García»',
        direccion: 'Calle 5 # 36-08, San Fernando, Cali',
        telefonos: [['(602) 620 6000', '+576026206000']],
        horario: null,
        nota: 'Hospital público de alta complejidad con urgencias. Tras el sismo del 10 de agosto funciona con capacidad reducida mientras avanza su reconstrucción.',
        web: 'https://www.huv.gov.co/',
        lat: 3.4301834, lng: -76.5454401,
        fuente: ['El País Cali (octubre de 2026)', 'https://www.elpais.com.co/cali/el-huv-recupera-el-70-de-sus-camas-tras-el-terremoto-y-avanza-en-su-plan-de-reconstruccion-0216.html']
    },
    {
        id: 'lili', tipo: 'hospital',
        nombre: 'Fundación Valle del Lili',
        direccion: 'Carrera 98 # 18-49, Cali',
        telefonos: [['(602) 331 9090', '+576023319090'], ['320 880 2830 (solo llamadas)', '+573208802830']],
        horario: 'Atención al usuario por celular 24 horas, todos los días. Línea general: lunes a viernes de 7:00 a. m. a 5:00 p. m.',
        nota: 'Clínica de alta complejidad con servicio de urgencias.',
        web: 'https://valledellili.org/',
        lat: 3.3727612, lng: -76.526125,
        fuente: ['Página oficial de la clínica', 'https://valledellili.org/contactenos/']
    },
    {
        id: 'imbanaco', tipo: 'hospital',
        nombre: 'Clínica Imbanaco',
        direccion: 'Carrera 38A # 5A-100, San Fernando, Cali',
        telefonos: [['(602) 382 1000', '+576023821000']],
        horario: null,
        nota: 'Clínica de alta complejidad con servicio de urgencias.',
        web: null,
        lat: 3.4237073, lng: -76.5439889,
        fuente: ['Doctoralia y directorio einforma', 'https://www.doctoralia.co/clinicas/centro-medico-imbanaco-torres-a-y-b']
    },
    {
        id: 'mariocorrea', tipo: 'hospital',
        nombre: 'Hospital Departamental Mario Correa Rengifo',
        direccion: 'Carrera 78 Oeste # 2A-00, Cali',
        telefonos: [['(602) 318 0020', '+576023180020']],
        horario: null,
        nota: 'Hospital público departamental, en la zona de ladera.',
        web: null,
        lat: 3.3871246, lng: -76.5579784,
        fuente: ['Doctoralia', 'https://www.doctoralia.co/clinicas/hospital-mario-correa-rengifo']
    },
    {
        id: 'isaiasduarte', tipo: 'hospital',
        nombre: 'Hospital Isaías Duarte Cancino',
        direccion: 'Calle 96 # 28E3-1, Mojica, Cali',
        telefonos: [],
        horario: null,
        nota: 'Hospital público de referencia para el oriente de Cali, con servicio de urgencias.',
        web: null,
        lat: 3.4117988, lng: -76.4857267,
        fuente: ['Alcaldía de Cali', 'https://www.cali.gov.co/alcaldenlinea/publicaciones/117270/localizacion-fisica-sucursales-horarios-y-dias-de-atencion-al-publico/']
    },
    {
        id: 'joaquinpaz', tipo: 'hospital',
        nombre: 'Hospital Joaquín Paz Borrero',
        direccion: 'Carrera 7A Bis con Calle 72, Alfonso López, Cali',
        telefonos: [['(602) 488 4666', '+576024884666']],
        horario: 'Atención general de 7:00 a. m. a 5:00 p. m., jornada continua.',
        nota: 'Hospital de la red pública (Red de Salud del Norte).',
        web: null,
        lat: 3.4652723, lng: -76.4822107,
        fuente: ['Alcaldía de Cali', 'https://www.cali.gov.co/alcaldenlinea/publicaciones/117270/localizacion-fisica-sucursales-horarios-y-dias-de-atencion-al-publico/']
    },
    {
        id: 'cruzroja', tipo: 'emergencia',
        nombre: 'Cruz Roja Colombiana · Seccional Valle',
        direccion: 'Carrera 38 Bis # 5-91, San Fernando, Cali',
        telefonos: [['132 · emergencias', '132'], ['(602) 518 4200', '+576025184200']],
        horario: null,
        nota: 'Además de emergencias, ofrece apoyo psicosocial: escucha y orientación.',
        web: 'https://www.cruzrojavalle.org.co/',
        lat: 3.4272609, lng: -76.5447765,
        fuente: ['Página oficial de la Cruz Roja Valle', 'https://www.cruzrojavalle.org.co/']
    },
    {
        id: 'bomberos', tipo: 'emergencia',
        nombre: 'Bomberos Voluntarios de Cali · Estación Central',
        direccion: 'Avenida de las Américas # 20N-54, Versalles, Cali',
        telefonos: [['119 · emergencias', '119'], ['(602) 882 1252', '+576028821252']],
        horario: 'Emergencias: 119, gratis, las 24 horas. Oficinas: lunes a viernes de 7:30 a. m. a 5:30 p. m.',
        nota: null,
        web: 'https://bomberoscali.org/',
        lat: 3.4604764, lng: -76.527367,
        fuente: ['Página oficial de Bomberos Cali', 'https://bomberoscali.org/']
    },
    {
        id: 'riesgo', tipo: 'desastres',
        nombre: 'Secretaría de Gestión del Riesgo de Emergencias y Desastres',
        direccion: 'Calle 11 # 9-20, Hotel Aristi, piso 9, Cali',
        telefonos: [['(602) 653 3801', '+576026533801']],
        horario: 'Lunes a jueves de 8:00 a 11:30 a. m. y de 2:00 a 4:30 p. m.; viernes de 7:30 a. m. a 12:30 p. m. y de 1:30 a 4:30 p. m.',
        nota: 'Coordina la prevención y la respuesta a emergencias y desastres en Cali.',
        web: 'https://www.cali.gov.co/gestiondelriesgo/',
        lat: 3.4477891, lng: -76.5324988,
        fuente: ['Alcaldía de Cali', 'https://www.cali.gov.co/gestiondelriesgo/directorio/366/secretaria-de-gestion-del-riesgo-de-emergencias-y-desastres/']
    },
    {
        id: 'defensacivil', tipo: 'desastres',
        nombre: 'Defensa Civil Colombiana · Seccional Valle',
        direccion: 'Avenida 3C Norte # 63-00, barrio La Flora, Cali',
        telefonos: [['144 · emergencias', '144'], ['321 208 7400', '+573212087400']],
        horario: 'Lunes a viernes de 8:00 a. m. a 6:00 p. m.',
        nota: 'Gestión del riesgo, rescate y apoyo a personas damnificadas.',
        web: 'https://www.defensacivil.gov.co/nuestra-institucion-1/seccionales/valle-del-cauca',
        lat: 3.4905, lng: -76.5153, aprox: true, // OpenStreetMap no tiene el edificio: el punto está en el cruce de la dirección
        fuente: ['Página oficial de la Defensa Civil', 'https://www.defensacivil.gov.co/nuestra-institucion-1/seccionales/valle-del-cauca/institucional/contactenos']
    },
    {
        id: 'saludpublica', tipo: 'apoyo',
        nombre: 'Secretaría de Salud Pública Distrital',
        direccion: 'Calle 4B # 36-00, San Fernando, Cali',
        telefonos: [['(602) 554 2514', '+576025542514']],
        horario: 'Lunes a viernes de 7:30 a. m. a 12:30 p. m. y de 1:30 a 5:30 p. m.',
        nota: 'Coordina la Línea 106 de salud mental de Cali y las rutas de atención de la ciudad.',
        web: 'https://www.cali.gov.co/salud/',
        lat: 3.4319153, lng: -76.546483,
        fuente: ['Alcaldía de Cali', 'https://www.cali.gov.co/salud/publicaciones/100212/horario-de-atencion-al-publico/']
    },
    {
        id: 'cam', tipo: 'apoyo',
        nombre: 'Centro Administrativo Municipal (CAM) · Alcaldía de Cali',
        direccion: 'Avenida 2 Norte # 10-70, Cali',
        telefonos: [['195', '195'], ['(602) 887 9020', '+576028879020']],
        horario: 'Lunes a viernes de 8:00 a. m. a 4:30 p. m., jornada continua.',
        nota: 'Oficina principal de atención al ciudadano (sótano 1): orientación, trámites y peticiones.',
        web: 'https://www.cali.gov.co/',
        lat: 3.4539121, lng: -76.5347032,
        fuente: ['Alcaldía de Cali', 'https://www.cali.gov.co/participacion/publicaciones/135307/canal-presencial-de-atencion-al-ciudadano/']
    },

    // Puntos de acopio abiertos por el sismo del 10 de agosto: son temporales (aviso = advertencia que sale resaltada en la tarjeta)
    {
        id: 'jairovarela', tipo: 'apoyo',
        nombre: 'Centro de acopio · Plazoleta Jairo Varela',
        direccion: 'Plazoleta Jairo Varela, Avenida 2 Norte, centro de Cali',
        telefonos: [['195 · Alcaldía de Cali', '195']],
        horario: null,
        nota: 'Punto de la Alcaldía para donaciones tras el sismo: agua embotellada, alimentos no perecederos, artículos de aseo, cobijas, colchonetas, botiquines y herramientas. No recibe ropa usada ni comida preparada.',
        aviso: 'Punto temporal de la emergencia. Su última confirmación es del 21 de agosto de 2026: llama al 195 antes de ir.',
        web: null,
        lat: 3.4550187, lng: -76.5348007,
        fuente: ['La República (21 de agosto de 2026) y Colombia Ayuda', 'https://www.larepublica.co/responsabilidad-social/conozca-cuales-son-los-centros-de-acopio-que-todavia-reciben-donaciones-4463365']
    },
    {
        id: 'coliseopueblo', tipo: 'apoyo',
        nombre: 'Centro de acopio · Coliseo del Pueblo',
        direccion: 'Unidad Deportiva Alberto Galindo, Carrera 52, Cali',
        telefonos: [['195 · Alcaldía de Cali', '195']],
        horario: null,
        nota: 'Recibe alimentos no perecederos, agua, artículos de aseo, ropa en buen estado y otros elementos de primera necesidad para las zonas afectadas por el sismo.',
        aviso: 'Punto temporal de la emergencia. Su última confirmación es del 21 de agosto de 2026: llama al 195 antes de ir.',
        web: null,
        lat: 3.4133855, lng: -76.5517346,
        fuente: ['La República (21 de agosto de 2026)', 'https://www.larepublica.co/responsabilidad-social/conozca-cuales-son-los-centros-de-acopio-que-todavia-reciben-donaciones-4463365']
    },
    {
        id: 'licorera', tipo: 'apoyo',
        nombre: 'Centro de acopio «Todos Somos Valle» · Antigua Licorera',
        direccion: 'Carrera 1 # 26-85, Cali',
        telefonos: [],
        horario: null,
        nota: 'Punto de la Gobernación del Valle para donaciones al norte del Valle: agua, alimentos no perecederos, cobijas, colchonetas y artículos de aseo.',
        aviso: 'Punto temporal de la emergencia, publicado en agosto de 2026. Confirma con la Gobernación del Valle que siga abierto antes de ir.',
        web: null,
        lat: 3.4627632, lng: -76.5194767,
        fuente: ['Occidente (14 de agosto de 2026) y Colombia Ayuda', 'https://occidente.co/cali/centros-de-acopio-en-cali-puntos-de-donacion-sismo/']
    }
]

// Líneas que se pueden llamar desde cualquier lugar (no van en el mapa, van debajo).
// Se llenan por filas: van en el orden de lectura para que, con 4 columnas, cada columna quede de un solo color:
// salud mental (azul) · emergencias (naranja) · socorro y servicios (franja verde) · desastres (amarillo)
export const LINEAS = [
    {
        tipo: 'apoyo', numero: '106', marcar: '106', nombre: 'Línea 106 · salud mental de Cali',
        texto: 'Atención psicológica e intervención en crisis. 24 horas, gratis y anónima; no necesitas EPS. También por WhatsApp: 316 245 8423.',
        extra: ['WhatsApp', 'https://wa.me/573162458423'],
        fuente: 'https://www.cali.gov.co/salud/publicaciones/191550/la-linea-106-atendio-mas-de-13000-casos-relacionados-con-salud-mental/'
    },
    { tipo: 'emergencia', numero: '123', marcar: '123', nombre: 'Número Único de Emergencias', texto: 'Para cualquier emergencia en Colombia.' },
    { tipo: 'emergencia', franja: 'verde', numero: '132', marcar: '132', nombre: 'Cruz Roja', texto: 'Emergencias y apoyo psicosocial.', fuente: 'https://www.cali.gov.co/gestiondelriesgo/publicaciones/170386/como-acudir-a-los-organismos-de-socorro-de-la-ciudad/' },
    { tipo: 'desastres', numero: '144', marcar: '144', nombre: 'Defensa Civil', texto: 'Prevención y atención de desastres.', fuente: 'https://www.cali.gov.co/gestiondelriesgo/publicaciones/170386/como-acudir-a-los-organismos-de-socorro-de-la-ciudad/' },
    {
        tipo: 'apoyo', numero: '192 · opción 4', marcar: '192', nombre: 'Línea nacional de salud mental',
        texto: 'Ministerio de Salud. 24 horas, gratis desde cualquier operador.',
        fuente: 'https://www.minsalud.gov.co/English/Paginas/Ministry-of-Health,-Committed-to-Colombians%E2%80%99-Mental-Health-.aspx'
    },
    { tipo: 'emergencia', numero: '119', marcar: '119', nombre: 'Bomberos', texto: '24 horas, gratis.', fuente: 'https://bomberoscali.org/' },
    { tipo: 'emergencia', franja: 'verde', numero: '164', marcar: '164', nombre: 'Fugas de gas', texto: 'Olor a gas, fugas o daños en la red de gas natural. Gratis, 24 horas.', fuente: 'https://www.elpais.com.co/cali/gases-de-occidente-informo-fechas-y-zonas-de-reconexion-en-cali-atencion-a-recomendaciones-de-seguridad-0438.html' },
    { tipo: 'desastres', numero: '177 · opción 6', marcar: '177', nombre: 'Emcali · daños en servicios públicos', texto: 'Reporta daños de agua, alcantarillado o energía (por ejemplo, después de un sismo). Gratis, 24 horas.', fuente: 'https://selectra.com.co/empresas/emcali/reportar-danos' }
]
