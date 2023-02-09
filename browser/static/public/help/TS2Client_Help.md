# Indice
1. [Introduzione](#introduction)
2. [La barra dei menu](#menues)
    1. [Menu Connessione](#menuconnessione)
3. [Scripting](#scripting)
	1. [Una room](#mapperroom)

## 1. This is the introduction <a name="introduction"></a>
Some introduction text, formatted in heading 2 style  
[Markdown Syntassi base](https://www.markdownguide.org/basic-syntax/)  
[Markdown Syntassi estesa](https://www.markdownguide.org/extended-syntax/)  
[Markdown Cheat sheet](https://www.markdownguide.org/cheat-sheet/) 


## 2. La barra dei menu <a name="menues"></a>
Bla Bla

![Menu screenshot](./help/menu.jpg)

### 2.1 Menu Connessione <a name="menuconnessione"></a>
This is a sub paragraph, formatted in heading 3 style  
![Menu connessione](./help/connessione.jpg)  
Bla bla
> Nota: a fine logging serve premere **Registrazione (Log)** per scaricare il log.

## 3. Scripting <a name="scripting"></a>
Flags di trigger o alias:  
| Proprieta'  | Descrizione |
| ----------- | ----------- |
| Abilitato   | Se disabilitato non sara' azionabile        |  
| Regex       | Se abilitato il pattern e' in linguaggio Regex (vedi ***[Azioni](#azioni)***)      |  
| Script      | Se abilitato le azioni sono scritte in linguaggio javascript (vedi ***[API javascript](#apijs)***)<br />Altrimenti vedi: ***[API testuale](#apitestuale)***       |  

Esempio azione scripting per assegnare variabile:  
```js
setvar("testo","contenuto testuale")
```
Oppure:  
```js
this.testo = "contenuto testuale"
```
Richiama variabile metodo non script / semplice:  
```nohighlight
say @variabile
```

Esempio script:  
```js
if (this.TSPosizione != "In piedi") {
	send("stand")
}
```

### 3.1 Una room del mapper <a name="mapperroom"></a>
Il JSON di una room

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
```