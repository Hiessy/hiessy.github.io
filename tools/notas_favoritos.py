# -*- coding: utf-8 -*-
"""Arma `notas.json`: para cada favorito, pros, contras, qué mirar e impuestos.

Los impuestos salen de la escala oficial 2026 (Ley 11090, art. 6, inmobiliario
básico urbano edificado), verificada por continuidad: el monto fijo de cada
tramo coincide con el impuesto del tramo anterior calculado en su tope.

**El dato que no se publica es la valuación fiscal**, que es la base del
impuesto y no el precio. Por eso la ficha da un rango sobre tres supuestos
(20%, 35% y 50% del precio) y dice de dónde sale el número real: del cedulón,
que se le pide al vendedor y termina la discusión.

Los textos de pros y contras los escribo yo leyendo cada aviso; no salen de
ninguna cuenta. Lo que sí es dato duro: las distancias a servicios
(`serv_all.json`, OpenStreetMap) y si el aviso se dio de baja (`alive.json`).

    python tools/notas_favoritos.py
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from build2 import load_dead, is_dead

USD = 1545          # dólar oficial venta, 7-10-2026
ESCALA = [(0, 41e6, 0, .156), (41e6, 63e6, 63_960, .230), (63e6, 90e6, 114_560, .353),
          (90e6, 124e6, 209_870, .451), (124e6, 198e6, 363_210, .551),
          (198e6, 307e6, 770_950, .624), (307e6, 762e6, 1_451_110, .720),
          (762e6, 1738e6, 4_727_110, .800), (1738e6, float("inf"), 12_535_110, .850)]
MINIMO = 16_875
# sellos 1% repartido 50/50, escribano ~2%, comisión 3% con IVA
COMPRA = .005 + .02 + .03 * 1.21


def inmobiliario(base_ars):
    for d, h, fijo, al in ESCALA:
        if base_ars <= h:
            return max(fijo + (base_ars - d) * al / 100, MINIMO)
    return MINIMO


def impuestos(precio_usd):
    ars = precio_usd * USD
    return {"anual_usd": [round(inmobiliario(ars * p) / USD) for p in (.20, .35, .50)],
            "compra_usd": round(precio_usd * COMPRA),
            "compra_pct": round(COMPRA * 100, 1)}


N = {
"58720619": dict(
    pros=["Lo más barato de la lista y con 4 dormitorios en 180 m²",
          "Huerta Grande con todo a mano: farmacia a 100 m, escuela y policía a 200 m",
          "Vista al valle; sirve para vivir todo el año o alquilar"],
    contras=["No declara lote: con 180 m² cubiertos y 180 m² totales puede no tener parque",
             "Dispensario a 2,3 km; el pueblo depende de La Falda"],
    ojo=["Pedí la superficie del terreno por escrito: si cubierto = total, no hay jardín",
         "A este precio en Punilla, confirmá que la escritura esté perfecta"]),

"20491226": dict(
    pros=["Dos viviendas en block: una para vivir y otra para renta",
          "Apto crédito, que en la sierra es raro",
          "Dispensario y escuela a menos de 1 km"],
    contras=["Cabalango es muy chico: supermercado a 7,2 km, farmacia a 3,1 km",
             "155 m² cubiertos repartidos en dos casas es poco por unidad"],
    ojo=["¿Están subdivididas o es una sola matrícula? Cambia el crédito y la venta futura",
         "Si la segunda se alquila, preguntá por la habilitación municipal"]),

"51003647": dict(
    pros=["Casa principal más casa de caseros, en el mejor barrio de Valle Hermoso",
          "Super a 200 m, dispensario y escuela a menos de 1 km",
          "Se pueden comprar por separado: 65.000 la principal, 25.000 la otra"],
    contras=["El texto dice terreno de 1.000 m² y la ficha 1.273: no coinciden",
             "Sólo 2 dormitorios en la casa principal"],
    ojo=["**Aún sin subdividir**: comprar una sola te deja en condominio con un desconocido",
         "Si comprás las dos, subdividir después lo pagás vos"]),

"20242483": dict(
    pros=["Seis dormitorios y 4 baños: pensado como cabañas de alquiler",
          "1 km a Ruta 38, 5 km al centro de Cosquín"],
    contras=["No es una casa de familia, es un negocio: el formato manda",
             "800 m² de terreno para 283 m² cubiertos deja poco parque"],
    ojo=["Pedí habilitación y facturación si pensás seguir alquilando",
         "Varias unidades chicas se deterioran rápido con rotación de turistas"]),

"57948571": dict(
    pros=["Costa de arroyo propia y calle sin salida, en Villa General Belgrano",
          "2.033 m² de lote con 187 m² cubiertos: buena proporción",
          "Banco, farmacia, dispensario y super a ~1 km"],
    contras=["Sólo 2 baños para 4 dormitorios",
             "VGB vive del turismo: en Oktoberfest el pueblo se llena"],
    ojo=["Costa de arroyo: preguntá por crecidas y por la línea de ribera",
         "Dice luz y agua, no menciona gas natural: presupuestá envasado"]),

"57978811": dict(
    pros=["Son **dos lotes** (600 + 640 m²): se puede vender uno",
          "Barrio residencial de Capilla del Monte, con todo a ~1 km"],
    contras=["El aviso se contradice: el título dice 4 dormitorios y el texto 3, con 1 baño",
             "147 m² cubiertos para 1.240 m² de terreno: casa chica para el lote"],
    ojo=["Confirmá dormitorios y baños en la visita, no por teléfono",
         "Dos lotes pueden ser dos cuentas de inmobiliario: pedí los dos cedulones"]),

"59789640": dict(
    pros=["Chalet de 240 m² con 5 dormitorios (principal en suite) y 4 baños",
          "Lote de 40 × 65 m, pileta y cochera cubierta",
          "Policía a 500 m, super a 800 m, escuela a 1,2 km"],
    contras=["Banco a 7,8 km y dispensario a 4,8 km",
             "Dos plantas y 240 m²: calefacción y mantenimiento no son menores"],
    ojo=["Preguntá si tiene gas natural o envasado; a esta superficie el invierno pesa",
         "Dependencia de servicio: confirmá que compute como ambiente habilitado"]),

"58418604": dict(
    pros=["2.072 m² a metros del río San Francisco, con arroyo cruzando el parque",
          "Pileta y parque arbolado"],
    contras=["**El aviso ya no está publicado**: Zonaprop contesta 410",
             "Sólo 2 dormitorios en la casa principal pese a figurar 3"],
    ojo=["Es el que marcaste como caído. Si te sigue interesando, llamá a la inmobiliaria: "
         "puede estar vendido o republicado con otro código"]),

"60037658": dict(
    pros=["221 m² cubiertos con 4 dormitorios, en zona residencial",
          "Comercios cerca y 25 minutos a Carlos Paz"],
    contras=["**A metros de la Ruta 38**: ruido de camiones las 24 horas",
             "El texto dice 1.313 m² de terreno y la ficha 221: no coinciden"],
    ojo=["Andá a escuchar la casa un día de semana a la mañana antes de decidir",
         "Aclará la superficie real del lote por escrito"]),

"55463511": dict(
    pros=["1.700 m² de terreno con 130 m² cubiertos: mucho parque",
          "Super a 200 m, dispensario y escuela a menos de 1 km",
          "Deck con vista a las sierras, dormitorio en suite"],
    contras=["Un solo baño completo para 3 dormitorios",
             "130 m² es chico para vivir todo el año varias personas"],
    ojo=["A pocas cuadras de la Ruta 38: verificá el ruido parado en el lote"]),

"59288291": dict(
    pros=["**7.120 m² con bosque nativo y arroyo propio**, en barrio Yacoana",
          "Predio con puente interno y segunda salida: difícil de repetir",
          "185 m² cubiertos, suficiente para vivir"],
    contras=["**Un solo baño** para toda la propiedad",
             "Mantener 7.000 m² de bosque es trabajo y plata todos los años"],
    ojo=["Arroyo interno: línea de ribera y crecidas, preguntá a los vecinos",
         "Con esa superficie, confirmá si tributa como urbano o rural"]),

"59266877": dict(
    pros=["**Se vende amoblada** y lista para habitar",
          "Media cuadra de la playa del Icho Cruz; escuela a 1 km",
          "Dos plantas, placares de pared a pared, galería con parrilla"],
    contras=["Servicios lejos: farmacia 8,1 km, super 7,2 km, banco 8,2 km",
             "Tala Huasi es comuna, no municipio: menos servicios"],
    ojo=["Qué incluye 'amoblada' tiene que estar **en el boleto**, no de palabra",
         "A metros del río: preguntá hasta dónde llegó el agua en la última crecida"]),

"60102207": dict(
    pros=["**1 hectárea** (10.100 m²) con bajada privada al arroyo",
          "Casa colonial de 273 m² con 4 dormitorios y 3 baños",
          "Policía a 100 m"],
    contras=["Los Molinos es muy chico: super a 8,7 km, banco a 9,4 km, escuela a 5,8 km",
             "Sobre la Ruta E56: ruido y acceso"],
    ojo=["1 hectárea probablemente tributa **rural**: otra escala, pedí el cedulón",
         "Bajada privada al arroyo: que el derecho figure en la escritura"]),

"60135884": dict(
    pros=["Casa **más departamento** aparte: renta o visitas",
          "Vistas al lago y las sierras, 35 min a Córdoba capital",
          "Farmacia a 900 m, policía a 1,2 km"],
    contras=["No declara lote pese a hablar de 'gran parque'",
             "Escuela a 5,8 km y super a 3,3 km: con chicos se maneja todos los días"],
    ojo=["Pedí la superficie del terreno por escrito",
         "El precio terminado en 174.999 es marketing: hay margen para negociar"]),

"18826941": dict(
    pros=["360 m² cubiertos, 4 dormitorios y 4 baños: de las más grandes de la lista",
          "200 m del río, 1,5 km del centro comercial, barrio de vecinos permanentes"],
    contras=["**Son dos lotes que suman apenas 605 m²**: mucha casa y poco terreno",
             "No publica ubicación exacta: no tiene pin en el mapa"],
    ojo=["Dos lotes sin unificar: preguntá si están en una o dos matrículas",
         "360 m² cubiertos en 605 m² de lote deja casi nada de parque"]),

"57789619": dict(
    pros=["**El mejor servido de todos**: hospital de La Falda a 1,8 km, escuela a 700 m, "
          "tres farmacias a menos de 1 km",
          "347 m² cubiertos, bodega en subsuelo, pileta, quincho con baño",
          "2.390 m² de parque arbolado"],
    contras=["Linda con la **unión de dos arroyos**: es el punto que más se inunda",
             "Dice 3 baños pero el texto enumera 2 más el del quincho"],
    ojo=["**Preguntá qué pasó en la última crecida grande** y mirá marcas de agua en el quincho",
         "Fijate si el parque cae dentro de la línea de ribera: ahí no se puede construir"]),

"16956495": dict(
    pros=["A dos cuadras del río y cerca de los balnearios de Santa Rosa",
          "173 m² con 3 baños"],
    contras=["Está planteada como **inversión**, no como casa de familia",
             "Sin lote declarado y sin ubicación publicada: no tiene pin"],
    ojo=["Preguntá si se alquila por temporada y con qué ocupación real",
         "Santa Rosa en enero es otra ciudad: visitala en temporada alta"]),

"60202755": dict(
    pros=["310 m² cubiertos con 4 dormitorios en dos plantas, vestidor y pileta de 9 m",
          "Quincho, asador, horno de barro y horno chileno"],
    contras=["Terreno de 732 m² para 310 m² cubiertos: poco parque",
             "Sin coordenadas publicadas: no aparece en el mapa"],
    ojo=["El texto dice Icho Cruz y el pueblo figura Santa María de Punilla: aclarar dónde está",
         "Pileta de 9 m: preguntá mantenimiento y costo de llenado"]),

"18364072": dict(
    pros=["**18 dormitorios y 13 baños en 700 m²**: es un hotel, no una casa",
          "A dos cuadras de la municipalidad, al lado de la escuela"],
    contras=["Como vivienda no sirve; como negocio necesita gestión todo el año",
             "Terreno irregular en triángulo con entrada por pasillo"],
    ojo=["Pedí habilitación, libros y facturación: estás comprando un negocio",
         "700 m² construidos de 1950 pueden necesitar una obra completa"]),

"58384015": dict(
    pros=["**2 hectáreas** (20.000 m²) y casa de sólo 4 años",
          "**Escritura inmediata**, que acá vale oro",
          "200 m² cubiertos bien distribuidos"],
    contras=["Villa Yacanto es remoto: escuela a 8,8 km, sin farmacia ni banco cerca",
             "Dos hectáreas se mantienen solas sólo en el folleto"],
    ojo=["Con 20.000 m² seguro tributa **rural**: pedí el cedulón, la escala es otra",
         "Preguntá por el agua: a esa distancia del pueblo suele ser perforación"]),

"59353232": dict(
    pros=["**Apta crédito y escritura inmediata**: de las pocas con las dos cosas",
          "2.410 m² con frutales, pileta, estanque y bodega",
          "Una sola planta, 241 m², y la casa del árbol con 4 camas"],
    contras=["Farmacia a 8,5 km, super a 7,6 km: lejos de lo diario",
             "El tercer dormitorio es, por el propio aviso, 'más chico'"],
    ojo=["El pin es **aproximado**: Zonaprop publicó mal la coordenada, confirmá el lote en el lugar",
         "Estanque más pileta: dos cosas que mantener"]),

"18966667": dict(
    pros=["5.556 m² de terreno con vista franca a las Sierras Grandes",
          "Hogar como eje térmico, dos baños completos en planta baja",
          "Farmacia a 200 m y policía a 300 m"],
    contras=["**Super a 10,3 km**: la compra grande es una excursión",
             "La ficha no declara lote pese a decir 5.556 m² en el texto"],
    ojo=["Sólo luz y agua: sin gas natural, presupuestá zeppelin o garrafa",
         "Villa Ciudad de América es chica y estacional: mirala en invierno"]),

"20524691": dict(
    pros=["**La Cumbrecita**: peatonal, única en el país, demanda turística asegurada",
          "Vista panorámica bajo el cerro Cristal"],
    contras=["Pueblo peatonal: se estaciona afuera y se camina, también con las compras",
             "150 m² y 2 baños por 190.000 es caro por metro: pagás la marca del lugar"],
    ojo=["Preguntá el acceso vehicular real a la casa y en qué condiciones",
         "Sin pin: el aviso no publica ubicación, pedila antes de viajar"]),

"20169338": dict(
    pros=["Vista al lago Los Molinos desde todos los ambientes",
          "325 m² cubiertos, a un kilómetro de la Ruta Provincial 5"],
    contras=["**Sólo 2 baños para 4 dormitorios y 325 m²**",
             "Sin lote declarado y sin ubicación publicada"],
    ojo=["Vista al lago: confirmá que no haya un lote vacío delante que puedan edificar",
         "Pedí la superficie del terreno y las coordenadas"]),

"56089650": dict(
    pros=["Cabaña alpina **más** casa en 1.500 m²: dos unidades",
          "Frente al arroyo, a 400 m del Bosque de los Pioneros",
          "Banco, dispensario, escuela y super a menos de 1 km"],
    contras=["A 400 m del predio de la Fiesta de la Cerveza: ruido y gente en octubre",
             "La ficha dice 150 m² de lote y el texto 1.500: no coinciden"],
    ojo=["Frente al arroyo: crecidas y línea de ribera",
         "Verificá si las dos unidades están habilitadas para alquilar"]),

"60131926": dict(
    pros=["Casa histórica de 1950 sobre Av. San Martín, 1.952 m² de terreno",
          "Galpón de 80 m²: taller, depósito o local",
          "Farmacia a 100 m, super a 200 m, escuela a 300 m"],
    contras=["**De 1950 y 'con potencial de puesta en valor'**: es una obra, no una mudanza",
             "Sobre avenida: ruido y poca intimidad"],
    ojo=["Presupuestá instalación eléctrica, agua y techos antes de ofertar",
         "Si es patrimonio municipal puede haber límites para tocar la fachada"]),

"60042197": dict(
    pros=["**1,2 hectáreas** con casa principal, casa 2, departamento y galpón",
          "Pileta con hidromasaje y termotanque solar",
          "Dispensario a 2,7 km, escuela a 2,3 km"],
    contras=["Es un **complejo turístico**: cuatro unidades para mantener y ocupar",
             "Farmacia a 9,3 km, super a 8,3 km, banco a 9,8 km"],
    ojo=["Pedí habilitación y ocupación real, no proyecciones",
         "1,2 ha probablemente tributa rural; y regar esa superficie cuesta"]),

"55284775": dict(
    pros=["**Gas natural** y calefacción instalada: rarísimo en esta lista",
          "A 6 cuadras del centro de La Cumbre y 2 del golf; escuelas a 2 cuadras",
          "Todo a menos de 1 km: escuela 200 m, policía 300 m, salud 800 m"],
    contras=["Sólo 2 baños para 4 dormitorios",
             "1.800 m² de lote con 185 m² cubiertos: casa modesta para el terreno"],
    ojo=["Confirmá que el gas natural esté **conectado**, no sólo disponible en la calle",
         "La Cumbre es de los pueblos más caros del valle: compará el m² antes de ofertar"]),

"58854102": dict(
    pros=["**Plano aprobado** para construir dos cuartos y dos baños más arriba",
          "1.268 m² con frutales y árboles añosos, vista a las Altas Cumbres",
          "Farmacia a 800 m, dispensario a 1,3 km, escuela a 1,5 km"],
    contras=["**Un solo baño** hoy para 3 dormitorios",
             "120 m² cubiertos: hay que construir para que entre una familia"],
    ojo=["Pedí el plano aprobado y su vigencia: los permisos vencen",
         "Presupuestá la ampliación antes de ofertar; con eso negociás el precio"]),

"58912469": dict(
    pros=["**590 m² cubiertos sobre 5.337 m²**: la más grande de la lista",
          "Vista al lago y las sierras, suite con balcón privado",
          "Hospital Regional Domingo Funes a 7,1 km, farmacia a 2,1 km"],
    contras=["**590 m² es el problema, no la virtud**: calefacción, techos y pintura para siempre",
             "Son 3 dormitorios reales más 2 'lofts abiertos', no 5",
             "Sólo 3 baños para esa superficie; escuela a 6,5 km"],
    ojo=["Preguntá **cuánto cuesta calefaccionarla en julio** antes que nada",
         "Reventa difícil: pocos compradores a ese tamaño en Síquiman"]),

"55720468": dict(
    pros=["**Construcción de calidad**: cimientos, doble vidrio, aberturas de cedro, doble aislante",
          "270 m² con 4 dormitorios, 15 años de antigüedad",
          "La Cumbre con todo a mano: escuela 100 m, policía 100 m, super 300 m"],
    contras=["Sólo 2 baños para 4 dormitorios y 270 m²",
             "**'Sin bajo mesadas'**: la cocina hay que hacerla"],
    ojo=["Es la mejor construida de la lista: pedí igual informe de techos y humedad",
         "Presupuestá la cocina completa y sumala al precio de oferta"]),

"58735575": dict(
    pros=["**6.700 m² con acceso directo al río** desde adentro del terreno",
          "Casa principal, casa secundaria independiente, playroom de 60 m², pileta y cancha de tenis",
          "**Escritura traslativa de dominio y posesión inmediata**"],
    contras=["Dos casas, una cancha y una pileta: más administración que vivienda",
             "Super a 9,3 km y banco a 9,3 km",
             "'30 minutos de Circunvalación' es optimista en temporada"],
    ojo=["El uso turístico está 'sujeto a las habilitaciones correspondientes': **no vienen incluidas**",
         "Acceso privado al río: que figure en la escritura, no en el folleto"]),

"49318249": dict(
    pros=["**4.000 m² parquizados** y a la vez hospital a 3,2 km, escuelas desde 2,4 km, bancos a 2,7 km",
          "Acceso asfaltado desde Ruta 38, cochera para dos autos, pileta de material",
          "Cosquín es pueblo con vida todo el año, no sólo temporada"],
    contras=["**Sólo 2 baños** para 4 dormitorios y 8 ambientes",
             "Cerca de la Ruta 38: ruido",
             "Ofrece 'posibilidad de emprendimiento turístico': puede estar en el precio"],
    ojo=["Andá un fin de semana de enero, no un martes tranquilo",
         "La semana del Festival de Cosquín el pueblo cambia por completo"]),
}


def main():
    favs = json.load(io.open(os.path.join(ROOT, ".work", "favs_full.json"), encoding="utf-8"))
    sp = os.path.join(ROOT, ".work", "serv_all.json")
    serv = json.load(io.open(sp, encoding="utf-8")) if os.path.exists(sp) else {}
    dead = load_dead()

    out, faltan = {}, []
    for x in favs:
        m = re.search(r"(\d{6,})", x["url"])
        k = m.group(1) if m else None
        n = dict(N.get(k) or {})
        if not n:
            faltan.append((k, x["pueblo"], x["precio"]))
        n["imp"] = impuestos(x["precio"])
        n["serv"] = serv.get(x["url"], {})
        if is_dead(x["url"], dead):
            n["baja"] = True
        out[x["url"]] = n

    json.dump(out, io.open(os.path.join(ROOT, "notas.json"), "w", encoding="utf-8", newline=""),
              ensure_ascii=False, indent=1, sort_keys=True)
    print(f"notas.json: {len(out)} avisos")
    print(f"  con pros y contras : {sum(1 for v in out.values() if v.get('pros'))}")
    print(f"  con servicios      : {sum(1 for v in out.values() if v.get('serv'))}")
    print(f"  dados de baja      : {sum(1 for v in out.values() if v.get('baja'))}")
    if faltan:
        print("  SIN NOTAS:", faltan)


if __name__ == "__main__":
    main()
