// Parser del modulo «Richiesta dati anagrafici» (privato / azienda).
// Legge il testo del PDF e restituisce i campi da precompilare nel gestionale.

(function (root) {
    'use strict';

    var OWN_EMAIL = /info@3dmakes\.ch/i;
    var OWN_PHONE_DIGITS = '41762660396';

    var FIELD_DEFS = [
        { key: 'companyName', labels: ['ragione sociale', 'ragione sociale / ditta'] },
        { key: 'firstName', labels: ['nome'] },
        { key: 'lastName', labels: ['cognome'] },
        { key: 'fullName', labels: ['nome e cognome', 'nome cognome'] },
        { key: 'address', labels: ['via / n. civico', 'via/n. civico', 'via / n civico', 'via n. civico', 'via / numero civico', 'indirizzo'] },
        { key: 'capCity', labels: ['cap / comune', 'cap/comune', 'cap e comune', 'cap / citta', 'cap / citta\'', 'cap comune'] },
        { key: 'phone', labels: ['numero di telefono', 'telefono', 'cellulare'] },
        { key: 'email', labels: ['e-mail', 'email', 'e mail', 'posta elettronica'] },
        { key: 'vat', labels: ['che - partita iva', 'che partita iva', 'partita iva', 'p.iva', 'p iva', 'codice fiscale', 'n. iva'] },
        { key: 'website', labels: ['sito internet', 'sito web', 'website'] }
    ];

    var STOP_PREFIXES = [
        'ringraziandovi',
        'ringraziando',
        'cogliamo',
        'distinti saluti',
        'ufficio amministrativo',
        'oggetto',
        'gentile cliente',
        'la presente per',
        'spett.le',
        'spettle'
    ];

    function norm(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/['’]/g, "'")
            .replace(/[:]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isStopLine(n) {
        var i;
        for (i = 0; i < STOP_PREFIXES.length; i++) {
            if (n === STOP_PREFIXES[i] || n.indexOf(STOP_PREFIXES[i] + ' ') === 0) return true;
        }
        return false;
    }

    function restAfterLabel(line, label) {
        var collapsed = String(line || '').replace(/\s+/g, ' ').trim();
        var escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*');
        var re = new RegExp('^' + escaped + '\\s*:?\\s*', 'i');
        return collapsed.replace(re, '').trim();
    }

    function matchField(line) {
        var n = norm(line);
        var i;
        var d;
        var L;
        var lab;
        var rest;
        for (i = 0; i < FIELD_DEFS.length; i++) {
            d = FIELD_DEFS[i];
            for (L = 0; L < d.labels.length; L++) {
                lab = d.labels[L];
                if (n === lab) return { key: d.key, rest: '' };
                if (n.indexOf(lab + ' ') === 0 || n.indexOf(lab + ':') === 0) {
                    rest = restAfterLabel(line, lab);
                    if (rest && rest !== line) return { key: d.key, rest: rest };
                    return { key: d.key, rest: restAfterLabel(line, d.labels[0]) };
                }
            }
        }
        return null;
    }

    function phoneDigits(value) {
        return String(value || '').replace(/\D/g, '');
    }

    function cleanVat(value) {
        return String(value || '').replace(/\s*(MWST|TVA|IVA)\s*$/i, '').replace(/\s+/g, ' ').trim();
    }

    function splitCapCity(value) {
        var v = String(value || '').trim();
        var m = v.match(/^((?:CH[-\s]?)?\d{4,5})\s+(.+)$/i);
        if (m) {
            return {
                postalCode: m[1].replace(/^CH[-\s]?/i, '').trim(),
                city: m[2].trim()
            };
        }
        return { postalCode: '', city: v };
    }

    function detectType(text, fields) {
        if (fields.companyName) return 'aziendale';
        if (fields.firstName || fields.lastName || fields.fullName) return 'privato';
        if (/spett\.?\s*le[\s\S]{0,80}\bazienda\b/i.test(text)) return 'aziendale';
        if (/spett\.?\s*le[\s\S]{0,80}\bprivato\b/i.test(text)) return 'privato';
        return 'privato';
    }

    function parseAnagraficaText(raw) {
        var text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        var lines = text.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
        var fields = {};
        var currentKey = null;
        var i;
        var line;
        var n;
        var hit;
        var started = false;
        var allLabels = [];
        FIELD_DEFS.forEach(function (d) {
            d.labels.forEach(function (lab) {
                allLabels.push({ key: d.key, lab: lab });
            });
        });
        allLabels.sort(function (a, b) { return b.lab.length - a.lab.length; });

        function matchFieldLongest(line) {
            var nn = norm(line);
            var j;
            var lab;
            var rest;
            for (j = 0; j < allLabels.length; j++) {
                lab = allLabels[j].lab;
                if (nn === lab) return { key: allLabels[j].key, rest: '' };
                if (nn.indexOf(lab + ' ') === 0 || nn.indexOf(lab + ':') === 0) {
                    rest = restAfterLabel(line, lab);
                    return { key: allLabels[j].key, rest: rest };
                }
            }
            return null;
        }

        for (i = 0; i < lines.length; i++) {
            line = lines[i];
            n = norm(line);
            hit = matchFieldLongest(line);

            if (hit) {
                var isCore = hit.key === 'companyName' || hit.key === 'firstName' || hit.key === 'lastName'
                    || hit.key === 'fullName' || hit.key === 'address' || hit.key === 'capCity' || hit.key === 'vat';
                if (!started && !isCore) continue;
                started = true;
                currentKey = hit.key;
                if (hit.rest) {
                    fields[currentKey] = fields[currentKey] ? fields[currentKey] + ' ' + hit.rest : hit.rest;
                    if (hit.rest) currentKey = hit.key;
                } else if (!fields[currentKey]) {
                    fields[currentKey] = '';
                }
                continue;
            }

            if (!started) continue;
            if (isStopLine(n)) {
                currentKey = null;
                continue;
            }
            if (!currentKey) continue;
            if (n === '3dmakes' || n === 'azienda' || n === 'privato') continue;

            fields[currentKey] = fields[currentKey] ? fields[currentKey] + ' ' + line : line;
        }

        Object.keys(fields).forEach(function (k) {
            fields[k] = String(fields[k] || '').replace(/\s+/g, ' ').trim();
        });

        if (fields.email) {
            fields.email = fields.email.split(/\s+/).filter(function (part) {
                return part.indexOf('@') !== -1 && !OWN_EMAIL.test(part);
            }).join(' ');
        }
        if (fields.phone) {
            var phones = String(fields.phone).split(/(?=\+)/).map(function (p) { return p.trim(); }).filter(Boolean);
            phones = phones.filter(function (p) { return phoneDigits(p) !== OWN_PHONE_DIGITS; });
            fields.phone = phones.length ? phones[phones.length - 1] : '';
        }
        if (fields.vat) fields.vat = cleanVat(fields.vat);

        var cap = splitCapCity(fields.capCity || '');
        var clientType = detectType(text, fields);
        var country = '';
        if ((fields.phone && String(fields.phone).indexOf('+41') !== -1) || /^\d{4}$/.test(cap.postalCode)) {
            country = 'Svizzera';
        }

        var filled = [];
        var missing = [];
        var result = {
            clientType: clientType,
            companyName: fields.companyName || '',
            firstName: fields.firstName || '',
            lastName: fields.lastName || '',
            fullName: fields.fullName || '',
            address: fields.address || '',
            postalCode: cap.postalCode,
            city: cap.city,
            country: country,
            phone: fields.phone || '',
            email: fields.email || '',
            vat: fields.vat || '',
            website: fields.website || ''
        };

        function mark(key, label, required) {
            if (result[key]) filled.push(label);
            else if (required) missing.push(label);
        }

        if (clientType === 'aziendale') {
            mark('companyName', 'Ragione sociale', true);
            mark('vat', 'P.IVA', true);
        } else {
            if (result.fullName && !result.firstName && !result.lastName) {
                filled.push('Nome e cognome');
            } else {
                mark('firstName', 'Nome', true);
                mark('lastName', 'Cognome', true);
            }
        }
        mark('email', 'Email', false);
        mark('phone', 'Telefono', false);
        mark('address', 'Indirizzo', false);
        mark('postalCode', 'CAP', false);
        mark('city', 'Città', false);

        result.filled = filled;
        result.missing = missing;
        result.hasAny = filled.length > 0;
        return result;
    }

    function itemsToText(items) {
        var sorted = items.slice().sort(function (a, b) {
            var ay = a.transform ? a.transform[5] : 0;
            var by = b.transform ? b.transform[5] : 0;
            var dy = by - ay;
            if (Math.abs(dy) > 2) return dy;
            var ax = a.transform ? a.transform[4] : 0;
            var bx = b.transform ? b.transform[4] : 0;
            return ax - bx;
        });
        var lines = [];
        var currentY = null;
        var current = [];
        sorted.forEach(function (item) {
            var str = item.str || '';
            if (!str) return;
            var y = item.transform ? Math.round(item.transform[5]) : 0;
            if (currentY === null || Math.abs(y - currentY) <= 3) {
                current.push(str);
                currentY = currentY === null ? y : currentY;
            } else {
                lines.push(current.join(' ').replace(/\s+/g, ' ').trim());
                current = [str];
                currentY = y;
            }
        });
        if (current.length) lines.push(current.join(' ').replace(/\s+/g, ' ').trim());
        return lines.filter(Boolean).join('\n');
    }

    function parseAnagraficaPdf(arrayBuffer) {
        if (typeof pdfjsLib === 'undefined') {
            return Promise.reject(new Error('pdf.js non è caricato'));
        }
        var data = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
        return pdfjsLib.getDocument({ data: data }).promise.then(function (pdf) {
            var texts = [];
            var chain = Promise.resolve();
            var n;
            function readPage(pageNum) {
                return pdf.getPage(pageNum).then(function (page) {
                    return page.getTextContent().then(function (content) {
                        texts.push(itemsToText(content.items || []));
                    });
                });
            }
            for (n = 1; n <= pdf.numPages; n++) {
                (function (pageNum) {
                    chain = chain.then(function () { return readPage(pageNum); });
                })(n);
            }
            return chain.then(function () {
                var text = texts.join('\n');
                var parsed = parseAnagraficaText(text);
                parsed.sourceText = text;
                return parsed;
            });
        });
    }

    var api = {
        parseAnagraficaText: parseAnagraficaText,
        parseAnagraficaPdf: parseAnagraficaPdf
    };

    root.parseAnagraficaText = parseAnagraficaText;
    root.parseAnagraficaPdf = parseAnagraficaPdf;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : global);
