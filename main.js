// ---------- Mapas base ----------
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});
var googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google'
});

// ---------- Popups padronizados ----------
function popup(titulo, linhas) {
    var corpo = linhas.map(function (l) {
        return '<div class="d-flex justify-content-between gap-3"><span class="text-secondary">' + l[0] +
               '</span><strong class="text-end">' + (l[1] || '-') + '</strong></div>';
    }).join('');
    return '<div style="min-width:210px;font-size:13px"><h6 class="mb-2" style="color:#0b3a4a">' + titulo + '</h6>' + corpo + '</div>';
}

// ---------- Estilos ----------
var acudesStyle = { color: "#0057B8", fillColor: "#00A6FB", weight: 2, opacity: 0.8, fillOpacity: 0.6 };
var riosStyle = { color: "#070A9c", weight: 2, opacity: 0.8 };

var coresBacias = ["#272AF5", "#FF5733", "#33A02C", "#F1C40F", "#8E44AD", "#E67E22",
                   "#1ABC9C", "#D35400", "#2980B9", "#C0392B", "#16A085", "#7D3C98"];

function getCorBacia(nome) {
    if (!nome) return coresBacias[0];
    var hash = 0;
    for (var i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    return coresBacias[Math.abs(hash) % coresBacias.length];
}
function baciasStyle(feature) {
    var cor = getCorBacia(feature.properties.Nome);
    return { color: cor, fillColor: cor, weight: 2, opacity: 0.7, fillOpacity: 0.4 };
}

// ---------- Camadas ----------
var acudesLayer = L.geoJSON(acudes, {
    style: acudesStyle,
    onEachFeature: function (f, layer) {
        var p = f.properties || {};
        if (p.Nome) layer.bindPopup(popup(p.Nome, [["Executor", p.Executor], ["Finalidade", p.Finalidade], ["Município", p.Municipio]]));
    }
});

var pocosLayer = L.geoJSON(pocos, {
    onEachFeature: function (f, layer) {
        var p = f.properties || {};
        layer.bindPopup(popup("Poço #" + p.fid, [
            ["Município", p.municipio], ["Proprietário", p.proprietario], ["Órgão", p.orgao],
            ["Perfuração", p.data_perfuracao], ["Profundidade", p.profundidade + " m"],
            ["Vazão", p.q_m3h + " m³/h"], ["Equipamento", p.equipamento],
            ["Região", p.microregiao + " (" + p.mesoregiao + ")"]
        ]));
    }
});
var pocosCluster = L.markerClusterGroup({ showCoverageOnHover: false });
pocosCluster.addLayer(pocosLayer);

var baciasLayer = L.geoJSON(bacias_hidro, {
    style: baciasStyle,
    onEachFeature: function (f, layer) {
        var p = f.properties || {};
        if (p.Nome) {
            layer.bindPopup(popup(p.Nome, [["Perímetro", p.Perimetro], ["Área (km²)", p.Area_km2]]));
            layer.bindTooltip(p.Nome, { sticky: true });
            layer.on({
                mouseover: function (e) { e.target.setStyle({ weight: 3, fillOpacity: 0.55 }); },
                mouseout: function (e) { baciasLayer.resetStyle(e.target); }
            });
        }
    }
});

var riosLayer = L.geoJSON(drenagem_principal, {
    style: riosStyle,
    onEachFeature: function (f, layer) {
        var p = f.properties || {};
        if (p.Nome) layer.bindPopup(popup(p.Nome, [["Ordem", p.Ordem], ["Domínio", p.Dominio]]));
    }
});

// ---------- Mapa ----------
var CENTRO = [-7.171756, -36.798706], ZOOM = 8;
var map = L.map('map', {
    center: CENTRO, zoom: ZOOM,
    layers: [osm, baciasLayer, riosLayer, acudesLayer]
});

// Camadas controladas pelo painel
var camadas = { acudes: acudesLayer, pocos: pocosCluster, bacias: baciasLayer, rios: riosLayer };
var bases = { osm: osm, sat: googleSat };

document.querySelectorAll('.camada').forEach(function (sw) {
    var camada = camadas[sw.dataset.camada];
    sw.checked = map.hasLayer(camada);
    sw.addEventListener('change', function () {
        sw.checked ? map.addLayer(camada) : map.removeLayer(camada);
    });
});
document.querySelectorAll('input[name="base"]').forEach(function (r) {
    r.addEventListener('change', function () {
        Object.values(bases).forEach(function (b) { map.removeLayer(b); });
        bases[r.value].addTo(map).bringToBack();
    });
});

// Contagem de feições
document.getElementById('n-acudes').textContent = (acudes.features || []).length;
document.getElementById('n-pocos').textContent = (pocos.features || []).length;

// ---------- Controles Leaflet ----------
L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

function botao(icone, titulo, acao, posicao) {
    var Ctl = L.Control.extend({
        options: { position: posicao },
        onAdd: function () {
            var b = L.DomUtil.create('button', 'gp-btn leaflet-bar');
            b.type = 'button'; b.title = titulo; b.setAttribute('aria-label', titulo);
            b.innerHTML = '<i class="bi ' + icone + '"></i>';
            L.DomEvent.disableClickPropagation(b);
            L.DomEvent.on(b, 'click', acao);
            return b;
        }
    });
    return new Ctl().addTo(map);
}
var painel = new bootstrap.Offcanvas('#painel');
botao('bi-layers', 'Camadas e legenda', function () { painel.toggle(); }, 'topleft');
botao('bi-house', 'Voltar à visão inicial', function () { map.setView(CENTRO, ZOOM); }, 'topleft');
botao('bi-fullscreen', 'Tela cheia', function () {
    document.fullscreenElement ? document.exitFullscreen() : document.getElementById('map').requestFullscreen();
}, 'topright');
botao('bi-crosshair', 'Minha localização', function () { map.locate({ setView: true, maxZoom: 13 }); }, 'topright');

map.on('locationfound', function (e) { L.circleMarker(e.latlng, { radius: 7, color: '#fff', fillColor: '#e11d48', fillOpacity: 1, weight: 2 }).addTo(map); });
map.on('locationerror', function () { alert('Não foi possível obter sua localização. Verifique a permissão do navegador.'); });

// Coordenadas do cursor
var coords = L.control({ position: 'bottomright' });
coords.onAdd = function () { this._d = L.DomUtil.create('div', 'gp-coords'); this._d.textContent = 'Passe o mouse no mapa'; return this._d; };
coords.addTo(map);
map.on('mousemove', function (e) { coords._d.textContent = e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5); });

// Abre o painel no desktop
if (window.innerWidth >= 992) painel.show();
