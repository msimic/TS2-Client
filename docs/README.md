# TS2 Client 
> Il MUD client di Tempora Sanguinis 2.

E' usato per il client online sul sito: https://temporasanguinis.it, e ha versioni binarie per windows, e linux (deb, rpm).

![image](https://github.com/user-attachments/assets/4ef3dc25-e0b9-4776-92db-f57b3b6d9a2f)

Versione live su Tempora Sanguinis: https://temporasanguinis.it/#play

# Funzionalita' #
* Colori ANSI
* 256 colori
* Mapper
* UTF-8
* Disposizione schermo (layout)
* Finestre (scriptabili via trigger)
* Supporto MXP (``<image>``, ``<send>``, ``<a>``, ``<i>``, ``<b>``, ``<u>``, ``<color>``, e ``<s>``)
* Triggers (semplici and regex)
* Aliases (semplici and regex)
* Variabili
* Eventi  
* [Supporto per scripting (Javascript)](scripting.md)

Sviluppato con tecnologie: Node.js, Socket.IO, HTML5

Linguaggi usati: Typescript, HTML5, CSS

Il proxy fatto in Node.js tramite Socket.IO crea le connessioni telnet e trasferisce i dati telnet al browser ed e' hostato sul sito del gioco.

# Build
* git clone https://github.com/msimic/TS2-Client.git

# Prerequisiti per build del proxy: Git, Node.js / NPM
* In cartella telnet_proxy
* > npm install
* > npm run build
* configurare i config per l'esecuzione in locale
* > npm run build && npm run start

# Prerequisiti per build del client: Git, Node.js / NPM
* In cartella browser
* > npm install
* > npm run build

# Prerequisiti per build delle versioni binarie
* > npm run build_for_electron
* > npm run electronWindows
* > npm run electronLinux (solo sotto linux)
* > npm run electronMac (solo sotto macOS)

# Esecuzione
* Aprire in VSCode i progetti telnet_proxy e browser
* configurare i config
* CTRL+SHIFT+B e runnare il build
* F5 per runnare con debugging 

# Contributi

Accettiamo contributi, anche di devs di altri mud se volete far girare il client per il vostro mud.
Aiuti sono graditi in coding e desing grafico.

Inoltre contributi monetari sono ben accetti e verranno usati per lo sviluppo e miglioramento del client:
* https://www.paypal.com/paypalme/marinosimic 

# Licenza
[MIT](LICENSE.md)
