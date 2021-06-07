# nfc-pcsc

[![npm](https://img.shields.io/npm/v/nfc-pcsc.svg)](https://www.npmjs.com/package/nfc-pcsc)
[![build status](https://img.shields.io/travis/pokusew/nfc-pcsc/master.svg)](https://travis-ci.org/pokusew/nfc-pcsc)
[![nfc-pcsc channel on discord](https://img.shields.io/badge/discord-join%20chat-61dafb.svg)](https://discord.gg/bg3yazg)

Easy **reading and writing NFC tags and cards** in Node.js

Built-in support for auto-reading **card UIDs** and reading tags emulated with [**Android HCE**](https://developer.android.com/guide/topics/connectivity/nfc/hce.html).

> **NOTE:** Reading tag UID and methods for writing and reading tag content **depend on NFC reader commands support**.
It is tested to work with **ACR122 USB reader** but it should work with **all PC/SC compliant devices**.  
When detecting tags does not work see [Alternative usage](#alternative-usage).

This library uses pcsclite native bindings [pokusew/node-pcsclite](https://github.com/pokusew/node-pcsclite) under the hood.

**Psst!** Problems upgrading to 0.6.0? Check out [this migration note](#migration-from-older-versions-to-060).


<!-- _**Psst!** You are browsing the documentation for the master branch, [look here](https://github.com/pokusew/nfc-pcsc/tree/v0.6.0) to see the usage of latest published version._ -->


## Content

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [About this Fork](#about-this-fork)
- [Installation](#installation)
- [Flow of handling tags](#flow-of-handling-tags)
- [Basic usage](#basic-usage)
	- [Running examples locally](#running-examples-locally)
- [Alternative usage](#alternative-usage)
- [Reading and writing data](#reading-and-writing-data)
- [More examples](#more-examples)
- [FAQ](#faq)
  - [Migration from older versions to 0.6.0](#migration-from-older-versions-to-060)
  - [Can I use this library in my Electron app?](#can-i-use-this-library-in-my-electron-app)
  - [Can I use this library in my angular-electron app?](#can-i-use-this-library-in-my-angular-electron-app)
  - [Do I have to use Babel in my app too?](#do-i-have-to-use-babel-in-my-app-too)
  - [Which Node.js versions are supported?](#which-nodejs-versions-are-supported)
  - [How do I require/import this library?](#how-do-i-requireimport-this-library)
  - [Can I read a NDEF formatted tag?](#can-i-read-a-ndef-formatted-tag)
  - [Can I use this library in my React Native app?](#can-i-use-this-library-in-my-react-native-app)
- [Frequent errors](#frequent-errors)
  - [TypeError: NFC is not a constructor](#typeerror-nfc-is-not-a-constructor)
  - [Transaction failed error when using `CONNECT_MODE_DIRECT`](#transaction-failed-error-when-using-connect_mode_direct)
  - [MIFARE Classic: Authentication Error after Multiple Writes](#mifare-classic-authentication-error-after-multiple-writes)
  - [Reading data from a type 4 tags inside a Elsys.se sensors](#reading-data-from-a-type-4-tags-inside-a-elsysse-sensors)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## About this Fork

The goal of this project is to have a "local server" that provides an API to a web browser based "client" page.
The "client" page will be sourced from a separate project, which will communicate with both a back-end and this local server instance.
In this way, the "client" is acting like a bridge between the two servers. The "client" will pass parameters to the local server to
configure its behavior as it processes NTAG213 or NTAG215 items that are presented to it. Eventually, the local server will be provided with an
appropriate URL prefix and domain. Currently, this is hardcoded. The local server will then process the "write" actions by producing a
unique signature that will be composed of the tag's 7 byte serial number, presented as 14 character HEX code, AND a 16 byte UUIDv4 random code,
presented as a 32 character HEX code. When the two ID's are combined, this will produce a 23 byte unique identifcation number, which
should prevent any duplication in the back-end server's records. The ultimate purpose of the encoded tag is to provide a means to a smartphone
or tablet that is equiped with 13.56mhz NFC component. iPhone's of version 7 or higher should have the feature, though some models do not
support background scanning. Starting at version 10, background scanning of "well known" tags is supported.

Note: Setting a tag with "http://www." or "https://www.", values 1 and 2 respectively, does not work with brackground sscanning on the iPhone.
To support background scanning, it is best to use a value of 3 or 4, which is "http://" and "https://" respectively.

This is a forked copy of the nfc-pcsc, which contains a "ntag_rw_server.js" within a folder called server.
At this time, the only modifications to the original source repo are the inclusion of the above folder/file,
modification of the package.json which includes a UUID library, and this "About this Fork" section appended to the README.md file.

To install this project simply clone the project, and then type "npm install" in a terminal window, while within the nfc-pcsc folder.
To execute this server simply type "npm run server" in a terminal window, while within the nfc-pcsc folder.

To use this server, use a web browser to go to the following URL's from the same computer:

1. http://127.0.0.1:8080/check

2. http://127.0.0.1:8080/clear

3. http://127.0.0.1:8080/read

4. http://127.0.0.1:8080/write

5. http://127.0.0.1:8080/writeover/?ti= (7 byte tag ID expressed as 14 characters of HEX)

6. http://127.0.0.1:8080/writeover/?ti=AUTO

7. http://127.0.0.1:8080/pending

"check" will return a value of 0 or 1.
1 will be returned when the reader does not have a tag being currently read. (resting on it)
0 will be returned when the reader does have a tag being currently read.

"clear" will always return 1, and basically means that it has set variables to "undefined" to clear out a previous pending action.

"read" will return 1, when there is no pending action. This will mean that it has "set" the read/writer to perform a read action.
"write" will return 1, when there is no pending action. This will mean that it has "set" the read/writer to perform a write action.
"writeover" will return 1, when there is no pending action. This will mean that it has "set" the read/writer to perform a writeover action.
Note: a writeover action requires that either ti= has a 14 character hexcode matching a particular tag's serial number, or the word "AUTO"
has been passed in. Without this setting, writeover will not occur.

All three actions "read", "write", "writeover" will return 0, when a pending action is already in place.

"pending" will return 1, when there is a pending action, but no data has been returned yet for the pending action.
data will be returned, when pending is called, and the action has already occurred.
0 will be returned when there is no pending action.

## Installation

**Requirements:** **at least Node.js 8 or newer** (see [this FAQ](#which-nodejs-versions-are-supported) for more info)

**Note:** This library can be used only in **Node.js** environments on Linux/UNIX, macOS and Windows. Read why [here](#can-i-use-this-library-in-my-react-native-app).

1. **Node Native Modules build tools**

    Because this library (via [pokusew/node-pcsclite](https://github.com/pokusew/node-pcsclite) under the hood) uses Node Native Modules (C++ Addons),
    which are automatically built (using [node-gyp](https://github.com/nodejs/node-gyp))
    when installing via npm or yarn, you need to have installed **C/C++ compiler
    toolchain and some other tools** depending on your OS.
    
    **Please refer to the [node-gyp > Installation](https://github.com/nodejs/node-gyp#installation)**
    for the list of required tools depending on your OS and steps how to install them.

2. **PC/SC API in your OS**

    On **macOS** and **Windows** you **don't have to install** anything,
    **pcsclite API** is provided by the OS.
    
    On Linux/UNIX you'd probably need to install pcsclite library and daemon**.

    > For example, in Debian/Ubuntu:
    > ```bash
    > apt-get install libpcsclite1 libpcsclite-dev
    > ```
    > To run any code you will also need to have installed the pcsc daemon:
    > ```bash
    > apt-get install pcscd
    > ```

3. **Once you have all needed libraries, you can install nfc-pcsc using npm:**

    ```bash
    npm install nfc-pcsc --save
    ```
    
    or using Yarn:
    
    ```bash
    yarn add nfc-pcsc
    ```


## Flow of handling tags

When a NFC tag (card) is attached to the reader, the following is done:

1. it tries to find out the standard of card (`TAG_ISO_14443_3` or `TAG_ISO_14443_4`)

2. it will connect to the card, so any other card specific commands could be send

3. handling of card
	
	- when `autoProcessing` is true (default value) it will handle card by the standard:  
		
		`TAG_ISO_14443_3` *(MIFARE Ultralight, 1K ...)*: sends GET_DATA command to retrieve **card UID**  
		`TAG_ISO_14443_4` *(e.g.: Android HCE)*: sends SELECT_APDU command to retrieve data by file
		
		**then `card` event is fired, for which you can listen and then you can read or write data on the card**  
		see [Basic usage](#basic-usage) how to do it
		
	- when `autoProcessing` is false (default value) it will only fire `card` event  
	  then you can send whatever commands you want using `reader.transmit` method  
	  see [Alternative usage](#alternative-usage) how to do it
	  
4. you can read data, write data and send other commands


## Basic usage

> ### Running examples locally
> If you want see it in action, clone this repository, install dependencies with npm and run `npm run example`.
> Of course, instead of npm you can Yarn if you want.
> See scripts section of [package.json](/package.json) for all available examples run commands.
> ```bash
> git clone https://github.com/pokusew/nfc-pcsc.git
> cd nfc-pcsc
> npm install
> npm run example
> ```

You can use this library in any Node.js 8+ environment (even in an Electron app). 

```javascript
// in ES6
import { NFC } from 'nfc-pcsc';

// without Babel in ES2015
const { NFC } = require('nfc-pcsc');

const nfc = new NFC(); // optionally you can pass logger

nfc.on('reader', reader => {

	console.log(`${reader.reader.name}  device attached`);

	// enable when you want to auto-process ISO 14443-4 tags (standard=TAG_ISO_14443_4)
	// when an ISO 14443-4 is detected, SELECT FILE command with the AID is issued
	// the response is available as card.data in the card event
	// see examples/basic.js line 17 for more info
	// reader.aid = 'F222222222';

	reader.on('card', card => {

		// card is object containing following data
		// [always] String type: TAG_ISO_14443_3 (standard nfc tags like MIFARE) or TAG_ISO_14443_4 (Android HCE and others)
		// [always] String standard: same as type
		// [only TAG_ISO_14443_3] String uid: tag uid
		// [only TAG_ISO_14443_4] Buffer data: raw data from select APDU response

		console.log(`${reader.reader.name}  card detected`, card);

	});

	reader.on('card.off', card => {
		console.log(`${reader.reader.name}  card removed`, card);
	});

	reader.on('error', err => {
		console.log(`${reader.reader.name}  an error occurred`, err);
	});

	reader.on('end', () => {
		console.log(`${reader.reader.name}  device removed`);
	});

});

nfc.on('error', err => {
	console.log('an error occurred', err);
});
```


## Alternative usage

You can **disable auto processing of tags** and process them yourself.
It may be useful when you are using other than ACR122 USB reader or non-standard tags.

```javascript
// in ES6
import { NFC } from 'nfc-pcsc';

// without Babel in ES2015
const { NFC } = require('nfc-pcsc');

const nfc = new NFC(); // optionally you can pass logger

nfc.on('reader', reader => {

	// disable auto processing
	reader.autoProcessing = false;

	console.log(`${reader.reader.name}  device attached`);

	reader.on('card', card => {

		// card is object containing following data
		// String standard: TAG_ISO_14443_3 (standard nfc tags like MIFARE Ultralight) or TAG_ISO_14443_4 (Android HCE and others)
		// String type: same as standard
		// Buffer atr

		console.log(`${reader.reader.name}  card inserted`, card);

		// you can use reader.transmit to send commands and retrieve data
		// see https://github.com/pokusew/nfc-pcsc/blob/master/src/Reader.js#L291

	});
	
	reader.on('card.off', card => {	
		console.log(`${reader.reader.name}  card removed`, card);
	});

	reader.on('error', err => {
		console.log(`${reader.reader.name}  an error occurred`, err);
	});

	reader.on('end', () => {
		console.log(`${reader.reader.name}  device removed`);
	});

});

nfc.on('error', err => {
	console.log('an error occurred', err);
});
```


## Reading and writing data

You can read from and write to numerous NFC tags including MIFARE Ultralight (tested), MIFARE Classic, MIFARE DESFire, ...

> Actually, you can even read/write any possible non-standard NFC tag and card, via sending APDU commands according card's technical documentation via `reader.transmit`.

Here is **a simple example** showing reading and writing data to simple card **without authenticating** (e.g. MIFARE Ultralight):  
_See [Basic usage](#basic-usage) how to set up reader or [look here for full code](/examples/from-readme-3.js)_

```javascript
reader.on('card', async card => {

	console.log();
	console.log(`card detected`, card);

	// example reading 12 bytes assuming containing text in utf8
	try {

		// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
		const data = await reader.read(4, 12); // starts reading in block 4, continues to 5 and 6 in order to read 12 bytes
		console.log(`data read`, data);
		const payload = data.toString(); // utf8 is default encoding
		console.log(`data converted`, payload);

	} catch (err) {
		console.error(`error when reading data`, err);
	}

	// example write 12 bytes containing text in utf8
	try {

		const data = Buffer.allocUnsafe(12);
		data.fill(0);
		const text = (new Date()).toTimeString();
		data.write(text); // if text is longer than 12 bytes, it will be cut off
		// reader.write(blockNumber, data, blockSize = 4)
		await reader.write(4, data); // starts writing in block 4, continues to 5 and 6 in order to write 12 bytes
		console.log(`data written`);

	} catch (err) {
		console.error(`error when writing data`, err);
	}

});
```

## More examples

📦📦📦 You can find more examples in [examples folder](/examples), including:

* [read-write.js](/examples/read-write.js) – detecting, reading and writing cards standard ISO/IEC 14443-3 cards (NTAG, MIFARE Ultralight, ...)
* [mifare-classic.js](/examples/mifare-classic.js) – authenticating, reading and writing MIFARE Classic cards
* [mifare-desfire.js](/examples/mifare-desfire.js) – authenticating and accessing data on MIFARE DESFire cards
* [mifare-ultralight-ntag.js](/examples/mifare-ultralight-ntag.js) – an example implementation of Mifare Ultralight EV1 and NTAG specific commands
* [basic.js](/examples/basic.js) – reader events explanation
* [led.js](/examples/led.js) – controlling LED and buzzer of ACR122U reader
* [uid-logger.js](/examples/uid-logger.js) – logs uid when a card is detected

Feel free to open pull request, if you have any useful example, that you'd like to add. 


## FAQ

### Migration from older versions to 0.6.0

There was a **breaking change in 0.6.0**, as the default export was removed _(because of non-standard behaviour of ES6 modules in ES5 env (see [#12](https://github.com/pokusew/nfc-pcsc/issues/12) and [v0.6.0 release changelog](https://github.com/pokusew/nfc-pcsc/releases/tag/v0.6.0)))_.

You have to **update all requires or imports** of this library to the following _(note the brackets around NFC)_:
```javascript
// in ES6 environment
import { NFC } from 'nfc-pcsc';

// in ES2015 environment
const { NFC } = require('nfc-pcsc');
```

### Can I use this library in my [Electron](https://electron.atom.io/) app?

**Yes, you can!** It works well.

**But please note**, that this library uses [Node Native Modules](https://nodejs.org/api/addons.html) (underlying library [pokusew/node-pcsclite](https://github.com/pokusew/node-pcsclite) which provides access to PC/SC API).

Read carefully **[Using Native Node Modules](https://electron.atom.io/docs/tutorial/using-native-node-modules/) guide in Electron documentation** to fully understand the problematic.

**Note**, that because of Node Native Modules, you must build your app on target platform (you must run Windows build on Windows machine, etc.).  
You can use CI/CD server to build your app for certain platforms.  
For Windows, I recommend you to use [AppVeyor](https://appveyor.com/).  
For macOS and Linux build, there are plenty of services to choose from, for example [CircleCI](https://circleci.com/), [Travis CI](https://travis-ci.com/) [CodeShip](https://codeship.com/).

### Can I use this library in my [angular-electron](https://github.com/maximegris/angular-electron) app?

**Yes, you can!** But as this library uses Node Native Modules, you must change some config in `package.json` and `webpack.config.js` as described in [this comment](https://github.com/pokusew/nfc-pcsc/issues/24#issuecomment-327038188).

### Do I have to use Babel in my app too?

**No, you don't have to.** This library works great **in any Node.js 8+ environment** (even in an **Electron** app).

> Psst! Instead of using **async/await** (like in examples), you can use Promises.
> ```
> reader
>   .read(...)
>   .then(data => ...)
>   .catch(err => ...))
> ```

Babel is used under the hood to transpile features, that are not supported in **Node.js 8** (for example ES6 modules – import/export, see [.babelrc](/.babelrc) for list of used plugins). The transpiled code (in the dist folder) is then published into npm and when you install and require the library, the transpiled code is used, so you don't have to worry about anything.

### Which Node.js versions are supported?

nfc-pcsc officially supports the following Node.js versions: **8.x, 9.x, 10.x, 11.x, 12.x, 13.x**.

### How do I require/import this library?

```javascript
// in ES6 environment
import { NFC } from 'nfc-pcsc';

// in ES2015 environment
const { NFC } = require('nfc-pcsc');
```

If you want to import uncompiled source and transpile it yourself (not recommended), you can do it as follows:

```javascript
import { NFC } from 'nfc-pcsc/src';
```

### Can I read a NDEF formatted tag?

**Yes, you can!** You can read raw byte card data with `reader.read` method, and then you can parse it with any NDEF parser, e.g. [TapTrack/NdefJS](https://github.com/TapTrack/NdefJS).

**Psst!** There is also an example ([ndef.js](/examples/ndef.js)), but it is not finished yet. Feel free to contribute.

### Can I use this library in my React Native app?

Short answer: **NO**

Explanation: **Mobile support is virtually impossible** because nfc-pcsc uses **Node Native Modules**
to access system **PC/SC API** _(actually under the hood, the pcsclite native binding
is implemented in [@pokusew/pcsclite](https://github.com/pokusew/node-pcsclite))_.
So the **Node.js runtime and PC/SC API** are required for nfc-pcsc to run.
That makes it possible to use it on the most of OS (Windows, macOS, Linux)
**directly in Node.js** or in **Electron.js and NW.js** desktop apps.


## Frequent errors

### TypeError: NFC is not a constructor

No worry, just check that you import/require the library like this _(note the brackets around NFC)_:
```javascript
// in ES6 environment
import { NFC } from 'nfc-pcsc';

// in ES2015 environment
const { NFC } = require('nfc-pcsc');
```

Take a a look at [How do I require/import this library?](#how-do-i-requireimport-this-library) section for more info.

> **Note**, that `const NFC = require('nfc-pcsc');` or `import NFC from 'nfc-pcsc'` (NFC without brackets) won't work, because there is no default export.  
It was removed for non-standard behaviour of ES6 modules in ES5 env (see [#12](https://github.com/pokusew/nfc-pcsc/issues/12) and [v0.6.0 release changelog](https://github.com/pokusew/nfc-pcsc/releases/tag/v0.6.0))

### Transaction failed error when using `CONNECT_MODE_DIRECT`

No worry, just needs a proper configuration, see [explanation and instructions here](https://github.com/pokusew/nfc-pcsc/issues/13#issuecomment-302482621).

### MIFARE Classic: Authentication Error after Multiple Writes

No worry, you have probably modified a sector trailer instead of a data block, see [explanation and instructions here](https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178).

### Reading data from a type 4 tags inside a [Elsys.se](https://www.elsys.se/en/) sensors

According to [@martijnthe](https://github.com/martijnthe)'s findings, it seems to be necessary to change the CLASS of READ BINARY APDU command
from the default value of `0xFF` to `0x00` in order to make a successful read.

If you experience the same problems, you can try setting the fourth argument (readClass) of the
[`reader.read(blockNumber, length, blockSize, packetSize, readClass)`](https://github.com/pokusew/nfc-pcsc/blob/master/src/Reader.js#L493) method to value `0x00`.

Relevant conversation: https://github.com/pokusew/nfc-pcsc/pull/55#issuecomment-450120232


## License

[MIT](/LICENSE.md)
