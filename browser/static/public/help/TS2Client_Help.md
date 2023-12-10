# Indice
1. [Introduzione](#introduction)
2. [La barra dei menu](#Menu)
    1. [Menu Connessione](#MenuConnessione)
        1. Personaggi
        2. Connetti/Disconnetti
        3. Nuova registrazione (Log)
        4. Interrompi registrazione
        5. Scarica registrazione
    2. [Menu Impostazioni](#MenuImpostazioni)
        1. Testo
        2. Scorrimento
        3. Flag capolinea
        4. Flag Triggers, Aliases, Suoni
        5. Tasterino numerico
        6. Avanzate
    3. [Menu Scripting](#MenuScripting)
        1. Aliases, Triggers, Variabili, Classi, Eventi
        2. Creazione e test di script
        3. Esporta scripts
        4. Importa scripts
        5. Aggiorna preimpostati
        6. Avanzate
    4. [Menu Finestre](#MenuFinestre)
        1. Finestre utente
        2. Disposizione schermo
        3. Mapper
    5. [Menu Informazioni](#MenuInformazioni)
        1. Versione
        2. Registro modifiche
        3. Aiuto
3. [Elementi della finestra](#Elements)
    1. [Lato sinistro](#AreaSX)
        1. Riquadro dei pulsanti
        2. Riquadro delle statistiche
        3. Riquadro delle comunicazioni del gruppo
        4. Riquadro dello stato del gruppo
        5. Riquadro delle armi e degli scudi
        6. Riquadro dello stato del pg e del tick timer
    2. [Parte centrale](#AreaCX)
        1. Riquadro dell'output del MUD
        2. Barra di stato
        3. Barra delle azioni
    3. [Lato destro](#AreaDX)
        1. Riquadro delle couminicazioni generali
        2. Riquadro del mapper
4. [Scripting](#scripting)
    1. [Alias](#alias)
    2. [Triggers](#triggers)
    3. [Variabili](#variabili)
    4. [Classi](#classi)
    5. [Eventi](#eventi)
    6. [Funzioni disponibili](#funzioni)
    7. [Come fare per?](#howto)

---

# 1. Introduzione <a name="introduction"></a>

Il WebClient di *Tempora Sanguinis 2* permette un esperienza di gioco più completa. Permette di facilitare e velocizzare l'interazione con il server MUD del gioco separando e rendendo evidenti le informazioni utili al giocatore e velocizzando sequenze di comandi che altrimenti il giocatore dovrebbe digitare ogni volta.

In questo help verranno presentate, e forse spiegate, tutte le parti dell'interfaccia per permetterne un loro uso più completo.

## 1.1 Installazione del WebClient

Il WebClient può essere utilizzato direttamente in una finestra del browser. Per una esperienza migliore si suggerisce però l'installazione come applicazione esterna con questa procedrura:

1. Aprire Google Chrome o Microsoft Edge
2. Andare all'indirizzo https://www.temporasanguinis.it/client/index.html
3. Nella barra dell'indirizzo pigiare sull'icona sulla destra "Installa Tempora Sanguinis 2 Client"  o "Applicazione disponibile"
   - Alternativamente aprire il menu a tre puntini del browser e cercare l'opzione per installare app
4. Confermare l'installazione dell'App
5. Sul desktop dovrebbe essere comparsa l'icona di un Pegaso e la dicitura "Tempora Sanguinis 2 Client"

Si potrà avviare il client direttamente da quella icona o dal menu Avvio.

Si ricorda che il WebClient è testato usando l'ultima versione disponibile di Google Chrome o Edge. Eventuali malfunzionamenti potrebbero essere legati all'uso di un browser o ad una versione differente

---

# 2. La barra dei menu <a name="Menu"></a>

<img src="./help/Menu.jpg" alt="Menu screenshot" width="60%"/>

## 2.1 Menu Connessione <a name="MenuConnessione"></a>

### 2.1.1 Personaggi

Mostra il pannello di scelta per il caricamento del profilo del personaggio.

In questo pannello è possibile selezionare il profilo caricando nel WebClient tutte le impostazioni di quel profilo.
Normalmente si crea un profilo per ogni perosnaggio.

Dal pannello è possibile creare un nuovo profilo vuoto (tasto + verde), cancellare il profilo selezionato (tasto X rosso) o modificare il profilo selezionato (tasto ... giallo).

In fase di creazione o modifica del profilo è possibile impostare:

- Nome profilo: nome da attribuire al profilo. Tipicamente il nome del personaggio.
- Server: tipo di server al quale ci si vuole collegare (**Live** per il server di gioco, **Tester** per l'ambiente di test o **Manuale** per impostare manualmente l'indirizzo di collegamento al server)
- Flag Autenticazione: per abilitare la compilazione automatica del nome e password del personaggio alla richiesta di autenticazione da parte del server di gioco
- Flag trigger preimpostati: per abilitare l'uso di tutti i trigger preimpostati
- Flag disposizione schermo: per il posizionamento automatico dei riquadri all'interno della finestra di gioco.
- Pulsante Ricarica predefinito: per reimpostare il posizionamento predefinito dei riquadri all'interno della finestra di gioco.
- Pulsante Modifica: per vedere e modificare manualmente le impostazioni di posizionamento dei riquadri all'intero della finestra di gioco. Questa opzione è destinata ad un uso avanzato e se ne consiglia l'uso solo se si ha dimestichezza con le configurazioni del WebClient.

Dopo aver selezionato il profilo tramite il pulsante **Connessione** è possibile connettersi al server di gioco.

Il pulsante **Offline** permette di chiudere la schermata di scelta del profilo, caricare tutte le impostazioni del personaggio ma non connettersi al server di gioco.

NOTA: La scelta del profilo **[Profilo base]** permette di caricare i preimpostati (alias, trigger, classi, eventi, variabili) come fossero specifici del personaggio e non preimpostati. Questa opzione è destinata ad un uso avanzato e se ne consiglia l'uso solo se si vuole fare manutenzione dei preimpostati.

NOTA: Per motivi di protezione delle password introdotti dal web browser, potrebbe capitare un problema al caricamento delle impostazioni del profilo al momento della connessione. In questo caso è sufficiente entrare in modifica del profilo (tasto ... giallo) e reimpostare la password del giocatore.

### 2.1.2 Connetti / Disconnetti

Avvia la connessione al server con il profilo precedentemente selezionato oppure disconnette il WebClient dal server di gioco.

In caso di disconnessione comparirà automaticamente il menu di scelta del profilo con un timer automatico che ritenterà periodicamente la connessione.

### 2.1.3 Nuova registrazione (Log)

Avvia la registrazione in memoria di tutto quanto passa nel [riquadro dell'output del mud](#AreaCX).

Il salvataggio su file avverrà però al momento in cui verrà scaricata la registrazione.
Uscire dal WebClient senza fermare la registrazione non ne permetterà pertanto il salvataggio su file.

NOTA: Poichè la registrazione verrà mantenuta in memoria fino al suo salvataggio su file, per evitare una occupazione eccessiva della memoria, raggiunto una dimensione di 1Mb vengono cancellate le righe più vecchie.

### 2.1.4 Interrompi registrazione

Ferma la registrazione del log e cancella quanto registrato.

### 2.1.5 Scarica registrazione

Permette di salvare su file la registrazione raccolta fino a quel momento.

## 2.2 Menu Impostazioni <a name="MenuImpostazioni"></a>

### 2.2.1 Testo

Permette di cambiare colore, font e grandezza del carattere usato nel [riquadro dell'output del mud](#AreaCX). Per gli altri riquadri può essere impostato un font separato.

### 2.2.2 Scorrimento

Permette di definire quante linee vengono tenute nel [riquadro dell'output del mud](#AreaCX).
Il flag animato permette di scegliere se le righe devono comparire oppure scorrere nella finestra.

### 2.2.3 Flag capolinea

Se abilitato aggiunge un a capo automatico qualora la riga di testo ricevuta dal MUD superasse in larghezza lo spazio del riquardo di gioco.

### 2.2.4 Flag Triggers, Aliases, Suoni

Abilita o disabilita il funzionamento dei Trigger, Alias e dei suoni.

### 2.2.5 Tasterino numerico

Permette di cambiare i comandi associati ai tasti del tasterino numerico.

### 2.2.6 Avanzate

#### Flag MXP

Abilita l'interpretazione dei dati ricevuti dal MUD per permettere le funzioni avanzate e una migliore esperienza di gioco. Si consiglia di lasciarlo abilitato

#### Flag Marca tempo nell'output

Se abilitato aggiunge ad ogni riga del [riquadro dell'rioutput del mud](#AreaCX) l'orario esatto.

#### Flag Informazioni scripting (debug)

Se abilitato aggiugnge nel [riquadro dell'output del mud](#AreaCX) indicazioni legate al debug. E' utile nella fase di verifica sul funzionamento dei trigger e alias più complessi ma se ne sconsiglia l'uso nel gioco tipico.

#### Ripristina

Resetta il profilo del PG. Da usare solo in caso di problemi non altrimenti risolvibili.

#### Importazioni ed esportazioni

Le **importazioni** permettono di selezionare un file esterno precedentemente salvato che contiene:

- **Configurazione**: contenuto di tutto il profilo utente (alias, trigger, classi, eventi, variabili)
- **Layout**: impostazioni di posizionamento di tutti i riquadri del WebClient.

Il contenuto dei file importati sovrascriverà le impostazioni in memoria.

Le **esportazioni** permettono di salvere la configurazione attiva o il layout attivo su file esterno.

Le esportazioni sono consigliate per:

- creare copie di backup del proprio profilo per poter ritornare a versioni precedenti funzionanti in caso modifiche abbiano introdotto errori
- far fronte a possibili perdite del profilo visto che il salvataggio dello stesso è demandato al browser.
- spostare il profilo su altri dispositivi

## 2.3 Menu Scripting <a name="MenuScripting"></a>

### 2.3.1 Aliases, Triggers, Variabili, Classi, Eventi

Queste voci aprono le relative finestre di scripting.

Da queste finestre è possibile creare un nuovo elemento, eliminare l'elemento selezionato o modificarlo.

Consultare la voce [Scripting](#scripting) per i dettagli sul loro uso.

### 2.3.2 Creazione e test di script

Viene aperta una finestra per impartire comandi JavaScript al WebClient. Quanto riportato non viene salvato nel profilo del giocatore.

### 2.3.3 Esporta scipts

Apre una maschera che permette l'esportazione su file JSON degli script (alias, trigger, classi, eventi, variabili) la cui classe corrisponde al criterio impostato (da scrivere in formato RegEx). 

E' una funziona avanzata pensata per esportare solo parte degli script. Per il salvataggio di backup si consiglia di usare l'esportazione della configurazione presente nel menu [Impostazioni->Avanzate](#MenuImpostazioni)

### 2.3.4 Importa scripts

Permette di importare un file generato con esporta scripts. A differenza dell'importazione della configurazione presente nel menu [Impostazioni->Avanzate](#MenuImpostazioni), questa importazione non sostituisce tutta la configurazione ma aggiunge agli script già presenti, quelli importati da file.

### 2.3.5 Aggiorna preimpostati

Scarica da server l'ultima versione degli script preimpostati. 

Poichè il WebClient notifica automaticamente all'avvio la disponibilità di un aggiornamento, questa funzione è pensata per riottenere la versione disponibile su server in conseguenza di modifiche non volute sugli script preimpostati.

### 2.3.6 Avanzate

Da questo menu è possibile operare su Alias, Triggers ed Eventi preimpostati. Tipicamente non è necessario operare su questi script e ogni modifica fatta verrà persa quando verranno scaricati o aggiornati gli script preimpostati.

## 2.4 Menu Finestre <a name="MenuFinestre"></a>

### 2.4.1 Finestre utente

Permette di apire un riquadro esistente che precedentemente è stato chiuso.

### 2.4.2 Disposizione schermo

TODO: Funzione non ancora implementata

### 2.4.3 Mapper

Permette di aprire il riquadro del mapper.

## 2.5 Menu informazioni <a name="MenuInformazioni"></a>

### 2.5.1 Versione

Mostra la versione del WebClient.

### 2.5.2 Registro modifiche

Mostra la storia delle modifiche introdotte nel client

### 2.5.3 Help

Apre il presente help del WebClient.

NOTA: L'help sugli script predefiniti può essere invece consultato direttamente dal WebClient dando il comando ```help client```

---

# 3. Elementi della finestra <a name="Elements"></a>

<img src="./help/Totale.jpg" alt="Totale" width="60%"/>

La applicazione contiene una grossa parte centrale per le risposte ricevute dal server di gioco.
Per migliorare l'esperienza di gioco è possibile aggiungere finestre flottanti (si posizionano sopra l'area centrale) o bloccate su un lato (riducono l'area centrale ma non rischiano di nasconderne il contenuto).

E' possibile:

* passare dalla versione bloccata a flottante e viceversa premendo sul simbolo della puntina da disegno presente alla sinistra del nome della finestra.
* nascondere una finestra premendo sulla X quando la finestra è in versione flottante
* mostrare una finestra selezionandola dal menu [Altro->Finestre](#MenuAltro)
* cambiare il font, la dimensione dei caratteri, posizione e dimensione della finestra premendo sul simbolo dell'ingranaggio presente sulla destra del nome della finestra

Nell'impostazione predefinita l'applicazione può essere divisa in 4 aree principali:

* [Barra dei menu](#Menu)
* [Finestre sul lato sinistro](#AreaSX)
* [Parte centrale](#AreaCX)
* [Finestre sul lato destro](#AreaDX)

## 3.1 Lato sinistro <a name="AreaSX"></a>

### 3.1.1 Riquadro dei pulsanti

<img src="./help/Pulsanti.jpg" alt="Pulsanti" width="40%"/>

Questi pulsanti permettono di vedere quali automatismi sono attivi e quali spenti. La pressione del tasto abilita/disabilita l'automatismo.

### 3.1.2 Riquadro delle statistiche

<img src="./help/Statistiche.jpg" alt="Statistiche" width="40%"/>

Questa compatta finestrella mostra, divise su 3 colonne, alcune informazioni utili.

Nella colonna di sinistra è indicato il numero di sigilli divini ed elementali in possesso

Nella colonna centrale c'è una statistica sul numero di Sigilli Divini ottenuti nel periodo indicato.

Nella colonna di destra c'è una statistica sugli XP ottenuti nel periodo indicato (indicati in Mega).

**Sess** rappresenta l'intera sessione (dall'avvio del client)

La riga più in basso indica le monete d'oro che si hanno sul PG (Gold) e in banca (Bank).

### 3.1.3 Riquadro delle comunicazioni del gruppo

Oltre che comparire nel riquadro dell'output di gioco, in questa finestra vengono riportate tutte le comunicazioni interne al gruppo.
Questo per permettere di non perdere alcun messaggio

### 3.1.4 Riquadro dello stato del gruppo

<img src="./help/Gruppo.jpg" alt="Gruppo" width="40%"/>

In questo riquadro sono elencati tutti i membri del gruppo (al primo posto il capogruppo). 

Per ognuno è indicato:

- PG: Il nome
- HP: Percentuale di HP
- MN: Percentuale di Mana
- MV: Percentuale di Movimento
- SANC: Presenza dell'incantesimo Sanc o equivalente
- DO: Presenza dell'incantesimo Detect Original
- QUI: Presenza del giocatore nella stessa stanza

HP, MN e MV sono indicate con colori, sottolineature e lampeggi per indicare il diverso grado di rischio.

Per SANC, DO, il **+** indica la presenza dell'incantesimo, **-** l'assenza e **!** il suo prossimo esaurimento allo scattare del tick

### 3.1.5 Riquadro delle armi e degli scudi

<img src="./help/Armi.jpg" alt="Armi" width="30%"/>

Questi pulsanti permettono di vedere quale arma (colonna di sinistra) e scudo (colonna di destra) sono indossati. La pressione del tasto permette il cambio veloce dell'arma o dello scudo.

### 3.1.6 Riquadro dello stato del pg e del tick timer

<img src="./help/Stato.jpg" alt="Stato" width="30%"/>

Vengono indicati e rappresentati da barre i 4 indicatori:

- HP del pg (attuali/massimi)
- MANA del pg (attuali/massimi)
- MOV del pg (attuali/massimi)
- Countdown stimato al prossimo tick

## 3.2 Parte centrale <a name="AreaCX"></a>

### 3.2.1 Riquadro dell'output del MUD

E' il riquadro principale del gioco. Contiene i messaggi ricevuti dal server di gioco

### 3.2.2 Barra di stato

<img src="./help/Barra.jpg" alt="Barra di stato" width="60%"/>

Nella riga più in alto viene indicato:

- Nome del giocatore.
- HP attuali/massimi.
- Eventuale presenza del flag [AFK] per indicare lo stato di Away From Keyboard - Allontanato dalla tastiera
- Stato del incantesimo SANC
- Stato dello scudo magico (es. fireshield)
- Stato dei buff tipici attivi sul pg (es. True Sight, Detect Original, Blink, ecc.)

e sulla destra:

- Reattivo/Laggato per indicare se il mud è pronto a ricevere comandi oppure il pg è ancora bloccato dal comando precedentemente lanciato
- Posizione del PG (In piedi/Seduto)
- Tipo di room (All'aperto/Al chiuso)

### 3.2.3 Barra delle azioni

<img src="./help/Barra.jpg" alt="Barra di stato" width="60%"/>

La riga più in basso contiene il comando che si vuole mandare al server di gioco per comandare le azioni del proprio personaggio.
A seguito dell'invio il comando rimane presente e selezionato per permettere di rimandarlo con la sola pressione dell'invio.
La digitazione di un nuovo comando sostituisce il precedente.
La barra delle azioni funziona tiene uno storico degli ultimi comandi inviati che si possono scorrere usando freccia su-giù

Sulla destra sono presenti 3 pulsanti che servono per disattivare/attivare rispettivamente:

- [Triggers](#triggers)
- [Alias](#alias)
- Concatenazione di comandi separandoli da **;**

## 3.3 Lato destro <a name="AreaDX"></a>

### 3.3.1 Riquadro delle couminicazioni generali

Oltre che comparire nel riquadro dell'output di gioco, in questa finestra vengono riportate tutte le comunicazioni che il giocatore sente (tranne quelle interne al gruppo che hanno [un riquadro specifico](#AreaSX)) 
Questo per permettere di non perdere alcun messaggio.

### 3.3.2 Riquadro del mapper

<img src="./help/Mapper.jpg" alt="Mapper" width="40%"/>

Questa riquadro contiene una rappresentazione grafica della stanza in cui si trova il giocatore (quadratino con un punto rosso tipicamente al centro della finestra) e tutte quelle attorno.
Tramite segni grafici vengono indicati i collegamenti tra le stanze, la presenza di porte e se il collegamento può essere percorso in una sola direzione.

Stanze particolari (DT, mob, trappole, teleport, ecc) vengono evidenziate con colori per renderle più velocemente individuabili.
La presenza di piccoli triangoli neri in prossimità degli angoli delle *stanze* indicano una apertura verso l'alto o verso il basso.

Il doppio click su una *stanza*, attiva il *vai automatico* fino a quella *stanza*.
Click e drag permette di spostare la mappa per vedere le parti che escono dal riquadro.

La pressione con il tasto destro su una *stanza* fa comparire un breve menu:

- **Aggiungi ai favoriti**: Permette di aggiungere la *stanza* ai favoriti attribuendole un nome. Questo permetterà di impartire al client il comando *vai nome_scelto*. Contestualmente si potrà anche impostarne anche il colore.
- **Rimuovi dai favoriti**: Rimuove la stanza dai favoriti
- **Vai**: Corrisponde ad un doppio click sulla *stanza* attivando il *vai automatico* fino a quella *stanza*
- **Posiziona**: Forza il riposizionamento del giocatore in quella *stanza*. Non prevede il movimento del giocatore.
- **Modifica**: Mostra una finestra con il contenuto (in formato JSON) del database del mapper per quella stanza per permettere modifiche locali al database. Le modifiche verranno perse quando verrà emesso e distribuito un aggiornamento.

Il mapper, vista la sua complessità, ha un suo menu specifico:

- **Dati**
    - **Modalità mappaggio**: Abilita la modalità mappaggio Usabile solo se si è capogruppo. *In sviluppo*
    - **Ricarica mappe**: Preleva da repository internet il database con le mappe.
    - **Carica da locale**: Rende attivo il database mappe che si è salvato in locale in seguito ad aver terminato la modalità mappaggio. Indispensabile perchè al riavvio il WebClient preleva la versione disponibile su internet.
    - **Scarica zona corrente**: Esporta il database della zona corrente su file in formato .json
    - **Carica zona o zone**: Importa nel database attivo la zona o le zone presenti su file esterno precedentemente esportato.
- **Azioni**
    - **Vai a num. locazione**: Attiva il *vai automatico* fino alla stanza di cui si è impostato il numero.
    - **Cerca locazione**: Permette di cercare tutte le locaziozioni il cui nome o descrizione corrisponde al criterio di ricerca messo.
    - **Sincronizza mappa**: Riposiziona il player nell'ultima stanza visitata
    - **Esporta immagine**: Permette di salvare su disco una immagine contenente tutte le *stanze* dell'area e del livello attivo.
- **Altro**
    - **Favoriti**: Mostra un elenco delle destinazioni impostate manualmente e ne permette il *vai automatico*
    - **Informazioni**: Mostra informazioni sul diritto d'uso delle mappe.
    - **Legenda**: Mostra una legenda con la spiegazione del significato degli sfondi delle *stanze*

Al centro, nella barra del menu, è indicato il livello a cui ci si trova e le 2 frecce ai lati permettono di vedere i livelli superiori o inferiori della mappa.
Sulla destra infine è indicato ed è modificabile il livello di zoom a cui si vuole vedere la mappa nel riquadro del mapper.

Appena sotto il menu è indicato il nome dell'area visualizzata. 

**_NOTA:_** Il nome dell'area nel mapper non corrisponde al nome dell'area per il MUD.

Nella parte più bassa del riquadro è indicato in numero della *stanza* in cui ci si trova e il suo nome.
E' il numero da usare con il comando *vai* per raggiungere quella stanza. 
Le stanze più frequentate e le stanze di *inizio area* hanno un nome già assegnato che è più facile da ricordare rispetto al loro numero.

# 4. Scripting <a name="scripting"></a>

Il WebClient ha un potente linguaggio di scripting che permette di velocizzare e automatizzare molti compiti.
Molti di questi automatismi che sono stati ritenuti essere di rilevanza generale per tutti e per permettere una migliore esperienza di gioco, sono già stati creati e vengono aggiornati periodicamente. Nel menu di gioco e in questo help sono chiamati **preimpostati**.
Quando è disponibile un aggiornamento il WebClient evidenzia la disponibilità e chiede conferma che si vogliono scaricare i nuovi preimpostati. Questo sovrascriverà tutti gli script preimpostati. Pertanto, pur se tecnicamente possibile, si consiglia di non modificare gli script preimpostati ma di agire solo su quelli personali.

Lo script non è altro che un elenco di comandi che il WebClient deve eseguire. Questi comandi possono riguardare il solo WebClient oppure essere comandi che il WebClient manda al MUD. 

Nella forma più semplice sono un sequenza di comandi che il WebClient deve inviare al MUD.
Per la forma più complessa si ha a disposizione JavaScript. Si rimanda a risorse esterne per tutorial sulla programmazione e sulla sintassi di JavaScript.

La spiegazione delle funzioni messe a disposizione dal WebClient sono nella sezione [Funzioni](#funzioni)

Gli script, indipendentemente dal contenuto di azioni che devono essere svolte, si dividono in 3 categorie in funzione di cosa fa partire quello script:

- [**gli alias**](#alias): script attivati da un comando impartito dal player nella riga di comando. E' sempre noto quindi quando questi script vengono attivati. Un esempio può essere l'alias ```slash``` che impartito dal player provoca il cambio dell'arma.
Un elenco e una spiegazione degli alias preimpostati è visibile impartendo il comando ```help client```
- [**i triggers**](#triggers): script attivati dalla ricezione dal server di gioco di particolari sequenze di testo. Un esempio può essere l'aggiunta automatica del player *Nome* nel gruppo alla ricezione del testo ```[Nome] inizia a seguirti```
- [**gli eventi**](#eventi): script attivati dal verificarsi della condizione impostata nell'evento. Ad esempio il cambio nel valore di una variabile. L'uso degli eventi rientra in un livello di scripting più avanzato e per le automazioni più facili è normalmente sufficiente l'uso di [alias](#alias) e [triggers](#triggers).


## 4.1 Alias <a name="alias"></a>

Gli alias sono script attivati da un comando impartito dal player nella riga di comando.

<img src="./help/Alias.jpg" alt="Alias" width="80%"/>

| Campo | Funzione |
| ----- | -------- |
| **Modello** | Comando che fa scattare l'alias. Qualora l'alias debba scattare in corrispondenza di più comandi è possiible definire una RegEx |  
| **ID** | Permette di attribuire un nome univoco all'alias. Questo permette agli script di riferirsi esattamente a questo alias. Ad esempio per abilitarlo o disabilitarlo. |  
| **Classe** | Permette di assegnare questo alias ad una classe. Questo permette un raggruppamento degli alias per facilitarne la ricerca. Permette inoltre agendo sull'abilitazione o disabiltiazione delle [classi](#classi), di agire contemporaneamente su tutti gli alias di quella classe. |  
| **Azioni** | Elenco dei comandi da eseguire. |  

| Flags | Funzione |
| ----- | -------- |
| **Macro** | In sviluppo. Non usare. |
| **Abilitato** | Definisce se l'alias è abilitato e quindi funzionante oppure disabilitato. |
| **Regex** | Definisce se il comando definito nel modello è un comando che deve essere impartito esattamente come scritto o se è una RegEx. Per approfondire e fere prove con le Regular Expression si consiglia il sito *https://regexr.com/* |
| **Script** | Definisce se i comandi specificati nel riquadro Azioni sono da interpretare come codice JavaScript (flag attivo) o come lista di comandi da inviare al MUD (flag spento). |

I comandi definiti nel riquadro script vengono interpretati dal client. Pertanto possono richiamare altri alias. A causa di questo c'è il rischio di avere chiamate ricorsive dove lo script richiama se stesso che richiama se stesso e così via. Questo manda in crash il client. 

Qualora serva lanciare un comando che non deve essere interpretato come alias è necessario anteporre il simbolo di tilde. Esempio: ```~comando```

### Esempio di alias facile
**Necessità**: Poichè per medicare le proprie ferite con la skill ```second wind``` è necessario essere seduti si vuole creare un atuomatismo che con l'invio di un solo comando venga svolta la sequenza: sedersi, lancio della skill, rialzarsi.

**Creazione dell'alias**

**Modello**: ```second```

**ID** e **Classe**: vuoti     **Flags**: Spunare solo il flag *Abilitato*

**Script**: 

```
sit
~second
stand
```

### Esempio di alias più complesso
**Necessità**: Castarsi le protezioni dal soffio di drago

**Modello**: ```^\+prot(a|c|f|e|l)b$```
Spiegazione della Regex:

- Comando che inizia con ```+prot```
- segue una tra le lettere a,c,f,e oppure l, che viene intercettata e assegnata al gruppo 1
- poi la lettera ```b``` 
- nulla dopo la ```b```

**ID** e **Classe**: vuoti     **Flags**: Spunare i flag *Abilitato*, *Regex* e *Script*

**Script**: 

```js
if (match[1]==="a") {  //Se la lettera passata ed intercettata nel gruppo 1 è a
    send("cast 'protection acid breath'");  //casta protezione dal soffio acid
} else if (match[1]==="c") {  //Se la lettera passata ed intercettata nel gruppo 1 è c
    send("cast 'protection frost breath'");  //casta protezione dal soffio cold
} else if (match[1]==="e") {
    send("cast 'protection gas breath'");
} else if (match[1]==="f") {
    send("cast 'protection fire breath'");
} else if (match[1]==="l") {
    send("cast 'protection electric breath'");
}
```

## 4.2 Triggers <a name="triggers"></a>

I trigger sono script attivati dalla ricezione dal server di gioco di particolari sequenze di testo.

<img src="./help/Trigger.jpg" alt="Trigger" width="80%"/>

| Campo | Funzione |
| ----- | -------- |
| **Modello** | Pattern che deve essere ricevuto e che fa scattare il trigger. Qualora l'alias debba scattare in corrispondenza di più pattern possibili è possiible definire una RegEx.|
| **ID** | Permette di attribuire un nome univoco al trigger. Questo permette agli script di riferirsi esattamente a questo trigger. Ad esempio per abilitarlo o disabilitarlo.|
| **Classe** | Permette di assegnare questo trigger ad una classe. Questo permette un raggruppamento dei trigger per facilitarne la ricerca. Permette inoltre agendo sull'abilitazione o disabiltiazione delle [classi](#classi), di agire contemporaneamente su tutti i trigger di quella classe.|
| **Azioni** | Elenco dei comandi da eseguire.|

| Flags | Funzione |
| ----- | -------- |
| **Abilitato** | Definisce se il trigger è abilitato e quindi funzionante oppure disabilitato. |
| **Prompt** | Da abilitare solo se il trigger deve intercettare un pattern presente nel prompt restituito dal MUD. Altrimenti lasciare disabilitato. |
| **Regex** | Definisce se il pattern definito nel modello è un pattern che deve essere intercettato esattamente come scritto o se è una RegEx. Per approfondire e fere prove con le Regular Expression si consiglia il sito *https://regexr.com/* |
| **Script** | Definisce se i comandi specificati nel riquadro Azioni sono da interpretare come codice JavaScript (flag attivo) o come lista di comandi da inviare al MUD (flag spento).|

I comandi definiti nella finestra script vengono interpretati dal client. Pertanto possono essere richiamati altri alias. A causa di questo c'è il rischio di avere chiamate ricorsive dove lo script richiama se stesso che richiama se stesso e così via. Questo manda in crash il client.

Qualora serva lanciare un comando che non deve essere interpretato come alias è necessario anteporre il simbolo di tilde. Esempio: ```~comando```

## 4.3 Variabili <a name="variabili"></a>

<img src="./help/Variabili.jpg" alt="Variabili" width="60%"/>

E' possibile definire variabili il cui contenuto viene salvato nel profilo del personaggio e il cui valore quindi viene mantenuto anche all'uscita del WebClient.
Queste variabili, accessibili dagli script con ```this.nome_variabile``` hanno una visibilità globale e possono essere accedute da tutti gli script (trigger, alias e eventi).
Variabili definite all'interno di script con ```let``` sono accessibili solo dallo script che le definisce.

**_NOTA:_** Il contenuto di queste variabili viene tramutato in JSON per permetterne l'archiviazione nel profilo utente, questo comporta che: 

- le variabili possono contenere solo informazioni serializzabili
- le variabili non possono contenere moli di dati troppo onerose visto che lo spazio che il browser mette a disposizione è limitato.

## 4.4 Classi <a name="classi"></a>

<img src="./help/Classi.jpg" alt="Classi" width="60%"/>

La classe è un descrittivo che può essere attribuito nel campo classe a Trigger, Alias e Eventi.

Ogni classe può poi essere abilitata e disabilitata. Questo produce la corrispondente abilitazione o disabilitazione di tutti gli script associati a questa classe.

## 4.5 Eventi <a name="eventi"></a>

Gli eventi sono tipi speciali di [Trigger](#triggers), nel senso che entrambi sono script attivati automaticamente dal WebClient al verificarsi di una condizione in gioco.
Se i [Trigger](#triggers) scattano quando il MUD manda la sequenza di testo impostata, gli eventi permettono di scattare all'accadere di altre condizioni.

<img src="./help/Eventi.jpg" alt="Eventi" width="60%"/>

| Campo | Funzione |
| ----- | -------- |
| **Tipo di evento** | Scelta della tipologia di evento che farà scattare lo script. |
| **Condizione**| Condizione che, assieme al tipo di evento, farà scattare lo script. |
| **ID**| Permette di attribuire un nome univoco al trigger. Questo permette agli script di riferirsi esattamente a questo trigger. Ad esempio per abilitarlo o disabilitarlo. |
| **Classe**| Permette di assegnare questo trigger ad una classe. Questo permette un raggruppamento dei trigger per facilitarne la ricerca. Permette inoltre agendo sull'abilitazione o disabiltiazione delle [classi](#classi), di agire contemporaneamente su tutti i trigger di quella classe. |
| **Azioni**| Elenco dei comandi da eseguire. |

| Tipo di evento | Funzione |
| -------------- | -------- |
| **Variabile cambiata** | Lo script scatta quando la variabile impostata nel campo *Condizione* cambia il suo valore. Nello script *args* avrà il valore *oldValue* e *newValue* |
| **Stato connessione cambiato** | Lo script scatta quando la connessione al server cambia stato. in *Condizione* mettere telnet, websocket. Nello script *args* prenderà il valore true, false |
| **Impostazione cambiata** | Lo script scatta quando avviene un cambiamento delle impostazioni di *userConfig*. Indicare in *Condizione* di quale impostazione si vuole tracciare il cambiamento (text-color, wrap-lines, utf8Enabled, mxpEnabled, enable-aliases, enable-triggers, font-size, font, colorsEnabled, logTime, debugScripts) |
| **Stato classe cambiato** | Lo script scatta quando la classe impostata nel campo *Condizione* cambia il suo stato di attivazione. Nello script *args* prenderà il valore true, false |
| **Trigger scattato** | Lo script scatta quando il trigger il cui ID è impostato nel campo *Condizione* scatta. Nello script *args* prenderà il valore true, false. L'evento scatterà dopo il trigger.|


## 4.6 Funzioni disponibili <a name="funzioni"></a>

Elenco in ordine alfabetico delle funzioni messe a disposizione dal WebClient.


### Marcatori speciali %n e $n

Sono usati negli [alaias](#alias) e nei [triggers](#triggers) per identificare i campi variabili in alternativa alle regex e all'uso di ```match[n]```

%1, %2, ... nel pattern
$1, $2, ... nelle azioni.

**Esempio:**

Pattern: Non riesci a reggere %1 che ti cade in terra.

Azioni: 
```js
Notification.Show("Ti e' caduto " + $1);
send("get ed" + TSPersonaggio)
```

### aliasEnabled <a name="f_aliasEnabled"></a>

Ritorna lo stato di abilitazione del'[alias](#alias) con ID 'id': true se abilitato, false altrimenti.

**Sintassi**: 
```js
aliasEnabled(id: string) -> bool
```

### aliasManager <a name="f_aliasManager"></a>

Utility per gli alias.

**Funzioni**:
```js
 getById(aliasId:string) -> alias
 isEnabled(aliasId:string) -> bool
```

### cap <a name="f_cap"></a>

Se usato all'interno di un [trigger](#triggers) copia la linea che ha fatto scattare il trigger nella finestra 'window'

**Sintassi**: 
```js
cap(window: string)
```

### classEnabled <a name="f_classEnabled"></a>

Ritorna lo stato di abilitazione della [classe](#classi) con ID 'id': true se abilitato, false altrimenti.

**Sintassi**: 
```js
classEnabled(id: string) -> bool
```

### classManager <a name="f_classManager"></a>

Utility per le classi alias/trigger.

**Funzioni**:
```js
Delete(id:string)
Create(id:string, val:boolean)
isEnabled(id: string) -> bool
```

### cls <a name="f_cls"></a>

Cancella il contenuto della finestra 'window'.

**Sintassi**: 
```js
cls(window: string)
```

### color <a name="f_color"></a>

Restituisce una stringa in cui viene aggiunto un colore al 'testo'.
E' possibile aggiungere anche effetti mettendo a true il parametro. Di default è falso.

I nomi dei colori possono essere trovati in internet cercando *javascript color names*

Vedi anche [print][#f_print]

**Sintassi**: 
```js
color(testo: string, foreground: string, background?: string, bold?: bool, underline?: bool, blink?: bool) -> string
```

**Esempio d'uso**:
```js
print("Questo help e' " + color('bellissimo', 'red', 'Gold', true, false, true));
```

### createWindow <a name="f_createWindow"></a>

Funzione per apire una finestra con i parametri specificati. Ritorna un riferimento alla definizione della finestra per una manipolazione successiva tramite windowManager.

**Sintassi**: 
```js
createWindow(windowName:string, data?:WindowData) -> WindowDefinition
```

WindowData opzionale è un oggetto con la seguente struttura:
```js
interface WindowData {
    name: string;
    x:number;
    y:number;
    w:number;
    h:number;
    visible:boolean;
    collapsed:boolean;
    docked:boolean;
    font?:string;
    fontSize?:number;
    anchorWidth?:number;
    anchorHeight?:number;
}
```

WindowDefinition è un oggetto con la seguente struttura:
```js
interface WindowDefinition {
    data: WindowData;
    created:boolean;
    initialized:boolean;
}
```

### delay <a name="f_delay"></a>

Esegue la funzione 'function' dopo 'milliseconds' millisecondi. L'ID è necessario e se esiste già un delay con lo stesso ID, esso verrà annullato e sovrascritto

**Sintassi**: 
```js
delay(id: string, milliseconds: number, function: fn())
```

**Esempio d'uso**:
```js
const ts = () => {
  const n = new Date();
  return (n.getHours().toString().padStart(2,'0') + ":" 
        + n.getMinutes().toString().padStart(2,'0') + ":" 
        + n.getSeconds().toString().padStart(2,'0') + "." 
        + n.getMilliseconds().toString().padStart(3,'0')
         );
}

print(ts() + ': avvio');
delay('d_smile', 2500, ()=>{print(ts() + ': dopo delay');});
```

### deleteWindow <a name="f_deleteWindow"></a>

Cancella la finestra con quel nome e la rimuove dalla lista di finestra nel menu finestre.

**Sintassi**: 
```js
deleteWindow(windowName:string)
```

### eventEnabled <a name="f_eventEnabled"></a>

Ritorna lo stato di abilitazione del'[evento](#eventi) con ID 'id': true se abilitato, false altrimenti.

**Sintassi**: 
```js
eventEnabled(id: string) -> bool
```

### gag <a name="f_gag"></a>

Se usato all'interno di un [trigger](#triggers), rimuove dall'output la riga che ha fatto scattare il trigger

**Sintassi**: 
```js
gag()
```

### getAlias <a name="f_getAlias"></a>

Accede all'aliasManager e ritorna l'[alias](#alias) con l'ID richiesto

**Sintassi**: 
```js
getAlias(id: string) -> alias
```

### getEvent <a name="f_getEvent"></a>

Accede all'aliasManager e ritorna l'[evento](#eventi) con l'ID richiesto

**Sintassi**: 
```js
getEvent(id: string) -> event
```

### getTrigger <a name="f_getTrigger"></a>

Accede all'aliasManager e ritorna il [trigger](#triggers) con l'ID richiesto

**Sintassi**: 
```js
getTrigger(id: string) -> trigger
```

### getvar <a name="f_getvar"></a>

Restituisce la variabile 'varname'. 

Analogo a ```this.varname```

**Sintassi**: 
```js
getvar(varname: string) -> variable
```

### getWindow <a name="f_getWindow"></a>

Ritorna un oggetto WindowDefinition ([vedi createWindow](#f_createWindow)) della finestra con il nome impostato.

**Sintassi**: 
```js
getWindow(window:string) -> WindowDefinition
```

### highlight <a name="f_highlight"></a>

Evidenzia l'ultima linea di trigger con i colori assegnati e opzionalmente il lampeggio.

**Sintassi**: 
```js
highlight(foreground: string, background: string, blink?: bool)
```

### link <a name="f_link"></a>

Crea un link cliccabile che esegue la funzione 'click'. Opzionalmente 'hover' mostrerà un testo quando il mouse è sopra al link.

**_NOTA:_** Il link non viene automaticamente mostrato. Deve essere incapsulato in un comando print

**Sintassi**:
```js
link(text: string, click: fn(), hoover?: string)
```

**Esempio d'uso**:
```js
print("E' il momento di " + 
      link(color('sorridere','yellow'),
              ()=>{
                   send('smile')
                  },
           'smile'
          )
     )
```

Gli a capo sono solo per facilità di lettura in questo help e non necessari.

### map / mapper <a name="f_mapper"></a>

Oggetto per comandare il mapper via script. 

Vedi elementi specifici.

### mapper.current

Oggetto contentente la locazione corrente nel mapper.

**Sintassi**:
```js
mapper.current -> Room
```

Proprietà dell'oggetto room:

| proprietà | descirzione |
| --------- | ----------- |
| color | colore della cella in formato web - css|
| description | descrizione della locazione |
| exits | Oggetto contenente le uscite disponibili nella locazione | 
| id | ID della locazione |
| name | nome della locazione |
| shortName | nome breve della locazione usabile con il comando vai |
| zone_id | id dell'area a cui appartiene la locazione |

### mapper.getRoomById

Cerca e ritorna la room con quell'ID

**Sintassi**:
```js
mapper.getRoomById(id: number) -> Room
```

### mapper.getRoomByVnum

Cerca e ritorna la room con quel numero virtuale

**Sintassi**:
```js
mapper.getRoomByVnum(vnum: number) -> Room
```

### mapper.search

Cerca la room per nome e opzionalmente descrizione, visualizza a schermo e ritorna un array di Room trovate

**Sintassi**:
```js
mapper.search(name: string, desc?: string) -> Room[]
```

**Esempio d'uso**:
```js
mapper.search("reception");
```

### mapper.searchRooms

Simile a mapper.search. Cerca la room per nome e opzionalmente descrizione, non visualizza a schermo e ritorna un array di Room trovate.

**Sintassi**:
```js
mapper.searchRooms(name: string, desc?: string) -> Room[]
```

**Esempio d'uso**:
```js
const trovate = mapper.searchRooms("reception");
for (let r of trovate) {
  print(r.name); 
}
```

### mapper.setRoomById

Assegna la locazione con ID come corrente nel mapper

**Sintassi**:
```js
mapper.setRoomByID(id: number)
```

### mapper.setRoomByVnum

Assegna la locazione con numero virtuale come corrente nel mapper

**Sintassi**:
```js
mapper.setRoomByVnum(vnum: number)
```

### mapper.setZoneById

Assegna la zona con ID specificato come corrente nel mapper

**Sintassi**:
```js
mapper.setZoneById(id: number)
```

### mapper.walkToId

Attiva l'auto vai all'ID specificato. Crea il percorso e lo segue

**Sintassi**:
```js
mapper.walkToId(id: number)
```

### mapper.walkToVnum

Attiva l'auto vai al numero virtuale specificato. Crea il percorso e lo segue

**Sintassi**:
```js
mapper.walkToVnum(vnum: number)
```

### Messagebox <a name="f_Messagebox"></a>

Oggetto per apire form di dialogo.

| Funzioni | Descrizione |
| -------- | ----------- |
| Question | Fornisce una domanda e viene restituita la risposta |
| Show | Messagebox semplice, con titolo e messaggio |
| ShowFull | Fornisce una domande e viene restituita la risposta |
| ShowInput | Permette multiline per testi lunghi | 
| ShowInputWithButtons | Permette bottoni personalizzabili |
| ShowMultiInput | Permette più domande in un pannello. Ritorna un array con le risposte |

**_NOTA:_** Aggiungere ```await``` per mettere in pausa lo script e attendere la risposta.

**Esempio d'uso**:
```js
const risposta = await Messagebox.ShowInputWithButtons("Titolo", "Corpo del messaggio", "Testo di default", "Conferma", "Annulla")
if (risposta.button == 1) {
  print(risposta.result);
} else {
  print("Annullato");
}
```

### Notification.Show <a name="f_Notification"></a>

Aggiunge una notifica popup con il testo e la configurazione opzionale passata"

**Sintassi**:
```js
Notification.Show(testo: string, top?: bool, ripeti?: bool, delay?: number, html?: bool, trasparenza?: number, blink?: bool)
```

| Parametro | Descrizione |
| --------- | ----------- |
| testo | Testo da mostrare nella finestra popup |
| top | se true mostra il popup dall'alto verso il basso, se false (default) dal basso verso l'alto |
| ripeti | se true toglie istantaneamente dallo schermo la notifica precedente e la sostituisce con questa, se false (predefinito) aggiunge la notifica senza rimuovere la precedente |
| delay | millisecondi di permanenza del popup |
| html | se true il testo viene interptretato come formato html, se false (default) come stringa di testo |
| trasparenza | numero tra 0 e 1 indicante il livello di trasparenza richiesto. 0 equivale a trasparenza completa, 1 equivale a opacità completa |
| blink | se true attiva il lampeggio del popup |

### owner <a name="f_owner"></a>

Restituisce una stringa contenente chi ha lanciato lo script.

**Sintassi**
```js
Owner -> string
``` 

### playAudio <a name="f_playAudio"></a>

Suona un file audio dall'URL specificato.

**Sintassi**
```js
playAudio(url: string)
```

### print <a name="f_print"></a>

Visualizza nella finestra indicata (di default l'output del MUD) il testo richiesto.

**Sintassi**
```js
print(testo: string, finestra?: string)
```

**Esempio d'uso**
```js
print("Esempio di print", "Social")
```

### repeat <a name="f_repeat"></a>

Esegue a ripetizione la funzione 'function' ogni 'milliseconds' millisecondi. L'ID è necessario e se esiste già un repeat con lo stesso ID, esso verrà annullato e sovrascritto.

**Sintassi**
```js
repeat(id: string, milliseconds: number, function: fn())
```

**Esempio d'uso**
```js
repeat('test_repeat', 3000, ()=>{send('smile')})
```
per fermarlo si passa null a function:
**Esempio d'uso**:
```js
repeat('test_repeat', 0, null)
```

### send <a name="f_send"></a>

Manda un comando, o più comandi se separati da ; al mud. 

Può contenere [alias](#alias) che verranno eseguiti.

**Sintassi**
```js
send(command: string)
```

### setvar <a name="f_setvar"></a>

Analogo a ```this.varname = value```

Imposta il valore di una variabile

**Sintassi**
```js
setvar(varname:string, value:any))
```

### stopAudio <a name="f_stopAudio"></a>

Interrompe ogni audio che sta suonando al momento.

**Sintassi**
```js
stopAudio()
```

### sub <a name="f_sub"></a>

All'interno di un [trigger](#triggers) viene usato per sostituire il testo 'cosa' con il testo 'conCosa' nell'output a schermo

**Sintassi**
```js
sub(cosa: string, conCosa: string)
```

**Esempio d'uso**
```js
sub("lucertola a quattro zampe","paleoscincus")
```

### toggleAlias <a name="f_toggleAlias"></a>

Abilita o disabilita l'[alias](#alias) con ID 'id' impostandolo allo stato 'state' richiesto

**Sintassi**
```js
toggleAlias(id: string, state: bool)
```

### toggleClass <a name="f_toggleClass"></a>

Abilita o disabilita la [classe](#classe) con ID 'id' impostandola allo stato 'state' richiesto

**Sintassi**
```js
toggleClass(id: string, state: bool)
```

### toggleEvent <a name="f_toggleEvent"></a>

Abilita o disabilita l'[evento](#eventi) con ID 'id' impostandola allo stato 'state' richiesto

**Sintassi**
```js
toggleEvent(id: string, state: bool)
```

### toggleTrigger <a name="f_toggleTrigger"></a>

Abilita o disabilita il [trigger](#triggers) con ID 'id' impostandola allo stato 'state' richiesto

**Sintassi**
```js
toggleTrigger(id: string, state: bool)
```

### triggerEnabled <a name="f_triggerEnabled"></a>

Ritorna lo stato di abilitazione del [trigger](#triggers) con ID 'id': true se abilitato, false altrimenti.

**Sintassi**: 
```js
triggerEnabled(id: string) -> bool
```

### triggerManager <a name="f_triggerManager"></a>

Utility per gli trigger.

**Sintassi**: 
```js
getById(trgId:string) -> trigger
isEnabled(trgId:string) -> bool
```

### variable <a name="f_variable"></a>

Ritorna il valore della variabile con il nome richiesto. Analogo a [getvar](#f_getvar) e a ```this.name```

**Sintassi**: 
```js
variable(name: string) -> variable
```

## 4.7 Come fare per? <a name="howto"></a>

In questa sezione verranno aggiunte man mano le soluzioni alle domande più frequenti riguardo agli script non già riportate nelle spiegazioni precedenti.


---
