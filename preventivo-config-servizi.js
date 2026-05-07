/**
 * Clausole legali preventivo (pagine 2–3 PDF) — per servizio 3DMakes.
 * Struttura: 1 Note tecniche · 2 IVA · 3 Trasporto/consegna · 4 Pagamento · 5 Costi esclusi
 * · 6 Condizioni di fornitura · 7 Accettazione · legge/foro e chiusura.
 */
(function () {
    'use strict';

    var LIMITE_RESP =
        'In ogni caso, qualsivoglia responsabilità complessiva di 3DMakes nei confronti del Cliente resterà limitata all\'importo effettivamente corrisposto da quest\'ultimo per il Servizio oggetto della contestazione.';
    var ACCETTAZIONE_SILENZIO =
        'In assenza di contestazione scritta nei termini di cui sopra, il Servizio si intenderà integralmente accettato dal Cliente.';
    var USO_NON_CRITICO =
        'Salvo diverso accordo scritto, manufatti, modelli digitali, file o lavorazioni forniti da 3DMakes sono destinati a validazione, prototipazione o impieghi non critici per la sicurezza e non devono essere utilizzati in applicazioni ove la sicurezza di persone o beni dipenda dal componente (impieghi «safety-critical») senza apposite prove, verifiche e certificazioni a cura e spese del Cliente.';
    var RITARDI_CLIENTE =
        'Ritardi derivanti da modifiche richieste dal Cliente, da approvazioni tardive, da dati o informazioni incomplete, da materiali non disponibili o da variazioni delle specifiche potranno comportare la revisione dei tempi e, ove occorra, dei corrispettivi.';
    var MAT_CLIENTE =
        '3DMakes non è responsabile per difetti, deformazioni, contaminazioni, danni o comportamenti anomali imputabili a materiali, componenti, supporti o file forniti dal Cliente.';
    var CONFERMA_ORDINE =
        'L\'ordine si intende confermato con il ricevimento dell\'accettazione scritta del preventivo, dell\'ordine d\'acquisto o del pagamento anticipato, ove previsto.';

    var FOOTER_LEGGE =
        '<p style="margin:0 0 6px;"><strong>Legge applicabile e foro competente</strong></p>' +
        '<p style="margin:0 0 10px;">Le presenti condizioni e ogni accordo ad esse collegato sono regolati dal diritto svizzero. È competente in via esclusiva il Foro di Lugano.</p>' +
        '<p style="margin:0 0 10px;">Validità dell\'offerta: 20 giorni lavorativi, salvo diversa indicazione sul documento.</p>' +
        '<p style="margin:0 0 24px;">Nel ringraziarVi per la preferenza accordata, si porgono cordiali saluti.</p>' +
        '<p style="margin:0 0 24px;">Per accettazione, data ___ / ___ / ______</p>' +
        '<p style="margin:0;">(Timbro e firma) ________________________________________________</p>';

    window.PREVENTIVO_CONFIG_SERVIZI = {
        stampa_3d: {
            label: 'Stampa 3D / Additive Manufacturing',
            intro: 'Facendo seguito a Vs cortese richiesta, si formula la nostra migliore offerta per i servizi di stampa 3D e additive manufacturing relativi alle seguenti voci.',
            pagina2:
                '<div class="dm-doc-legal">' +
                '<p style="margin:0 0 8px;"><strong>1. Note tecniche</strong></p>' +
                '<ol style="margin:0 0 12px; padding-left:18px;">' +
                '<li><strong>Validità dei tempi:</strong> le tempistiche indicate sono stime commerciali e saranno confermate, anche in funzione del carico di lavoro, al momento dell\'ordine confermato. ' + RITARDI_CLIENTE + '</li>' +
                '<li><strong>Base della quotazione:</strong> la quotazione si basa sui file 3D (es. STEP, STL o altri formati CAD concordati) trasmessi dal Cliente. In caso di divergenza tra file 3D e disegni 2D, fanno fede i file 3D salvo diverso accordo scritto. Modifiche geometriche successive possono richiedere una revisione di prezzo e di consegna.</li>' +
                '<li><strong>Tolleranze e controlli:</strong> si applicano le tolleranze tipiche del processo di stampa e del materiale scelti. Controlli dimensionali con rilascio di certificati o report metrologici certificati non sono inclusi salvo espresso incarico in offerta.</li>' +
                '<li><strong>Orientamento in macchina:</strong> salvo vincoli scritti pattuiti, l\'orientamento dei pezzi sul piano di stampa è determinato da 3DMakes al fine di conciliare tempi, stabilità di processo e qualità ripetibile. Con il processo possono coesistere stratificazione visibile, effetto «stair-stepping», rugosità superficiale, tracce di supporti, anisotropia, piccole deformazioni da ritiro materiale o variazioni estetiche, salvo diverso standard concordato e quotato.</li>' +
                '<li><strong>Geometria consigliata:</strong> si raccomandano, di massima, spessori di parete non inferiori a circa 1 mm e dettagli non inferiori a circa 0,5 mm; geometrie più snelle possono dare luogo a esiti non ripetibili o a maggiore fragilità.</li>' +
                '<li><strong>Accoppiamenti e tolleranze funzionali:</strong> non si garantiscono accoppiamenti meccanici di precisione, interferenze progettate o intercambiabilità senza analisi tecnica e offerta dedicata.</li>' +
                '<li><strong>Uso finale:</strong> l\'impiego previsto del manufatto, la sua idoneità funzionale e la conformità a norme di settore restano nella sfera di competenza e di responsabilità del Cliente.</li>' +
                '<li>' + MAT_CLIENTE + '</li>' +
                '<li>' + USO_NON_CRITICO + '</li>' +
                '</ol>' +
                '<p style="margin:0 0 6px;"><strong>2. IVA</strong></p>' +
                '<p style="margin:0 0 8px;">Da applicarsi secondo la normativa fiscale vigente e come già esposto in prima pagina.</p>' +
                '<p style="margin:0 0 6px;"><strong>3. Trasporto e consegna</strong></p>' +
                '<p style="margin:0 0 8px;">Ritiro presso la sede 3DMakes in via Cantonale 15, 6918 Figino, salvo diversa pattuizione scritta.</p>' +
                '<p style="margin:0 0 6px;"><strong>4. Pagamento</strong></p>' +
                '<p style="margin:0 0 8px;">Alle modalità già indicate nell\'offerta commerciale (anticipo, saldo, ecc.).</p>' +
                '<p style="margin:0 0 6px;"><strong>5. Costi esclusi</strong></p>' +
                '<p style="margin:0 0 10px;">Ogni costo, prestazione o condizione non richiamata espressamente nel presente documento.</p>' +
                '<p style="margin:0 0 8px;"><strong>6. Condizioni di fornitura</strong></p>' +
                '<p style="margin:0 0 6px;"><strong>6.1 Oggetto</strong></p>' +
                '<p style="margin:0 0 8px;">Le presenti clausole regolano i servizi di prototipazione e produzione in additive manufacturing (di seguito «Servizio») svolti da 3DMakes in base ai file 3D e alle istruzioni validate dal Cliente. I pezzi vengono prodotti in conformità ai suddetti file; salvo patto scritto, non sono comprese attività di riprogettazione o ottimizzazione CAD inclusive nel prezzo.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.2 Conferma d\'ordine e termini</strong></p>' +
                '<p style="margin:0 0 8px;">' + CONFERMA_ORDINE + ' Le date di consegna comunicate hanno carattere orientativo e possono essere spostate in caso di forza maggiore, indisponibilità del materiale o altre circostanze non imputabili a 3DMakes.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.3 Proprietà intellettuale</strong></p>' +
                '<p style="margin:0 0 8px;">Il Cliente dichiara e garantisce di avere titolo a far eseguire la lavorazione sui file e sulle rappresentazioni fornite e si obbliga a manlevare 3DMakes da qualsivoglia pretesa di terzi in ordine a modelli, marchi, disegni o altre opere utilizzati per l\'ordine.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.4 Garanzie e responsabilità</strong></p>' +
                '<p style="margin:0 0 8px;">3DMakes esegue il Servizio con la diligenza richiesta dalla natura dell\'incarico, nei limiti delle tecnologie e dei materiali convenuti. Restano escluse garanzie tacite ulteriori non previste dal contratto, nonché i danni indiretti, lucro cessante o perdita di chance. ' + LIMITE_RESP + '</p>' +
                '</div>',
            pagina3:
                '<div class="dm-doc-legal">' +
                '<p style="margin:0 0 6px;"><strong>6.5 Reclami, resi e non conformità</strong></p>' +
                '<p style="margin:0 0 8px;">Eventuali difformità rispetto a quanto pattuito devono essere denunciate per iscritto, entro 48 ore dalla consegna o dal ritiro, corredate da fotografie leggibili e dal riferimento all\'offerta o all\'ordine. Non si accettano resi senza previa autorizzazione scritta (RMA). ' + ACCETTAZIONE_SILENZIO + '</p>' +
                '<p style="margin:0 0 6px;"><strong>6.6 Know-how e parametri di processo</strong></p>' +
                '<p style="margin:0 0 8px;">Parametri di slicing, strategie di stampa e know-how operativo restano di esclusiva titolarità di 3DMakes, salvo esplicita cessione per iscritto.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.7 Prezzi</strong></p>' +
                '<p style="margin:0 0 10px;">Gli importi restano fermi finché non intervengono variazioni documentate di file, specifiche o volumi rispetto a quanto posto a base del preventivo.</p>' +
                '<p style="margin:0 0 8px;"><strong>7. Accettazione</strong></p>' +
                '<p style="margin:0 0 8px; text-align:center;"><strong><u>L\'accettazione della presente offerta comporta l\'adesione integrale alle note e alle condizioni che precedono.</u></strong></p>' +
                FOOTER_LEGGE +
                '</div>'
        },

        modellazione_3d: {
            label: 'Modellazione CAD / Progettazione 3D',
            intro: 'Facendo seguito a Vs cortese richiesta, si formula la nostra migliore offerta per i servizi di modellazione CAD e progettazione 3D di cui alle seguenti voci.',
            pagina2:
                '<div class="dm-doc-legal">' +
                '<p style="margin:0 0 8px;"><strong>1. Note tecniche</strong></p>' +
                '<ol style="margin:0 0 12px; padding-left:18px;">' +
                '<li><strong>Tempi:</strong> le scadenze indicate si intendono subordinate al ricevimento, completo e tempestivo, del brief e degli input concordati. ' + RITARDI_CLIENTE + '</li>' +
                '<li><strong>Input del Cliente:</strong> l\'attività si fonda su brief, disegni, fotografie, campioni fisici, riferimenti dimensionali e materiale digitale (es. CAD, immagini) forniti dal Cliente, che ne risponde in ordine a completezza, correttezza e liceità.</li>' +
                '<li><strong>Variazioni dopo l\'avvio:</strong> modifiche al brief o alle specifiche successive all\'avvio del lavoro comportano, ove rilevanti, adeguamento di onorario e scadenze; le revisioni incluse nel prezzo sono unicamente quelle quantificate in offerta. Redesign, varianti di prodotto o cicli di revisione ulteriori saranno quotati separatamente.</li>' +
                '<li><strong>Approvazioni:</strong> l\'approvazione scritta del Cliente sulle milestone indicate in offerta vale come accettazione dello stato del modello a quel punto e restringe il perimetro delle modifiche ancora comprese nei corrispettivi pattuiti.</li>' +
                '<li><strong>Deliverable:</strong> formati di consegna (a titolo esemplificativo: STL, STEP, OBJ, 3MF, DXF o altri formati indicati) e ambiente di lavoro sono quelli stabiliti per iscritto. Non sono di norma inclusi, salvo supplemento: file sorgenti parametrici completi con cronologia delle feature, template aziendali, librerie interne, macro personalizzate e documentazione del workflow 3DMakes.</li>' +
                '<li><strong>FEM, CFD e industrializzazione:</strong> salvo separato incarico e offerta, 3DMakes non esegue analisi agli elementi finiti (FEM), analisi fluidodinamiche (CFD), piani di validazione industriale né attività di industrializzazione di prodotto; prove fisiche, omologazioni e collaudi restano a carico del Cliente.</li>' +
                '<li>' + MAT_CLIENTE + '</li>' +
                '<li>' + USO_NON_CRITICO + '</li>' +
                '</ol>' +
                '<p style="margin:0 0 6px;"><strong>2. IVA</strong></p>' +
                '<p style="margin:0 0 8px;">Da applicarsi secondo la normativa fiscale vigente e come già esposto in prima pagina.</p>' +
                '<p style="margin:0 0 6px;"><strong>3. Trasporto e consegna</strong></p>' +
                '<p style="margin:0 0 8px;">Consegna dei file digitali nelle modalità definite in offerta (download, cloud, supporto fisico).</p>' +
                '<p style="margin:0 0 6px;"><strong>4. Pagamento</strong></p>' +
                '<p style="margin:0 0 8px;">Alle condizioni già indicate nell\'offerta (anticipo, rate, saldo a consegna, ecc.).</p>' +
                '<p style="margin:0 0 6px;"><strong>5. Costi esclusi</strong></p>' +
                '<p style="margin:0 0 10px;">Qualsiasi prestazione o formato di output non elencato esplicitamente nell\'offerta.</p>' +
                '<p style="margin:0 0 8px;"><strong>6. Condizioni di fornitura</strong></p>' +
                '<p style="margin:0 0 6px;"><strong>6.1 Oggetto</strong></p>' +
                '<p style="margin:0 0 8px;">Consulenza e realizzazione di modelli digitali e attività connesse di progettazione 3D (di seguito «Servizio»), nei limiti dello scope e degli output descritti nel preventivo.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.2 Conferma d\'ordine</strong></p>' +
                '<p style="margin:0 0 8px;">' + CONFERMA_ORDINE + '</p>' +
                '<p style="margin:0 0 6px;"><strong>6.3 Proprietà intellettuale</strong></p>' +
                '<p style="margin:0 0 8px;">Il Cliente dichiara di possedere titolo o licenza sugli elementi messi a disposizione e manleva 3DMakes da rivendicazioni di terzi. Rimangono riservati a 3DMakes metodologie, template e strumenti interni non oggetto di ceduta contrattuale.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.4 Garanzie e responsabilità</strong></p>' +
                '<p style="margin:0 0 8px;">3DMakes si impegna a espletare l\'incarico con diligenza professionale e in coerenza col brief approvato, nei limiti degli strumenti software e delle tempistiche pattuite. Sono esclusi danni indiretti. ' + LIMITE_RESP + '</p>' +
                '</div>',
            pagina3:
                '<div class="dm-doc-legal">' +
                '<p style="margin:0 0 6px;"><strong>6.5 Conformità e contestazioni</strong></p>' +
                '<p style="margin:0 0 8px;">Le contestazioni sulle difformità rispetto al brief approvato dovranno essere formulate per iscritto entro 48 ore dal ricevimento dei file, indicando riferimento d\'ordine e punti oggetto di contestazione. ' + ACCETTAZIONE_SILENZIO + '</p>' +
                '<p style="margin:0 0 6px;"><strong>6.6 Know-how</strong></p>' +
                '<p style="margin:0 0 8px;">Modelli di libreria, workflow interni e metodologie proprietarie utilizzate nello svolgimento del Servizio restano di titolarità 3DMakes, salvo diversa convenzione scritta.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.7 Prezzi</strong></p>' +
                '<p style="margin:0 0 10px;">Gli importi possono essere aggiornati fino alla conferma definitiva di brief, milestone e pacchetto di consegna.</p>' +
                '<p style="margin:0 0 8px;"><strong>7. Accettazione</strong></p>' +
                '<p style="margin:0 0 8px; text-align:center;"><strong><u>L\'accettazione della presente offerta comporta l\'adesione integrale alle note e alle condizioni che precedono.</u></strong></p>' +
                FOOTER_LEGGE +
                '</div>'
        },

        incisione_laser: {
            label: 'Laseratura / Incisione / Marcatura',
            intro: 'Facendo seguito a Vs cortese richiesta, si formula la nostra migliore offerta per i servizi di laseratura, incisione e marcatura relativi alle seguenti voci.',
            pagina2:
                '<div class="dm-doc-legal">' +
                '<p style="margin:0 0 8px;"><strong>1. Note tecniche</strong></p>' +
                '<ol style="margin:0 0 12px; padding-left:18px;">' +
                '<li><strong>Preparazione:</strong> le tempistiche commerciali dipendono anche dalla tempestiva approvazione di grafiche, campioni e disposizioni di marcatura. ' + RITARDI_CLIENTE + '</li>' +
                '<li><strong>Riferimenti di lavorazione:</strong> l\'esecuzione avviene in conformità a file vettoriali, campioni fisici o bozzetti approvati per iscritto dal Cliente prima dell\'avvio produttivo.</li>' +
                '<li><strong>File consigliati:</strong> si raccomandano formati vettoriali (SVG, DXF, AI, PDF vettoriale). Immagini raster, loghi di bassa definizione o grafiche non vettoriali possono richiedere tempo aggiuntivo di ricostruzione, da quotare a parte.</li>' +
                '<li><strong>Diritti sulle immagini:</strong> il Cliente garantisce di essere legittimato all\'uso di loghi, marchi, font e opere riprodotte e manleva 3DMakes da rivendicazioni di terzi.</li>' +
                '<li><strong>Risultato estetico:</strong> contrasto, uniformità e aspetto finale dipendono da lotto di materiale, preparazione della superficie, geometria del pezzo, colore di base, grado di riflessione e parametri di processo; per produzioni in serie è opportuna una prova su campione, ove non già inclusa.</li>' +
                '<li><strong>Registro e tolleranze:</strong> piccoli scostamenti di posizionamento e di registro sono connaturati al processo; effetti di kerf, calore e risposta del materiale possono produrre variazioni rispetto al campione, salvo tolleranze nominali indicate in offerta.</li>' +
                '<li><strong>Materiali da conto Cliente:</strong> ' + MAT_CLIENTE + '</li>' +
                '<li><strong>Certificazioni e conformità:</strong> la sola marcatura non modifica certificazioni preesistenti del materiale né assicura di per sé la conformità del prodotto finito a norme settoriali; verifiche e dichiarazioni di conformità restano in capo al Cliente.</li>' +
                '<li><strong>Rifiuto della commessa:</strong> 3DMakes può declinare l\'incarico o sospendere la lavorazione qualora materiali o geometrie comportino rischi per la sicurezza del personale o delle attrezzature.</li>' +
                '<li>' + USO_NON_CRITICO + '</li>' +
                '</ol>' +
                '<p style="margin:0 0 6px;"><strong>2. IVA</strong></p>' +
                '<p style="margin:0 0 8px;">Da applicarsi secondo la normativa fiscale vigente e come già esposto in prima pagina.</p>' +
                '<p style="margin:0 0 6px;"><strong>3. Trasporto e consegna</strong></p>' +
                '<p style="margin:0 0 8px;">Ritiro e riconsegna dei pezzi secondo quanto specificato nell\'offerta e pattuito con il Cliente.</p>' +
                '<p style="margin:0 0 6px;"><strong>4. Pagamento</strong></p>' +
                '<p style="margin:0 0 8px;">Alle condizioni già indicate nell\'offerta.</p>' +
                '<p style="margin:0 0 6px;"><strong>5. Costi esclusi</strong></p>' +
                '<p style="margin:0 0 10px;">Servizi accessori non quotati (es. ricostruzione grafica, campioni aggiuntivi, trattamenti post-marcatura).</p>' +
                '<p style="margin:0 0 8px;"><strong>6. Condizioni di fornitura</strong></p>' +
                '<p style="margin:0 0 6px;"><strong>6.1 Oggetto</strong></p>' +
                '<p style="margin:0 0 8px;">Programmazione ed esecuzione di lavorazioni laser di incisione e/o marcatura (di seguito «Servizio») sui pezzi e con le grafiche approvate dal Cliente.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.2 Conferma d\'ordine</strong></p>' +
                '<p style="margin:0 0 8px;">' + CONFERMA_ORDINE + '</p>' +
                '<p style="margin:0 0 6px;"><strong>6.3 Proprietà intellettuale</strong></p>' +
                '<p style="margin:0 0 8px;">Il Cliente è responsabile della liceità dei segni e delle opere oggetto di riproduzione; 3DMakes interviene quale esecutore tecnico della marcatura richiesta.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.4 Garanzie e responsabilità</strong></p>' +
                '<p style="margin:0 0 8px;">3DMakes esegue il Servizio in conformità a grafiche e campioni approvati, nei limiti del processo laser e del substrato. Sono esclusi danni indiretti e pretese estetiche soggettive non regolate contrattualmente. ' + LIMITE_RESP + '</p>' +
                '</div>',
            pagina3:
                '<div class="dm-doc-legal">' +
                '<p style="margin:0 0 6px;"><strong>6.5 Reclami e non conformità</strong></p>' +
                '<p style="margin:0 0 8px;">Reclami motivati vanno trasmessi per iscritto entro 48 ore dalla consegna o dal ritiro, con fotografie chiare e riferimento d\'ordine. Nessun reso senza emissione preventiva di RMA. ' + ACCETTAZIONE_SILENZIO + '</p>' +
                '<p style="margin:0 0 6px;"><strong>6.6 Know-how</strong></p>' +
                '<p style="margin:0 0 8px;">Programmi macchina, parametri laser e metodi di fissaggio sviluppati da 3DMakes restano di sua esclusiva titolarità, salvo patto scritto di cessione.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.7 Prezzi</strong></p>' +
                '<p style="margin:0 0 10px;">Validi fino ad approvazione definitiva di grafica, campioni e distinta pezzi, ove applicabile.</p>' +
                '<p style="margin:0 0 8px;"><strong>7. Accettazione</strong></p>' +
                '<p style="margin:0 0 8px; text-align:center;"><strong><u>L\'accettazione della presente offerta comporta l\'adesione integrale alle note e alle condizioni che precedono.</u></strong></p>' +
                FOOTER_LEGGE +
                '</div>'
        },

        scansione_3d: {
            label: 'Scansione 3D / Reverse Engineering',
            intro: 'Facendo seguito a Vs cortese richiesta, si formula la nostra migliore offerta per i servizi di scansione 3D, acquisizione digitale e, ove indicato, reverse engineering relativi alle seguenti voci.',
            pagina2:
                '<div class="dm-doc-legal">' +
                '<p style="margin:0 0 8px;"><strong>1. Note tecniche</strong></p>' +
                '<ol style="margin:0 0 12px; padding-left:18px;">' +
                '<li><strong>Oggetto dell\'incarico:</strong> il Servizio si basa sull\'oggetto fisico messo a disposizione dal Cliente nello stato e nei tempi concordati. Risoluzione spaziale, completezza geometrica e accuratezza dipendono dalla tecnologia scelta, dalla riflettenza e dalla condizione delle superfici, dal colore, dalla geometria complessiva e dalle limitazioni strumentali.</li>' +
                '<li><strong>Preparazione delle superfici:</strong> superfici lucide, scure, trasparenti o altamente riflettenti possono richiedere trattamenti provvisori (spray opacizzante), bersagli di riferimento o accessori, con eventuali costi aggiuntivi. ' + RITARDI_CLIENTE + '</li>' +
                '<li><strong>Natura dell\'output:</strong> l\'acquisizione standard fornisce modelli mesh (poligonali) e/o nuvole di punti. Attività quali modellazione CAD parametrica, ricostruzione di solidi, pulizia avanzata della mesh, retopologia, esportazione in STEP funzionale o altre lavorazioni sono Servizi distinti e devono essere espressamente incluse nell\'offerta.</li>' +
                '<li><strong>Limiti di misura:</strong> vani profondi, sottosquadri, superfici non visibili dal sensore, zone occluse o interne al pezzo possono risultare assenti o approssimate nel modello digitale.</li>' +
                '<li><strong>Parametri contrattuali:</strong> formati file, risoluzione, tolleranza attesa e grado di reverse engineering devono essere fissati in preventivo. Verifiche metrologiche con rilascio di certificazione non sono incluse salvo incarico dedicato.</li>' +
                '<li><strong>Uso e validazione:</strong> l\'utilizzo finale dei dati, le verifiche dimensionali strumentali e l\'idoneità del modello digitale all\'impiego prescelto sono di esclusiva responsabilità del Cliente. ' + MAT_CLIENTE + '</li>' +
                '<li>' + USO_NON_CRITICO + '</li>' +
                '</ol>' +
                '<p style="margin:0 0 6px;"><strong>2. IVA</strong></p>' +
                '<p style="margin:0 0 8px;">Da applicarsi secondo la normativa fiscale vigente e come già esposto in prima pagina.</p>' +
                '<p style="margin:0 0 6px;"><strong>3. Trasporto e consegna</strong></p>' +
                '<p style="margin:0 0 8px;">Ritiro e riconsegna dell\'oggetto e trasmissione dei file digitali secondo le modalità definite in offerta.</p>' +
                '<p style="margin:0 0 6px;"><strong>4. Pagamento</strong></p>' +
                '<p style="margin:0 0 8px;">Alle condizioni già indicate nell\'offerta.</p>' +
                '<p style="margin:0 0 6px;"><strong>5. Costi esclusi</strong></p>' +
                '<p style="margin:0 0 10px;">Ogni attività non citata nel preventivo (es. post-processing CAD avanzato, certificazioni, rilievi aggiuntivi).</p>' +
                '<p style="margin:0 0 8px;"><strong>6. Condizioni di fornitura</strong></p>' +
                '<p style="margin:0 0 6px;"><strong>6.1 Oggetto</strong></p>' +
                '<p style="margin:0 0 8px;">Acquisizione digitale tridimensionale e lavorazioni sui dati espressamente ricomprese nell\'offerta (di seguito «Servizio»), limitatamente all\'oggetto e ai deliverable ivi descritti.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.2 Conferma d\'ordine</strong></p>' +
                '<p style="margin:0 0 8px;">' + CONFERMA_ORDINE + '</p>' +
                '<p style="margin:0 0 6px;"><strong>6.3 Proprietà intellettuale</strong></p>' +
                '<p style="margin:0 0 8px;">Il Cliente dichiara di avere diritto a far sottoporre a scansione l\'oggetto e i relativi dati e manleva 3DMakes da pretese di terzi connesse all\'oggetto stesso o all\'uso del modello digitale.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.4 Garanzie e responsabilità</strong></p>' +
                '<p style="margin:0 0 8px;">La responsabilità di 3DMakes è limitata all\'esecuzione del Servizio retribuito secondo i parametri dichiarati in offerta. Sono esclusi danni indiretti. ' + LIMITE_RESP + '</p>' +
                '</div>',
            pagina3:
                '<div class="dm-doc-legal">' +
                '<p style="margin:0 0 6px;"><strong>6.5 Contestazioni</strong></p>' +
                '<p style="margin:0 0 8px;">Ogni contestazione in merito alla conformità dei file rispetto a quanto pattuito in offerta dovrà essere inviata per iscritto entro 48 ore dalla messa a disposizione del deliverable, con riferimento d\'ordine e sintesi della problematica. ' + ACCETTAZIONE_SILENZIO + '</p>' +
                '<p style="margin:0 0 6px;"><strong>6.6 Know-how</strong></p>' +
                '<p style="margin:0 0 8px;">Pipeline di acquisizione, algoritmi di allineamento, parametri di fusione e metodi di lavorazione interni restano di titolarità 3DMakes, salvo diverso accordo scritto.</p>' +
                '<p style="margin:0 0 6px;"><strong>6.7 Prezzi</strong></p>' +
                '<p style="margin:0 0 10px;">Possono essere rivisti fino a ricezione definitiva dell\'oggetto e conferma scritta dell\'elenco dei deliverable richiesti.</p>' +
                '<p style="margin:0 0 8px;"><strong>7. Accettazione</strong></p>' +
                '<p style="margin:0 0 8px; text-align:center;"><strong><u>L\'accettazione della presente offerta comporta l\'adesione integrale alle note e alle condizioni che precedono.</u></strong></p>' +
                FOOTER_LEGGE +
                '</div>'
        }
    };
})();
